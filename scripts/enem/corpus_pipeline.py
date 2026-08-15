#!/usr/bin/env python3
"""Extrator recuperável e language-aware para cadernos oficiais do ENEM.

Este módulo é deliberadamente separado de ``enem_pipeline.py``. Ele reutiliza
as primitivas de leitura, geometria e renderização que já foram validadas pelo
piloto, mas não muda o comportamento nem o portão editorial daquele pipeline.

O corpus gerado é um artefato de revisão. Este comando nunca importa no banco
e nunca publica questões. O relatório mantém ``canPublish=false`` enquanto
qualquer requisito editorial, visual ou de integração continuar pendente.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
import re
import shutil
import sys
import time
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence
from urllib.parse import urlparse

try:
    import fitz  # PyMuPDF
except ImportError as error:  # pragma: no cover - mensagem de preflight
    raise SystemExit(
        "PyMuPDF não está instalado. Execute: "
        "python -m pip install -r scripts/enem/requirements.txt"
    ) from error

import enem_pipeline as pilot


ROOT = Path(__file__).resolve().parents[2]
CONFIG_ROOT = Path(__file__).resolve().parent / "config"
PIPELINE_PATH = Path(__file__).resolve()
SCHEMA_VERSION = 1
EXTRACTOR_ID = "enem-corpus-language-aware-v1"
ANSWER_VALUES = frozenset("ABCDE") | {"ANULADA", "ANULADO"}
FOREIGN_LANGUAGES = frozenset({"ingles", "espanhol"})
SECTION_LABEL = re.compile(r"^(TEXTO\s+[IVXLCDM]+|PROPOSTA\s+DE\s+REDAÇÃO)\b", re.IGNORECASE)
ESSAY_SECTION_BOUNDARY = re.compile(
    r"^(TEXTO\s+([IVXLCDM]+)|PROPOSTA\s+DE\s+REDAÇÃO)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
ESSAY_INSTRUCTIONS_HEADING = re.compile(
    r"^INSTRUÇÕES\s+PARA\s+A\s+REDAÇÃO\s*$",
    re.IGNORECASE | re.MULTILINE,
)
MALFORMED_PDF_SUFFIX = re.compile(r"(?<=[.!?])(?:i{1,3}|il|l)$")
MALFORMED_COMMAND_SUFFIXES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bque\s+l$"), "que"),
    (re.compile(r"\bdei$"), "de"),
    (re.compile(r"\bpori$"), "por"),
    (re.compile(r"\bde\(a\)i$"), "de(a)"),
    (re.compile(r"\bo\(a\)i$"), "o(a)"),
    (re.compile(r"\bai$"), "a"),
    (re.compile(r"\baol$"), "ao"),
    (re.compile(r"\bdel$"), "de"),
    (re.compile(r"\bporqueii$"), "porque"),
    (re.compile(r"\bpeloi$"), "pelo"),
    (re.compile(r"\bpelai$"), "pela"),
    (re.compile(r"\bao\(à\)i$"), "ao(à)"),
    (re.compile(r"\bdevei$"), "deve"),
    (re.compile(r":\s*i$"), ":"),
)
MISSING_SPACE_AFTER_CLOSING_QUOTE = re.compile(
    r"(?<=”)(?=[A-Za-zÀ-ÖØ-öø-ÿ])"
)
CREDIT_BOUNDARY = re.compile(
    r"(?:\b(?:18|19|20)\d{2}(?:\s*\(adaptad[oa]\))?[.:]?|"
    r"\(adaptad[oa]\)\.?|\bs/d\.?)\s*$",
    re.IGNORECASE,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_hash(value: Any) -> str:
    return sha256_bytes(
        json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    )


def json_load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def json_dump(path: Path, value: Any) -> None:
    """Escreve JSON de forma atômica para preservar checkpoints válidos."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + f".{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    for attempt in range(20):
        try:
            temporary.replace(path)
            return
        except PermissionError:
            if attempt == 19:
                raise
            time.sleep(0.05 * (attempt + 1))


def repo_path(value: str | Path) -> Path:
    candidate = (ROOT / Path(value)).resolve()
    if candidate != ROOT and ROOT not in candidate.parents:
        raise ValueError(f"Caminho fora do repositório: {value}")
    return candidate


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def config_path(value: str) -> Path:
    explicit = Path(value)
    if explicit.suffix.lower() == ".json":
        candidate = repo_path(explicit)
        if candidate.exists():
            return candidate
    name = value if value.endswith(".json") else f"{value}.json"
    candidate = (CONFIG_ROOT / name).resolve()
    if not candidate.exists():
        raise FileNotFoundError(f"Configuração do corpus ENEM não encontrada: {candidate}")
    return candidate


def _required(config: dict[str, Any], field: str, expected_type: type | tuple[type, ...]) -> Any:
    value = config.get(field)
    if not isinstance(value, expected_type):
        raise ValueError(f"Configuração inválida: campo {field!r} ausente ou com tipo incorreto.")
    return value


def load_config(value: str) -> tuple[dict[str, Any], Path]:
    path = config_path(value)
    config = json_load(path)
    for field, field_type in (
        ("id", str),
        ("year", int),
        ("day", int),
        ("bookletNumber", int),
        ("bookletColor", str),
        ("questionStart", int),
        ("questionEnd", int),
        ("expectedLogicalQuestions", int),
        ("expectedPrintedOccurrences", int),
        ("officialExamPdf", str),
        ("officialAnswerKeyPdf", str),
        ("outputDirectory", str),
        ("objectivePageRanges", list),
        ("languageSections", list),
        ("areas", list),
    ):
        _required(config, field, field_type)
    if config["day"] not in {1, 2}:
        raise ValueError("O dia do ENEM deve ser 1 ou 2.")
    logical = config["questionEnd"] - config["questionStart"] + 1
    if logical != config["expectedLogicalQuestions"]:
        raise ValueError(
            "expectedLogicalQuestions diverge do intervalo questionStart–questionEnd."
        )
    if config["expectedPrintedOccurrences"] < logical:
        raise ValueError("O total de ocorrências impressas não pode ser menor que o total lógico.")
    output = repo_path(config["outputDirectory"])
    processing_root = repo_path("data/QUESTÕES/processamento")
    if output == processing_root or processing_root not in output.parents:
        raise ValueError("outputDirectory deve ser um filho específico de data/QUESTÕES/processamento.")
    return config, path


def pipeline_hashes() -> dict[str, str]:
    return {
        "corpusPipelineSha256": sha256_file(PIPELINE_PATH),
        "pilotPrimitivesSha256": sha256_file(Path(pilot.__file__).resolve()),
    }


def validate_pdf(path: Path) -> None:
    pilot.validate_input_pdf(path)
    try:
        document = fitz.open(path)
        document.authenticate("")
        if document.needs_pass:
            raise ValueError(f"PDF protegido por senha: {path}")
        if document.page_count <= 0:
            raise ValueError(f"PDF sem páginas: {path}")
        # Força leitura da primeira e da última página para detectar truncamento.
        document[0].get_text("text")
        document[document.page_count - 1].get_text("text")
    finally:
        if "document" in locals():
            document.close()


def page_numbers_from_ranges(ranges: Sequence[dict[str, int]]) -> list[int]:
    output: list[int] = []
    for item in ranges:
        start = int(item["start"])
        end = int(item["end"])
        if start <= 0 or end < start:
            raise ValueError(f"Intervalo de páginas inválido: {item}")
        output.extend(range(start, end + 1))
    if len(output) != len(set(output)):
        raise ValueError("objectivePageRanges contém páginas repetidas.")
    return output


def normalize_answer(value: str) -> str:
    normalized = pilot.normalize_ascii(value).upper()
    return "ANULADA" if normalized.startswith("ANULAD") else normalized


def text_identifies_day(value: str, day: int) -> bool:
    compact = re.sub(r"\s+", "", pilot.normalize_ascii(value))
    return bool(
        re.search(rf"(?:{day}[ºo°]?dia|dia[ºo°]?{day})", compact, re.IGNORECASE)
    )


def area_for_question(config: dict[str, Any], number: int) -> str | None:
    matches = [
        item["name"]
        for item in config["areas"]
        if int(item["questionStart"]) <= number <= int(item["questionEnd"])
    ]
    return matches[0] if len(matches) == 1 else None


def bbox_payload(rect: fitz.Rect, page: fitz.Page) -> dict[str, Any]:
    return pilot.bbox_payload(rect, page)


def region_payload(region: pilot.Region, page: fitz.Page) -> dict[str, Any]:
    return {
        "sourcePdfPage": region.page_index + 1,
        "zoneIndex": region.zone_index,
        "sourceRegion": bbox_payload(region.rect, page),
    }


def asset_payload(
    destination: Path,
    page: fitz.Page,
    rect: fitz.Rect,
    *,
    asset_type: str,
    relation: str,
    order: int,
    alt_text: str,
    scale: float = 3.0,
) -> dict[str, Any]:
    try:
        width, height, digest = pilot.render_clip(
            page, rect, destination, scale=scale
        )
    finally:
        # MuPDF mantém uma store global de pixmaps/imagens. Em cadernos com
        # centenas de recortes ela pode acumular memória mesmo depois de o
        # objeto Python sair de escopo; liberar a store entre recortes torna o
        # checkpoint realmente retomável também em máquinas com pouca RAM.
        gc.collect()
        fitz.TOOLS.store_shrink(100)
    local_path = relative(destination)
    return {
        "artifactPath": local_path,
        # O auditor visual e o importador consomem ``storagePath`` como o
        # vínculo explícito para o arquivo local. ``artifactPath`` permanece
        # por compatibilidade com os blocos/validações do extrator.
        "storagePath": local_path,
        "url": None,
        "type": asset_type,
        "relation": relation,
        "order": order,
        "altText": alt_text,
        "width": width,
        "height": height,
        "sha256": digest,
        "sourcePdfPage": page.number + 1,
        "sourceRegion": bbox_payload(rect, page),
    }


@dataclass(frozen=True)
class PrintedOccurrence:
    printed_order: int
    number: int
    language: str
    language_occurrence: int
    occurrence_id: str
    variant_group_id: str | None
    marker: pilot.Marker


class VisualIndex:
    """Indexa o desenho de cada página uma vez e reaproveita as geometrias."""

    def __init__(self, document: fitz.Document) -> None:
        self.document = document
        self._rectangles: dict[int, list[fitz.Rect]] = {}

    def rectangles(self, page_index: int) -> list[fitz.Rect]:
        if page_index not in self._rectangles:
            page = self.document[page_index]
            self._rectangles[page_index] = [
                fitz.Rect(rect) for rect in pilot.visual_rectangles(page, page.rect)
            ]
        return self._rectangles[page_index]

    def groups(self, page_index: int, clip: fitz.Rect) -> list[fitz.Rect]:
        page = self.document[page_index]
        rectangles: list[fitz.Rect] = []
        for raw in self.rectangles(page_index):
            intersection = raw & clip
            if intersection.is_empty:
                continue
            if intersection.width < 1 and intersection.height < 5:
                continue
            if intersection.height < 1 and intersection.width < 5:
                continue
            rectangles.append(intersection)
        groups = pilot.group_visual_rectangles(rectangles)
        groups = [pilot.expand_visual_with_labels(page, group, clip) for group in groups]
        return sorted(
            (
                group
                for group in groups
                if group.get_area() >= 180 and group.width >= 12 and group.height >= 12
            ),
            key=lambda item: (item.y0, item.x0),
        )


def layout_rectangles(config: dict[str, Any], page: fitz.Page, page_number: int) -> list[fitz.Rect]:
    layout = config.get("layout", {})
    top = float(layout.get("top", 60.0))
    bottom = min(float(layout.get("bottom", 735.0)), page.rect.y1)
    left = float(layout.get("left", 28.0))
    right = min(float(layout.get("right", 540.0)), page.rect.x1)
    if page_number in {int(value) for value in layout.get("fullWidthObjectivePages", [])}:
        return [fitz.Rect(left, top, right, bottom)]
    return [
        fitz.Rect(left, top, float(layout.get("leftEnd", 283.0)), bottom),
        fitz.Rect(float(layout.get("rightStart", 286.0)), top, right, bottom),
    ]


def build_zones(config: dict[str, Any], document: fitz.Document) -> list[pilot.Zone]:
    zones: list[pilot.Zone] = []
    for page_number in page_numbers_from_ranges(config["objectivePageRanges"]):
        if page_number > document.page_count:
            raise ValueError(
                f"Página objetiva {page_number} excede o PDF de {document.page_count} páginas."
            )
        page = document[page_number - 1]
        for zone_index, rect in enumerate(layout_rectangles(config, page, page_number)):
            zones.append(pilot.Zone(page_number - 1, zone_index, rect & page.rect))
    return zones


def discover_markers(document: fitz.Document, zones: Sequence[pilot.Zone]) -> list[pilot.Marker]:
    positions = {(zone.page_index, zone.zone_index): index for index, zone in enumerate(zones)}
    markers: list[pilot.Marker] = []
    seen: set[tuple[int, int, int, float, float]] = set()

    def add_marker(marker: pilot.Marker) -> None:
        key = (
            marker.number,
            marker.page_index,
            marker.zone_index,
            round(marker.bbox.x0, 2),
            round(marker.bbox.y0, 2),
        )
        if key in seen:
            return
        nearby_duplicate = any(
            existing.number == marker.number
            and existing.page_index == marker.page_index
            and existing.zone_index == marker.zone_index
            and abs(existing.bbox.y0 - marker.bbox.y0) < 3
            and abs(existing.bbox.x0 - marker.bbox.x0) < 25
            for existing in markers
        )
        if nearby_duplicate:
            return
        seen.add(key)
        markers.append(marker)

    word_markers_by_page: dict[int, list[dict[str, Any]]] = {}
    for zone in zones:
        for span in pilot.iter_text_spans(document[zone.page_index], zone.rect):
            match = pilot.QUESTION_MARKER.fullmatch(span["text"].strip())
            if not match:
                continue
            add_marker(
                pilot.Marker(
                    int(match.group(1)),
                    zone.page_index,
                    zone.zone_index,
                    fitz.Rect(span["bbox"]),
                )
            )

        # Cadernos antigos e alguns PDFs "com gabarito" separam "Questão" e o
        # número em palavras distintas. O detector por span não enxerga esses
        # casos, então complementamos pelos tokens da página filtrados pela zona.
        page_word_markers = word_markers_by_page.setdefault(
            zone.page_index,
            _question_markers_from_words(document[zone.page_index]),
        )
        for word_marker in page_word_markers:
            rect = word_marker["rect"]
            center = fitz.Point((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2)
            if not zone.rect.contains(center):
                continue
            add_marker(
                pilot.Marker(
                    int(word_marker["questionNumber"]),
                    zone.page_index,
                    zone.zone_index,
                    rect,
                )
            )
    markers.sort(
        key=lambda marker: (
            positions[(marker.page_index, marker.zone_index)],
            marker.bbox.y0,
            marker.bbox.x0,
        )
    )
    return markers


def language_for_marker(
    config: dict[str, Any],
    number: int,
    occurrence_index: int,
) -> tuple[str, str | None]:
    candidates = [
        item
        for item in config["languageSections"]
        if int(item["questionStart"]) <= number <= int(item["questionEnd"])
        and int(item["occurrenceIndex"]) == occurrence_index
    ]
    if len(candidates) > 1:
        raise ValueError(
            f"Questão {number}, ocorrência {occurrence_index}: configuração de idioma ambígua."
        )
    if candidates:
        return str(candidates[0]["language"]), f"{config['id']}-q{number:03d}"
    variant_range = any(
        int(item["questionStart"]) <= number <= int(item["questionEnd"])
        for item in config["languageSections"]
    )
    if variant_range:
        raise ValueError(
            f"Questão {number}, ocorrência {occurrence_index}: variante de idioma não configurada."
        )
    if occurrence_index != 1:
        raise ValueError(f"Questão comum {number} apareceu {occurrence_index} vezes.")
    return str(config.get("commonLanguage", "portugues")), None


def build_occurrences(
    config: dict[str, Any],
    markers: Sequence[pilot.Marker],
) -> list[PrintedOccurrence]:
    seen_numbers: Counter[int] = Counter()
    output: list[PrintedOccurrence] = []
    for printed_order, marker in enumerate(markers, start=1):
        if not config["questionStart"] <= marker.number <= config["questionEnd"]:
            raise ValueError(f"Marcador fora do caderno: questão {marker.number}.")
        seen_numbers[marker.number] += 1
        occurrence_index = seen_numbers[marker.number]
        language, variant_group = language_for_marker(
            config, marker.number, occurrence_index
        )
        occurrence_id = f"{config['id']}-q{marker.number:03d}-{language}"
        output.append(
            PrintedOccurrence(
                printed_order=printed_order,
                number=marker.number,
                language=language,
                language_occurrence=occurrence_index,
                occurrence_id=occurrence_id,
                variant_group_id=variant_group,
                marker=marker,
            )
        )
    if len(output) != config["expectedPrintedOccurrences"]:
        raise ValueError(
            f"Foram detectadas {len(output)} ocorrências impressas; "
            f"esperadas {config['expectedPrintedOccurrences']}."
        )
    logical_numbers = set(range(config["questionStart"], config["questionEnd"] + 1))
    if set(seen_numbers) != logical_numbers:
        missing = sorted(logical_numbers - set(seen_numbers))
        extra = sorted(set(seen_numbers) - logical_numbers)
        raise ValueError(f"Numeração lógica divergente. Ausentes={missing}; excedentes={extra}.")
    if len({item.occurrence_id for item in output}) != len(output):
        raise ValueError("IDs de ocorrência duplicados após separar os idiomas.")
    return output


def prefix_is_section_header(
    config: dict[str, Any],
    document: fitz.Document,
    zone: pilot.Zone,
    following: pilot.Marker,
) -> bool:
    end = following.bbox.y0 - 2.0
    if end - zone.rect.y0 < 5:
        return False
    text = document[zone.page_index].get_text(
        "text",
        clip=fitz.Rect(zone.rect.x0, zone.rect.y0, zone.rect.x1, end),
    )
    normalized = pilot.normalize_ascii(pilot.collapse_text(text))
    return any(
        re.search(pattern, normalized, re.IGNORECASE)
        for pattern in config.get("sectionHeaderPatterns", [])
    )


def occurrence_regions(
    config: dict[str, Any],
    document: fitz.Document,
    zones: Sequence[pilot.Zone],
    current: PrintedOccurrence,
    following: PrintedOccurrence | None,
) -> list[pilot.Region]:
    positions = {(zone.page_index, zone.zone_index): index for index, zone in enumerate(zones)}
    current_position = positions[(current.marker.page_index, current.marker.zone_index)]
    include_following_prefix = following is not None
    following_position: int | None = None
    if following:
        following_position = positions[
            (following.marker.page_index, following.marker.zone_index)
        ]
        if following.number <= current.number:
            include_following_prefix = False
        if following.marker.page_index - current.marker.page_index > 1:
            include_following_prefix = False
        # Na mesma zona o marcador seguinte é o próprio limite vertical; o
        # texto acima dele contém a questão atual e pode também conter o
        # cabeçalho da primeira seção. A supressão de prefixo só faz sentido
        # ao atravessar para outra coluna/página.
        if following_position > current_position:
            following_zone = zones[following_position]
            if prefix_is_section_header(
                config, document, following_zone, following.marker
            ):
                include_following_prefix = False

    if following_position is None:
        end_position = len(zones) - 1
    elif include_following_prefix:
        end_position = following_position
    else:
        end_position = following_position - 1
    if end_position < current_position:
        end_position = current_position

    output: list[pilot.Region] = []
    for position in range(current_position, end_position + 1):
        zone = zones[position]
        y0 = (
            max(zone.rect.y0, current.marker.bbox.y0 - 2.0)
            if position == current_position
            else zone.rect.y0
        )
        y1 = zone.rect.y1
        if (
            following
            and include_following_prefix
            and position == end_position
            and following_position == end_position
        ):
            y1 = min(y1, following.marker.bbox.y0 - 2.0)
        if y1 - y0 >= 10:
            output.append(
                pilot.Region(
                    zone.page_index,
                    zone.zone_index,
                    fitz.Rect(zone.rect.x0, y0, zone.rect.x1, y1),
                )
            )
    if not output:
        raise ValueError(f"{current.occurrence_id}: nenhuma região física foi delimitada.")
    return output


def shared_support_regions(
    config: dict[str, Any],
    document: fitz.Document,
    occurrence: PrintedOccurrence,
) -> list[pilot.Region]:
    output: list[pilot.Region] = []
    for item in config.get("sharedSupportRegions", []):
        if not int(item["questionStart"]) <= occurrence.number <= int(
            item["questionEnd"]
        ):
            continue
        configured_languages = {str(value) for value in item.get("languages", [])}
        if configured_languages and occurrence.language not in configured_languages:
            continue
        for payload in item.get("regions", []):
            page_index = int(payload["sourcePdfPage"]) - 1
            if not 0 <= page_index < document.page_count:
                raise ValueError(
                    f"{occurrence.occurrence_id}: página de apoio compartilhado inválida."
                )
            page = document[page_index]
            rect = fitz.Rect(
                float(payload["x"]),
                float(payload["y"]),
                float(payload["x"]) + float(payload["width"]),
                float(payload["y"]) + float(payload["height"]),
            ) & page.rect
            if rect.is_empty or rect.width < 20 or rect.height < 20:
                raise ValueError(
                    f"{occurrence.occurrence_id}: região de apoio compartilhado vazia."
                )
            output.append(pilot.Region(page_index, -1, rect))
    return output


def safe_clear_generated(directory: Path, output_directory: Path) -> None:
    """Remove somente uma subárvore gerada dentro do output configurado."""
    resolved = directory.resolve()
    output = output_directory.resolve()
    if resolved == output or output not in resolved.parents:
        raise ValueError(f"Recusa ao limpar caminho amplo ou inesperado: {resolved}")
    if resolved.exists():
        shutil.rmtree(resolved)


def occurrence_file_name(occurrence: PrintedOccurrence) -> str:
    return f"questao-{occurrence.number:03d}-{occurrence.language}.json"


def occurrence_asset_directory(output: Path, occurrence: PrintedOccurrence) -> Path:
    return output / "assets" / "questoes" / occurrence.occurrence_id


def render_page_manifest(
    config: dict[str, Any],
    document: fitz.Document,
    occurrences: Sequence[PrintedOccurrence],
    output: Path,
) -> dict[str, Any]:
    objective_pages = set(page_numbers_from_ranges(config["objectivePageRanges"]))
    essay_pages = {int(value) for value in config.get("essayPages", [])}
    draft_pages = {int(value) for value in config.get("draftPages", [])}
    occurrences_by_page: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for occurrence in occurrences:
        page_number = occurrence.marker.page_index + 1
        occurrences_by_page[page_number].append(
            {
                "occurrenceId": occurrence.occurrence_id,
                "officialNumber": occurrence.number,
                "language": occurrence.language,
                "printedOrder": occurrence.printed_order,
                "markerRegion": bbox_payload(
                    occurrence.marker.bbox,
                    document[occurrence.marker.page_index],
                ),
            }
        )

    page_assets_dir = output / "assets" / "paginas"
    page_assets_dir.mkdir(parents=True, exist_ok=True)
    pages: list[dict[str, Any]] = []
    for page_index in range(document.page_count):
        page_number = page_index + 1
        page = document[page_index]
        if page_number == 1:
            page_type = "capa_e_instrucoes"
        elif page_number in objective_pages:
            page_type = "questoes_objetivas"
        elif page_number in essay_pages:
            page_type = "proposta_redacao"
        elif page_number in draft_pages:
            page_type = "rascunho_redacao"
        else:
            page_type = "administrativa_ou_continuacao"
        destination = page_assets_dir / f"pagina-{page_number:03d}.png"
        asset = asset_payload(
            destination,
            page,
            page.rect,
            asset_type="official_page_facsimile",
            relation="admin_original_page",
            order=page_index,
            alt_text=f"Página oficial {page_number} do caderno {config['bookletNumber']} {config['bookletColor']}",
            scale=1.75,
        )
        raw_text = pilot.clean_control_characters(page.get_text("text"))
        pages.append(
            {
                "sourcePdfPage": page_number,
                "type": page_type,
                "widthPoints": round(page.rect.width, 3),
                "heightPoints": round(page.rect.height, 3),
                "embeddedText": bool(raw_text.strip()),
                "textSha256": sha256_bytes(raw_text.encode("utf-8")),
                "printedOccurrencesStartingHere": occurrences_by_page.get(page_number, []),
                "facsimile": asset,
            }
        )
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "corpusId": config["id"],
        "generatedAt": now_iso(),
        "totalPages": document.page_count,
        "pages": pages,
    }
    json_dump(output / "paginas.json", payload)
    return payload


def block_is_credit(block: dict[str, Any]) -> bool:
    if block.get("forceNonCredit"):
        return False
    text = block["text"]
    normalized = pilot.normalize_ascii(text)
    if pilot.SOURCE_RE.search(text) or float(block.get("fontMedian", 9.0)) <= 7.4:
        return True
    if re.search(r"\b(?:disponivel|acesso|adaptad[oa]|et al)\b", normalized):
        return True
    if re.match(
        r"^(?:[a-z][a-z-]+(?:\s+(?:jr|filho|neto|sobrinho)\.)?,\s*"
        r"(?:[a-z]\.\s*)+|[a-z]{3,}\.\s)",
        normalized,
    ):
        return True
    return False


def text_has_credit_signature(value: str) -> bool:
    normalized = pilot.normalize_ascii(value)
    return bool(
        pilot.SOURCE_RE.search(value)
        or re.search(r"\b(?:disponivel|acesso|adaptad[oa]|et al)\b", normalized)
        or re.match(
            r"^(?:[a-z][a-z-]+(?:\s+(?:jr|filho|neto|sobrinho)\.)?,\s*"
            r"(?:[a-z]\.\s*)+|[a-z]{3,}\.\s)",
            normalized,
        )
    )


def split_credit_boundaries(block: dict[str, Any]) -> list[dict[str, Any]]:
    """Separa crédito/fonte de texto ou comando colado no mesmo bloco PDF."""
    lines = block["text"].splitlines()
    if len(lines) < 2:
        return [block]
    pieces: list[dict[str, Any]] = []
    start = 0
    for index, line in enumerate(lines[:-1]):
        prefix = pilot.collapse_text("\n".join(lines[start : index + 1]))
        if not prefix or not text_has_credit_signature(prefix):
            continue
        is_complete_credit = bool(CREDIT_BOUNDARY.search(line.strip())) or (
            "disponivel em:" in pilot.normalize_ascii(line)
            and "acesso em:" not in pilot.normalize_ascii("\n".join(lines[index + 1 :]))
        )
        if not is_complete_credit:
            continue
        pieces.append({**block, "text": prefix, "semanticSplit": "credit_boundary"})
        start = index + 1
    suffix = pilot.collapse_text("\n".join(lines[start:]))
    if suffix:
        pieces.append(
            {
                **block,
                "text": suffix,
                "semanticSplit": "credit_boundary" if start else None,
                "forceNonCredit": bool(start) and not text_has_credit_signature(suffix),
            }
        )
    return pieces or [block]


def clean_pdf_text_artifacts(value: str) -> tuple[str, list[dict[str, str]]]:
    """Remove somente resíduos invisíveis comprovados no fac-símile oficial."""
    cleaned = pilot.collapse_text(value)
    corrections: list[dict[str, str]] = []
    without_suffix = MALFORMED_PDF_SUFFIX.sub("", cleaned)
    if without_suffix != cleaned:
        corrections.append(
            {
                "from": cleaned[-4:],
                "to": without_suffix[-4:],
                "reason": "invisible_pdf_text_layer_suffix",
            }
        )
        cleaned = without_suffix
    for pattern, replacement in MALFORMED_COMMAND_SUFFIXES:
        replaced = pattern.sub(replacement, cleaned)
        if replaced != cleaned:
            corrections.append(
                {
                    "from": cleaned[-12:],
                    "to": replaced[-12:],
                    "reason": "invisible_pdf_text_layer_suffix",
                }
            )
            cleaned = replaced
    spaced = MISSING_SPACE_AFTER_CLOSING_QUOTE.sub(" ", cleaned)
    if spaced != cleaned:
        corrections.append(
            {
                "from": cleaned,
                "to": spaced,
                "reason": "missing_space_after_closing_quote_in_pdf_text_layer",
            }
        )
        cleaned = spaced
    return cleaned, corrections


def has_malformed_pdf_suffix(value: str) -> bool:
    stripped = value.strip()
    return bool(
        MALFORMED_PDF_SUFFIX.search(stripped)
        or any(pattern.search(stripped) for pattern, _replacement in MALFORMED_COMMAND_SUFFIXES)
    )


def build_text_blocks(
    document: fitz.Document,
    regions: Sequence[pilot.Region],
) -> tuple[
    list[dict[str, Any]],
    str | None,
    str | None,
    list[str],
    list[dict[str, Any]],
]:
    raw_extracted = pilot.extract_text_blocks(document, regions)
    extracted: list[dict[str, Any]] = []
    corrections: list[dict[str, Any]] = []
    for raw_block in raw_extracted:
        for semantic_block in split_credit_boundaries(raw_block):
            cleaned, own_corrections = clean_pdf_text_artifacts(semantic_block["text"])
            extracted.append({**semantic_block, "text": cleaned})
            corrections.extend(
                {
                    **item,
                    "target": "prompt_block",
                    "sourcePdfPage": int(semantic_block["page"]),
                }
                for item in own_corrections
            )
    if not extracted:
        return [], None, None, [], corrections
    command_candidates = [
        index
        for index, block in enumerate(extracted)
        if not block_is_credit(block)
        and sum(character.isalpha() for character in block["text"]) >= 8
    ]
    command_index = command_candidates[-1] if command_candidates else len(extracted) - 1
    blocks: list[dict[str, Any]] = []
    credits: list[str] = []
    for index, block in enumerate(extracted):
        is_credit = block_is_credit(block)
        block_type = "command" if index == command_index else "credit" if is_credit else "support_text"
        if is_credit:
            credits.append(block["text"])
        page = document[block["pageIndex"]]
        blocks.append(
            {
                "type": block_type,
                "content": block["text"],
                "pdfOrder": index,
                "sourcePdfPage": block["page"],
                "zoneOrder": block["regionOrder"],
                "sourceRegion": bbox_payload(block["bbox"], page),
                "fontMedian": round(float(block.get("fontMedian", 9.0)), 3),
                "textSha256": sha256_bytes(block["text"].encode("utf-8")),
                "confidence": 0.97 if block_type == "command" else 0.985,
                "classificationMethod": "deterministic_pdf_heuristic",
                "semanticSplit": block.get("semanticSplit"),
                "_sortKey": (
                    int(block["regionOrder"]),
                    round(block["bbox"].y0, 3),
                    round(block["bbox"].x0, 3),
                    0,
                ),
            }
        )
    command = extracted[command_index]["text"] if extracted else None
    support = pilot.collapse_text(
        "\n\n".join(
            block["text"] for index, block in enumerate(extracted) if index != command_index
        )
    ) or None
    return blocks, support, command, credits, corrections


def render_region_assets(
    document: fitz.Document,
    regions: Sequence[pilot.Region],
    directory: Path,
    *,
    name_prefix: str,
    asset_type: str,
    relation: str,
    alt_text_prefix: str,
    scale: float,
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for index, region in enumerate(regions, start=1):
        destination = directory / f"{name_prefix}-{index:02d}.png"
        output.append(
            asset_payload(
                destination,
                document[region.page_index],
                region.rect,
                asset_type=asset_type,
                relation=relation,
                order=index - 1,
                alt_text=f"{alt_text_prefix}, parte {index}",
                scale=scale,
            )
        )
    return output


def render_prompt_visuals(
    document: fitz.Document,
    visual_index: VisualIndex,
    regions: Sequence[pilot.Region],
    directory: Path,
    occurrence: PrintedOccurrence,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    assets: list[dict[str, Any]] = []
    blocks: list[dict[str, Any]] = []
    order = 0
    for region_order, region in enumerate(regions):
        page = document[region.page_index]
        for group in visual_index.groups(region.page_index, region.rect):
            destination = directory / f"visual-{order + 1:02d}.png"
            asset = asset_payload(
                destination,
                page,
                group,
                asset_type="official_prompt_visual",
                relation="statement",
                order=order,
                alt_text=f"Elemento visual oficial da questão {occurrence.number} ({occurrence.language})",
                scale=3.0,
            )
            assets.append(asset)
            alt_text = str(asset["altText"])
            blocks.append(
                {
                    "type": "image",
                    "content": alt_text,
                    "altText": alt_text,
                    "artifactPath": asset["artifactPath"],
                    "assetSha256": asset["sha256"],
                    # Mantido por compatibilidade com consumidores antigos;
                    # artifactPath é o vínculo canônico do bloco ao asset.
                    "assetPath": asset["artifactPath"],
                    "sourcePdfPage": region.page_index + 1,
                    "zoneOrder": region_order,
                    "sourceRegion": bbox_payload(group, page),
                    "confidence": 0.9,
                    "classificationMethod": "deterministic_pdf_geometry",
                    "_sortKey": (
                        region_order,
                        round(group.y0, 3),
                        round(group.x0, 3),
                        1,
                    ),
                }
            )
            order += 1
    return assets, blocks


def alternatives_for_occurrence(
    config: dict[str, Any],
    document: fitz.Document,
    visual_index: VisualIndex,
    regions: Sequence[pilot.Region],
    markers: Sequence[dict[str, Any]],
    asset_directory: Path,
    occurrence: PrintedOccurrence,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    bool,
    list[dict[str, Any]],
]:
    marker_keys = [item["key"] for item in markers]
    if sorted(marker_keys) != list("ABCDE") or len(marker_keys) != 5:
        raise ValueError(
            f"{occurrence.occurrence_id}: marcadores A–E inválidos: {marker_keys}."
        )
    is_grid = marker_keys != list("ABCDE") or any(
        abs(first["bbox"].y0 - second["bbox"].y0) < 6
        and first["regionOrder"] == second["regionOrder"]
        for first, second in zip(markers, markers[1:])
    ) or any(
        # Em alternativas diagramadas em duas colunas dentro de uma zona de
        # largura total, a camada textual pode enumerar A-B-C e depois D-E.
        # O retorno vertical de C para D comprova a grade mesmo quando nenhum
        # par consecutivo compartilha exatamente a mesma coordenada y.
        second["bbox"].y0 < first["bbox"].y0 - 6
        and first["regionOrder"] == second["regionOrder"]
        for first, second in zip(markers, markers[1:])
    )
    alternative_regions = (
        pilot.grid_alternative_regions(regions, markers)
        if is_grid
        else pilot.sequential_alternative_regions(regions, markers)
    )
    alternatives: list[dict[str, Any]] = []
    assets: list[dict[str, Any]] = []
    corrections: list[dict[str, Any]] = []
    marker_by_key = {item["key"]: item for item in markers}
    for order, key in enumerate("ABCDE"):
        own_regions = alternative_regions.get(key, [])
        if not own_regions:
            raise ValueError(f"{occurrence.occurrence_id}: alternativa {key} sem região.")
        raw_text = pilot.collapse_text(pilot.alternative_text(document, own_regions, key))
        text, own_corrections = clean_pdf_text_artifacts(raw_text)
        corrections.extend(
            {
                **item,
                "target": f"alternative_{key}",
                "sourcePdfPage": own_regions[0].page_index + 1,
            }
            for item in own_corrections
        )
        visual_regions: list[tuple[pilot.Region, list[fitz.Rect]]] = []
        for region in own_regions:
            groups = visual_index.groups(region.page_index, region.rect)
            if groups:
                visual_regions.append((region, groups))
        image_assets: list[dict[str, Any]] = []
        for part, (region, groups) in enumerate(visual_regions, start=1):
            page = document[region.page_index]
            union = fitz.Rect(groups[0])
            for group in groups[1:]:
                union |= group
            # Preserva também texto/fórmula imediatamente associado à célula.
            clip = fitz.Rect(
                max(region.rect.x0 + 12.0, union.x0 - 6.0),
                max(region.rect.y0, union.y0 - 6.0),
                min(region.rect.x1, union.x1 + 6.0),
                min(region.rect.y1, union.y1 + 6.0),
            )
            destination = asset_directory / f"alternativa-{key.lower()}-{part:02d}.png"
            asset = asset_payload(
                destination,
                page,
                clip,
                asset_type="official_alternative_visual",
                relation="alternative",
                order=order,
                alt_text=f"Elemento visual da alternativa {key} da questão {occurrence.number} ({occurrence.language})",
                scale=3.0,
            )
            asset["alternativeKey"] = key
            image_assets.append(asset)
            assets.append(asset)
        marker = marker_by_key[key]
        alternatives.append(
            {
                "key": key,
                "order": order,
                "text": text,
                "textSha256": sha256_bytes(text.encode("utf-8")) if text else None,
                "imageArtifacts": [item["artifactPath"] for item in image_assets],
                "marker": {
                    "sourcePdfPage": int(marker["pageIndex"]) + 1,
                    "sourceRegion": bbox_payload(
                        marker["bbox"], document[int(marker["pageIndex"])]
                    ),
                },
                "sourceRegions": [
                    region_payload(region, document[region.page_index])
                    for region in own_regions
                ],
                "confidence": 0.96 if image_assets else 0.985,
                "reviewStatus": "pending_human_review",
            }
        )
    return alternatives, assets, is_grid, corrections


def structured_question(
    config: dict[str, Any],
    config_hash: str,
    exam_hash: str,
    pipeline_digests: dict[str, str],
    document: fitz.Document,
    visual_index: VisualIndex,
    zones: Sequence[pilot.Zone],
    occurrence: PrintedOccurrence,
    following: PrintedOccurrence | None,
    output: Path,
) -> dict[str, Any]:
    regions = occurrence_regions(config, document, zones, occurrence, following)
    shared_regions = shared_support_regions(config, document, occurrence)
    alternative_markers = pilot.alternative_markers(document, regions)
    if sorted(item["key"] for item in alternative_markers) != list("ABCDE"):
        raise ValueError(
            f"{occurrence.occurrence_id}: não foi possível delimitar cinco alternativas."
        )
    own_prompt_regions = pilot.trim_regions_before_alternatives(
        regions, alternative_markers
    )
    pre_alternative_regions = [*shared_regions, *own_prompt_regions]
    if not pre_alternative_regions:
        raise ValueError(f"{occurrence.occurrence_id}: enunciado sem região antes de A–E.")

    asset_directory = occurrence_asset_directory(output, occurrence)
    asset_directory.mkdir(parents=True, exist_ok=True)
    original_crops = render_region_assets(
        document,
        [*shared_regions, *regions],
        asset_directory,
        name_prefix="recorte-original",
        asset_type="official_question_original",
        relation="admin_reference",
        alt_text_prefix=f"Recorte oficial completo da questão {occurrence.number} ({occurrence.language})",
        scale=3.0,
    )
    prompt_facsimiles = render_region_assets(
        document,
        pre_alternative_regions,
        asset_directory,
        name_prefix="enunciado-facsimile",
        asset_type="official_prompt_facsimile",
        relation="statement",
        alt_text_prefix=f"Enunciado diagramado da questão {occurrence.number} ({occurrence.language})",
        scale=3.0,
    )
    text_blocks, support_text, command, credits, prompt_corrections = build_text_blocks(
        document, pre_alternative_regions
    )
    prompt_visual_assets, visual_blocks = render_prompt_visuals(
        document,
        visual_index,
        pre_alternative_regions,
        asset_directory,
        occurrence,
    )
    blocks = text_blocks + visual_blocks
    blocks.sort(key=lambda item: item["_sortKey"])
    for order, block in enumerate(blocks):
        block["order"] = order
        block.pop("_sortKey", None)
    statement = pilot.collapse_text(
        "\n\n".join(
            block["content"]
            for block in blocks
            if block["type"] in {"support_text", "credit", "command"}
            and block.get("content")
        )
    )
    (
        alternatives,
        alternative_assets,
        alternative_grid,
        alternative_corrections,
    ) = alternatives_for_occurrence(
        config,
        document,
        visual_index,
        regions,
        alternative_markers,
        asset_directory,
        occurrence,
    )
    source_regions = [*shared_regions, *regions]
    first_page = min(region.page_index for region in source_regions) + 1
    last_page = max(region.page_index for region in source_regions) + 1
    source_pages = sorted({region.page_index + 1 for region in source_regions})
    content_hash = canonical_hash(
        {
            "corpusId": config["id"],
            "officialNumber": occurrence.number,
            "language": occurrence.language,
            "statement": statement,
            "blocks": [
                {"type": block["type"], "content": block.get("content")}
                for block in blocks
            ],
            "alternatives": [
                {"key": item["key"], "text": item["text"]}
                for item in alternatives
            ],
        }
    )
    source_region_hash = canonical_hash(
        {
            "examSha256": exam_hash,
            "regions": [
                region_payload(region, document[region.page_index])
                for region in source_regions
            ],
        }
    )
    all_assets = prompt_facsimiles + prompt_visual_assets + alternative_assets
    return {
        "schemaVersion": SCHEMA_VERSION,
        "extractorId": EXTRACTOR_ID,
        "id": occurrence.occurrence_id,
        "corpusId": config["id"],
        "oldExamId": config.get("oldExamId"),
        "vestibular": config.get("vestibular", "ENEM"),
        "year": config["year"],
        "day": config["day"],
        "application": config.get("application"),
        "applicationLabel": config.get("applicationLabel"),
        "modality": config.get("modality"),
        "bookletNumber": config["bookletNumber"],
        "bookletColor": config["bookletColor"],
        "officialNumber": occurrence.number,
        "officialOrder": occurrence.number,
        "printedOccurrenceOrder": occurrence.printed_order,
        "language": occurrence.language,
        "languageOccurrence": occurrence.language_occurrence,
        "variantGroupId": occurrence.variant_group_id,
        "area": area_for_question(config, occurrence.number),
        "subject": None,
        "content": None,
        "subcontent": None,
        "competency": None,
        "ability": None,
        "difficulty": None,
        "estimatedTimeSeconds": None,
        "supportText": support_text,
        "command": command,
        "statement": statement,
        "credits": credits,
        "blocks": blocks,
        "alternatives": alternatives,
        "answer": None,
        "answerSituation": "pending_official_key",
        "officialAnswerKey": None,
        "source": {
            "institution": config.get("institution"),
            "sourcePageUrl": config.get("officialSourcePage"),
            "officialExamUrl": config.get("officialExamUrl"),
            "officialExamPath": config["officialExamPdf"],
            "officialExamSha256": exam_hash,
            "officialPdfPageStart": first_page,
            "officialPdfPageEnd": last_page,
            "officialPdfPages": source_pages,
            "originalPageUrl": f"{config.get('officialExamUrl')}#page={first_page}",
            "marker": {
                "sourcePdfPage": occurrence.marker.page_index + 1,
                "zoneIndex": occurrence.marker.zone_index,
                "sourceRegion": bbox_payload(
                    occurrence.marker.bbox,
                    document[occurrence.marker.page_index],
                ),
            },
            "sourceRegions": [
                region_payload(region, document[region.page_index])
                for region in source_regions
            ],
            "sourceRegionHash": source_region_hash,
            "accessedAt": now_iso(),
        },
        "assets": all_assets,
        "originalCrops": original_crops,
        "flags": {
            "hasPromptVisual": bool(prompt_visual_assets),
            "hasAlternativeVisual": bool(alternative_assets),
            "hasImage": bool(all_assets),
            "hasTable": "tabela" in pilot.normalize_ascii(statement)
            or "quadro" in pilot.normalize_ascii(statement),
            "hasGraph": "grafico" in pilot.normalize_ascii(statement),
            "hasFormula": bool(
                re.search(
                    r"[=±×÷√∑∫]|\b(?:sen|cos|log|pH|mol|m/s|km|cm|mm)\b",
                    statement,
                    re.IGNORECASE,
                )
            ),
            "spansMultiplePages": first_page != last_page,
            "alternativeGrid": alternative_grid,
            "usesPromptFacsimile": True,
            "usesSharedSupport": bool(shared_regions),
        },
        "confidence": {
            "text": 0.97 if statement and command else 0.0,
            "alternatives": 0.96
            if all(item["text"] or item["imageArtifacts"] for item in alternatives)
            else 0.0,
            "images": 0.9,
            "answer": 0.0,
            "classification": 0.0,
            "overall": 0.0,
        },
        "extractionStatus": "structured_pending_review",
        "reviewStatus": "pending_human_review",
        "publicationStatus": "blocked",
        "publicationBlockers": [
            "pedagogical_classification_missing",
            "human_visual_review_pending",
            "student_answer_flow_not_tested",
            "mobile_render_not_tested",
            "not_imported",
        ],
        "contentHash": content_hash,
        "deduplicationHash": canonical_hash(
            {
                "year": config["year"],
                "day": config["day"],
                "booklet": config["bookletNumber"],
                "number": occurrence.number,
                "language": occurrence.language,
                "contentHash": content_hash,
            }
        ),
        "extraction": {
            "generatedAt": now_iso(),
            "configSha256": config_hash,
            **pipeline_digests,
            "ocrUsed": False,
            "embeddedTextUsed": True,
            "commandSeparation": "deterministic_heuristic_pending_editorial_review",
            "textArtifactCorrections": prompt_corrections + alternative_corrections,
        },
    }


def error_question(
    config: dict[str, Any],
    exam_hash: str,
    document: fitz.Document,
    occurrence: PrintedOccurrence,
    error: Exception,
) -> dict[str, Any]:
    page = document[occurrence.marker.page_index]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "extractorId": EXTRACTOR_ID,
        "id": occurrence.occurrence_id,
        "corpusId": config["id"],
        "year": config["year"],
        "day": config["day"],
        "bookletNumber": config["bookletNumber"],
        "bookletColor": config["bookletColor"],
        "officialNumber": occurrence.number,
        "officialOrder": occurrence.number,
        "printedOccurrenceOrder": occurrence.printed_order,
        "language": occurrence.language,
        "languageOccurrence": occurrence.language_occurrence,
        "variantGroupId": occurrence.variant_group_id,
        "area": area_for_question(config, occurrence.number),
        "statement": None,
        "blocks": [],
        "alternatives": [],
        "answer": None,
        "answerSituation": "pending_official_key",
        "source": {
            "officialExamPath": config["officialExamPdf"],
            "officialExamUrl": config.get("officialExamUrl"),
            "officialExamSha256": exam_hash,
            "marker": {
                "sourcePdfPage": occurrence.marker.page_index + 1,
                "zoneIndex": occurrence.marker.zone_index,
                "sourceRegion": bbox_payload(occurrence.marker.bbox, page),
            },
        },
        "assets": [],
        "originalCrops": [],
        "confidence": {
            "text": 0.0,
            "alternatives": 0.0,
            "images": 0.0,
            "answer": 0.0,
            "classification": 0.0,
            "overall": 0.0,
        },
        "extractionStatus": "error",
        "reviewStatus": "blocked_by_extraction_error",
        "publicationStatus": "blocked",
        "publicationBlockers": ["extraction_error"],
        "extractionIssues": [str(error)],
        "contentHash": None,
    }


def clean_essay_instructions(raw_text: str) -> str | None:
    instruction_prefix = raw_text.split("TEXTO I", 1)[0]
    instruction_heading = ESSAY_INSTRUCTIONS_HEADING.search(instruction_prefix)
    return pilot.collapse_text(
        instruction_prefix[instruction_heading.start() :]
        if instruction_heading
        else instruction_prefix
    ) or None


def structure_essay_motivating_texts(
    raw_text: str,
    essay_pages: Sequence[int],
) -> list[dict[str, Any]]:
    section_boundaries = list(ESSAY_SECTION_BOUNDARY.finditer(raw_text))
    motivating_texts: list[dict[str, Any]] = []
    for index, boundary in enumerate(section_boundaries):
        roman = boundary.group(2)
        if not roman:
            continue
        following_start = (
            section_boundaries[index + 1].start()
            if index + 1 < len(section_boundaries)
            else len(raw_text)
        )
        content = pilot.collapse_text(raw_text[boundary.end() : following_start])
        if not content:
            continue
        lines = content.splitlines()
        credit_start = next(
            (
                line_index
                for line_index, line in enumerate(lines)
                if "disponivel em:" in pilot.normalize_ascii(line)
                or pilot.normalize_ascii(line).startswith("fonte:")
            ),
            None,
        )
        credit_text = (
            pilot.collapse_text("\n".join(lines[credit_start:]))
            if credit_start is not None
            else None
        )
        motivating_texts.append(
            {
                "label": f"TEXTO {roman.upper()}",
                "order": len(motivating_texts),
                "content": content,
                "creditText": credit_text,
                "textSha256": sha256_bytes(content.encode("utf-8")),
                "sourcePdfPages": [int(value) for value in essay_pages],
            }
        )
    return motivating_texts


def extract_essay(
    config: dict[str, Any],
    document: fitz.Document,
    visual_index: VisualIndex,
    page_manifest: dict[str, Any],
    output: Path,
    exam_hash: str,
) -> dict[str, Any] | None:
    essay_pages = [int(value) for value in config.get("essayPages", [])]
    if not essay_pages:
        return None
    asset_directory = output / "assets" / "redacao"
    asset_directory.mkdir(parents=True, exist_ok=True)
    page_records: list[dict[str, Any]] = []
    complete_text: list[str] = []
    all_visual_assets: list[dict[str, Any]] = []
    for page_number in essay_pages:
        if not 1 <= page_number <= document.page_count:
            raise ValueError(f"Página de redação inválida: {page_number}.")
        page = document[page_number - 1]
        raw_text = pilot.collapse_text(page.get_text("text"))
        complete_text.append(raw_text)
        raw_blocks: list[dict[str, Any]] = []
        for pdf_order, block in enumerate(page.get_text("blocks")):
            x0, y0, x1, y1, text = block[:5]
            content = pilot.collapse_text(str(text))
            if not content:
                continue
            rect = fitz.Rect(float(x0), float(y0), float(x1), float(y1)) & page.rect
            if rect.is_empty:
                continue
            label_match = SECTION_LABEL.match(content)
            raw_blocks.append(
                {
                    "type": "section_label_and_text" if label_match else "text",
                    "sectionLabel": label_match.group(1).upper() if label_match else None,
                    "content": content,
                    "pdfOrder": pdf_order,
                    "visualOrder": 0,
                    "sourcePdfPage": page_number,
                    "sourceRegion": bbox_payload(rect, page),
                    "textSha256": sha256_bytes(content.encode("utf-8")),
                    "_sortKey": (round(rect.y0, 3), round(rect.x0, 3)),
                }
            )
        for visual_order, block in enumerate(
            sorted(raw_blocks, key=lambda item: item["_sortKey"])
        ):
            block["visualOrder"] = visual_order
            block.pop("_sortKey", None)

        layout = config.get("layout", {})
        visual_clip = fitz.Rect(
            float(layout.get("left", 28.0)),
            float(layout.get("top", 60.0)),
            min(float(layout.get("right", 540.0)), page.rect.x1),
            min(float(layout.get("bottom", 735.0)), page.rect.y1),
        )
        page_visuals: list[dict[str, Any]] = []
        for index, group in enumerate(
            visual_index.groups(page_number - 1, visual_clip), start=1
        ):
            destination = asset_directory / f"pagina-{page_number:03d}-visual-{index:02d}.png"
            asset = asset_payload(
                destination,
                page,
                group,
                asset_type="essay_motivating_visual",
                relation="essay_support",
                order=len(all_visual_assets),
                alt_text=f"Elemento visual oficial da proposta de redação, página {page_number}",
                scale=3.0,
            )
            page_visuals.append(asset)
            all_visual_assets.append(asset)
        page_facsimile = next(
            item["facsimile"]
            for item in page_manifest["pages"]
            if item["sourcePdfPage"] == page_number
        )
        page_records.append(
            {
                "sourcePdfPage": page_number,
                "text": raw_text,
                "textSha256": sha256_bytes(raw_text.encode("utf-8")),
                "blocks": raw_blocks,
                "facsimile": page_facsimile,
                "visualAssets": page_visuals,
            }
        )
    raw_text = pilot.collapse_text("\n\n".join(complete_text))
    theme_match = re.search(
        r"sobre\s+o\s+tema\s+[\"“«](.*?)[\"”»]",
        raw_text,
        re.IGNORECASE | re.DOTALL,
    )
    theme = pilot.collapse_text(theme_match.group(1)) if theme_match else None
    proposal_match = re.search(
        r"^PROPOSTA\s+DE\s+REDAÇÃO\s*$\s*"
        r"(A\s+partir\s+da\s+leitura.*?ponto\s+de\s+vista\.)",
        raw_text,
        re.IGNORECASE | re.DOTALL | re.MULTILINE,
    )
    proposal_text = (
        pilot.collapse_text(proposal_match.group(1)) if proposal_match else None
    )
    instructions = clean_essay_instructions(raw_text)
    motivating_texts = structure_essay_motivating_texts(raw_text, essay_pages)
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "id": f"{config['id']}-redacao",
        "corpusId": config["id"],
        "year": config["year"],
        "day": config["day"],
        "bookletNumber": config["bookletNumber"],
        "bookletColor": config["bookletColor"],
        "theme": theme,
        "themeExtractionMethod": "quoted_theme_in_official_proposal",
        "themeConfidence": 0.995 if theme else 0.0,
        "proposalText": proposal_text,
        "instructions": instructions,
        "motivatingTexts": motivating_texts,
        "rawText": raw_text,
        "pages": page_records,
        "visualAssets": all_visual_assets,
        "source": {
            "institution": config.get("institution"),
            "sourcePageUrl": config.get("officialSourcePage"),
            "officialExamUrl": config.get("officialExamUrl"),
            "officialExamPath": config["officialExamPdf"],
            "officialExamSha256": exam_hash,
            "sourcePdfPages": essay_pages,
        },
        "reviewStatus": "pending_human_review",
        "publicationStatus": "blocked",
        "publicationBlockers": [
            "essay_visual_review_pending",
            "essay_module_integration_not_performed",
            "not_imported",
        ],
        "contentHash": canonical_hash(
            {
                "theme": theme,
                "proposalText": proposal_text,
                "instructions": instructions,
                "motivatingTexts": motivating_texts,
                "rawText": raw_text,
                "examSha256": exam_hash,
            }
        ),
    }
    json_dump(output / "redacao.json", payload)
    return payload


def validate_exam_identity(
    config: dict[str, Any],
    document: fitz.Document,
) -> dict[str, Any]:
    if config.get("skipIdentityChecks"):
        return {
            "skipped": True,
            "reason": "skipIdentityChecks configurado para caderno oficial validado por caminho/hash.",
        }
    objective_pages = page_numbers_from_ranges(config["objectivePageRanges"])
    sample_pages = sorted({1, *objective_pages[:2]})
    sample_text = "\n".join(document[number - 1].get_text("text") for number in sample_pages)
    normalized = pilot.normalize_ascii(sample_text)
    metadata_dates = " ".join(
        str(document.metadata.get(field) or "")
        for field in ("creationDate", "modDate")
    )
    year = str(config["year"])
    checks = {
        "exam": "exame nacional do ensino medio" in normalized or "enem" in normalized,
        # Alguns cadernos (por exemplo, o 2º dia de 2023) não imprimem o ano
        # em nenhuma camada textual. Nesse caso, o ano das datas internas do
        # próprio PDF oficial é uma segunda evidência, registrada no hash da
        # proveniência e conferida junto dos demais identificadores do caderno.
        "year": year in normalized or f"D:{year}" in metadata_dates,
        "day": text_identifies_day(sample_text, config["day"]),
        "bookletNumber": bool(
            re.search(rf"caderno\s+0?{config['bookletNumber']}\b", normalized)
        ),
        "bookletColor": pilot.normalize_ascii(config["bookletColor"]) in normalized,
        "questionRangeOnCover": str(config["expectedLogicalQuestions"]) in sample_text,
    }
    if not all(checks.values()):
        failed = [name for name, passed in checks.items() if not passed]
        raise ValueError(f"Identidade do caderno não confirmada no PDF: {failed}.")
    return checks


def checkpoint_payload(
    config: dict[str, Any],
    *,
    stage: str,
    source_hashes: dict[str, str],
    config_hash: str,
    pipeline_digests: dict[str, str],
    completed: Sequence[str] = (),
    failed: Sequence[dict[str, Any]] = (),
    **extra: Any,
) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "extractorId": EXTRACTOR_ID,
        "corpusId": config["id"],
        "stage": stage,
        "sourceHashes": source_hashes,
        "configSha256": config_hash,
        **pipeline_digests,
        "expectedLogicalQuestions": config["expectedLogicalQuestions"],
        "expectedPrintedOccurrences": config["expectedPrintedOccurrences"],
        "completedOccurrences": list(completed),
        "failedOccurrences": list(failed),
        "publicationAuthorized": False,
        "updatedAt": now_iso(),
        **extra,
    }


def resume_is_compatible(
    checkpoint: dict[str, Any],
    source_hashes: dict[str, str],
    config_hash: str,
    pipeline_digests: dict[str, str],
) -> bool:
    return (
        checkpoint.get("sourceHashes") == source_hashes
        and checkpoint.get("configSha256") == config_hash
        and all(checkpoint.get(key) == value for key, value in pipeline_digests.items())
    )


def extract_corpus(
    config: dict[str, Any],
    config_file: Path,
    *,
    resume: bool,
) -> dict[str, Any]:
    exam_path = repo_path(config["officialExamPdf"])
    key_path = repo_path(config["officialAnswerKeyPdf"])
    validate_pdf(exam_path)
    validate_pdf(key_path)
    output = repo_path(config["outputDirectory"])
    output.mkdir(parents=True, exist_ok=True)
    question_directory = output / "questoes"
    if not resume:
        safe_clear_generated(question_directory, output)
        safe_clear_generated(output / "assets" / "questoes", output)
        safe_clear_generated(output / "assets" / "paginas", output)
        safe_clear_generated(output / "assets" / "redacao", output)
    question_directory.mkdir(parents=True, exist_ok=True)

    exam_hash = sha256_file(exam_path)
    key_hash = sha256_file(key_path)
    source_hashes = {
        "officialExamSha256": exam_hash,
        "officialAnswerKeySha256": key_hash,
    }
    config_hash = sha256_file(config_file)
    digests = pipeline_hashes()
    checkpoint_path = output / "checkpoint.json"
    checkpoint = json_load(checkpoint_path) if checkpoint_path.exists() else None
    if resume and checkpoint and not resume_is_compatible(
        checkpoint, source_hashes, config_hash, digests
    ):
        raise RuntimeError(
            "O checkpoint foi criado com PDF, configuração ou extrator diferente; "
            "execute sem --resume para refazer os artefatos."
        )
    json_dump(
        checkpoint_path,
        checkpoint_payload(
            config,
            stage="validating_sources",
            source_hashes=source_hashes,
            config_hash=config_hash,
            pipeline_digests=digests,
        ),
    )

    document = fitz.open(exam_path)
    try:
        identity_checks = validate_exam_identity(config, document)
        zones = build_zones(config, document)
        markers = discover_markers(document, zones)
        occurrences = build_occurrences(config, markers)
        visual_index = VisualIndex(document)
        if resume and (output / "paginas.json").exists():
            page_manifest = json_load(output / "paginas.json")
        else:
            page_manifest = render_page_manifest(
                config, document, occurrences, output
            )
        if resume and (output / "redacao.json").exists():
            essay = json_load(output / "redacao.json")
        else:
            essay = extract_essay(
                config,
                document,
                visual_index,
                page_manifest,
                output,
                exam_hash,
            )

        completed: list[str] = []
        failures: list[dict[str, Any]] = []
        questions: list[dict[str, Any]] = []
        previous_completed = set(
            checkpoint.get("completedOccurrences", []) if checkpoint else []
        )
        for index, occurrence in enumerate(occurrences):
            question_path = question_directory / occurrence_file_name(occurrence)
            question: dict[str, Any]
            can_resume_question = (
                resume
                and occurrence.occurrence_id in previous_completed
                and question_path.exists()
            )
            if can_resume_question:
                candidate = json_load(question_path)
                source = candidate.get("source", {})
                extraction = candidate.get("extraction", {})
                can_resume_question = (
                    source.get("officialExamSha256") == exam_hash
                    and extraction.get("configSha256") == config_hash
                    and all(extraction.get(key) == value for key, value in digests.items())
                )
                if can_resume_question:
                    question = candidate
            if not can_resume_question:
                asset_directory = occurrence_asset_directory(output, occurrence)
                if asset_directory.exists():
                    safe_clear_generated(asset_directory, output)
                try:
                    question = structured_question(
                        config,
                        config_hash,
                        exam_hash,
                        digests,
                        document,
                        visual_index,
                        zones,
                        occurrence,
                        occurrences[index + 1] if index + 1 < len(occurrences) else None,
                        output,
                    )
                except Exception as error:  # registra a lacuna sem fabricar conteúdo
                    question = error_question(
                        config, exam_hash, document, occurrence, error
                    )
                    failures.append(
                        {
                            "occurrenceId": occurrence.occurrence_id,
                            "officialNumber": occurrence.number,
                            "language": occurrence.language,
                            "error": str(error),
                        }
                    )
                json_dump(question_path, question)
            if question.get("extractionStatus") == "error" and not any(
                item["occurrenceId"] == occurrence.occurrence_id for item in failures
            ):
                failures.append(
                    {
                        "occurrenceId": occurrence.occurrence_id,
                        "officialNumber": occurrence.number,
                        "language": occurrence.language,
                        "error": "; ".join(question.get("extractionIssues", ["erro não descrito"])),
                    }
                )
            questions.append(question)
            completed.append(occurrence.occurrence_id)
            json_dump(
                checkpoint_path,
                checkpoint_payload(
                    config,
                    stage="extracting_questions",
                    source_hashes=source_hashes,
                    config_hash=config_hash,
                    pipeline_digests=digests,
                    completed=completed,
                    failed=failures,
                    lastOccurrence=occurrence.occurrence_id,
                ),
            )

        json_dump(output / "questoes-estruturadas.json", questions)
        provenance = {
            "schemaVersion": SCHEMA_VERSION,
            "extractorId": EXTRACTOR_ID,
            "corpusId": config["id"],
            "generatedAt": now_iso(),
            "officialExam": {
                "path": relative(exam_path),
                "url": config.get("officialExamUrl"),
                "sourcePageUrl": config.get("officialSourcePage"),
                "sha256": exam_hash,
                "sizeBytes": exam_path.stat().st_size,
                "pageCount": document.page_count,
                "identityChecks": identity_checks,
            },
            "officialAnswerKey": {
                "path": relative(key_path),
                "url": config.get("officialAnswerKeyUrl"),
                "sha256": key_hash,
                "sizeBytes": key_path.stat().st_size,
            },
            "configuration": {
                "path": relative(config_file),
                "sha256": config_hash,
            },
            "pipeline": digests,
            "detection": {
                "logicalQuestions": len({item.number for item in occurrences}),
                "printedOccurrences": len(occurrences),
                "languages": dict(Counter(item.language for item in occurrences)),
                "markers": [
                    {
                        "occurrenceId": item.occurrence_id,
                        "printedOrder": item.printed_order,
                        "officialNumber": item.number,
                        "language": item.language,
                        "sourcePdfPage": item.marker.page_index + 1,
                        "zoneIndex": item.marker.zone_index,
                        "sourceRegion": bbox_payload(
                            item.marker.bbox, document[item.marker.page_index]
                        ),
                    }
                    for item in occurrences
                ],
            },
            "pageManifestPath": relative(output / "paginas.json"),
            "essayPath": relative(output / "redacao.json") if essay else None,
            "questionsPath": relative(output / "questoes-estruturadas.json"),
            "failures": failures,
        }
        json_dump(output / "proveniencia.json", provenance)
        final_stage = "extracted_with_errors" if failures else "extracted"
        json_dump(
            checkpoint_path,
            checkpoint_payload(
                config,
                stage=final_stage,
                source_hashes=source_hashes,
                config_hash=config_hash,
                pipeline_digests=digests,
                completed=completed,
                failed=failures,
                artifacts={
                    "questions": relative(output / "questoes-estruturadas.json"),
                    "essay": relative(output / "redacao.json") if essay else None,
                    "pages": relative(output / "paginas.json"),
                    "provenance": relative(output / "proveniencia.json"),
                },
            ),
        )
        return {
            "corpusId": config["id"],
            "status": final_stage,
            "logicalQuestions": len({item.number for item in occurrences}),
            "printedOccurrences": len(questions),
            "alternatives": sum(len(item.get("alternatives", [])) for item in questions),
            "languages": dict(Counter(item.get("language") for item in questions)),
            "essayExtracted": bool(essay),
            "failures": failures,
            "output": relative(output),
        }
    finally:
        document.close()


def group_words_by_row(
    words: Sequence[dict[str, Any]],
    tolerance: float = 2.2,
) -> list[list[dict[str, Any]]]:
    rows: list[list[dict[str, Any]]] = []
    centers: list[float] = []
    for word in sorted(words, key=lambda item: (item["y0"], item["x0"])):
        center = (word["y0"] + word["y1"]) / 2
        match = next(
            (
                index
                for index, existing in enumerate(centers)
                if abs(existing - center) <= tolerance
            ),
            None,
        )
        if match is None:
            rows.append([word])
            centers.append(center)
        else:
            rows[match].append(word)
            centers[match] = sum(
                (item["y0"] + item["y1"]) / 2 for item in rows[match]
            ) / len(rows[match])
    for row in rows:
        row.sort(key=lambda item: item["x0"])
    return rows


def key_table_rows(page: fitz.Page) -> list[dict[str, Any]]:
    words = [
        {
            "x0": float(word[0]),
            "y0": float(word[1]),
            "x1": float(word[2]),
            "y1": float(word[3]),
            "text": str(word[4]),
        }
        for word in page.get_text("words")
    ]
    divider = page.rect.width / 2
    parsed: list[dict[str, Any]] = []
    for side, side_words in (
        ("left", [word for word in words if (word["x0"] + word["x1"]) / 2 < divider]),
        ("right", [word for word in words if (word["x0"] + word["x1"]) / 2 >= divider]),
    ):
        header_words = [
            word
            for word in side_words
            if pilot.normalize_ascii(word["text"]) == "questao"
        ]
        if not header_words:
            continue
        # Alguns gabaritos trazem no rodapé notas como "* Questão 114
        # anulada". A âncora da tabela é a primeira ocorrência de "Questão"
        # na coluna, não a última ocorrência textual da página.
        header_y = min(word["y1"] for word in header_words)
        candidates = [
            word
            for word in side_words
            if word["y0"] >= header_y + 5 and word["y1"] <= page.rect.height - 55
        ]
        for row in group_words_by_row(candidates):
            number_words = [
                word
                for word in row
                if re.fullmatch(r"0?\d{1,3}", word["text"].strip())
                and 1 <= int(word["text"]) <= 180
            ]
            answer_words = [
                word
                for word in row
                if normalize_answer(word["text"]) in ANSWER_VALUES
            ]
            if len(number_words) != 1 or not answer_words:
                continue
            number_word = number_words[0]
            answer_words = [word for word in answer_words if word["x0"] > number_word["x1"]]
            if not answer_words:
                continue
            union = fitz.Rect(
                number_word["x0"],
                number_word["y0"],
                number_word["x1"],
                number_word["y1"],
            )
            for answer_word in answer_words:
                union |= fitz.Rect(
                    answer_word["x0"],
                    answer_word["y0"],
                    answer_word["x1"],
                    answer_word["y1"],
                )
            parsed.append(
                {
                    "questionNumber": int(number_word["text"]),
                    "side": side,
                    "answers": [
                        {
                            "value": normalize_answer(word["text"]),
                            "x": round((word["x0"] + word["x1"]) / 2, 3),
                            "region": bbox_payload(
                                fitz.Rect(word["x0"], word["y0"], word["x1"], word["y1"]),
                                page,
                            ),
                        }
                        for word in sorted(answer_words, key=lambda item: item["x0"])
                    ],
                    "sourceRegion": bbox_payload(union, page),
                }
            )
    return sorted(parsed, key=lambda item: item["questionNumber"])


def _key_word_payloads(page: fitz.Page) -> list[dict[str, Any]]:
    return [
        {
            "x0": float(word[0]),
            "y0": float(word[1]),
            "x1": float(word[2]),
            "y1": float(word[3]),
            "text": str(word[4]),
            "block": int(word[5]),
            "line": int(word[6]),
            "word": int(word[7]),
        }
        for word in page.get_text("words")
    ]


def _word_rect(word: dict[str, Any]) -> fitz.Rect:
    return fitz.Rect(word["x0"], word["y0"], word["x1"], word["y1"])


def _official_inep_url(value: Any, year: int) -> bool:
    if not isinstance(value, str):
        return False
    host = (urlparse(value).hostname or "").lower()
    return (host == "gov.br" or host.endswith(".gov.br")) and str(year) in value


def answer_key_manifest_binding(
    config: dict[str, Any],
    key_path: Path,
) -> dict[str, Any]:
    """Vincula o arquivo recebido ao manifest oficial antes de qualquer fallback.

    Alguns gabaritos de 2011-2014 nao imprimem o ano e os de 2011 tambem nao
    imprimem o dia. Nesses casos, o fallback so e permitido quando caminho,
    SHA-256 e URLs oficiais do manifest conferem simultaneamente. Assim, um
    PDF desconhecido nao herda a identidade declarada pela configuracao.
    """

    actual_path = key_path.resolve()
    configured_path = repo_path(config["officialAnswerKeyPdf"]).resolve()
    actual_hash = sha256_file(actual_path)
    expected_hash = config.get("officialAnswerKeySha256")
    hash_declared = isinstance(expected_hash, str) and bool(
        re.fullmatch(r"[0-9a-f]{64}", expected_hash)
    )
    hash_matches = hash_declared and actual_hash == expected_hash
    path_matches = actual_path == configured_path
    year = int(config["year"])
    official_urls = all(
        _official_inep_url(config.get(field), year)
        for field in ("officialSourcePage", "officialAnswerKeyUrl")
    )
    verified = path_matches and hash_matches and official_urls
    if hash_declared and not hash_matches:
        raise ValueError(
            "SHA-256 do gabarito oficial diverge do manifest: "
            f"esperado={expected_hash}; obtido={actual_hash}."
        )
    if 2009 <= year <= 2016 and not verified:
        raise ValueError(
            "Gabarito historico sem vinculo integral ao manifest oficial "
            f"(path={path_matches}, sha256={hash_matches}, urls={official_urls})."
        )
    return {
        "configuredPath": relative(configured_path),
        "receivedPath": relative(actual_path) if ROOT in actual_path.parents else str(actual_path),
        "pathMatchesManifest": path_matches,
        "expectedSha256": expected_hash,
        "actualSha256": actual_hash,
        "sha256MatchesManifest": hash_matches,
        "officialUrlsVerified": official_urls,
        "verified": verified,
    }


def answer_key_identity_checks(
    config: dict[str, Any],
    raw_text: str,
    manifest_binding: dict[str, Any],
) -> dict[str, Any]:
    normalized = pilot.normalize_ascii(raw_text)
    embedded = {
        "year": str(config["year"]) in normalized,
        "day": text_identifies_day(raw_text, config["day"]),
        "bookletNumber": bool(
            re.search(rf"caderno\s+0?{config['bookletNumber']}\b", normalized)
        ),
        "bookletColor": pilot.normalize_ascii(config["bookletColor"]) in normalized,
    }
    if config["day"] == 1:
        area_day = (
            "ciencias humanas" in normalized
            and "ciencias da natureza" in normalized
        )
    else:
        area_day = "linguagens" in normalized and "matematica" in normalized
    fallback = bool(manifest_binding["verified"])
    effective = {
        "year": embedded["year"] or fallback,
        "day": embedded["day"] or area_day or fallback,
        "bookletNumber": embedded["bookletNumber"] or fallback,
        "bookletColor": embedded["bookletColor"] or fallback,
    }
    if not all(effective.values()):
        failed = [name for name, passed in effective.items() if not passed]
        raise ValueError(f"Identidade do gabarito oficial nao confirmada: {failed}.")
    return {
        **effective,
        "embedded": embedded,
        "dayConfirmedByAreas": area_day,
        "manifestHashFallbackUsed": {
            name: effective[name] and not embedded[name]
            for name in effective
        },
    }


def historical_split_key_table_rows(
    config: dict[str, Any],
    page: fitz.Page,
) -> list[dict[str, Any]]:
    """Le as tabelas de duas metades usadas nos gabaritos de 2011-2016."""

    words = _key_word_payloads(page)
    divider = page.rect.width / 2
    parsed: list[dict[str, Any]] = []
    for side, side_words in (
        ("left", [word for word in words if (word["x0"] + word["x1"]) / 2 < divider]),
        ("right", [word for word in words if (word["x0"] + word["x1"]) / 2 >= divider]),
    ):
        headers = [
            word
            for word in side_words
            if pilot.normalize_ascii(word["text"]) in {"questao", "questoes"}
        ]
        if not headers:
            continue
        # A primeira ancora e o cabecalho da tabela. O limite inferior de 20
        # pontos preserva as linhas 45/90 e 135/180 proximas ao fim da pagina.
        header_y = min(word["y1"] for word in headers)
        candidates = [
            word
            for word in side_words
            if word["y0"] >= header_y - 1
            and word["y1"] <= page.rect.height - 20
        ]
        for row in group_words_by_row(candidates, tolerance=2.8):
            number_words = [
                word
                for word in row
                if re.fullmatch(r"0?\d{1,3}", word["text"].strip())
                and config["questionStart"]
                <= int(word["text"])
                <= config["questionEnd"]
            ]
            answer_words = [
                word
                for word in row
                if normalize_answer(word["text"]) in ANSWER_VALUES
            ]
            if len(number_words) != 1 or not answer_words:
                continue
            number_word = number_words[0]
            answer_words = [
                word for word in answer_words if word["x0"] > number_word["x1"]
            ]
            if not answer_words:
                continue
            union = _word_rect(number_word)
            answer_payloads: list[dict[str, Any]] = []
            for answer_word in sorted(answer_words, key=lambda item: item["x0"]):
                rect = _word_rect(answer_word)
                union |= rect
                answer_payloads.append(
                    {
                        "value": normalize_answer(answer_word["text"]),
                        "x": round((answer_word["x0"] + answer_word["x1"]) / 2, 3),
                        "region": bbox_payload(rect, page),
                        "sourcePdfPage": page.number + 1,
                    }
                )
            parsed.append(
                {
                    "questionNumber": int(number_word["text"]),
                    "side": side,
                    "answers": answer_payloads,
                    "sourcePdfPage": page.number + 1,
                    "sourceRegion": bbox_payload(union, page),
                }
            )
    return sorted(parsed, key=lambda item: item["questionNumber"])


def multi_color_2009_key_rows(
    config: dict[str, Any],
    document: fitz.Document,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Seleciona a coluna exata de caderno/cor no gabarito multi-cor de 2009."""

    first_page = document[0]
    header_words = _key_word_payloads(first_page)
    color = pilot.normalize_ascii(config["bookletColor"])
    color_headers = [
        word
        for word in header_words
        if pilot.normalize_ascii(word["text"]) == color and word["y0"] < 150
    ]
    answer_headers = [
        word
        for word in header_words
        if pilot.normalize_ascii(word["text"]) == f"gab_{color}"
        and word["y0"] < 150
    ]
    if len(color_headers) != 1 or len(answer_headers) != 1:
        raise ValueError(
            "Nao foi possivel isolar os cabecalhos da coluna multi-cor "
            f"{config['bookletNumber']} {config['bookletColor']}."
        )
    question_x = (color_headers[0]["x0"] + color_headers[0]["x1"]) / 2
    answer_x = (answer_headers[0]["x0"] + answer_headers[0]["x1"]) / 2
    parsed: list[dict[str, Any]] = []
    for page in document:
        for row in group_words_by_row(_key_word_payloads(page), tolerance=2.2):
            number_words = [
                word
                for word in row
                if re.fullmatch(r"0?\d{1,3}", word["text"].strip())
                and config["questionStart"]
                <= int(word["text"])
                <= config["questionEnd"]
            ]
            answer_words = [
                word
                for word in row
                if normalize_answer(word["text"]) in ANSWER_VALUES
            ]
            if not number_words or not answer_words:
                continue
            number_word = min(
                number_words,
                key=lambda word: abs((word["x0"] + word["x1"]) / 2 - question_x),
            )
            answer_word = min(
                answer_words,
                key=lambda word: abs((word["x0"] + word["x1"]) / 2 - answer_x),
            )
            number_distance = abs(
                (number_word["x0"] + number_word["x1"]) / 2 - question_x
            )
            answer_distance = abs(
                (answer_word["x0"] + answer_word["x1"]) / 2 - answer_x
            )
            if number_distance >= 45 or answer_distance >= 45:
                continue
            number_rect = _word_rect(number_word)
            answer_rect = _word_rect(answer_word)
            parsed.append(
                {
                    "questionNumber": int(number_word["text"]),
                    "side": "selected_multicolor_column",
                    "answers": [
                        {
                            "value": normalize_answer(answer_word["text"]),
                            "x": round(
                                (answer_word["x0"] + answer_word["x1"]) / 2,
                                3,
                            ),
                            "region": bbox_payload(answer_rect, page),
                            "sourcePdfPage": page.number + 1,
                        }
                    ],
                    "sourcePdfPage": page.number + 1,
                    "sourceRegion": bbox_payload(number_rect | answer_rect, page),
                }
            )
    parsed.sort(key=lambda item: item["questionNumber"])
    return parsed, {
        "selectedBookletNumber": config["bookletNumber"],
        "selectedBookletColor": config["bookletColor"],
        "questionColumnCenterX": round(question_x, 3),
        "answerColumnCenterX": round(answer_x, 3),
        "rowCount": len(parsed),
    }


def _clean_question_word(value: str) -> str:
    return pilot.normalize_ascii(value).lower().strip().strip(":.;,-")


def _question_markers_from_words(page: fitz.Page) -> list[dict[str, Any]]:
    words = page.get_text("words", sort=True)
    output: list[dict[str, Any]] = []
    for index, word in enumerate(words):
        token = _clean_question_word(str(word[4]))
        combined = re.fullmatch(r"questao0*(\d{1,3})", token)
        if combined:
            output.append(
                {
                    "questionNumber": int(combined.group(1)),
                    "rect": fitz.Rect(word[:4]),
                }
            )
            continue
        if token != "questao" or index + 1 >= len(words):
            continue
        number_word = words[index + 1]
        number_token = _clean_question_word(str(number_word[4]))
        if not re.fullmatch(r"0*\d{1,3}", number_token):
            continue
        same_block = number_word[5] == word[5]
        same_row = number_word[6] == word[6] or abs(number_word[1] - word[1]) < 20
        if same_block and same_row:
            output.append(
                {
                    "questionNumber": int(number_token),
                    "rect": fitz.Rect(word[:4]) | fitz.Rect(number_word[:4]),
                }
            )
    return output


def _historical_zone_index(
    config: dict[str, Any],
    page_number: int,
    rect: fitz.Rect,
) -> int:
    layout = config["layout"]
    if page_number in {
        int(value) for value in layout.get("fullWidthObjectivePages", [])
    }:
        return 0
    split = (float(layout["leftEnd"]) + float(layout["rightStart"])) / 2
    return 0 if (rect.x0 + rect.x1) / 2 < split else 1


def _historical_visual_order_key(
    config: dict[str, Any],
    page_positions: dict[int, int],
    page_number: int,
    rect: fitz.Rect,
) -> tuple[int, int, float, float]:
    return (
        page_positions[page_number],
        _historical_zone_index(config, page_number, rect),
        rect.y0,
        rect.x0,
    )


def _expected_printed_question_numbers(config: dict[str, Any]) -> list[int]:
    sections = sorted(
        config["languageSections"],
        key=lambda item: int(item["occurrenceIndex"]),
    )
    if not sections:
        return list(range(config["questionStart"], config["questionEnd"] + 1))
    output: list[int] = []
    for section in sections:
        output.extend(
            range(int(section["questionStart"]), int(section["questionEnd"]) + 1)
        )
    common_start = max(int(item["questionEnd"]) for item in sections) + 1
    output.extend(range(common_start, config["questionEnd"] + 1))
    return output


def marked_booklet_2010_key_rows(
    config: dict[str, Any],
    document: fitz.Document,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Le os circulos coloridos do caderno oficial ``com_gab`` de 2010."""

    objective_pages = page_numbers_from_ranges(config["objectivePageRanges"])
    page_positions = {number: index for index, number in enumerate(objective_pages)}
    question_markers: list[dict[str, Any]] = []
    alternative_markers: list[dict[str, Any]] = []
    answer_rings: list[dict[str, Any]] = []
    ring_colors: Counter[tuple[float, float, float]] = Counter()
    for page_number in objective_pages:
        page = document[page_number - 1]
        for marker in _question_markers_from_words(page):
            number = marker["questionNumber"]
            if config["questionStart"] <= number <= config["questionEnd"]:
                question_markers.append(
                    {
                        **marker,
                        "sourcePdfPage": page_number,
                    }
                )
        for drawing in page.get_drawings():
            rect = fitz.Rect(drawing["rect"])
            fill = drawing.get("fill")
            if (
                fill
                and max(fill) < 0.25
                and 5 <= rect.width <= 9
                and 5 <= rect.height <= 9
                and len(drawing.get("items", [])) == 4
            ):
                alternative_markers.append(
                    {"sourcePdfPage": page_number, "rect": rect}
                )
            color = drawing.get("color")
            if (
                color
                and max(color) - min(color) > 0.25
                and float(drawing.get("width") or 0) >= 1.5
                and 8 <= rect.width <= 25
                and 7 <= rect.height <= 20
            ):
                rounded_color = tuple(round(float(value), 6) for value in color)
                ring_colors[rounded_color] += 1
                answer_rings.append(
                    {
                        "sourcePdfPage": page_number,
                        "rect": rect,
                        "color": rounded_color,
                    }
                )

    sorter = lambda item: _historical_visual_order_key(  # noqa: E731
        config,
        page_positions,
        int(item["sourcePdfPage"]),
        item["rect"],
    )
    question_markers.sort(key=sorter)
    alternative_markers.sort(key=sorter)
    answer_rings.sort(key=sorter)
    expected_numbers = _expected_printed_question_numbers(config)
    detected_numbers = [item["questionNumber"] for item in question_markers]
    if detected_numbers != expected_numbers:
        raise ValueError(
            "Marcadores do caderno com gabarito de 2010 fora de ordem: "
            f"detectados={detected_numbers}; esperados={expected_numbers}."
        )
    expected_occurrences = config["expectedPrintedOccurrences"]
    if len(alternative_markers) != expected_occurrences * 5:
        raise ValueError(
            f"Marcadores A-E no gabarito 2010: {len(alternative_markers)}; "
            f"esperados={expected_occurrences * 5}."
        )
    if len(answer_rings) != expected_occurrences:
        raise ValueError(
            f"Circulos de resposta no gabarito 2010: {len(answer_rings)}; "
            f"esperados={expected_occurrences}."
        )

    grouped: dict[int, dict[str, Any]] = {}
    used_rings: set[int] = set()
    for index, question_marker in enumerate(question_markers):
        alternatives = alternative_markers[index * 5 : (index + 1) * 5]
        matches: list[tuple[int, int]] = []
        for alternative_index, alternative in enumerate(alternatives):
            center = fitz.Point(
                (alternative["rect"].x0 + alternative["rect"].x1) / 2,
                (alternative["rect"].y0 + alternative["rect"].y1) / 2,
            )
            for ring_index, ring in enumerate(answer_rings):
                if ring["sourcePdfPage"] != alternative["sourcePdfPage"]:
                    continue
                expanded = fitz.Rect(ring["rect"])
                expanded.x0 -= 2
                expanded.y0 -= 2
                expanded.x1 += 2
                expanded.y1 += 2
                if expanded.contains(center):
                    matches.append((alternative_index, ring_index))
        if len(matches) != 1:
            raise ValueError(
                f"Questao impressa {index + 1} ({question_marker['questionNumber']}): "
                f"foram associados {len(matches)} circulos de resposta."
            )
        alternative_index, ring_index = matches[0]
        if ring_index in used_rings:
            raise ValueError(f"Circulo de resposta 2010 reutilizado: {ring_index}.")
        used_rings.add(ring_index)
        ring = answer_rings[ring_index]
        number = int(question_marker["questionNumber"])
        marker_page = document[int(question_marker["sourcePdfPage"]) - 1]
        ring_page = document[int(ring["sourcePdfPage"]) - 1]
        row = grouped.setdefault(
            number,
            {
                "questionNumber": number,
                "side": "marked_official_booklet",
                "answers": [],
                "sourcePdfPage": int(question_marker["sourcePdfPage"]),
                "sourceRegion": bbox_payload(question_marker["rect"], marker_page),
            },
        )
        row["answers"].append(
            {
                "value": "ABCDE"[alternative_index],
                "x": round((ring["rect"].x0 + ring["rect"].x1) / 2, 3),
                "region": bbox_payload(ring["rect"], ring_page),
                "sourcePdfPage": int(ring["sourcePdfPage"]),
                "sourceRegion": bbox_payload(question_marker["rect"], marker_page),
            }
        )
    if len(used_rings) != len(answer_rings):
        raise ValueError(
            f"Circulos 2010 nao utilizados: {len(answer_rings) - len(used_rings)}."
        )
    rows = [grouped[number] for number in sorted(grouped)]
    return rows, {
        "questionMarkerCount": len(question_markers),
        "alternativeMarkerCount": len(alternative_markers),
        "answerRingCount": len(answer_rings),
        "answerRingColors": {
            ",".join(f"{value:.6f}" for value in color): count
            for color, count in sorted(ring_colors.items())
        },
        "printedQuestionSequence": detected_numbers,
    }


def language_sections_by_number(
    config: dict[str, Any],
    number: int,
) -> list[dict[str, Any]]:
    return sorted(
        (
            item
            for item in config["languageSections"]
            if int(item["questionStart"]) <= number <= int(item["questionEnd"])
        ),
        key=lambda item: int(item.get("answerColumnOrder", item["occurrenceIndex"])),
    )


def parse_official_answer_key(
    config: dict[str, Any],
    key_path: Path,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    validate_pdf(key_path)
    manifest_binding = answer_key_manifest_binding(config, key_path)
    document = fitz.open(key_path)
    try:
        raw_text = pilot.collapse_text(
            "\n".join(page.get_text("text") for page in document)
        )
        identity_checks = answer_key_identity_checks(
            config,
            raw_text,
            manifest_binding,
        )
        parser_evidence: dict[str, Any] = {}
        year = int(config["year"])
        if year == 2009:
            parser_id = "enem-official-key-multicolor-2009-v1"
            rows, parser_evidence = multi_color_2009_key_rows(config, document)
        elif year == 2010:
            parser_id = "enem-official-key-marked-booklet-2010-v1"
            rows, parser_evidence = marked_booklet_2010_key_rows(config, document)
        elif 2011 <= year <= 2016:
            parser_id = "enem-official-key-split-table-2011-2016-v1"
            rows = []
            for page in document:
                rows.extend(historical_split_key_table_rows(config, page))
            parser_evidence = {
                "rowCount": len(rows),
                "acceptedHeaderLabels": ["QUESTAO", "QUESTOES"],
                "bottomMarginPoints": 20,
            }
        else:
            parser_id = "enem-official-key-generic-split-table-v1"
            rows = []
            for page in document:
                for row in key_table_rows(page):
                    row["sourcePdfPage"] = page.number + 1
                    rows.append(row)
        by_number: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            by_number[row["questionNumber"]].append(row)
        expected_numbers = set(range(config["questionStart"], config["questionEnd"] + 1))
        if set(by_number) != expected_numbers:
            missing = sorted(expected_numbers - set(by_number))
            extra = sorted(set(by_number) - expected_numbers)
            raise ValueError(
                f"Linhas do gabarito divergentes. Ausentes={missing}; excedentes={extra}."
            )

        answers: list[dict[str, Any]] = []
        for number in sorted(expected_numbers):
            own_rows = by_number[number]
            if len(own_rows) != 1:
                raise ValueError(f"Questão {number}: {len(own_rows)} linhas no gabarito.")
            row = own_rows[0]
            sections = language_sections_by_number(config, number)
            if sections:
                if len(row["answers"]) != len(sections):
                    raise ValueError(
                        f"Questão {number}: {len(row['answers'])} respostas para "
                        f"{len(sections)} idiomas."
                    )
                for section, answer_word in zip(sections, row["answers"]):
                    value = answer_word["value"]
                    answers.append(
                        {
                            "questionNumber": number,
                            "language": section["language"],
                            "correctAlternative": None if value == "ANULADA" else value,
                            "situation": "annulled" if value == "ANULADA" else "confirmed",
                            "validationStatus": "parsed_from_official_pdf_pending_human_review",
                            "sourcePdfPage": answer_word.get(
                                "sourcePdfPage", row["sourcePdfPage"]
                            ),
                            "sourceRegion": answer_word.get(
                                "sourceRegion", row["sourceRegion"]
                            ),
                            "answerRegion": answer_word["region"],
                        }
                    )
            else:
                if len(row["answers"]) != 1:
                    raise ValueError(
                        f"Questão comum {number}: esperada uma resposta, obtidas {len(row['answers'])}."
                    )
                answer_word = row["answers"][0]
                value = answer_word["value"]
                answers.append(
                    {
                        "questionNumber": number,
                        "language": "comum",
                        "appliesToLanguage": config.get("commonLanguage", "portugues"),
                        "correctAlternative": None if value == "ANULADA" else value,
                        "situation": "annulled" if value == "ANULADA" else "confirmed",
                        "validationStatus": "parsed_from_official_pdf_pending_human_review",
                        "sourcePdfPage": answer_word.get(
                            "sourcePdfPage", row["sourcePdfPage"]
                        ),
                        "sourceRegion": answer_word.get(
                            "sourceRegion", row["sourceRegion"]
                        ),
                        "answerRegion": answer_word["region"],
                    }
                )
        expected_answers = config["expectedPrintedOccurrences"]
        if len(answers) != expected_answers:
            raise ValueError(
                f"Gabarito produziu {len(answers)} vínculos; esperados {expected_answers}."
            )
        annulled = sorted(
            {
                item["questionNumber"]
                for item in answers
                if item["situation"] == "annulled"
            }
        )
        expected_annulled = sorted(int(value) for value in config.get("expectedAnnulled", []))
        if annulled != expected_annulled:
            raise ValueError(
                f"Anulações divergentes. Detectadas={annulled}; esperadas={expected_annulled}."
            )
        return answers, {
            "pageCount": document.page_count,
            "parserId": parser_id,
            "identityChecks": identity_checks,
            "manifestBinding": manifest_binding,
            "rawTextSha256": sha256_bytes(raw_text.encode("utf-8")),
            "parserEvidence": parser_evidence,
            "tableRows": rows,
        }
    finally:
        document.close()


def link_answer_key(config: dict[str, Any], config_file: Path) -> dict[str, Any]:
    output = repo_path(config["outputDirectory"])
    questions_path = output / "questoes-estruturadas.json"
    provenance_path = output / "proveniencia.json"
    if not questions_path.exists() or not provenance_path.exists():
        raise RuntimeError("Extraia o corpus antes de relacionar o gabarito.")
    questions = json_load(questions_path)
    key_path = repo_path(config["officialAnswerKeyPdf"])
    key_hash = sha256_file(key_path)
    answers, parser_trace = parse_official_answer_key(config, key_path)
    answer_lookup: dict[tuple[int, str], dict[str, Any]] = {}
    for answer in answers:
        key = (answer["questionNumber"], answer["language"])
        if key in answer_lookup:
            raise ValueError(f"Vínculo de gabarito duplicado: {key}.")
        answer_lookup[key] = answer
    imported_at = now_iso()
    linked_answers: list[dict[str, Any]] = []
    for question in questions:
        lookup_language = (
            question["language"]
            if question["language"] in FOREIGN_LANGUAGES
            else "comum"
        )
        lookup_key = (int(question["officialNumber"]), lookup_language)
        answer = answer_lookup.get(lookup_key)
        if not answer:
            raise ValueError(f"Sem gabarito oficial para {question['id']}.")
        alternative_keys = [item.get("key") for item in question.get("alternatives", [])]
        correct = answer["correctAlternative"]
        if correct is not None and alternative_keys and correct not in alternative_keys:
            raise ValueError(
                f"{question['id']}: gabarito {correct} não existe nas alternativas extraídas."
            )
        linked = {
            **answer,
            "occurrenceId": question["id"],
            "questionLanguage": question["language"],
        }
        linked_answers.append(linked)
        question["answer"] = correct
        question["answerSituation"] = answer["situation"]
        question["isAnnulled"] = answer["situation"] == "annulled"
        question["officialAnswerKey"] = {
            **answer,
            "occurrenceId": question["id"],
            "sourceUrl": config.get("officialAnswerKeyUrl"),
            "sourcePageUrl": config.get("officialSourcePage"),
            "sourcePath": config["officialAnswerKeyPdf"],
            "sourceSha256": key_hash,
            "importedAt": imported_at,
        }
        question.setdefault("confidence", {})["answer"] = 1.0
        confidence_values = [
            float(value)
            for value in question["confidence"].values()
            if isinstance(value, (int, float))
        ]
        question["confidence"]["overall"] = (
            round(min(confidence_values), 3) if confidence_values else 0.0
        )
        json_dump(
            output / "questoes" / (
                f"questao-{question['officialNumber']:03d}-{question['language']}.json"
            ),
            question,
        )
    json_dump(questions_path, questions)
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "corpusId": config["id"],
        "year": config["year"],
        "day": config["day"],
        "application": config.get("application"),
        "modality": config.get("modality"),
        "bookletNumber": config["bookletNumber"],
        "bookletColor": config["bookletColor"],
        "source": {
            "institution": config.get("institution"),
            "sourcePageUrl": config.get("officialSourcePage"),
            "officialUrl": config.get("officialAnswerKeyUrl"),
            "path": relative(key_path),
            "sha256": key_hash,
            "sizeBytes": key_path.stat().st_size,
            "importedAt": imported_at,
            "parserTrace": parser_trace,
        },
        "summary": {
            "logicalQuestionNumbers": config["expectedLogicalQuestions"],
            "answerAssignments": len(linked_answers),
            "byLanguage": dict(Counter(item["language"] for item in linked_answers)),
            "annulled": sorted(
                {
                    item["questionNumber"]
                    for item in linked_answers
                    if item["situation"] == "annulled"
                }
            ),
        },
        "answers": linked_answers,
    }
    json_dump(output / "gabarito-oficial.json", payload)

    checkpoint_path = output / "checkpoint.json"
    checkpoint = json_load(checkpoint_path) if checkpoint_path.exists() else {}
    checkpoint.update(
        {
            "stage": "answer_key_linked",
            "officialAnswerKeySha256": key_hash,
            "answerAssignments": len(linked_answers),
            "answerKeyArtifact": relative(output / "gabarito-oficial.json"),
            "publicationAuthorized": False,
            "updatedAt": now_iso(),
        }
    )
    json_dump(checkpoint_path, checkpoint)
    return {
        "corpusId": config["id"],
        "status": "answer_key_linked",
        "answers": len(linked_answers),
        "byLanguage": payload["summary"]["byLanguage"],
        "annulled": payload["summary"]["annulled"],
        "output": relative(output / "gabarito-oficial.json"),
    }


def image_dimensions(path: Path) -> tuple[int, int]:
    pixmap = fitz.Pixmap(path)
    try:
        return pixmap.width, pixmap.height
    finally:
        pixmap = None


def iter_asset_records(
    questions: Sequence[dict[str, Any]],
    page_manifest: dict[str, Any],
    essay: dict[str, Any] | None,
) -> Iterator[tuple[str, dict[str, Any]]]:
    for question in questions:
        for asset in question.get("assets", []):
            yield question["id"], asset
        for asset in question.get("originalCrops", []):
            yield question["id"], asset
    for page in page_manifest.get("pages", []):
        if page.get("facsimile"):
            yield f"pagina-{page['sourcePdfPage']}", page["facsimile"]
    if essay:
        for asset in essay.get("visualAssets", []):
            yield essay["id"], asset


def iter_coordinate_records(question: dict[str, Any]) -> Iterator[tuple[str, dict[str, Any]]]:
    source = question.get("source", {})
    if source.get("marker"):
        yield "source.marker", source["marker"]
    for index, region in enumerate(source.get("sourceRegions", [])):
        yield f"source.sourceRegions[{index}]", region
    for index, block in enumerate(question.get("blocks", [])):
        yield f"blocks[{index}]", block
    for index, alternative in enumerate(question.get("alternatives", [])):
        if alternative.get("marker"):
            yield f"alternatives[{index}].marker", alternative["marker"]
        for region_index, region in enumerate(alternative.get("sourceRegions", [])):
            yield f"alternatives[{index}].sourceRegions[{region_index}]", region
    for index, asset in enumerate(question.get("assets", [])):
        yield f"assets[{index}]", asset
    for index, asset in enumerate(question.get("originalCrops", [])):
        yield f"originalCrops[{index}]", asset


def region_is_valid(record: dict[str, Any], page_count: int) -> bool:
    page_number = record.get("sourcePdfPage")
    region = record.get("sourceRegion")
    if not isinstance(page_number, int) or not 1 <= page_number <= page_count:
        return False
    if not isinstance(region, dict):
        return False
    normalized = region.get("normalized")
    if not isinstance(normalized, dict):
        return False
    try:
        x = float(normalized["x"])
        y = float(normalized["y"])
        width = float(normalized["width"])
        height = float(normalized["height"])
    except (KeyError, TypeError, ValueError):
        return False
    return (
        -0.001 <= x <= 1.001
        and -0.001 <= y <= 1.001
        and width > 0
        and height > 0
        and x + width <= 1.002
        and y + height <= 1.002
    )


def expected_printed_signature(config: dict[str, Any]) -> list[tuple[int, str]]:
    signature: list[tuple[int, str]] = []
    variant_numbers: set[int] = set()
    sections = sorted(
        config["languageSections"],
        key=lambda item: int(item["occurrenceIndex"]),
    )
    for section in sections:
        start = int(section["questionStart"])
        end = int(section["questionEnd"])
        signature.extend((number, str(section["language"])) for number in range(start, end + 1))
        variant_numbers.update(range(start, end + 1))
    signature.extend(
        (number, str(config.get("commonLanguage", "portugues")))
        for number in range(config["questionStart"], config["questionEnd"] + 1)
        if number not in variant_numbers
    )
    return signature


def validate_corpus(config: dict[str, Any], config_file: Path) -> dict[str, Any]:
    output = repo_path(config["outputDirectory"])
    required_paths = {
        "questions": output / "questoes-estruturadas.json",
        "answerKey": output / "gabarito-oficial.json",
        "pages": output / "paginas.json",
        "provenance": output / "proveniencia.json",
        "checkpoint": output / "checkpoint.json",
    }
    expects_essay = bool(config.get("essayPages"))
    if expects_essay:
        required_paths["essay"] = output / "redacao.json"
    missing_artifacts = [relative(path) for path in required_paths.values() if not path.exists()]
    if missing_artifacts:
        raise RuntimeError(f"Artefatos obrigatórios ausentes: {missing_artifacts}")
    questions = json_load(required_paths["questions"])
    answer_key = json_load(required_paths["answerKey"])
    essay = json_load(required_paths["essay"]) if expects_essay else None
    pages = json_load(required_paths["pages"])
    provenance = json_load(required_paths["provenance"])
    checkpoint = json_load(required_paths["checkpoint"])
    errors: list[str] = []
    warnings: list[str] = []

    expected_signature = expected_printed_signature(config)
    actual_signature = [
        (int(question.get("officialNumber", -1)), str(question.get("language")))
        for question in questions
    ]
    if actual_signature != expected_signature:
        errors.append(
            "A sequência física das ocorrências não corresponde às variantes e à ordem configuradas."
        )
    if len(questions) != config["expectedPrintedOccurrences"]:
        errors.append(
            f"Ocorrências estruturadas: {len(questions)}; esperadas {config['expectedPrintedOccurrences']}."
        )
    logical_numbers = {int(item.get("officialNumber", -1)) for item in questions}
    expected_numbers = set(range(config["questionStart"], config["questionEnd"] + 1))
    if logical_numbers != expected_numbers:
        errors.append("A numeração lógica 1–90 está incompleta ou contém excedentes.")
    if len({item.get("id") for item in questions}) != len(questions):
        errors.append("Há IDs de ocorrência duplicados.")
    content_hashes = [item.get("contentHash") for item in questions]
    if any(not value for value in content_hashes):
        errors.append("Há ocorrência sem contentHash devido a erro de extração.")
    if len(set(content_hashes)) != len(content_hashes):
        warnings.append("Há hashes de conteúdo repetidos; revisar possível duplicidade textual.")

    page_count = int(pages.get("totalPages", 0))
    total_alternatives = 0
    prompt_visual_count = 0
    alternative_visual_count = 0
    extraction_errors = 0
    header_patterns = [
        re.compile(pattern, re.IGNORECASE)
        for pattern in config.get("sectionHeaderPatterns", [])
    ]
    question_files = sorted((output / "questoes").glob("questao-*.json"))
    if len(question_files) != config["expectedPrintedOccurrences"]:
        errors.append(
            f"Arquivos individuais: {len(question_files)}; esperados {config['expectedPrintedOccurrences']}."
        )
    for question in questions:
        identifier = question.get("id", "ocorrencia-sem-id")
        if question.get("extractionStatus") == "error":
            extraction_errors += 1
            errors.append(
                f"{identifier}: erro de extração: {question.get('extractionIssues', [])}."
            )
            continue
        if question.get("year") != config["year"] or question.get("day") != config["day"]:
            errors.append(f"{identifier}: ano ou dia divergente.")
        if (
            question.get("bookletNumber") != config["bookletNumber"]
            or pilot.normalize_ascii(str(question.get("bookletColor")))
            != pilot.normalize_ascii(config["bookletColor"])
        ):
            errors.append(f"{identifier}: caderno ou cor divergente.")
        statement = str(question.get("statement") or "").strip()
        if len(statement) < 20:
            errors.append(f"{identifier}: enunciado ausente ou curto.")
        if not str(question.get("command") or "").strip():
            errors.append(f"{identifier}: comando não separado.")
        elif text_has_credit_signature(str(question.get("command") or "")):
            errors.append(f"{identifier}: comando ainda contém crédito/fonte bibliográfica.")
        blocks = question.get("blocks", [])
        if [item.get("order") for item in blocks] != list(range(len(blocks))):
            errors.append(f"{identifier}: ordem dos blocos não é contígua.")
        empty_blocks = [
            index
            for index, block in enumerate(blocks)
            if not str(block.get("content") or "").strip()
        ]
        if empty_blocks:
            errors.append(f"{identifier}: blocos sem content em {empty_blocks}.")
        question_assets_by_path = {
            str(asset.get("artifactPath")): asset
            for asset in question.get("assets", [])
            if asset.get("artifactPath")
        }
        for block_index, block in enumerate(blocks):
            if block.get("type") != "image":
                continue
            artifact_path = str(block.get("artifactPath") or "")
            linked_asset = question_assets_by_path.get(artifact_path)
            if not str(block.get("altText") or "").strip():
                errors.append(f"{identifier}: bloco de imagem {block_index} sem altText.")
            if not linked_asset or linked_asset.get("type") != "official_prompt_visual":
                errors.append(
                    f"{identifier}: bloco de imagem {block_index} sem asset visual da própria questão."
                )
            elif block.get("assetSha256") != linked_asset.get("sha256"):
                errors.append(
                    f"{identifier}: hash do bloco de imagem {block_index} diverge do asset."
                )
        command_blocks = [item for item in blocks if item.get("type") == "command"]
        if len(command_blocks) != 1:
            errors.append(f"{identifier}: deve haver exatamente um bloco de comando.")
        elif any(
            block.get("type") in {"support_text", "credit"}
            and int(block.get("order", -1)) > int(command_blocks[0].get("order", -1))
            for block in blocks
        ):
            errors.append(
                f"{identifier}: há texto de apoio/crédito depois do bloco de comando."
            )
        structured_text_values = [
            str(question.get("command") or ""),
            *(str(block.get("content") or "") for block in blocks),
        ]
        malformed_prompt = [
            value
            for value in structured_text_values
            if has_malformed_pdf_suffix(value)
        ]
        if malformed_prompt:
            errors.append(f"{identifier}: resíduo invisível do texto PDF no enunciado/comando.")
        alternatives = question.get("alternatives", [])
        total_alternatives += len(alternatives)
        if [item.get("key") for item in alternatives] != list("ABCDE"):
            errors.append(f"{identifier}: alternativas A–E ausentes ou fora da ordem.")
        alternative_lengths = sorted(
            len(str(item.get("text") or "").strip()) for item in alternatives
        )
        if alternative_lengths:
            median_length = alternative_lengths[len(alternative_lengths) // 2]
            if alternative_lengths[-1] > max(400, median_length * 4):
                errors.append(
                    f"{identifier}: alternativa com extensão incompatível com as demais; "
                    "possível mistura de conteúdo adjacente."
                )
        for alternative in alternatives:
            if not str(alternative.get("text") or "").strip() and not alternative.get(
                "imageArtifacts"
            ):
                errors.append(
                    f"{identifier}: alternativa {alternative.get('key')} sem texto e sem imagem."
                )
            normalized_alt = pilot.normalize_ascii(str(alternative.get("text") or ""))
            alternative_text = str(alternative.get("text") or "").strip()
            if has_malformed_pdf_suffix(alternative_text):
                errors.append(
                    f"{identifier}: resíduo invisível do PDF na alternativa {alternative.get('key')}."
                )
            if any(pattern.search(normalized_alt) for pattern in header_patterns):
                errors.append(
                    f"{identifier}: alternativa {alternative.get('key')} contém cabeçalho de seção."
                )
        mixed_markers = [
            int(match.group(1))
            for match in pilot.QUESTION_MARKER.finditer(statement)
            if int(match.group(1)) != int(question["officialNumber"])
        ]
        if mixed_markers:
            errors.append(f"{identifier}: contém marcador de outra questão {mixed_markers}.")
        answer = question.get("officialAnswerKey")
        if not isinstance(answer, dict):
            errors.append(f"{identifier}: sem vínculo ao gabarito oficial.")
        elif answer.get("sourceSha256") != answer_key["source"]["sha256"]:
            errors.append(f"{identifier}: hash do gabarito vinculado é divergente.")
        elif answer.get("situation") == "confirmed" and answer.get(
            "correctAlternative"
        ) not in list("ABCDE"):
            errors.append(f"{identifier}: resposta oficial inválida.")
        if not question.get("originalCrops"):
            errors.append(f"{identifier}: sem recorte original auditável.")
        if not any(
            item.get("type") == "official_prompt_facsimile"
            for item in question.get("assets", [])
        ):
            errors.append(f"{identifier}: sem fac-símile do enunciado.")
        prompt_visual_count += sum(
            1
            for item in question.get("assets", [])
            if item.get("type") == "official_prompt_visual"
        )
        alternative_visual_count += sum(
            1
            for item in question.get("assets", [])
            if item.get("type") == "official_alternative_visual"
        )
        for location, record in iter_coordinate_records(question):
            if not region_is_valid(record, page_count):
                errors.append(f"{identifier}: coordenada inválida em {location}.")
        individual_path = output / "questoes" / (
            f"questao-{question['officialNumber']:03d}-{question['language']}.json"
        )
        if individual_path.exists() and json_load(individual_path) != question:
            errors.append(f"{identifier}: arquivo individual diverge do agregado.")

    if total_alternatives != config["expectedPrintedOccurrences"] * 5:
        errors.append(
            f"Alternativas estruturadas: {total_alternatives}; "
            f"esperadas {config['expectedPrintedOccurrences'] * 5}."
        )

    assignments = answer_key.get("answers", [])
    if len(assignments) != config["expectedPrintedOccurrences"]:
        errors.append(
            f"Vínculos de gabarito: {len(assignments)}; "
            f"esperados {config['expectedPrintedOccurrences']}."
        )
    assignment_ids = [item.get("occurrenceId") for item in assignments]
    if sorted(assignment_ids) != sorted(item.get("id") for item in questions):
        errors.append("Os vínculos do gabarito não cobrem exatamente as ocorrências físicas.")
    expected_annulled = sorted(int(value) for value in config.get("expectedAnnulled", []))
    actual_annulled = sorted(
        {
            int(item["questionNumber"])
            for item in assignments
            if item.get("situation") == "annulled"
        }
    )
    if actual_annulled != expected_annulled:
        errors.append(
            f"Questões anuladas divergentes: {actual_annulled}; esperadas {expected_annulled}."
        )
    if sha256_file(repo_path(config["officialAnswerKeyPdf"])) != answer_key["source"]["sha256"]:
        errors.append("O PDF local do gabarito mudou após a vinculação.")
    if sha256_file(repo_path(config["officialExamPdf"])) != provenance["officialExam"]["sha256"]:
        errors.append("O PDF local da prova mudou após a extração.")
    if sha256_file(config_file) != provenance["configuration"]["sha256"]:
        errors.append("A configuração mudou após a extração.")

    if expects_essay:
        if not essay or not str(essay.get("theme") or "").strip():
            errors.append("Tema da proposta de redação não extraído.")
        if not essay or not str(essay.get("instructions") or "").strip():
            errors.append("Instruções da proposta de redação não extraídas.")
        elif re.search(
            r"(?:CADERNO\s+\d+|\*[0-9A-Z]{8,}\*|^[0-9]{1,2}$)",
            str(essay.get("instructions")),
            re.IGNORECASE | re.MULTILINE,
        ):
            errors.append("Instruções da redação ainda contêm cabeçalho, rodapé ou código de página.")
        expected_motivating_texts = config.get("expectedEssayMotivatingTexts")
        motivating_texts = essay.get("motivatingTexts", []) if essay else []
        if expected_motivating_texts is not None and len(motivating_texts) != int(
            expected_motivating_texts
        ):
            errors.append(
                "Textos motivadores da redação: "
                f"{len(motivating_texts)}; esperados {expected_motivating_texts}."
            )
        if any(not str(item.get("content") or "").strip() for item in motivating_texts):
            errors.append("Há texto motivador da redação sem conteúdo digitalizado.")
        if [item.get("order") for item in motivating_texts] != list(
            range(len(motivating_texts))
        ):
            errors.append("A ordem dos textos motivadores da redação não é contígua.")
        if not essay or not essay.get("pages"):
            errors.append("Proposta de redação sem páginas/blocos de origem.")
        if essay and not all(page.get("facsimile") for page in essay.get("pages", [])):
            errors.append("Proposta de redação sem fac-símile integral de origem.")

    essay_visual_review_passed = False
    essay_visual_audit_summary: dict[str, Any] | None = None
    if expects_essay and essay and essay.get("visualAudit"):
        try:
            essay_audit_reference = essay["visualAudit"]
            essay_audit_path = repo_path(str(essay_audit_reference["path"]))
            if not essay_audit_path.is_file():
                raise ValueError("arquivo ausente")
            essay_audit_hash = sha256_file(essay_audit_path)
            if essay_audit_hash != essay_audit_reference.get("sha256"):
                raise ValueError("hash do relatório divergente")
            essay_audit = json_load(essay_audit_path)
            if (
                essay_audit.get("corpusId") != config["id"]
                or essay_audit.get("essayId") != essay.get("id")
                or essay_audit.get("essayContentHash") != essay.get("contentHash")
                or essay_audit.get("expected") != 1
                or essay_audit.get("audited") != 1
                or essay_audit.get("passed") != 1
                or essay_audit.get("failed") != 0
                or essay_audit.get("complete") is not True
                or essay_audit.get("canApproveVisual") is not True
            ):
                raise ValueError("cobertura ou vínculo semântico inválido")
            file_evidence = essay_audit.get("inspectedFileEvidence") or {}
            if set(file_evidence) != set(essay_audit.get("inspectedFiles") or []):
                raise ValueError("hashes não cobrem os arquivos inspecionados")
            for artifact, evidence in file_evidence.items():
                path = repo_path(str(artifact))
                if not path.is_file() or sha256_file(path) != evidence.get("sha256"):
                    raise ValueError(f"evidência visual mudou: {artifact}")
                if image_dimensions(path) != (
                    evidence.get("width"),
                    evidence.get("height"),
                ):
                    raise ValueError(f"dimensões da evidência mudaram: {artifact}")
            essay_visual_review_passed = True
            essay_visual_audit_summary = {
                "path": relative(essay_audit_path),
                "sha256": essay_audit_hash,
                "essayContentHash": essay_audit.get("essayContentHash"),
                "expected": 1,
                "audited": 1,
                "passed": 1,
                "failed": 0,
                "complete": True,
                "canApproveVisual": True,
            }
        except (KeyError, TypeError, ValueError, OSError, json.JSONDecodeError) as error:
            errors.append(f"Auditoria visual final da redação inválida: {error}.")

    referenced_assets: set[str] = set()
    asset_errors = 0
    asset_records = list(iter_asset_records(questions, pages, essay))
    for owner, asset in asset_records:
        artifact_path = asset.get("artifactPath")
        if not artifact_path:
            errors.append(f"{owner}: mídia sem artifactPath.")
            asset_errors += 1
            continue
        referenced_assets.add(str(artifact_path))
        try:
            stored = repo_path(str(artifact_path))
        except ValueError as error:
            errors.append(f"{owner}: caminho de mídia inválido: {error}")
            asset_errors += 1
            continue
        if output.resolve() not in stored.parents:
            errors.append(f"{owner}: mídia fora do diretório do corpus: {artifact_path}.")
            asset_errors += 1
            continue
        if not stored.exists():
            errors.append(f"{owner}: mídia ausente {artifact_path}.")
            asset_errors += 1
            continue
        actual_hash = sha256_file(stored)
        if actual_hash != asset.get("sha256"):
            errors.append(f"{owner}: hash divergente em {artifact_path}.")
            asset_errors += 1
        try:
            width, height = image_dimensions(stored)
        except Exception as error:  # registra legibilidade técnica
            errors.append(f"{owner}: imagem ilegível {artifact_path}: {error}")
            asset_errors += 1
            continue
        if (width, height) != (asset.get("width"), asset.get("height")):
            errors.append(f"{owner}: dimensões divergentes em {artifact_path}.")
            asset_errors += 1
        if width < 24 or height < 24:
            errors.append(f"{owner}: imagem pequena demais ({width}×{height}) em {artifact_path}.")
            asset_errors += 1
    physical_assets = {
        relative(path)
        for path in (output / "assets").rglob("*")
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    }
    orphan_assets = sorted(physical_assets - referenced_assets)
    if orphan_assets:
        warnings.append(f"Há {len(orphan_assets)} mídias órfãs no diretório gerado.")

    visual_review_passed = False
    visual_audit_summary: dict[str, Any] | None = None
    visual_audit_reference = config.get("finalVisualAudit")
    conventional_visual_audit = output / "auditoria-visual-final.json"
    if visual_audit_reference or conventional_visual_audit.is_file():
        try:
            visual_audit_path = (
                repo_path(str(visual_audit_reference["path"]))
                if visual_audit_reference
                else conventional_visual_audit
            )
            expected_audit_hash = (
                str(visual_audit_reference["sha256"])
                if visual_audit_reference
                else None
            )
            if not visual_audit_path.is_file():
                raise ValueError("arquivo ausente")
            actual_audit_hash = sha256_file(visual_audit_path)
            if expected_audit_hash and actual_audit_hash != expected_audit_hash:
                raise ValueError("hash do relatório divergente")
            visual_audit = json_load(visual_audit_path)
            question_ids = {question["id"] for question in questions}
            visual_rows = visual_audit.get("audits") or []
            visual_ids = {item.get("sourceId") for item in visual_rows}
            current_questions_hash = sha256_file(required_paths["questions"])
            audit_questions_hash = (
                visual_audit.get("questionsArtifact") or {}
            ).get("sha256")
            if audit_questions_hash != current_questions_hash:
                raise ValueError("auditoria não corresponde ao corpus atual")
            if (
                visual_audit.get("corpusId") != config["id"]
                or visual_audit.get("expected") != len(questions)
                or visual_audit.get("audited") != len(questions)
                or visual_audit.get("passed") != len(questions)
                or visual_audit.get("failed") != 0
                or visual_audit.get("complete") is not True
                or visual_audit.get("canApprove") is not True
                or len(visual_rows) != len(questions)
                or visual_ids != question_ids
            ):
                raise ValueError("cobertura ou contagens da auditoria são inválidas")
            for item in visual_rows:
                if item.get("verdict") != "PASS" or not str(
                    item.get("evidence") or ""
                ).strip():
                    raise ValueError(
                        f"{item.get('sourceId')}: PASS sem evidência rastreável"
                    )
                if any(
                    item.get(check) != "PASS"
                    for check in (
                        "statementFidelity",
                        "elementOrder",
                        "alternativeFidelity",
                        "imageLegibility",
                        "questionIsolation",
                    )
                ):
                    raise ValueError(
                        f"{item.get('sourceId')}: check visual não aprovado"
                    )
                inspected = item.get("inspectedFiles") or []
                evidence_hashes = (
                    item.get("evidenceLineage") or {}
                ).get("currentSourceFileHashes") or {}
                if set(inspected) != set(evidence_hashes):
                    raise ValueError(
                        f"{item.get('sourceId')}: hashes não cobrem os arquivos inspecionados"
                    )
                for artifact, expected_hash in evidence_hashes.items():
                    path = repo_path(str(artifact))
                    if not path.is_file() or sha256_file(path) != expected_hash:
                        raise ValueError(
                            f"{item.get('sourceId')}: evidência visual mudou: {artifact}"
                        )
            visual_review_passed = True
            visual_audit_summary = {
                "path": relative(visual_audit_path),
                "sha256": actual_audit_hash,
                "sourceHash": visual_audit.get("sourceHash"),
                "reviewMode": visual_audit.get("reviewMode"),
                "expected": visual_audit.get("expected"),
                "audited": visual_audit.get("audited"),
                "passed": visual_audit.get("passed"),
                "failed": visual_audit.get("failed"),
                "complete": visual_audit.get("complete"),
                "canApprove": visual_audit.get("canApprove"),
                "coverage": visual_audit.get("coverage"),
            }
        except (KeyError, TypeError, ValueError, OSError, json.JSONDecodeError) as error:
            errors.append(f"Auditoria visual final inválida: {error}.")

    structural_passed = not errors
    known_gaps = [
        {
            "code": "pedagogical_classification_missing",
            "count": sum(
                1
                for question in questions
                if any(
                    question.get(field) in (None, "")
                    for field in (
                        "subject",
                        "content",
                        "subcontent",
                        "competency",
                        "ability",
                        "difficulty",
                    )
                )
            ),
            "detail": "Disciplina, conteúdo, subconteúdo, competência, habilidade e dificuldade não foram inferidos sem fonte editorial.",
        },
        {
            "code": "answer_key_human_review_pending",
            "count": len(assignments),
            "detail": "As respostas foram lidas deterministicamente do PDF oficial, mas ainda não receberam confirmação humana no admin.",
        },
        {
            "code": "app_integration_not_performed",
            "count": len(questions),
            "detail": "Nenhuma linha foi importada; fluxo de resposta, correção, página original e mobile não foram testados no EstudAki.",
        },
    ]
    if not visual_review_passed:
        known_gaps.insert(
            1,
            {
                "code": "human_visual_review_pending",
                "count": len(questions),
                "detail": "A ordem visual, a completude e a ausência de mistura precisam ser conferidas lado a lado com os fac-símiles.",
            },
        )
    if expects_essay:
        if not essay_visual_review_passed:
            known_gaps.append(
                {
                    "code": "essay_visual_review_pending",
                    "count": 1,
                    "detail": "A proposta de redação ainda precisa de comparação visual integral com a página oficial.",
                }
            )
        known_gaps.append(
            {
                "code": "essay_module_integration_not_performed",
                "count": 1,
                "detail": "A proposta foi extraída como artefato separado, sem cadastro no módulo de redação.",
            }
        )
    publication_blockers = [item["code"] for item in known_gaps]
    if not structural_passed:
        publication_blockers.insert(0, "structural_validation_failed")
    artifact_paths = {
        "questions": required_paths["questions"],
        "answerKey": required_paths["answerKey"],
        "pages": required_paths["pages"],
        "provenance": required_paths["provenance"],
    }
    if expects_essay:
        artifact_paths["essay"] = required_paths["essay"]
    artifact_hashes = {
        name: {
            "path": relative(path),
            "sha256": sha256_file(path),
            "sizeBytes": path.stat().st_size,
        }
        for name, path in artifact_paths.items()
    }
    asset_manifest_sha256 = canonical_hash(
        [
            {
                "path": path,
                "sha256": sha256_file(repo_path(path)),
            }
            for path in sorted(physical_assets)
        ]
    )
    report = {
        "schemaVersion": SCHEMA_VERSION,
        "corpusId": config["id"],
        "generatedAt": now_iso(),
        "status": "review_required" if structural_passed else "failed",
        "checks": {
            "expectedLogicalQuestions": config["expectedLogicalQuestions"],
            "logicalQuestions": len(logical_numbers),
            "expectedPrintedOccurrences": config["expectedPrintedOccurrences"],
            "printedOccurrences": len(questions),
            "printedSequenceCorrect": actual_signature == expected_signature,
            "languages": dict(Counter(item.get("language") for item in questions)),
            "alternatives": total_alternatives,
            "allHaveFiveAlternatives": all(
                [item.get("key") for item in question.get("alternatives", [])]
                == list("ABCDE")
                for question in questions
            ),
            "answerAssignments": len(assignments),
            "answersByLanguage": dict(Counter(item.get("language") for item in assignments)),
            "annulled": actual_annulled,
            "essayExpected": expects_essay,
            "essayExtracted": bool(essay and essay.get("theme")),
            "essayTheme": essay.get("theme") if essay else None,
            "essayMotivatingTexts": len(essay.get("motivatingTexts", []))
            if essay
            else 0,
            "promptVisualAssets": prompt_visual_count,
            "alternativeVisualAssets": alternative_visual_count,
            "assetReferences": len(asset_records),
            "physicalAssets": len(physical_assets),
            "assetErrors": asset_errors,
            "orphanAssets": len(orphan_assets),
            "extractionErrors": extraction_errors,
            "visualReviewPassed": visual_review_passed,
            "ocrUsed": any(
                bool(question.get("extraction", {}).get("ocrUsed")) for question in questions
            ),
        },
        "requirements": {
            "completeStatement": "visual_review_passed"
            if structural_passed and visual_review_passed
            else (
                "automatic_check_passed_pending_human_review"
                if structural_passed
                else "failed"
            ),
            "elementOrder": "visual_review_passed"
            if visual_review_passed
            else "pending_human_visual_review",
            "allAlternatives": "automatic_check_passed"
            if total_alternatives == config["expectedPrintedOccurrences"] * 5
            else "failed",
            "imageLegibility": "visual_review_passed"
            if not asset_errors and visual_review_passed
            else (
                "hash_and_dimensions_passed_pending_human_review"
                if not asset_errors
                else "failed"
            ),
            "officialAnswerKey": "official_pdf_linked_pending_human_confirmation",
            "numberYearDay": "automatic_check_passed" if actual_signature == expected_signature else "failed",
            "answerableInEstudAki": "not_tested_not_imported",
            "correctionWorks": "not_tested_not_imported",
            "mobile": "not_tested_not_imported",
            "originalPageForAdmin": "artifact_available_app_integration_pending",
            "noMixedQuestionContent": "visual_review_passed"
            if visual_review_passed
            else (
                "automatic_header_marker_check_passed_pending_human_review"
                if not any("outra questão" in error or "cabeçalho" in error for error in errors)
                else "failed"
            ),
        },
        "errors": errors,
        "warnings": warnings,
        "artifactHashes": artifact_hashes,
        "assetManifestSha256": asset_manifest_sha256,
        "visualAudit": visual_audit_summary,
        "knownGaps": known_gaps,
        "publicationGate": {
            "structuralValidationPassed": structural_passed,
            "visualReviewPassed": visual_review_passed,
            "readyForHumanReview": structural_passed and not visual_review_passed,
            "importExecuted": False,
            "publicationAuthorized": False,
            "canPublish": False,
            "blockers": publication_blockers,
        },
    }
    json_dump(output / "relatorio-validacao.json", report)
    markdown = [
        f"# Relatório de validação — ENEM {config['year']} — {config['day']}º dia — Caderno {config['bookletNumber']} {config['bookletColor']}",
        "",
        f"Gerado em {report['generatedAt']}.",
        "",
        "## Resultado",
        "",
        f"- Status: **{report['status']}**",
        f"- Números lógicos: {len(logical_numbers)}/{config['expectedLogicalQuestions']}",
        f"- Ocorrências impressas: {len(questions)}/{config['expectedPrintedOccurrences']}",
        f"- Alternativas estruturadas: {total_alternatives}/{config['expectedPrintedOccurrences'] * 5}",
        f"- Vínculos ao gabarito oficial: {len(assignments)}/{config['expectedPrintedOccurrences']}",
        f"- Tema de redação: {(essay.get('theme') if essay else 'não aplicável') or 'não extraído'}",
        f"- Erros de extração: {extraction_errors}",
        f"- Erros técnicos de mídia: {asset_errors}",
        f"- Auditoria visual: {f'{len(questions)}/{len(questions)} PASS' if visual_review_passed else 'pendente'}",
        f"- Hash do manifesto de mídias: `{asset_manifest_sha256}`",
        "- Importadas/publicadas: 0/0",
        "",
        "## Erros estruturais",
        "",
        *([f"- {error}" for error in errors] or ["- Nenhum erro estrutural automático detectado."]),
        "",
        "## Lacunas reais e bloqueantes",
        "",
        *[
            f"- `{gap['code']}` ({gap['count']}): {gap['detail']}"
            for gap in known_gaps
        ],
        "",
        "## Portão de publicação",
        "",
        "`canPublish` permanece **false**. Este corpus é somente um artefato de revisão; não houve importação, publicação nem teste no fluxo do aluno.",
        "",
    ]
    (output / "relatorio-validacao.md").write_text(
        "\n".join(markdown), encoding="utf-8"
    )
    checkpoint.update(
        {
            "stage": (
                "validated_visual_review_passed_pending_other_gates"
                if structural_passed and visual_review_passed
                else (
                    "validated_review_required"
                    if structural_passed
                    else "validation_failed"
                )
            ),
            "validationReport": relative(output / "relatorio-validacao.json"),
            "validationReportSha256": sha256_file(output / "relatorio-validacao.json"),
            "artifactHashes": artifact_hashes,
            "assetManifestSha256": asset_manifest_sha256,
            "visualAudit": visual_audit_summary,
            "validationErrors": len(errors),
            "publicationAuthorized": False,
            "canPublish": False,
            "updatedAt": now_iso(),
        }
    )
    json_dump(required_paths["checkpoint"], checkpoint)
    return report


def load_batch_config(value: str) -> tuple[dict[str, Any], Path]:
    """Carrega uma lista explícita de corpus sem aceitar caminhos fora do repo."""
    path = config_path(value)
    payload = json_load(path)
    configs = payload.get("configs")
    report_path = payload.get("reportPath")
    if not isinstance(payload.get("id"), str) or not payload["id"].strip():
        raise ValueError("Configuração de lote sem id válido.")
    if (
        not isinstance(configs, list)
        or not configs
        or not all(isinstance(item, str) and item.strip() for item in configs)
    ):
        raise ValueError("Configuração de lote deve declarar uma lista não vazia em configs.")
    if len(configs) != len(set(configs)):
        raise ValueError("Configuração de lote contém corpus repetido.")
    if not isinstance(report_path, str) or not report_path.strip():
        raise ValueError("Configuração de lote sem reportPath válido.")
    destination = repo_path(report_path)
    processing_root = repo_path("data/QUESTÕES/processamento")
    if processing_root not in destination.parents:
        raise ValueError("reportPath do lote deve ficar em data/QUESTÕES/processamento.")
    return payload, path


def batch_report_payload(
    batch: dict[str, Any],
    batch_file: Path,
    items: Sequence[dict[str, Any]],
    *,
    finished: bool,
) -> dict[str, Any]:
    failed = [item for item in items if item.get("status") == "failed"]
    completed = [item for item in items if item.get("status") != "pending"]
    structurally_valid = [
        item
        for item in items
        if item.get("validationStatus") == "review_required"
        and not item.get("validationErrors")
    ]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "batchId": batch["id"],
        "generatedAt": now_iso(),
        "finished": finished,
        "status": (
            "failed"
            if finished and failed
            else "review_required"
            if finished
            else "processing"
        ),
        "configuration": {
            "path": relative(batch_file),
            "sha256": sha256_file(batch_file),
        },
        "summary": {
            "configuredCorpora": len(batch["configs"]),
            "processedCorpora": len(completed),
            "structurallyValidCorpora": len(structurally_valid),
            "failedCorpora": len(failed),
            "printedOccurrences": sum(
                int(item.get("printedOccurrences", 0)) for item in completed
            ),
            "alternatives": sum(int(item.get("alternatives", 0)) for item in completed),
            "answerAssignments": sum(
                int(item.get("answerAssignments", 0)) for item in completed
            ),
        },
        "corpora": list(items),
        "publicationGate": {
            "importExecuted": False,
            "publicationAuthorized": False,
            "canPublish": False,
            "blockers": [
                "individual_human_visual_review_pending",
                "application_import_not_executed",
                "student_answer_flow_not_tested",
                "mobile_review_not_executed",
            ],
        },
    }


def run_batch(batch: dict[str, Any], batch_file: Path, *, resume: bool) -> dict[str, Any]:
    """Executa todos os corpus e registra falhas sem interromper os seguintes."""
    report_path = repo_path(batch["reportPath"])
    items: list[dict[str, Any]] = [
        {
            "config": value,
            "status": "pending",
            "publicationAuthorized": False,
            "canPublish": False,
        }
        for value in batch["configs"]
    ]
    json_dump(
        report_path,
        batch_report_payload(batch, batch_file, items, finished=False),
    )
    for index, value in enumerate(batch["configs"]):
        started_at = now_iso()
        try:
            config, config_file = load_config(value)
            extraction = extract_corpus(config, config_file, resume=resume)
            answers = link_answer_key(config, config_file)
            validation = validate_corpus(config, config_file)
            items[index] = {
                "config": value,
                "corpusId": config["id"],
                "year": config["year"],
                "day": config["day"],
                "startedAt": started_at,
                "finishedAt": now_iso(),
                "status": validation["status"],
                "validationStatus": validation["status"],
                "validationErrors": len(validation.get("errors", [])),
                "printedOccurrences": extraction.get("printedOccurrences", 0),
                "alternatives": extraction.get("alternatives", 0),
                "answerAssignments": answers.get("answers", 0),
                "annulled": answers.get("annulled", []),
                "essayExpected": validation.get("checks", {}).get("essayExpected"),
                "essayExtracted": validation.get("checks", {}).get("essayExtracted"),
                "output": extraction.get("output"),
                "validationReport": relative(
                    repo_path(config["outputDirectory"]) / "relatorio-validacao.json"
                ),
                "publicationAuthorized": False,
                "canPublish": False,
            }
        except Exception as error:  # falha fechada, mas continua o lote
            items[index] = {
                "config": value,
                "startedAt": started_at,
                "finishedAt": now_iso(),
                "status": "failed",
                "errorType": type(error).__name__,
                "error": str(error),
                "publicationAuthorized": False,
                "canPublish": False,
            }
        json_dump(
            report_path,
            batch_report_payload(batch, batch_file, items, finished=False),
        )
    final_report = batch_report_payload(batch, batch_file, items, finished=True)
    json_dump(report_path, final_report)
    return final_report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extrator genérico e recuperável de cadernos oficiais do ENEM"
    )
    parser.add_argument(
        "command",
        choices=["extract", "answers", "validate", "run", "batch"],
        help="Etapa isolada ou execução completa do corpus de revisão.",
    )
    parser.add_argument(
        "--config",
        default="enem-2022-dia-1",
        help="Nome em scripts/enem/config ou caminho JSON dentro do repositório.",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Retoma artefatos somente se PDF, configuração e código mantiverem os hashes.",
    )
    parser.add_argument(
        "--batch-config",
        default="enem-2023-2025-batch",
        help="Configuração da execução em lote dentro de scripts/enem/config.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "batch":
        batch, batch_file = load_batch_config(args.batch_config)
        result = run_batch(batch, batch_file, resume=args.resume)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result.get("status") == "failed" else 0
    config, config_file = load_config(args.config)
    if args.command == "extract":
        result = extract_corpus(config, config_file, resume=args.resume)
    elif args.command == "answers":
        result = link_answer_key(config, config_file)
    elif args.command == "validate":
        result = validate_corpus(config, config_file)
    else:
        extract_corpus(config, config_file, resume=args.resume)
        link_answer_key(config, config_file)
        result = validate_corpus(config, config_file)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result.get("status") == "failed" else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print(
            "Processamento interrompido; o checkpoint válido foi preservado.",
            file=sys.stderr,
        )
        raise SystemExit(130)
    except Exception as error:  # CLI deve falhar fechado e não publicar
        print(f"Erro no corpus ENEM: {error}", file=sys.stderr)
        raise SystemExit(1)
