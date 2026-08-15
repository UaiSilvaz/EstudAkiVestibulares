#!/usr/bin/env python3
"""Pipeline editorial recuperável para cadernos oficiais do ENEM.

O primeiro uso deliberadamente permitido é o piloto ENEM 2022, 2º dia,
Caderno 5 Amarelo. O mapa percorre o PDF consolidado inteiro, mas a extração
fica limitada ao piloto até que seu relatório final seja aprovado.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import shutil
import sys
import time
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence

try:
    import fitz  # PyMuPDF
except ImportError as error:  # pragma: no cover - preflight message
    raise SystemExit(
        "PyMuPDF não está instalado. Execute: "
        "python -m pip install -r scripts/enem/requirements.txt"
    ) from error


ROOT = Path.cwd().resolve()
CONFIG_ROOT = ROOT / "scripts" / "enem" / "config"
PROCESSING_ROOT = ROOT / "data" / "QUESTÕES" / "processamento"
PAGE_MAP_PATH = PROCESSING_ROOT / "mapa_paginas_enem.json"
PILOT_ID = "enem-2022-dia-2-caderno-5-amarelo"
TOP = 60.0
BOTTOM = 735.0
LEFT_ZONE = fitz.Rect(28.0, TOP, 283.0, BOTTOM)
RIGHT_ZONE = fitz.Rect(286.0, TOP, 540.0, BOTTOM)
FULL_ZONE = fitz.Rect(28.0, TOP, 540.0, BOTTOM)
QUESTION_MARKER = re.compile(r"QUEST.O\s+0?(\d{1,3})", re.IGNORECASE)
ANSWER_LINE = re.compile(r"\b(9[1-9]|1[0-7]\d|180)\s+(ANULAD[OA]|[A-E])\b", re.IGNORECASE)
SOURCE_RE = re.compile(
    r"(?:Disponível em:|Acesso em:|Fonte:|Adaptado de:|\bet al\.)",
    re.IGNORECASE,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def json_dump(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + f".{os.getpid()}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for attempt in range(20):
        try:
            temporary.replace(path)
            return
        except PermissionError:
            if attempt == 19:
                raise
            time.sleep(0.05 * (attempt + 1))


def json_load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def normalize_ascii(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFD", value)
        if unicodedata.category(character) != "Mn"
    ).lower()


def clean_control_characters(value: str) -> str:
    return "".join(
        character if character in "\n\t" or ord(character) >= 32 else " "
        for character in value
    )


def collapse_text(value: str) -> str:
    value = clean_control_characters(value).replace("\u00ad", "")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def normalized_page_text(page: fitz.Page) -> str:
    value = page.get_text("text")
    value = re.sub(r"ENEM\s+20\d{2}", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"\*\d{6}[A-Z]{2}\d+\*", " ", value)
    value = re.sub(
        r"(?:CN|MT|LC|CH)\s*-\s*[12].*?Aplica..o(?:\s+\d+)?",
        " ",
        value,
        flags=re.IGNORECASE,
    )
    return re.sub(r"\W+", "", normalize_ascii(value))


def config_path(config_name: str) -> Path:
    candidate = Path(config_name)
    if candidate.suffix == ".json" and candidate.exists():
        return candidate.resolve()
    path = CONFIG_ROOT / (config_name if config_name.endswith(".json") else f"{config_name}.json")
    if not path.exists():
        raise FileNotFoundError(f"Configuração ENEM não encontrada: {path}")
    return path


def load_config(config_name: str) -> dict[str, Any]:
    config = json_load(config_path(config_name))
    if config.get("id") != PILOT_ID:
        pilot_validation = PROCESSING_ROOT / PILOT_ID / "piloto-validado.json"
        if not pilot_validation.exists() or not json_load(pilot_validation).get("published"):
            raise RuntimeError(
                "A expansão está bloqueada: valide e publique perfeitamente o piloto "
                "ENEM 2022 — 2º dia antes de processar outro caderno."
            )
    return config


def resolve_repo_path(value: str) -> Path:
    candidate = (ROOT / Path(value)).resolve()
    if ROOT != candidate and ROOT not in candidate.parents:
        raise ValueError(f"Caminho fora do repositório: {value}")
    return candidate


def validate_input_pdf(path: Path) -> None:
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"PDF não encontrado: {path}")
    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Arquivo não é PDF: {path}")
    if path.stat().st_size < 1024:
        raise ValueError(f"PDF vazio ou truncado: {path}")
    if path.stat().st_size > 600 * 1024 * 1024:
        raise ValueError(f"PDF excede o limite de 600 MiB: {path}")
    with path.open("rb") as source:
        if source.read(5) != b"%PDF-":
            raise ValueError(f"Assinatura PDF inválida: {path}")


def page_question_numbers(text: str) -> list[int]:
    return sorted({int(match.group(1)) for match in QUESTION_MARKER.finditer(text)})


def booklet_from_cover(text: str) -> tuple[int | None, str | None]:
    normalized = collapse_text(text)
    match = re.search(
        r"(?:^|\n)\s*(\d{1,2})\s+(AZUL|AMARELO|BRANCO|ROSA|CINZA|LARANJA|VERDE)\b",
        normalized,
        re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r"Caderno\s+(\d{1,2})\s*[-–]\s*(AZUL|AMARELO|BRANCO|ROSA|CINZA|LARANJA|VERDE)",
            normalized,
            re.IGNORECASE,
        )
    if not match:
        return None, None
    return int(match.group(1)), match.group(2).title()


def classify_page(text: str, question_numbers: Sequence[int], *, is_cover: bool) -> str:
    normalized = normalize_ascii(text)
    if is_cover:
        return "capa_caderno"
    if question_numbers:
        return "questoes"
    if "proposta de redacao" in normalized:
        return "proposta_redacao"
    if "rascunho da redacao" in normalized or "folha de rascunho" in normalized:
        return "rascunho"
    if "cartao-resposta" in normalized or "folha de respostas" in normalized:
        return "administrativa"
    if len(re.sub(r"\s+", "", text)) < 8:
        return "em_branco"
    return "instrucoes_ou_continuacao"


def build_segments_from_toc(document: fitz.Document) -> list[dict[str, Any]]:
    toc = document.get_toc()
    years: list[tuple[int, int]] = []
    days: list[tuple[int, int, int]] = []
    current_year: int | None = None
    for level, title, page_number, *_rest in toc:
        year_match = re.fullmatch(r"ENEM\s+(20\d{2})", title.strip(), re.IGNORECASE)
        if level == 2 and year_match:
            current_year = int(year_match.group(1))
            years.append((current_year, int(page_number)))
            continue
        day_match = re.fullmatch(r"([12]).*dia", normalize_ascii(title).strip(), re.IGNORECASE)
        if level == 3 and current_year and day_match:
            days.append((current_year, int(day_match.group(1)), int(page_number)))

    if len(years) != 17 or len(days) != 34:
        raise RuntimeError(
            f"Sumário inesperado: {len(years)} anos e {len(days)} cadernos; esperados 17 e 34."
        )

    year_start = {year: page for year, page in years}
    segments: list[dict[str, Any]] = []
    for index, (year, day, start) in enumerate(days):
        if day == 1:
            second_day_start = next(page for y, d, page in days if y == year and d == 2)
            end = second_day_start - 2
        else:
            following_year = next((y for y, _page in years if y > year), None)
            end = year_start[following_year] - 1 if following_year else document.page_count

        cover_text = document[start - 1].get_text("text")
        booklet_number, booklet_color = booklet_from_cover(cover_text)
        cover_normalized = normalize_ascii(cover_text)
        if day == 1 and year <= 2016:
            expected_start, expected_end = 1, 90
        elif day == 2 and year <= 2016:
            expected_start, expected_end = 91, 180
            # Older editions sometimes permute areas/days, but numbering remains 91–180.
        elif day == 1:
            expected_start, expected_end = 1, 90
        else:
            expected_start, expected_end = 91, 180
        segments.append(
            {
                "ano": year,
                "dia": day,
                "caderno_numero": booklet_number,
                "caderno_cor": booklet_color,
                "pagina_pdf_inicio": start,
                "pagina_pdf_fim": end,
                "total_paginas_caderno": end - start + 1,
                "questao_inicial": expected_start,
                "questao_final": expected_end,
                "possui_redacao": "redacao" in cover_normalized or day == 1,
                "status": "mapeado",
            }
        )
    return segments


def map_document(config: dict[str, Any]) -> dict[str, Any]:
    source = resolve_repo_path(config["consolidatedPdf"])
    validate_input_pdf(source)
    started = time.perf_counter()
    document_hash = sha256_file(source)
    document = fitz.open(source)
    try:
        segments = build_segments_from_toc(document)
        segment_by_page: dict[int, dict[str, Any]] = {}
        for segment in segments:
            for page_number in range(segment["pagina_pdf_inicio"], segment["pagina_pdf_fim"] + 1):
                segment_by_page[page_number] = segment

        year_dividers = {
            page_number: year
            for level, title, page_number, *_rest in document.get_toc()
            if level == 2 and (match := re.fullmatch(r"ENEM\s+(20\d{2})", title.strip(), re.IGNORECASE))
            for year in [int(match.group(1))]
        }
        day_dividers = {
            segment["pagina_pdf_inicio"] - 1: (segment["ano"], segment["dia"])
            for segment in segments
            if segment["dia"] == 2
        }

        pages: list[dict[str, Any]] = []
        for index in range(document.page_count):
            page_number = index + 1
            page = document[index]
            text = page.get_text("text")
            questions = page_question_numbers(text)
            segment = segment_by_page.get(page_number)
            if page_number == 1:
                kind = "capa_acervo"
            elif page_number == 2:
                kind = "como_usar"
            elif page_number in (3, 4):
                kind = "sumario"
            elif page_number in year_dividers:
                kind = "divisoria_ano"
            elif page_number in day_dividers:
                kind = "divisoria_dia"
            elif segment:
                kind = classify_page(
                    text,
                    questions,
                    is_cover=page_number == segment["pagina_pdf_inicio"],
                )
            else:
                kind = "administrativa"
            pages.append(
                {
                    "pagina_pdf": page_number,
                    "tipo": kind,
                    "ano": segment["ano"] if segment else year_dividers.get(page_number),
                    "dia": segment["dia"] if segment else day_dividers.get(page_number, (None, None))[1],
                    "caderno_numero": segment.get("caderno_numero") if segment else None,
                    "caderno_cor": segment.get("caderno_cor") if segment else None,
                    "pagina_caderno": page_number - segment["pagina_pdf_inicio"] + 1 if segment else None,
                    "questoes_detectadas": questions,
                    "quantidade_imagens_pdf": len(page.get_images(full=True)),
                    "largura_pontos": round(page.rect.width, 3),
                    "altura_pontos": round(page.rect.height, 3),
                    "texto_incorporado": bool(text.strip()),
                }
            )

        result = {
            "schemaVersion": 1,
            "generatedAt": now_iso(),
            "source": {
                "path": relative(source),
                "sha256": document_hash,
                "sizeBytes": source.stat().st_size,
                "totalPages": document.page_count,
                "title": document.metadata.get("title"),
            },
            "summary": {
                "years": sorted({segment["ano"] for segment in segments}),
                "exams": len(segments),
                "mappedPages": len(pages),
                "elapsedSeconds": round(time.perf_counter() - started, 3),
            },
            "exams": segments,
            "pages": pages,
        }
        json_dump(PAGE_MAP_PATH, result)
        return result
    finally:
        document.close()


@dataclass(frozen=True)
class Zone:
    page_index: int
    zone_index: int
    rect: fitz.Rect


@dataclass(frozen=True)
class Marker:
    number: int
    page_index: int
    zone_index: int
    bbox: fitz.Rect


@dataclass(frozen=True)
class Region:
    page_index: int
    zone_index: int
    rect: fitz.Rect


def page_is_full_width(page: fitz.Page) -> bool:
    for block in page.get_text("blocks"):
        x0, y0, x1, _y1, text = block[:5]
        if TOP - 5 < y0 < BOTTOM and x0 < 60 and x1 - x0 > 430 and "ENEM 2022" not in text:
            return True
    return False


def iter_text_spans(page: fitz.Page, clip: fitz.Rect | None = None) -> Iterator[dict[str, Any]]:
    payload = page.get_text("dict", clip=clip)
    seen: set[tuple[str, float, float, float, float, str]] = set()
    for block in payload.get("blocks", []):
        if block.get("type") != 0:
            continue
        block_bbox = fitz.Rect(block["bbox"])
        if block_bbox.width < 8 and block_bbox.height > 150:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "")
                bbox = fitz.Rect(span["bbox"])
                if clip is not None and not (clip.y0 <= (bbox.y0 + bbox.y1) / 2 <= clip.y1):
                    continue
                # The official booklet contains a repeated, white 1.8 pt
                # watermark at the edge of both columns. It is present in the
                # text layer but is not visible editorial content.
                if float(span.get("size", 9.0)) < 4.0:
                    continue
                key = (
                    text,
                    round(bbox.x0, 2),
                    round(bbox.y0, 2),
                    round(bbox.x1, 2),
                    round(bbox.y1, 2),
                    span.get("font", ""),
                )
                if key in seen:
                    continue
                seen.add(key)
                yield {**span, "bbox": bbox, "lineBbox": fitz.Rect(line["bbox"])}


def discover_layout(document: fitz.Document, first_page_index: int, last_page_index: int) -> tuple[list[Zone], dict[int, Marker]]:
    zones: list[Zone] = []
    markers: dict[int, Marker] = {}
    for page_index in range(first_page_index, last_page_index + 1):
        page = document[page_index]
        page_zones = [FULL_ZONE] if page_is_full_width(page) else [LEFT_ZONE, RIGHT_ZONE]
        for zone_index, rect in enumerate(page_zones):
            zones.append(Zone(page_index, zone_index, fitz.Rect(rect)))
        for span in iter_text_spans(page):
            match = QUESTION_MARKER.fullmatch(span["text"].strip())
            if not match:
                continue
            number = int(match.group(1))
            bbox: fitz.Rect = span["bbox"]
            zone_index = 0 if len(page_zones) == 1 or bbox.x0 < LEFT_ZONE.x1 else 1
            markers.setdefault(number, Marker(number, page_index, zone_index, bbox))
    return zones, markers


def regions_between(
    zones: Sequence[Zone],
    current: Marker,
    following: Marker | None,
) -> list[Region]:
    positions = {(zone.page_index, zone.zone_index): index for index, zone in enumerate(zones)}
    start = positions[(current.page_index, current.zone_index)]
    end = positions[(following.page_index, following.zone_index)] if following else len(zones) - 1
    output: list[Region] = []
    for position in range(start, end + 1):
        zone = zones[position]
        y0 = max(zone.rect.y0, current.bbox.y0 - 2.0) if position == start else zone.rect.y0
        y1 = min(zone.rect.y1, following.bbox.y0 - 2.0) if following and position == end else zone.rect.y1
        # A column transition can leave a 2--3 pt sliver before the next
        # marker. It carries no content and would become an unusable crop.
        if y1 - y0 >= 10:
            output.append(Region(zone.page_index, zone.zone_index, fitz.Rect(zone.rect.x0, y0, zone.rect.x1, y1)))
    return output


def alternative_markers(document: fitz.Document, regions: Sequence[Region]) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    seen: set[tuple[str, int, float, float]] = set()
    for region_order, region in enumerate(regions):
        for span in iter_text_spans(document[region.page_index], region.rect):
            text = span["text"].strip().upper()
            if text not in {"A", "B", "C", "D", "E"} or "Bundesbahn" not in span.get("font", ""):
                continue
            bbox: fitz.Rect = span["bbox"]
            key = (text, region.page_index, round(bbox.x0, 1), round(bbox.y0, 1))
            if key in seen:
                continue
            seen.add(key)
            found.append(
                {
                    "key": text,
                    "pageIndex": region.page_index,
                    "zoneIndex": region.zone_index,
                    "regionOrder": region_order,
                    "bbox": bbox,
                }
            )
    return found


def span_text_line(spans: Sequence[dict[str, Any]]) -> str:
    ordered = sorted(spans, key=lambda item: item["bbox"].x0)
    output = ""
    previous: fitz.Rect | None = None
    for span in ordered:
        value = clean_control_characters(span.get("text", ""))
        if not value:
            continue
        bbox: fitz.Rect = span["bbox"]
        if previous is not None and bbox.x0 - previous.x1 > max(1.5, span.get("size", 9.0) * 0.18):
            output += " "
        output += value
        previous = bbox
    return re.sub(r"[ \t]+", " ", output).strip()


def extract_text_blocks(
    document: fitz.Document,
    regions: Sequence[Region],
    *,
    remove_alt_labels: bool = True,
) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for region_order, region in enumerate(regions):
        page = document[region.page_index]
        payload = page.get_text("dict", clip=region.rect)
        for raw_block in payload.get("blocks", []):
            if raw_block.get("type") != 0:
                continue
            bbox = fitz.Rect(raw_block["bbox"]) & region.rect
            if bbox.is_empty or bbox.width < 8 and bbox.height > 100:
                continue
            lines: list[str] = []
            font_sizes: list[float] = []
            for raw_line in raw_block.get("lines", []):
                deduplicated: list[dict[str, Any]] = []
                seen: set[tuple[str, float, float, str]] = set()
                for raw_span in raw_line.get("spans", []):
                    span = {**raw_span, "bbox": fitz.Rect(raw_span["bbox"])}
                    if not (
                        region.rect.y0
                        <= (span["bbox"].y0 + span["bbox"].y1) / 2
                        <= region.rect.y1
                    ):
                        continue
                    value = span.get("text", "").strip()
                    font = span.get("font", "")
                    if not value:
                        continue
                    if float(span.get("size", 9.0)) < 4.0 or span.get("color") == 0xFFFFFF:
                        continue
                    if remove_alt_labels and value.upper() in {"A", "B", "C", "D", "E"} and "Bundesbahn" in font:
                        continue
                    if QUESTION_MARKER.fullmatch(value):
                        continue
                    key = (value, round(span["bbox"].x0, 1), round(span["bbox"].y0, 1), font)
                    if key in seen:
                        continue
                    seen.add(key)
                    deduplicated.append(span)
                    font_sizes.append(float(span.get("size", 9.0)))
                line = span_text_line(deduplicated)
                if line and not re.fullmatch(r"(?:ENEM\s+2022\s*)+", line, re.IGNORECASE):
                    lines.append(line)
            text = collapse_text("\n".join(lines))
            text = re.sub(r"\*\d{6}[A-Z]{2}\d+\*", "", text)
            text = collapse_text(text)
            if not text:
                continue
            if re.search(
                r"MATEMÁTICA\s+E\s+SUAS\s+TECNOLOGIAS|Questões\s+de\s+136\s+a\s+180",
                text,
                re.IGNORECASE,
            ):
                continue
            if re.search(r"Caderno\s+5\s*-\s*AMARELO\s*-\s*1", text, re.IGNORECASE):
                continue
            blocks.append(
                {
                    "text": text,
                    "pageIndex": region.page_index,
                    "page": region.page_index + 1,
                    "regionOrder": region_order,
                    "bbox": bbox,
                    "fontMedian": sorted(font_sizes)[len(font_sizes) // 2] if font_sizes else 9.0,
                }
            )
    blocks.sort(key=lambda item: (item["regionOrder"], item["bbox"].y0, item["bbox"].x0))
    return blocks


def trim_regions_before_alternatives(regions: Sequence[Region], markers: Sequence[dict[str, Any]]) -> list[Region]:
    if not markers:
        return list(regions)
    first = markers[0]
    output: list[Region] = []
    for order, region in enumerate(regions):
        if order < first["regionOrder"]:
            output.append(region)
        elif order == first["regionOrder"]:
            end = first["bbox"].y0 - 2
            if end > region.rect.y0:
                output.append(Region(region.page_index, region.zone_index, fitz.Rect(region.rect.x0, region.rect.y0, region.rect.x1, end)))
            break
        else:
            break
    return output


def sequential_alternative_regions(
    question_regions: Sequence[Region],
    markers: Sequence[dict[str, Any]],
) -> dict[str, list[Region]]:
    output: dict[str, list[Region]] = {}
    for index, marker in enumerate(markers):
        following = markers[index + 1] if index + 1 < len(markers) else None
        regions: list[Region] = []
        start_order = marker["regionOrder"]
        end_order = following["regionOrder"] if following else len(question_regions) - 1
        for order in range(start_order, end_order + 1):
            base = question_regions[order]
            y0 = max(base.rect.y0, marker["bbox"].y0 - 2) if order == start_order else base.rect.y0
            y1 = min(base.rect.y1, following["bbox"].y0 - 2) if following and order == end_order else base.rect.y1
            if y1 - y0 > 2:
                regions.append(Region(base.page_index, base.zone_index, fitz.Rect(base.rect.x0, y0, base.rect.x1, y1)))
        output[marker["key"]] = regions
    return output


def centered_alternative_regions(
    question_regions: Sequence[Region],
    markers: Sequence[dict[str, Any]],
) -> dict[str, list[Region]]:
    """Split formula/diagram alternatives around each marker's center.

    In these layouts numerators and drawings start above the A-E glyph, so a
    top-of-marker split both loses the current item and leaks the next one.
    Midpoints between marker centers preserve each visual cell.
    """
    output: dict[str, list[Region]] = {}
    sequential = sequential_alternative_regions(question_regions, markers)
    by_region: dict[int, list[dict[str, Any]]] = {}
    for marker in markers:
        by_region.setdefault(marker["regionOrder"], []).append(marker)
    for region_order, own_markers in by_region.items():
        base = question_regions[region_order]
        own_markers.sort(key=lambda item: item["bbox"].y0)
        if len(own_markers) == 1:
            only = own_markers[0]
            output[only["key"]] = sequential[only["key"]]
            continue
        centers = [(item["bbox"].y0 + item["bbox"].y1) / 2 for item in own_markers]
        for index, marker in enumerate(own_markers):
            center = centers[index]
            if index == 0:
                step = centers[1] - center if len(centers) > 1 else 30.0
                y0 = max(base.rect.y0, center - step / 2)
            else:
                y0 = (centers[index - 1] + center) / 2
            if index + 1 < len(centers):
                y1 = (center + centers[index + 1]) / 2
            else:
                step = center - centers[index - 1] if index else 30.0
                y1 = min(base.rect.y1, center + step / 2)
            output[marker["key"]] = [
                Region(base.page_index, base.zone_index, fitz.Rect(base.rect.x0, y0, base.rect.x1, y1))
            ]
    return output


def trim_regions_before_region(
    regions: Sequence[Region],
    boundary: Region,
) -> list[Region]:
    output: list[Region] = []
    for region in regions:
        if (region.page_index, region.zone_index) < (boundary.page_index, boundary.zone_index):
            output.append(region)
            continue
        if (region.page_index, region.zone_index) == (boundary.page_index, boundary.zone_index):
            if boundary.rect.y0 > region.rect.y0:
                output.append(
                    Region(
                        region.page_index,
                        region.zone_index,
                        fitz.Rect(region.rect.x0, region.rect.y0, region.rect.x1, boundary.rect.y0),
                    )
                )
            break
        break
    return output


def grid_alternative_regions(
    question_regions: Sequence[Region],
    markers: Sequence[dict[str, Any]],
) -> dict[str, list[Region]]:
    if not markers:
        return {}
    page_index = markers[0]["pageIndex"]
    base = next(region for region in question_regions if region.page_index == page_index)
    x_values: list[float] = []
    y_values: list[float] = []
    for marker in markers:
        x = marker["bbox"].x0
        y = marker["bbox"].y0
        if not any(abs(existing - x) < 18 for existing in x_values):
            x_values.append(x)
        if not any(abs(existing - y) < 12 for existing in y_values):
            y_values.append(y)
    x_values.sort()
    y_values.sort()
    x_bounds = [base.rect.x0]
    for first, second in zip(x_values, x_values[1:]):
        x_bounds.append((first + second) / 2)
    x_bounds.append(base.rect.x1)
    y_bounds = [min(marker["bbox"].y0 for marker in markers) - 3]
    for first, second in zip(y_values, y_values[1:]):
        y_bounds.append((first + second) / 2)
    y_bounds.append(base.rect.y1)

    output: dict[str, list[Region]] = {}
    for marker in markers:
        column = min(range(len(x_values)), key=lambda index: abs(x_values[index] - marker["bbox"].x0))
        row = min(range(len(y_values)), key=lambda index: abs(y_values[index] - marker["bbox"].y0))
        rect = fitz.Rect(
            max(x_bounds[column], marker["bbox"].x0),
            y_bounds[row],
            x_bounds[column + 1],
            y_bounds[row + 1],
        )
        output[marker["key"]] = [Region(page_index, base.zone_index, rect)]
    return output


def rect_distance(first: fitz.Rect, second: fitz.Rect) -> float:
    dx = max(first.x0 - second.x1, second.x0 - first.x1, 0.0)
    dy = max(first.y0 - second.y1, second.y0 - first.y1, 0.0)
    return math.hypot(dx, dy)


def visual_rectangles(page: fitz.Page, clip: fitz.Rect) -> list[fitz.Rect]:
    rectangles: list[fitz.Rect] = []
    for drawing in page.get_drawings():
        rect = fitz.Rect(drawing["rect"])
        intersection = rect & clip
        if intersection.is_empty:
            continue
        if intersection.width < 1 and intersection.height < 5:
            continue
        if intersection.height < 1 and intersection.width < 5:
            continue
        rectangles.append(intersection)
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 1:
            continue
        rect = fitz.Rect(block["bbox"]) & clip
        if not rect.is_empty and rect.get_area() >= 16:
            rectangles.append(rect)
    return rectangles


def group_visual_rectangles(rectangles: Sequence[fitz.Rect], max_distance: float = 14.0) -> list[fitz.Rect]:
    groups = [fitz.Rect(rect) for rect in rectangles]
    changed = True
    while changed:
        changed = False
        merged: list[fitz.Rect] = []
        while groups:
            current = groups.pop(0)
            index = 0
            while index < len(groups):
                if rect_distance(current, groups[index]) <= max_distance:
                    current |= groups.pop(index)
                    changed = True
                else:
                    index += 1
            merged.append(current)
        groups = merged
    return groups


def significant_visual_groups(page: fitz.Page, clip: fitz.Rect) -> list[fitz.Rect]:
    """Return visual groups large enough to be meaningful on a phone.

    The PDF drawing layer also exposes rules, crop marks and the question-label
    underline as vector objects. Requiring two-dimensional extent after
    grouping keeps real charts, diagrams and formula constructions while
    rejecting those one-dimensional artifacts.
    """
    groups = group_visual_rectangles(visual_rectangles(page, clip))
    groups = [expand_visual_with_labels(page, group, clip) for group in groups]
    return [
        group
        for group in groups
        if group.get_area() >= 180 and group.width >= 12 and group.height >= 12
    ]


def expand_visual_with_labels(page: fitz.Page, rect: fitz.Rect, clip: fitz.Rect) -> fitz.Rect:
    expanded = fitz.Rect(rect)
    for _iteration in range(2):
        proximity = fitz.Rect(expanded.x0 - 8, expanded.y0 - 8, expanded.x1 + 8, expanded.y1 + 8) & clip
        for span in iter_text_spans(page, proximity):
            bbox: fitz.Rect = span["bbox"]
            text = span["text"].strip()
            if not text or QUESTION_MARKER.fullmatch(text):
                continue
            if "Bundesbahn" in span.get("font", ""):
                continue
            if bbox.width < 190 or bbox.intersects(expanded):
                expanded |= bbox
        expanded &= clip
    return fitz.Rect(
        max(clip.x0, expanded.x0 - 4),
        max(clip.y0, expanded.y0 - 4),
        min(clip.x1, expanded.x1 + 4),
        min(clip.y1, expanded.y1 + 4),
    )


def render_clip(
    page: fitz.Page,
    clip: fitz.Rect,
    destination: Path,
    scale: float = 2.5,
    masks: Sequence[fitz.Rect] = (),
) -> tuple[int, int, str]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    safe_clip = clip & page.rect
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=safe_clip, alpha=False, annots=False)
    for mask in masks:
        intersection = fitz.Rect(mask) & safe_clip
        if intersection.is_empty:
            continue
        pixel_rect = fitz.IRect(
            pixmap.x + math.floor((intersection.x0 - safe_clip.x0) * scale),
            pixmap.y + math.floor((intersection.y0 - safe_clip.y0) * scale),
            pixmap.x + math.ceil((intersection.x1 - safe_clip.x0) * scale),
            pixmap.y + math.ceil((intersection.y1 - safe_clip.y0) * scale),
        )
        pixmap.set_rect(pixel_rect, (255, 255, 255))
    pixmap.save(destination)
    return pixmap.width, pixmap.height, sha256_file(destination)


def asset_url(config: dict[str, Any], question: int, file_name: str) -> str:
    return (
        f"/api/questions/assets/enem/{config['year']}/dia-{config['day']}/"
        f"questao-{question}/{file_name}"
    )


def bbox_payload(rect: fitz.Rect, page: fitz.Page) -> dict[str, Any]:
    return {
        "x": round(rect.x0, 3),
        "y": round(rect.y0, 3),
        "width": round(rect.width, 3),
        "height": round(rect.height, 3),
        "normalized": {
            "x": round(rect.x0 / page.rect.width, 6),
            "y": round(rect.y0 / page.rect.height, 6),
            "width": round(rect.width / page.rect.width, 6),
            "height": round(rect.height / page.rect.height, 6),
        },
    }


def render_original_regions(
    document: fitz.Document,
    regions: Sequence[Region],
    directory: Path,
    config: dict[str, Any],
    question_number: int,
    consolidated_start: int,
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for index, region in enumerate(regions, start=1):
        name = f"recorte-original-{index:02d}.png"
        destination = directory / name
        page = document[region.page_index]
        width, height, digest = render_clip(page, region.rect, destination)
        output.append(
            {
                "url": asset_url(config, question_number, name),
                "storagePath": relative(destination),
                "type": "original_reference",
                "relation": "admin_reference",
                "order": index - 1,
                "altText": f"Recorte oficial da questão {question_number}, parte {index}",
                "width": width,
                "height": height,
                "sha256": digest,
                "sourcePdfPage": region.page_index + 1,
                "consolidatedPdfPage": consolidated_start + region.page_index,
                "sourceRegion": bbox_payload(region.rect, page),
            }
        )
    return output


def render_prompt_facsimiles(
    document: fitz.Document,
    regions: Sequence[Region],
    directory: Path,
    config: dict[str, Any],
    question_number: int,
    consolidated_start: int,
) -> list[dict[str, Any]]:
    """Render the prompt before A-E as an exact student-facing fallback."""
    output: list[dict[str, Any]] = []
    for index, region in enumerate(regions, start=1):
        name = f"enunciado-facsimile-{index:02d}.png"
        destination = directory / name
        page = document[region.page_index]
        width, height, digest = render_clip(page, region.rect, destination, scale=3.0)
        output.append(
            {
                "url": asset_url(config, question_number, name),
                "storagePath": relative(destination),
                "type": "prompt_facsimile",
                "relation": "statement",
                "order": index - 1,
                "altText": f"Enunciado oficial diagramado da questão {question_number}, parte {index}",
                "width": width,
                "height": height,
                "sha256": digest,
                "sourcePdfPage": region.page_index + 1,
                "consolidatedPdfPage": consolidated_start + region.page_index,
                "sourceRegion": bbox_payload(region.rect, page),
            }
        )
    return output


def render_main_visuals(
    document: fitz.Document,
    regions: Sequence[Region],
    directory: Path,
    config: dict[str, Any],
    question_number: int,
    consolidated_start: int,
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    order = 0
    manual_regions = config.get("manualVisualRegions", {}).get(str(question_number), [])
    if manual_regions:
        for payload in manual_regions:
            order += 1
            page_index = int(payload["sourcePdfPage"]) - 1
            page = document[page_index]
            group = fitz.Rect(
                float(payload["x"]),
                float(payload["y"]),
                float(payload["x"]) + float(payload["width"]),
                float(payload["y"]) + float(payload["height"]),
            )
            same_page_regions = [
                (region_order, region)
                for region_order, region in enumerate(regions)
                if region.page_index == page_index
            ]
            if not same_page_regions:
                raise RuntimeError(
                    f"Questao {question_number}: visual manual fora das regioes do enunciado."
                )
            region_order = max(
                same_page_regions,
                key=lambda item: (item[1].rect & group).get_area(),
            )[0]
            name = f"visual-{order:02d}.png"
            destination = directory / name
            masks = [
                fitz.Rect(
                    float(mask["x"]),
                    float(mask["y"]),
                    float(mask["x"]) + float(mask["width"]),
                    float(mask["y"]) + float(mask["height"]),
                )
                for mask in payload.get("masks", [])
            ]
            width, height, digest = render_clip(
                page, group, destination, scale=3.0, masks=masks
            )
            output.append(
                {
                    "url": asset_url(config, question_number, name),
                    "storagePath": relative(destination),
                    "type": "visual",
                    "relation": "statement",
                    "order": order - 1,
                    "altText": f"Elemento visual oficial da questão {question_number}",
                    "width": width,
                    "height": height,
                    "sha256": digest,
                    "sourcePdfPage": page_index + 1,
                    "zoneOrder": region_order,
                    "consolidatedPdfPage": consolidated_start + page_index,
                    "sourceRegion": bbox_payload(group, page),
                    "sourceMasks": [bbox_payload(mask, page) for mask in masks],
                }
            )
        return output
    for region_order, region in enumerate(regions):
        page = document[region.page_index]
        groups = significant_visual_groups(page, region.rect)
        groups.sort(key=lambda rect: (rect.y0, rect.x0))
        if groups and config.get("mergeVisualGroupsByRegion", False):
            merged_group = fitz.Rect(groups[0])
            for group in groups[1:]:
                merged_group |= group
            groups = [merged_group]
        for group in groups:
            order += 1
            name = f"visual-{order:02d}.png"
            destination = directory / name
            width, height, digest = render_clip(page, group, destination, scale=3.0)
            output.append(
                {
                    "url": asset_url(config, question_number, name),
                    "storagePath": relative(destination),
                    "type": "visual",
                    "relation": "statement",
                    "order": order - 1,
                    "altText": f"Elemento visual oficial da questão {question_number}",
                    "width": width,
                    "height": height,
                    "sha256": digest,
                    "sourcePdfPage": region.page_index + 1,
                    "zoneOrder": region_order,
                    "consolidatedPdfPage": consolidated_start + region.page_index,
                    "sourceRegion": bbox_payload(group, page),
                }
            )
    return output


def regions_have_visual(document: fitz.Document, regions: Sequence[Region]) -> bool:
    return any(
        significant_visual_groups(document[region.page_index], region.rect)
        for region in regions
    )


def alternative_text(document: fitz.Document, regions: Sequence[Region], key: str) -> str:
    blocks = extract_text_blocks(document, regions, remove_alt_labels=True)
    text = collapse_text(" ".join(block["text"] for block in blocks))
    return collapse_text(text)


def render_alternative_image(
    document: fitz.Document,
    regions: Sequence[Region],
    directory: Path,
    config: dict[str, Any],
    question_number: int,
    key: str,
    consolidated_start: int,
) -> dict[str, Any] | None:
    if not regions:
        return None
    # Preserve the entire visual alternative region; this is safer than trying
    # to reconstruct formulas, chemical structures or projections from text.
    first = regions[0]
    page = document[first.page_index]
    clip = fitz.Rect(first.rect)
    clip.x0 = min(clip.x1 - 1, clip.x0 + 14)
    preserve_full_region = question_number in set(
        config.get("preserveFullAlternativeRegion", [])
    )
    if len(regions) == 1 and not preserve_full_region:
        components = [
            rect
            for rect in significant_visual_groups(page, clip)
            if not (rect.x1 >= clip.x1 - 1 and rect.width < 24)
        ]
        for span in iter_text_spans(page, clip):
            value = span.get("text", "").strip()
            if not value or "Bundesbahn" in span.get("font", ""):
                continue
            components.append(span["bbox"] & clip)
        if components:
            content_union = fitz.Rect(components[0])
            for rect in components[1:]:
                if not rect.is_empty:
                    content_union |= rect
            clip = fitz.Rect(
                max(clip.x0, content_union.x0 - 5),
                max(clip.y0, content_union.y0 - 4),
                min(clip.x1, content_union.x1 + 5),
                min(clip.y1, content_union.y1 + 4),
            )
    name = f"alternativa-{key.lower()}.png"
    destination = directory / name
    width, height, digest = render_clip(page, clip, destination, scale=3.0)
    return {
        "url": asset_url(config, question_number, name),
        "storagePath": relative(destination),
        "type": "alternative_visual",
        "relation": "alternative",
        "alternativeKey": key,
        "order": ord(key) - ord("A"),
        "altText": f"Elemento visual da alternativa {key} da questão {question_number}",
        "width": width,
        "height": height,
        "sha256": digest,
        "sourcePdfPage": first.page_index + 1,
        "consolidatedPdfPage": consolidated_start + first.page_index,
        "sourceRegion": bbox_payload(clip, page),
    }


def area_for_question(config: dict[str, Any], number: int) -> str:
    for area in config["areas"]:
        if area["questionStart"] <= number <= area["questionEnd"]:
            return area["name"]
    raise ValueError(f"Questão {number} fora das áreas configuradas.")


def checkpoint_payload(config: dict[str, Any], stage: str, completed: Sequence[int], **extra: Any) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "pilotId": config["id"],
        "stage": stage,
        "completedQuestions": sorted(completed),
        "lastQuestion": max(completed) if completed else None,
        "updatedAt": now_iso(),
        **extra,
    }


def extract_questions(
    config: dict[str, Any],
    *,
    resume: bool = False,
    force_questions: set[int] | None = None,
) -> dict[str, Any]:
    if not PAGE_MAP_PATH.exists():
        raise RuntimeError("Execute npm run enem:mapear antes da extração.")
    page_map = json_load(PAGE_MAP_PATH)
    consolidated = resolve_repo_path(config["consolidatedPdf"])
    official_exam = resolve_repo_path(config["officialExamPdf"])
    validate_input_pdf(consolidated)
    validate_input_pdf(official_exam)
    if sha256_file(consolidated) != page_map["source"]["sha256"]:
        raise RuntimeError("O PDF consolidado mudou após o mapeamento; refaça o mapa antes de extrair.")

    segment = next(
        (
            item
            for item in page_map["exams"]
            if item["ano"] == config["year"] and item["dia"] == config["day"]
        ),
        None,
    )
    if not segment:
        raise RuntimeError("Caderno piloto não encontrado no mapa de páginas.")
    if segment["caderno_numero"] != config["bookletNumber"] or normalize_ascii(segment["caderno_cor"] or "") != normalize_ascii(config["bookletColor"]):
        raise RuntimeError(
            "O caderno do PDF consolidado não corresponde à configuração oficial: "
            f"mapa={segment['caderno_numero']} {segment['caderno_cor']}; "
            f"config={config['bookletNumber']} {config['bookletColor']}."
        )

    pilot_dir = PROCESSING_ROOT / config["id"]
    questions_dir = pilot_dir / "questoes"
    storage_root = ROOT / "storage" / "questoes" / "enem" / str(config["year"]) / f"dia-{config['day']}"
    checkpoint_path = pilot_dir / "checkpoint.json"
    pilot_dir.mkdir(parents=True, exist_ok=True)
    questions_dir.mkdir(parents=True, exist_ok=True)
    storage_root.mkdir(parents=True, exist_ok=True)

    source_hash = sha256_file(official_exam)
    completed: list[int] = []
    if resume and checkpoint_path.exists():
        checkpoint = json_load(checkpoint_path)
        if checkpoint.get("officialExamSha256") == source_hash:
            completed = [int(value) for value in checkpoint.get("completedQuestions", [])]
    if force_questions:
        invalid = sorted(
            number
            for number in force_questions
            if not config["questionStart"] <= number <= config["questionEnd"]
        )
        if invalid:
            raise ValueError(f"Questões forçadas fora do piloto: {invalid}")
        completed = [number for number in completed if number not in force_questions]

    official = fitz.open(official_exam)
    consolidated_doc = fitz.open(consolidated)
    try:
        expected_pages = segment["total_paginas_caderno"]
        if official.page_count != expected_pages:
            raise RuntimeError(
                f"PDF oficial tem {official.page_count} páginas; o segmento consolidado tem {expected_pages}."
            )
        comparisons: list[dict[str, Any]] = []
        for official_index in range(official.page_count):
            consolidated_index = segment["pagina_pdf_inicio"] - 1 + official_index
            official_text = normalized_page_text(official[official_index])
            consolidated_text = normalized_page_text(consolidated_doc[consolidated_index])
            comparisons.append(
                {
                    "officialPage": official_index + 1,
                    "consolidatedPage": consolidated_index + 1,
                    "textMatches": official_text == consolidated_text,
                    "officialTextSha256": sha256_bytes(official_text.encode("utf-8")),
                    "consolidatedTextSha256": sha256_bytes(consolidated_text.encode("utf-8")),
                }
            )
        if not all(item["textMatches"] for item in comparisons):
            mismatches = [item["officialPage"] for item in comparisons if not item["textMatches"]]
            raise RuntimeError(f"O PDF consolidado diverge do oficial nas páginas: {mismatches}")

        question_page_first = 1
        question_page_last = official.page_count - 2
        zones, markers = discover_layout(official, question_page_first, question_page_last)
        expected_numbers = list(range(config["questionStart"], config["questionEnd"] + 1))
        missing_markers = [number for number in expected_numbers if number not in markers]
        extra_markers = sorted(set(markers) - set(expected_numbers))
        if missing_markers or extra_markers:
            raise RuntimeError(
                f"Marcadores inválidos. Ausentes={missing_markers}; excedentes={extra_markers}."
            )

        classification_path = resolve_repo_path(config["classificationFile"])
        classification_rows = json_load(classification_path)
        classification_by_number = {
            int(item["officialNumber"]): item for item in classification_rows
        }
        if (
            len(classification_rows) != len(expected_numbers)
            or set(classification_by_number) != set(expected_numbers)
        ):
            raise RuntimeError(
                "A classificação editorial deve conter exatamente as questões 91–180."
            )

        corrections_path = resolve_repo_path(config["correctionsFile"])
        corrections_by_number = {
            int(number): payload
            for number, payload in json_load(corrections_path).items()
        }
        unexpected_corrections = sorted(
            set(corrections_by_number) - set(expected_numbers)
        )
        if unexpected_corrections:
            raise RuntimeError(
                f"Correções editoriais fora do piloto: {unexpected_corrections}."
            )

        pages_dir = storage_root / "paginas"
        pages_dir.mkdir(parents=True, exist_ok=True)
        page_assets: list[dict[str, Any]] = []
        for page_index in range(official.page_count):
            destination = pages_dir / f"pagina-{page_index + 1:03d}.png"
            width, height, digest = render_clip(official[page_index], official[page_index].rect, destination, scale=2.25)
            page_assets.append(
                {
                    "sourcePdfPage": page_index + 1,
                    "consolidatedPdfPage": segment["pagina_pdf_inicio"] + page_index,
                    "storagePath": relative(destination),
                    "width": width,
                    "height": height,
                    "sha256": digest,
                }
            )

        extracted: list[dict[str, Any]] = []
        for number in expected_numbers:
            correction = corrections_by_number.get(number, {})
            question_json = questions_dir / f"questao-{number}.json"
            if number in completed and question_json.exists():
                extracted.append(json_load(question_json))
                continue

            current = markers[number]
            following = markers.get(number + 1)
            regions = regions_between(zones, current, following)
            alt_markers = alternative_markers(official, regions)
            marker_keys = [marker["key"] for marker in alt_markers]
            is_grid = marker_keys != list("ABCDE") or any(
                abs(first["bbox"].y0 - second["bbox"].y0) < 6
                and first["regionOrder"] == second["regionOrder"]
                for first, second in zip(alt_markers, alt_markers[1:])
            )
            if sorted(marker_keys) != list("ABCDE") or len(marker_keys) != 5:
                raise RuntimeError(f"Questão {number}: alternativas detectadas incorretamente: {marker_keys}")

            source_regions = [
                region
                for region in regions
                if not (number == 135 and region.page_index > current.page_index)
            ]

            uses_centered_alternatives = number in set(
                config.get("centeredAlternativeImages", [])
            )
            alternative_regions = (
                grid_alternative_regions(regions, alt_markers)
                if is_grid
                else centered_alternative_regions(regions, alt_markers)
                if uses_centered_alternatives
                else sequential_alternative_regions(regions, alt_markers)
            )
            manual_regions = config.get("manualAlternativeRegions", {}).get(str(number), {})
            for key, payload in manual_regions.items():
                alternative_regions[key] = [
                    Region(
                        int(payload["sourcePdfPage"]) - 1,
                        int(payload.get("zoneIndex", 0)),
                        fitz.Rect(
                            float(payload["x"]),
                            float(payload["y"]),
                            float(payload["x"]) + float(payload["width"]),
                            float(payload["y"]) + float(payload["height"]),
                        ),
                    )
                ]
            pre_alt_regions = (
                trim_regions_before_region(regions, alternative_regions["A"][0])
                if manual_regions or (uses_centered_alternatives and not is_grid)
                else trim_regions_before_alternatives(regions, alt_markers)
            )
            text_blocks = extract_text_blocks(official, pre_alt_regions)
            if not text_blocks:
                raise RuntimeError(f"Questão {number}: nenhum enunciado incorporado foi extraído.")
            for text_replacement in correction.get("replacements", []):
                for block in text_blocks:
                    block["text"] = block["text"].replace(
                        text_replacement["from"], text_replacement["to"]
                    )
            manual_command_start = config.get("manualCommandStarts", {}).get(str(number))
            if manual_command_start:
                matching_indexes = [
                    index
                    for index, block in enumerate(text_blocks)
                    if manual_command_start in block["text"]
                ]
                if len(matching_indexes) != 1:
                    raise RuntimeError(
                        f"Questão {number}: o início manual do comando não foi localizado uma única vez."
                    )
                split_index = matching_indexes[0]
                source_block = text_blocks[split_index]
                offset = source_block["text"].index(manual_command_start)
                prefix = collapse_text(source_block["text"][:offset])
                command_text = collapse_text(source_block["text"][offset:])
                replacement: list[dict[str, Any]] = []
                if prefix:
                    prefix_type = config.get("manualCommandPrefixTypes", {}).get(
                        str(number), "credit"
                    )
                    replacement.append(
                        {**source_block, "text": prefix, "forceType": prefix_type}
                    )
                replacement.append(
                    {**source_block, "text": command_text, "forceType": "command"}
                )
                text_blocks[split_index : split_index + 1] = replacement
            non_credit_indexes = [
                index
                for index, block in enumerate(text_blocks)
                if not SOURCE_RE.search(block["text"])
                and block["fontMedian"] > 7.4
                and sum(character.isalpha() for character in block["text"]) >= 8
            ]
            forced_command_indexes = [
                index
                for index, block in enumerate(text_blocks)
                if block.get("forceType") == "command"
            ]
            command_index = (
                forced_command_indexes[0]
                if forced_command_indexes
                else non_credit_indexes[-1]
                if non_credit_indexes
                else len(text_blocks) - 1
            )
            structured_blocks: list[dict[str, Any]] = []
            for index, block in enumerate(text_blocks):
                block_type = (
                    block.get("forceType")
                    if block.get("forceType")
                    else "command"
                    if index == command_index
                    else "credit"
                    if SOURCE_RE.search(block["text"]) or block["fontMedian"] <= 7.4
                    else "support_text"
                )
                structured_blocks.append(
                    {
                        "type": block_type,
                        "content": block["text"],
                        "order": len(structured_blocks),
                        "sourcePdfPage": block["page"],
                        "zoneOrder": block["regionOrder"],
                        "consolidatedPdfPage": segment["pagina_pdf_inicio"] + block["pageIndex"],
                        "sourceRegion": bbox_payload(block["bbox"], official[block["pageIndex"]]),
                        "confidence": 0.995,
                    }
                )
            support_text = collapse_text(
                "\n\n".join(
                    block["text"]
                    for index, block in enumerate(text_blocks)
                    if index != command_index
                )
            ) or None
            command = text_blocks[command_index]["text"]
            searchable_statement = collapse_text("\n\n".join(block["text"] for block in text_blocks))

            if correction.get("command"):
                command = collapse_text(correction["command"])
                structured_blocks[command_index]["content"] = command
            if correction.get("supportText"):
                support_text = collapse_text(correction["supportText"])
                reference_block = next(
                    (
                        block
                        for block in structured_blocks
                        if block["type"] != "command"
                    ),
                    structured_blocks[0],
                )
                preserved_credits = [
                    block
                    for block in structured_blocks
                    if block["type"] == "credit" and SOURCE_RE.search(block["content"])
                ]
                for manual_credit in correction.get("credits", []):
                    preserved_credits.append(
                        {
                            **reference_block,
                            "type": "credit",
                            "content": collapse_text(manual_credit),
                        }
                    )
                command_block = {
                    **structured_blocks[command_index],
                    "type": "command",
                    "content": command,
                }
                structured_blocks = [
                    {
                        **reference_block,
                        "type": "support_text",
                        "content": support_text,
                    },
                    *preserved_credits,
                    command_block,
                ]
                for order, block in enumerate(structured_blocks):
                    block["order"] = order
            manual_structured_blocks = correction.get("structuredBlocks")
            if manual_structured_blocks:
                allowed_types = {"support_text", "credit", "command"}
                reference_block = next(
                    (
                        block
                        for block in structured_blocks
                        if block["type"] != "command"
                    ),
                    structured_blocks[0],
                )
                rebuilt_blocks: list[dict[str, Any]] = []
                for order, payload in enumerate(manual_structured_blocks):
                    block_type = payload.get("type")
                    content = collapse_text(payload.get("content", ""))
                    if block_type not in allowed_types or not content:
                        raise RuntimeError(
                            f"Questão {number}: bloco estruturado manual inválido na posição {order}."
                        )
                    rebuilt_blocks.append(
                        {
                            **reference_block,
                            "type": block_type,
                            "content": content,
                            "order": order,
                        }
                    )
                command_blocks = [
                    block for block in rebuilt_blocks if block["type"] == "command"
                ]
                if len(command_blocks) != 1:
                    raise RuntimeError(
                        f"Questão {number}: blocos manuais exigem exatamente um comando."
                    )
                structured_blocks = rebuilt_blocks
                support_text = collapse_text(
                    "\n\n".join(
                        block["content"]
                        for block in structured_blocks
                        if block["type"] == "support_text"
                    )
                ) or None
                command = command_blocks[0]["content"]
            searchable_statement = collapse_text(
                "\n\n".join(block["content"] for block in structured_blocks)
            )

            question_storage = storage_root / f"questao-{number}"
            if question_storage.exists() and not resume:
                shutil.rmtree(question_storage)
            question_storage.mkdir(parents=True, exist_ok=True)
            original_crops = render_original_regions(
                official,
                source_regions,
                question_storage,
                config,
                number,
                segment["pagina_pdf_inicio"],
            )
            main_assets = render_main_visuals(
                official,
                pre_alt_regions,
                question_storage,
                config,
                number,
                segment["pagina_pdf_inicio"],
            )
            # A visual that is only present in ``assets`` is not part of the
            # digitalized statement.  Link every student-facing prompt visual
            # to an ordered IMAGE block so graphs, tables and figures keep
            # their exact position between the textual blocks.
            image_blocks: list[dict[str, Any]] = []
            for asset in main_assets:
                alt_text = str(asset["altText"])
                image_blocks.append(
                    {
                        "type": "image",
                        "content": alt_text,
                        "altText": alt_text,
                        "assetSha256": asset["sha256"],
                        "assetPath": asset["storagePath"],
                        "storagePath": asset["storagePath"],
                        "sourcePdfPage": asset["sourcePdfPage"],
                        "zoneOrder": asset["zoneOrder"],
                        "consolidatedPdfPage": asset["consolidatedPdfPage"],
                        "sourceRegion": asset["sourceRegion"],
                        "confidence": 0.985,
                        "_assetOrder": asset["order"],
                    }
                )

            for text_order, block in enumerate(structured_blocks):
                block["_textOrder"] = text_order

            def source_order(block: dict[str, Any]) -> tuple[Any, ...]:
                region = block["sourceRegion"]
                # Text wins ties so a caption/introduction at the same
                # coordinate remains before its visual.
                kind_order = 1 if block["type"] == "image" else 0
                return (
                    int(block.get("zoneOrder", 0)),
                    float(region["y"]),
                    float(region["x"]),
                    kind_order,
                    int(block.get("_textOrder", block.get("_assetOrder", 0))),
                )

            structured_blocks = sorted(
                [*structured_blocks, *image_blocks], key=source_order
            )

            # Exact editorial placement is available for exceptional layouts
            # whose manually rebuilt text blocks intentionally share one
            # source region. Values are zero-based text-block positions.
            image_placements = correction.get("imageBlockPlacements", {})
            for asset_order_text, after_text_order_value in sorted(
                image_placements.items(), key=lambda item: int(item[0])
            ):
                asset_order = int(asset_order_text)
                after_text_order = int(after_text_order_value)
                image_index = next(
                    (
                        index
                        for index, block in enumerate(structured_blocks)
                        if block.get("_assetOrder") == asset_order
                    ),
                    None,
                )
                target_index = next(
                    (
                        index
                        for index, block in enumerate(structured_blocks)
                        if block.get("_textOrder") == after_text_order
                    ),
                    None,
                )
                if image_index is None or target_index is None:
                    raise RuntimeError(
                        f"Questao {number}: posicionamento manual de imagem invalido."
                    )
                image_block = structured_blocks.pop(image_index)
                if image_index < target_index:
                    target_index -= 1
                structured_blocks.insert(target_index + 1, image_block)

            for order, block in enumerate(structured_blocks):
                block["order"] = order
                block.pop("_textOrder", None)
                block.pop("_assetOrder", None)
            uses_prompt_facsimile = (
                bool(config.get("forcePromptFacsimileAll"))
                or bool(main_assets)
                or number in set(config.get("forcePromptFacsimile", []))
            )
            prompt_facsimiles = (
                render_prompt_facsimiles(
                    official,
                    pre_alt_regions,
                    question_storage,
                    config,
                    number,
                    segment["pagina_pdf_inicio"],
                )
                if uses_prompt_facsimile
                else []
            )

            alternatives: list[dict[str, Any]] = []
            alternative_assets: list[dict[str, Any]] = []
            for key in "ABCDE":
                own_regions = alternative_regions[key]
                text = alternative_text(official, own_regions, key)
                for text_replacement in correction.get("replacements", []):
                    text = text.replace(
                        text_replacement["from"], text_replacement["to"]
                    )
                text = collapse_text(text)
                text = correction.get("alternatives", {}).get(key, text)
                has_visual = (
                    is_grid
                    or number in set(config.get("forceAlternativeImages", []))
                    or regions_have_visual(official, own_regions)
                )
                image = (
                    render_alternative_image(
                        official,
                        own_regions,
                        question_storage,
                        config,
                        number,
                        key,
                        segment["pagina_pdf_inicio"],
                    )
                    if has_visual
                    else None
                )
                if image:
                    alternative_assets.append(image)
                first_region = own_regions[0]
                alternatives.append(
                    {
                        "key": key,
                        "text": text,
                        "imageUrl": image["url"] if image else None,
                        "order": ord(key) - ord("A"),
                        "sourcePdfPage": first_region.page_index + 1,
                        "consolidatedPdfPage": segment["pagina_pdf_inicio"] + first_region.page_index,
                        "sourceRegion": bbox_payload(first_region.rect, official[first_region.page_index]),
                        "confidence": 0.985 if image else 0.997,
                    }
                )

            classification = classification_by_number[number]
            first_page = min(region.page_index for region in source_regions) + 1
            last_page = max(region.page_index for region in source_regions) + 1
            source_url = f"{config['officialExamUrl']}#page={first_page}"
            question = {
                "schemaVersion": 1,
                "id": f"{config['id']}-q{number}",
                "pilotId": config["id"],
                "oldExamId": config["oldExamId"],
                "vestibular": config["vestibular"],
                "year": config["year"],
                "day": config["day"],
                "application": config["application"],
                "applicationLabel": config["applicationLabel"],
                "modality": config["modality"],
                "bookletNumber": config["bookletNumber"],
                "bookletColor": config["bookletColor"],
                "officialNumber": number,
                "officialOrder": number - config["questionStart"] + 1,
                "area": area_for_question(config, number),
                "subject": classification["subject"],
                "content": classification["content"],
                "subcontent": classification.get("subcontent"),
                "competency": classification.get("competency"),
                "ability": classification.get("ability"),
                "difficulty": classification["difficulty"],
                "estimatedTimeSeconds": classification["estimatedTimeSeconds"],
                "language": "portugues",
                "supportText": support_text,
                "command": command,
                "statement": searchable_statement,
                "blocks": structured_blocks,
                "alternatives": alternatives,
                "answer": None,
                "answerSituation": "pending_official_key",
                "source": {
                    "institution": config["institution"],
                    "sourcePageUrl": config["officialSourcePage"],
                    "officialExamUrl": config["officialExamUrl"],
                    "officialExamSha256": source_hash,
                    "officialPdfPageStart": first_page,
                    "officialPdfPageEnd": last_page,
                    "consolidatedPdfPageStart": segment["pagina_pdf_inicio"] + first_page - 1,
                    "consolidatedPdfPageEnd": segment["pagina_pdf_inicio"] + last_page - 1,
                    "originalPageUrl": source_url,
                    "accessedAt": now_iso(),
                },
                "assets": prompt_facsimiles + main_assets + alternative_assets,
                "originalCrops": original_crops,
                "flags": {
                    "hasImage": bool(prompt_facsimiles or main_assets or alternative_assets),
                    "hasFormula": bool(
                        re.search(
                            r"[=±×÷√∑∫]|\b(?:sen|cos|log|pH|mol|m/s|km|cm|mm)\b",
                            searchable_statement,
                            re.IGNORECASE,
                        )
                        or number in set(config.get("forceFormulas", []))
                    ),
                    "hasTable": (
                        "tabela" in normalize_ascii(searchable_statement)
                        or "quadro" in normalize_ascii(searchable_statement)
                        or number in set(config.get("forceTables", []))
                    ),
                    "hasGraph": (
                        "grafico" in normalize_ascii(searchable_statement)
                        or number in set(config.get("forceGraphs", []))
                    ),
                    "requiresVisualInterpretation": bool(
                        config.get("visualInterpretationOverrides", {}).get(
                            str(number), bool(main_assets or alternative_assets)
                        )
                    ),
                    "spansMultiplePages": first_page != last_page,
                    "alternativeGrid": is_grid,
                    "centeredAlternativeImages": uses_centered_alternatives,
                    "usesPromptFacsimile": uses_prompt_facsimile,
                    "forcedAlternativeImages": number in set(config.get("forceAlternativeImages", [])),
                    "editorialCorrectionsApplied": bool(correction),
                },
                "confidence": {
                    "text": 0.995,
                    "alternatives": 0.985 if alternative_assets else 0.997,
                    "images": 0.985 if (main_assets or alternative_assets) else 1.0,
                    "answer": 0.0,
                    "classification": classification["confidence"],
                    "overall": 0.0,
                },
                "extractionStatus": "extracted",
                "reviewStatus": "pending_review",
                "reviewNotes": (
                    "Correções editoriais determinísticas auditadas contra o fac-símile oficial."
                    if correction
                    else None
                ),
                "contentHash": sha256_bytes(
                    json.dumps(
                        {
                            "pilot": config["id"],
                            "number": number,
                            "statement": searchable_statement,
                            "alternatives": [{"key": item["key"], "text": item["text"]} for item in alternatives],
                        },
                        ensure_ascii=False,
                        sort_keys=True,
                    ).encode("utf-8")
                ),
            }
            json_dump(question_json, question)
            extracted.append(question)
            completed.append(number)
            json_dump(
                checkpoint_path,
                checkpoint_payload(
                    config,
                    "extracting",
                    completed,
                    officialExamSha256=source_hash,
                    consolidatedSha256=page_map["source"]["sha256"],
                ),
            )

        extracted.sort(key=lambda item: item["officialNumber"])
        output_path = pilot_dir / "questoes-estruturadas.json"
        json_dump(output_path, extracted)
        provenance = {
            "pilotId": config["id"],
            "generatedAt": now_iso(),
            "consolidated": {
                "path": relative(consolidated),
                "sha256": page_map["source"]["sha256"],
                "pageStart": segment["pagina_pdf_inicio"],
                "pageEnd": segment["pagina_pdf_fim"],
            },
            "officialExam": {
                "path": relative(official_exam),
                "url": config["officialExamUrl"],
                "sha256": source_hash,
                "sizeBytes": official_exam.stat().st_size,
                "pageCount": official.page_count,
            },
            "editorialInputs": {
                "classificationPath": relative(classification_path),
                "classificationSha256": sha256_file(classification_path),
                "correctionsPath": relative(corrections_path),
                "correctionsSha256": sha256_file(corrections_path),
            },
            "pageComparisons": comparisons,
            "pageAssets": page_assets,
        }
        json_dump(pilot_dir / "proveniencia.json", provenance)
        json_dump(
            checkpoint_path,
            checkpoint_payload(
                config,
                "extracted",
                completed,
                officialExamSha256=source_hash,
                consolidatedSha256=page_map["source"]["sha256"],
                output=relative(output_path),
            ),
        )
        return {
            "pilotId": config["id"],
            "questions": len(extracted),
            "first": extracted[0]["officialNumber"],
            "last": extracted[-1]["officialNumber"],
            "withVisuals": sum(1 for item in extracted if item["flags"]["hasImage"]),
            "multiPage": sum(1 for item in extracted if item["flags"]["spansMultiplePages"]),
            "output": relative(output_path),
        }
    finally:
        official.close()
        consolidated_doc.close()


def import_answer_key(config: dict[str, Any]) -> dict[str, Any]:
    pilot_dir = PROCESSING_ROOT / config["id"]
    questions_path = pilot_dir / "questoes-estruturadas.json"
    if not questions_path.exists():
        raise RuntimeError("Extraia as questões antes de relacionar o gabarito.")
    key_path = resolve_repo_path(config["officialAnswerKeyPdf"])
    validate_input_pdf(key_path)
    key_hash = sha256_file(key_path)
    document = fitz.open(key_path)
    try:
        if document.page_count != 1:
            raise RuntimeError(f"Gabarito oficial deveria ter 1 página, mas possui {document.page_count}.")
        text = document[0].get_text("text")
    finally:
        document.close()
    answers: dict[int, str] = {}
    for match in ANSWER_LINE.finditer(collapse_text(text).replace("\n", " ")):
        number = int(match.group(1))
        value = normalize_ascii(match.group(2)).upper()
        answer = "ANULADA" if value.startswith("ANULAD") else value
        if number in answers and answers[number] != answer:
            raise RuntimeError(f"Gabarito divergente repetido para a questão {number}.")
        answers[number] = answer
    expected = list(range(config["questionStart"], config["questionEnd"] + 1))
    if sorted(answers) != expected:
        missing = sorted(set(expected) - set(answers))
        extra = sorted(set(answers) - set(expected))
        raise RuntimeError(f"Gabarito incompleto. Ausentes={missing}; excedentes={extra}.")
    annulled = [number for number, value in answers.items() if value == "ANULADA"]
    if annulled != [175]:
        raise RuntimeError(f"Anulação inesperada no Caderno 5: {annulled}; esperada [175].")

    imported_at = now_iso()
    payload = {
        "schemaVersion": 1,
        "pilotId": config["id"],
        "year": config["year"],
        "day": config["day"],
        "application": config["application"],
        "modality": config["modality"],
        "bookletNumber": config["bookletNumber"],
        "bookletColor": config["bookletColor"],
        "source": {
            "institution": config["institution"],
            "sourcePageUrl": config["officialSourcePage"],
            "officialUrl": config["officialAnswerKeyUrl"],
            "path": relative(key_path),
            "sha256": key_hash,
            "sizeBytes": key_path.stat().st_size,
            "importedAt": imported_at,
        },
        "answers": [
            {
                "questionNumber": number,
                "correctAlternative": None if answer == "ANULADA" else answer,
                "situation": "annulled" if answer == "ANULADA" else "confirmed",
                "validationStatus": "validated_against_official_pdf",
            }
            for number, answer in sorted(answers.items())
        ],
    }
    json_dump(pilot_dir / "gabarito-oficial.json", payload)

    questions = json_load(questions_path)
    answer_by_number = {item["questionNumber"]: item for item in payload["answers"]}
    for question in questions:
        answer = answer_by_number[question["officialNumber"]]
        question["answer"] = answer["correctAlternative"]
        question["answerSituation"] = answer["situation"]
        question["isAnnulled"] = answer["situation"] == "annulled"
        question["officialAnswerKey"] = {
            **answer,
            "sourceUrl": config["officialAnswerKeyUrl"],
            "sourceSha256": key_hash,
            "sourcePdfPage": 1,
            "importedAt": imported_at,
        }
        question["confidence"]["answer"] = 1.0
        base_values = [
            question["confidence"]["text"],
            question["confidence"]["alternatives"],
            question["confidence"]["images"],
            question["confidence"]["answer"],
            question["confidence"]["classification"],
        ]
        question["confidence"]["overall"] = round(min(base_values), 3)
        json_dump(pilot_dir / "questoes" / f"questao-{question['officialNumber']}.json", question)
    json_dump(questions_path, questions)
    checkpoint_path = pilot_dir / "checkpoint.json"
    checkpoint = json_load(checkpoint_path) if checkpoint_path.exists() else {}
    json_dump(
        checkpoint_path,
        {
            **checkpoint,
            "stage": "answer_key_linked",
            "officialAnswerKeySha256": key_hash,
            "updatedAt": now_iso(),
        },
    )
    return {
        "pilotId": config["id"],
        "answers": len(payload["answers"]),
        "annulled": annulled,
        "sha256": key_hash,
        "output": relative(pilot_dir / "gabarito-oficial.json"),
    }


def image_dimensions(path: Path) -> tuple[int, int]:
    pixmap = fitz.Pixmap(path)
    try:
        return pixmap.width, pixmap.height
    finally:
        pixmap = None


def validate_pilot(config: dict[str, Any]) -> dict[str, Any]:
    pilot_dir = PROCESSING_ROOT / config["id"]
    questions_path = pilot_dir / "questoes-estruturadas.json"
    key_path = pilot_dir / "gabarito-oficial.json"
    provenance_path = pilot_dir / "proveniencia.json"
    for required in (questions_path, key_path, provenance_path, PAGE_MAP_PATH):
        if not required.exists():
            raise RuntimeError(f"Artefato obrigatório ausente: {relative(required)}")
    questions = json_load(questions_path)
    key = json_load(key_path)
    provenance = json_load(provenance_path)
    page_map = json_load(PAGE_MAP_PATH)
    expected_numbers = list(range(config["questionStart"], config["questionEnd"] + 1))
    errors: list[str] = []
    warnings: list[str] = []

    numbers = [item.get("officialNumber") for item in questions]
    if numbers != expected_numbers:
        errors.append(f"Numeração incorreta: {numbers[:5]} … {numbers[-5:]}")
    if len({item.get("contentHash") for item in questions}) != len(questions):
        errors.append("Hashes de conteúdo duplicados no piloto.")
    answers = {item["questionNumber"]: item for item in key["answers"]}
    if sorted(answers) != expected_numbers:
        errors.append("O gabarito não contém exatamente as questões 91–180.")
    if [number for number, answer in answers.items() if answer["situation"] == "annulled"] != [175]:
        errors.append("A questão anulada não corresponde à questão 175 do Caderno 5.")
    if not all(item["textMatches"] for item in provenance["pageComparisons"]):
        errors.append("Há páginas divergentes entre o consolidado e o PDF oficial.")

    image_hashes: dict[str, str] = {}
    with_images = 0
    multi_page = 0
    for question in questions:
        number = question["officialNumber"]
        if question["year"] != 2022 or question["day"] != 2:
            errors.append(f"Questão {number}: ano ou dia incorreto.")
        if question["bookletNumber"] != 5 or normalize_ascii(question["bookletColor"]) != "amarelo":
            errors.append(f"Questão {number}: caderno incorreto.")
        if len(question.get("statement", "").strip()) < 20:
            errors.append(f"Questão {number}: enunciado ausente ou curto.")
        classification_fields = (
            "subject",
            "content",
            "subcontent",
            "difficulty",
            "estimatedTimeSeconds",
        )
        if any(question.get(field) in (None, "") for field in classification_fields):
            errors.append(f"Questão {number}: classificação editorial incompleta.")
        command_blocks = [
            block for block in question.get("blocks", []) if block.get("type") == "command"
        ]
        if len(command_blocks) != 1 or command_blocks[0].get("content") != question.get("command"):
            errors.append(f"Questão {number}: bloco de comando ausente, duplicado ou divergente.")
        manual_command_start = config.get("manualCommandStarts", {}).get(str(number))
        if manual_command_start and not question.get("command", "").startswith(manual_command_start):
            errors.append(f"Questão {number}: comando editorial não foi separado da fonte.")
        alternatives = question.get("alternatives", [])
        if [item.get("key") for item in alternatives] != list("ABCDE"):
            errors.append(f"Questão {number}: alternativas A–E incompletas ou fora de ordem.")
        if any(not item.get("text") and not item.get("imageUrl") for item in alternatives):
            errors.append(f"Questão {number}: alternativa sem texto e sem imagem.")
        if question.get("answerSituation") == "confirmed" and question.get("answer") not in list("ABCDE"):
            errors.append(f"Questão {number}: resposta oficial inválida.")
        if question.get("answerSituation") == "annulled" and question.get("answer") is not None:
            errors.append(f"Questão {number}: item anulado recebeu resposta A–E.")
        page_start = question["source"]["officialPdfPageStart"]
        page_end = question["source"]["officialPdfPageEnd"]
        if not (2 <= page_start <= page_end <= 31):
            errors.append(f"Questão {number}: páginas de origem inválidas ({page_start}–{page_end}).")
        if page_start != page_end:
            multi_page += 1
        original_crops = question.get("originalCrops", [])
        if not original_crops:
            errors.append(f"Questão {number}: sem recorte original para auditoria.")
        prompt_facsimiles = [
            asset for asset in question.get("assets", []) if asset.get("type") == "prompt_facsimile"
        ]
        if not prompt_facsimiles:
            errors.append(f"Questão {number}: sem fac-símile oficial do enunciado para o aluno.")
        structured_text_values = [
            question.get("supportText") or "",
            question.get("command") or "",
            *(block.get("content") or "" for block in question.get("blocks", [])),
            *(alternative.get("text") or "" for alternative in alternatives),
        ]
        if any(re.search(r"[\ue000-\uf8ff]", value) for value in structured_text_values):
            errors.append(f"Questão {number}: texto estruturado contém glifo privado do PDF.")
        malformed_alternatives = [
            alternative["key"]
            for alternative in alternatives
            if re.search(r"\.[il]$", (alternative.get("text") or "").strip())
        ]
        if malformed_alternatives:
            errors.append(
                f"Questão {number}: resíduos de marcador nas alternativas {malformed_alternatives}."
            )
        for asset in [*question.get("assets", []), *original_crops]:
            stored = resolve_repo_path(asset["storagePath"])
            if not stored.exists():
                errors.append(f"Questão {number}: mídia ausente {asset['storagePath']}.")
                continue
            actual_hash = sha256_file(stored)
            if actual_hash != asset["sha256"]:
                errors.append(f"Questão {number}: hash divergente em {asset['storagePath']}.")
            try:
                width, height = image_dimensions(stored)
            except Exception as error:  # noqa: BLE001 - recorded in report
                errors.append(f"Questão {number}: imagem ilegível {asset['storagePath']}: {error}")
                continue
            if width < 24 or height < 24:
                errors.append(f"Questão {number}: imagem pequena demais {width}×{height}.")
            previous = image_hashes.get(actual_hash)
            if previous and previous != asset["storagePath"] and asset["relation"] != "admin_reference":
                warnings.append(
                    f"Mídia duplicada por hash: {previous} e {asset['storagePath']}."
                )
            image_hashes[actual_hash] = asset["storagePath"]
        if question.get("flags", {}).get("hasImage"):
            with_images += 1
        mixed_markers = [
            int(match.group(1))
            for match in QUESTION_MARKER.finditer(question.get("statement", ""))
            if int(match.group(1)) != number
        ]
        if mixed_markers:
            errors.append(f"Questão {number}: contém marcador de outra questão: {mixed_markers}.")

    segment = next(
        item
        for item in page_map["exams"]
        if item["ano"] == config["year"] and item["dia"] == config["day"]
    )
    if segment["pagina_pdf_inicio"] != 898 or segment["pagina_pdf_fim"] != 929:
        errors.append(
            "O mapeamento do piloto não corresponde às páginas consolidadas 898–929."
        )

    report = {
        "schemaVersion": 1,
        "pilotId": config["id"],
        "generatedAt": now_iso(),
        "status": "passed" if not errors else "failed",
        "checks": {
            "expectedQuestions": config["expectedQuestions"],
            "extractedQuestions": len(questions),
            "numberingComplete": numbers == expected_numbers,
            "allHaveFiveAlternatives": all(
                [item.get("key") for item in question.get("alternatives", [])] == list("ABCDE")
                for question in questions
            ),
            "officialAnswers": len(answers),
            "annulled": sum(1 for answer in answers.values() if answer["situation"] == "annulled"),
            "withImages": with_images,
            "multiPage": multi_page,
            "originalPageAvailable": all(question.get("originalCrops") for question in questions),
            "consolidatedMatchesOfficial": all(
                item["textMatches"] for item in provenance["pageComparisons"]
            ),
        },
        "errors": errors,
        "warnings": sorted(set(warnings)),
        "publicationGate": {
            "structuralValidationPassed": not errors,
            "visualReviewRequired": True,
            "databaseImportRequired": True,
            "studentFlowRequired": True,
            "mobileReviewRequired": True,
            "canPublish": False,
        },
    }
    json_dump(pilot_dir / "relatorio-validacao.json", report)
    markdown = [
        "# Relatório de validação — ENEM 2022 — 2º dia — Caderno 5 Amarelo",
        "",
        f"Gerado em {report['generatedAt']}.",
        "",
        "## Resultado estrutural",
        "",
        f"- Status: **{report['status']}**",
        f"- Questões esperadas/extráidas: {config['expectedQuestions']}/{len(questions)}",
        f"- Gabaritos oficiais relacionados: {len(answers)}",
        f"- Questões anuladas: {report['checks']['annulled']} (questão 175)",
        f"- Questões com elementos visuais detectados: {with_images}",
        f"- Questões que atravessam regiões/páginas: {multi_page}",
        "- Publicadas nesta etapa: 0",
        "",
        "## Erros",
        "",
        *([f"- {error}" for error in errors] or ["- Nenhum erro estrutural detectado."]),
        "",
        "## Avisos",
        "",
        *([f"- {warning}" for warning in sorted(set(warnings))] or ["- Nenhum aviso."]),
        "",
        "## Portão editorial",
        "",
        "A validação estrutural não publica questões. Ainda são obrigatórios: revisão visual das 90 questões, importação transacional, teste real de resposta/correção, revisão mobile e publicação controlada.",
        "",
    ]
    (pilot_dir / "relatorio-validacao.md").write_text("\n".join(markdown), encoding="utf-8")
    return report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Pipeline editorial oficial do ENEM")
    parser.add_argument(
        "command",
        choices=["mapear", "extrair", "gabaritos", "validar", "piloto"],
    )
    parser.add_argument(
        "--config",
        default="enem-2022-dia-2",
        help="Nome da configuração em scripts/enem/config ou caminho JSON.",
    )
    parser.add_argument("--resume", action="store_true", help="Retoma questões já concluídas com o mesmo hash.")
    parser.add_argument(
        "--force-question",
        action="append",
        type=int,
        default=[],
        help="Reextrai uma questão específica ao retomar; pode ser repetido.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    config = load_config(args.config)
    if args.command == "mapear":
        result = map_document(config)
    elif args.command == "extrair":
        result = extract_questions(
            config,
            resume=args.resume,
            force_questions=set(args.force_question),
        )
    elif args.command == "gabaritos":
        result = import_answer_key(config)
    elif args.command == "validar":
        result = validate_pilot(config)
    else:
        map_document(config)
        extract_questions(
            config,
            resume=args.resume,
            force_questions=set(args.force_question),
        )
        import_answer_key(config)
        result = validate_pilot(config)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("status") != "failed" else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Processamento interrompido; o checkpoint foi preservado.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as error:  # noqa: BLE001 - CLI must record a concise failure
        print(f"Erro no pipeline ENEM: {error}", file=sys.stderr)
        raise SystemExit(1)
