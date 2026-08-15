from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import fitz

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str((ROOT / "scripts" / "enem").resolve()))

import corpus_pipeline as pipeline  # noqa: E402


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def corpus_config(corpus_id: str) -> dict[str, Any] | None:
    for config_path in sorted((ROOT / "scripts" / "enem" / "config").glob("enem-*.json")):
        try:
            payload = load_json(config_path)
        except Exception:
            continue
        if not isinstance(payload, dict):
            continue
        if payload.get("id") == corpus_id:
            return payload
    return None


def has_facsimile(question: dict[str, Any]) -> bool:
    return any(
        asset.get("type") == "official_prompt_facsimile"
        and Path(str(asset.get("artifactPath", ""))).exists()
        for asset in question.get("assets", [])
    )


def marker_key(question: dict[str, Any]) -> tuple[int, int, float]:
    marker = question.get("source", {}).get("marker", {})
    region = marker.get("sourceRegion", {})
    return (
        int(marker.get("sourcePdfPage") or 0),
        int(marker.get("zoneIndex") or 0),
        float(region.get("y") or 0),
    )


def source_regions_from_blocks(question: dict[str, Any]) -> dict[int, list[fitz.Rect]]:
    regions: dict[int, list[fitz.Rect]] = {}
    candidates: list[dict[str, Any]] = []
    candidates.extend(question.get("blocks", []))
    candidates.extend(question.get("alternatives", []))
    for item in candidates:
        page = item.get("sourcePdfPage")
        region = item.get("sourceRegion")
        if not page and item.get("sourceRegions"):
            first = item["sourceRegions"][0]
            page = first.get("sourcePdfPage")
            region = first.get("sourceRegion")
        if not page or not region:
            continue
        rect = fitz.Rect(
            float(region.get("x") or 0),
            float(region.get("y") or 0),
            float(region.get("x") or 0) + float(region.get("width") or 0),
            float(region.get("y") or 0) + float(region.get("height") or 0),
        )
        if rect.is_empty or rect.width <= 0 or rect.height <= 0:
            continue
        regions.setdefault(int(page), []).append(rect)
    return regions


def main() -> None:
    processing_root = ROOT / "data" / "QUESTÕES" / "processamento"
    generated = 0
    scanned = 0
    for corpus_dir in sorted(processing_root.glob("enem-*")):
        questions_dir = corpus_dir / "questoes"
        if not questions_dir.exists():
            continue
        config = corpus_config(corpus_dir.name)
        if not config:
            continue
        document = fitz.open(str(ROOT / config["officialExamPdf"]))
        try:
            files = sorted(questions_dir.glob("*.json"))
            questions = [(path, load_json(path)) for path in files]
            keyed = [
                (path, question, marker_key(question))
                for path, question in questions
                if question.get("source", {}).get("marker")
            ]
            next_by_question: dict[str, dict[str, Any] | None] = {}
            by_lane: dict[tuple[int, int], list[tuple[Path, dict[str, Any], tuple[int, int, float]]]] = {}
            for item in keyed:
                _, _, key = item
                by_lane.setdefault((key[0], key[1]), []).append(item)
            for lane_items in by_lane.values():
                lane_items.sort(key=lambda item: item[2][2])
                for index, (path, _, _) in enumerate(lane_items):
                    next_by_question[str(path)] = lane_items[index + 1][1] if index + 1 < len(lane_items) else None

            for path, question in questions:
                scanned += 1
                if has_facsimile(question):
                    continue
                marker = question.get("source", {}).get("marker")
                crop_rects: list[tuple[int, fitz.Rect]] = []
                if marker:
                    page_number = int(marker.get("sourcePdfPage") or 0)
                    zone_index = int(marker.get("zoneIndex") or 0)
                    if page_number <= 0 or page_number > document.page_count:
                        continue
                    page = document[page_number - 1]
                    zones = pipeline.layout_rectangles(config, page, page_number)
                    if zone_index >= len(zones):
                        continue
                    zone = fitz.Rect(zones[zone_index])
                    region = marker.get("sourceRegion", {})
                    y0 = max(zone.y0, float(region.get("y") or zone.y0) - 8)
                    next_question = next_by_question.get(str(path))
                    if next_question:
                        next_region = next_question.get("source", {}).get("marker", {}).get("sourceRegion", {})
                        y1 = min(zone.y1, float(next_region.get("y") or zone.y1) - 6)
                    else:
                        y1 = zone.y1
                    if y1 - y0 < 80:
                        y1 = min(zone.y1, y0 + 260)
                    crop_rects.append((page_number, fitz.Rect(zone.x0, y0, zone.x1, y1) & page.rect))
                else:
                    for page_number, rects in sorted(source_regions_from_blocks(question).items()):
                        if page_number <= 0 or page_number > document.page_count:
                            continue
                        page = document[page_number - 1]
                        rect = fitz.Rect(rects[0])
                        for item in rects[1:]:
                            rect |= item
                        rect.x0 = max(page.rect.x0, rect.x0 - 12)
                        rect.y0 = max(page.rect.y0, rect.y0 - 18)
                        rect.x1 = min(page.rect.x1, rect.x1 + 12)
                        rect.y1 = min(page.rect.y1, rect.y1 + 18)
                        crop_rects.append((page_number, rect & page.rect))
                if not crop_rects:
                    continue

                asset_dir = corpus_dir / "assets" / "questoes" / question["id"]
                asset_dir.mkdir(parents=True, exist_ok=True)
                new_assets = []
                for asset_index, (page_number, rect) in enumerate(crop_rects, start=1):
                    page = document[page_number - 1]
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=rect, alpha=False)
                    asset_path = asset_dir / f"enunciado-facsimile-fallback-{asset_index:02d}.png"
                    pix.save(str(asset_path))
                    relative_asset = asset_path.relative_to(ROOT).as_posix()
                    new_assets.append(
                        {
                        "artifactPath": relative_asset,
                        "type": "official_prompt_facsimile",
                        "relation": "statement",
                        "order": asset_index - 1,
                        "altText": f"Print oficial da questão {question.get('officialNumber')} do ENEM {question.get('year')}",
                        "width": pix.width,
                        "height": pix.height,
                        "sha256": pipeline.sha256_file(asset_path),
                        "sourcePdfPage": page_number,
                        "sourceRegion": {
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
                        },
                        },
                    )
                question.setdefault("assets", [])[0:0] = new_assets
                dump_json(path, question)
                generated += 1
        finally:
            document.close()
    print(json.dumps({"scanned": scanned, "generated": generated}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
