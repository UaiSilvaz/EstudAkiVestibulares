#!/usr/bin/env python3
"""Gera folhas locais lado a lado para revisao visual humana rastreavel.

Cada folha mostra o fac-simile oficial completo, a representacao textual
estruturada e todas as midias que o aluno recebera. O manifesto registra os
hashes fisicos consultados. Este utilitario nao aprova nem publica questoes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import textwrap
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
CANVAS_WIDTH = 1800
MARGIN = 28
GAP = 24
LEFT_WIDTH = 830
RIGHT_WIDTH = CANVAS_WIDTH - MARGIN * 2 - GAP - LEFT_WIDTH
FONT_PATH = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD_PATH = Path("C:/Windows/Fonts/arialbd.ttf")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def local_path(value: str) -> Path:
    candidate = (ROOT / value).resolve()
    if ROOT not in candidate.parents or not candidate.is_file():
        raise ValueError(f"Arquivo de revisao ausente ou fora do repositorio: {value}")
    return candidate


def font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD_PATH if bold else FONT_PATH), size)


def fit_image(path: Path, width: int, max_height: int | None = None) -> Image.Image:
    with Image.open(path) as source:
        image = source.convert("RGB")
    ratio = min(1.0, width / image.width)
    if max_height:
        ratio = min(ratio, max_height / image.height)
    size = (max(1, round(image.width * ratio)), max(1, round(image.height * ratio)))
    return image.resize(size, Image.Resampling.LANCZOS) if size != image.size else image


def wrapped_lines(value: str, width: int) -> list[str]:
    output: list[str] = []
    for raw in str(value or "").splitlines() or [""]:
        output.extend(textwrap.wrap(raw, width=width, replace_whitespace=False) or [""])
    return output


def structured_lines(question: dict[str, Any]) -> list[tuple[str, bool]]:
    lines: list[tuple[str, bool]] = [
        (question["id"], True),
        (
            f"Numero {question['officialNumber']} | idioma {question['language']} | "
            f"pagina(s) {question.get('source', {}).get('officialPdfPages')}",
            False,
        ),
        ("BLOCOS DIGITALIZADOS", True),
    ]
    for block in question.get("blocks") or []:
        heading = f"[{block.get('order')}] {str(block.get('type') or '').upper()}"
        lines.append((heading, True))
        if block.get("type") == "image":
            lines.append((str(block.get("altText") or block.get("content") or ""), False))
        else:
            lines.extend((item, False) for item in wrapped_lines(block.get("content") or "", 70))
    lines.append(("ALTERNATIVAS ESTRUTURADAS", True))
    for alternative in question.get("alternatives") or []:
        image_count = len(alternative.get("imageArtifacts") or [])
        prefix = f"{alternative.get('key')}) "
        value = str(alternative.get("text") or "[sem texto]")
        wrapped = wrapped_lines(prefix + value, 70)
        if image_count:
            wrapped[-1] += f"  [midias: {image_count}]"
        lines.extend((item, False) for item in wrapped)
    answer = question.get("officialAnswerKey") or {}
    lines.append(
        (
            "GABARITO OFICIAL VINCULADO: "
            + str(answer.get("correctAlternative") or answer.get("situation") or "ausente"),
            True,
        )
    )
    return lines


def render_text_panel(question: dict[str, Any]) -> Image.Image:
    normal = font(23)
    bold = font(24, bold=True)
    line_height = 32
    lines = structured_lines(question)
    height = MARGIN * 2 + line_height * (len(lines) + 1)
    panel = Image.new("RGB", (RIGHT_WIDTH, height), "white")
    draw = ImageDraw.Draw(panel)
    y = MARGIN
    for value, is_bold in lines:
        draw.text((MARGIN, y), value, fill="black", font=bold if is_bold else normal)
        y += line_height
    return panel


def source_records(question: dict[str, Any]) -> list[dict[str, Any]]:
    records = [*(question.get("originalCrops") or []), *(question.get("assets") or [])]
    output: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in records:
        path = str(item.get("artifactPath") or item.get("storagePath") or "")
        if not path or path in seen:
            continue
        seen.add(path)
        output.append({**item, "path": path})
    return output


def render_sheet(question: dict[str, Any], destination: Path) -> dict[str, Any]:
    records = source_records(question)
    originals = [item for item in records if item.get("type") == "official_question_original"]
    if not originals:
        raise ValueError(f"{question['id']}: sem recorte original")

    original_images = [fit_image(local_path(item["path"]), LEFT_WIDTH) for item in originals]
    left_height = sum(image.height for image in original_images) + GAP * (len(original_images) - 1)
    text_panel = render_text_panel(question)
    top_height = max(left_height, text_panel.height)

    secondary = [item for item in records if item not in originals]
    cards: list[tuple[dict[str, Any], Image.Image]] = []
    card_width = (CANVAS_WIDTH - MARGIN * 2 - GAP * 3) // 4
    for item in secondary:
        cards.append((item, fit_image(local_path(item["path"]), card_width, 470)))
    card_font = font(18)
    card_heights: list[int] = []
    for row_start in range(0, len(cards), 4):
        row = cards[row_start : row_start + 4]
        card_heights.append(max((image.height + 76 for _item, image in row), default=0))
    secondary_height = sum(card_heights) + GAP * max(0, len(card_heights) - 1)
    canvas_height = MARGIN * 2 + top_height + (GAP + secondary_height if cards else 0)
    canvas = Image.new("RGB", (CANVAS_WIDTH, canvas_height), "#eceff3")

    y = MARGIN
    for image in original_images:
        canvas.paste(image, (MARGIN, y))
        y += image.height + GAP
    canvas.paste(text_panel, (MARGIN + LEFT_WIDTH + GAP, MARGIN))

    draw = ImageDraw.Draw(canvas)
    y = MARGIN + top_height + (GAP if cards else 0)
    for row_index, row_start in enumerate(range(0, len(cards), 4)):
        row = cards[row_start : row_start + 4]
        for column, (item, image) in enumerate(row):
            x = MARGIN + column * (card_width + GAP)
            canvas.paste(image, (x, y + 56))
            label = f"{item.get('type')} | {Path(item['path']).name}"
            draw.text((x, y), label[:52], fill="black", font=card_font)
            draw.text((x, y + 24), str(item.get("sha256") or "")[:24], fill="#374151", font=card_font)
        y += card_heights[row_index] + GAP

    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, format="PNG", optimize=True)
    return {
        "sourceId": question["id"],
        "officialNumber": question["officialNumber"],
        "language": question["language"],
        "sheetPath": destination.relative_to(ROOT).as_posix(),
        "sheetSha256": sha256(destination),
        "sheetWidth": canvas.width,
        "sheetHeight": canvas.height,
        "sourceFiles": [
            {
                "path": item["path"],
                "declaredSha256": item.get("sha256"),
                "physicalSha256": sha256(local_path(item["path"])),
            }
            for item in records
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    questions_path = args.questions.resolve()
    output = args.output.resolve()
    rows = load_json(questions_path)
    if not isinstance(rows, list) or not rows:
        raise SystemExit("Manifesto de questoes invalido.")
    output.mkdir(parents=True, exist_ok=True)
    sheets = [
        render_sheet(row, output / f"q{int(row['officialNumber']):03d}-{row['language']}.png")
        for row in rows
    ]
    manifest = {
        "schemaVersion": 1,
        "method": "local_side_by_side_human_visual_review",
        "questionsPath": questions_path.relative_to(ROOT).as_posix(),
        "questionsSha256": sha256(questions_path),
        "expected": len(rows),
        "sheets": sheets,
    }
    manifest_path = output / "manifesto-folhas-revisao.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "questions": len(rows),
                "sourceFiles": sum(len(item["sourceFiles"]) for item in sheets),
                "questionsSha256": manifest["questionsSha256"],
                "manifest": manifest_path.relative_to(ROOT).as_posix(),
                "manifestSha256": sha256(manifest_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
