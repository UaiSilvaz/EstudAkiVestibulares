#!/usr/bin/env python3
"""Aplica correcoes editoriais rastreaveis a uma proposta de redacao ENEM."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
from typing import Any

import fitz

from apply_enem_2022_dia_1_corrections import normalized_region
from corpus_pipeline import (
    ROOT,
    asset_payload,
    canonical_hash,
    json_dump,
    json_load,
    now_iso,
    repo_path,
    sha256_file,
)


def text_sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def strip_credit(content: str, credit: str | None, label: str) -> str:
    value = content.rstrip()
    source = (credit or "").strip()
    if not source:
        return value
    if not value.endswith(source):
        raise ValueError(f"{label}: credito nao e sufixo exato do conteudo.")
    return value[: -len(source)].rstrip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--corrections", required=True, type=Path)
    args = parser.parse_args()

    config_path = args.config.resolve()
    corrections_path = args.corrections.resolve()
    config = json_load(config_path)
    corrections = json_load(corrections_path)
    if corrections.get("corpusId") != config.get("id"):
        raise SystemExit("Correcao de redacao pertence a outro corpus.")
    output = repo_path(config["outputDirectory"])
    essay_path = output / "redacao.json"
    essay = json_load(essay_path)
    if essay.get("contentHash") != corrections.get("baselineContentHash"):
        raise SystemExit("baselineContentHash da redacao diverge do artefato atual.")
    source_pdf = repo_path(config["officialExamPdf"])
    if (
        sha256_file(source_pdf) != corrections.get("sourcePdfSha256")
        or essay.get("source", {}).get("officialExamSha256")
        != corrections.get("sourcePdfSha256")
    ):
        raise SystemExit("PDF oficial da redacao diverge da correcao.")

    pages = copy.deepcopy(essay.get("pages") or [])
    page_by_number = {int(item["sourcePdfPage"]): item for item in pages}
    assets: list[dict[str, Any]] = []
    assets_by_key: dict[str, dict[str, Any]] = {}
    with fitz.open(source_pdf) as document:
        for order, raw in enumerate(corrections.get("visualRegions") or []):
            page_number = int(raw["page"])
            page = document[page_number - 1]
            rect = normalized_region(page, raw)
            destination = output / "assets" / "redacao" / str(raw["filename"])
            asset = asset_payload(
                destination,
                page,
                rect,
                asset_type="essay_motivating_visual",
                relation="essay_support",
                order=order,
                alt_text=str(raw["altText"]),
                scale=3.0,
            )
            asset["semanticKey"] = str(raw["key"])
            assets.append(asset)
            assets_by_key[str(raw["key"])] = asset
    if len(assets_by_key) != len(assets):
        raise SystemExit("Chaves de midia duplicadas na correcao da redacao.")
    for page_number, page_record in page_by_number.items():
        page_record["visualAssets"] = [
            asset for asset in assets if asset["sourcePdfPage"] == page_number
        ]

    motivating = copy.deepcopy(essay.get("motivatingTexts") or [])
    motivating_by_label = {item["label"]: item for item in motivating}
    if set(motivating_by_label) != {"TEXTO I", "TEXTO II", "TEXTO III", "TEXTO IV"}:
        raise SystemExit("Textos motivadores esperados nao estao completos.")
    for item in motivating:
        item["content"] = strip_credit(
            str(item.get("content") or ""),
            item.get("creditText"),
            str(item["label"]),
        )

    source_page = page_by_number[19]
    source_blocks = {
        int(item["pdfOrder"]): item for item in source_page.get("blocks") or []
    }
    iv_orders = [int(value) for value in corrections["textIVSourceBlockOrders"]]
    iv_content = "\n".join(
        str(source_blocks[order]["content"]).strip() for order in iv_orders
    )
    motivating_by_label["TEXTO IV"]["content"] = iv_content

    table_orders = corrections["textIITableBlockOrders"]
    caption = str(source_blocks[int(table_orders["caption"])]["content"]).strip()
    columns = str(source_blocks[int(table_orders["columns"])]["content"]).splitlines()
    rows = [
        str(source_blocks[int(order)]["content"]).splitlines()
        for order in table_orders["rows"]
    ]
    if len(columns) != 2 or any(len(row) != 2 for row in rows):
        raise SystemExit("Estrutura da tabela do TEXTO II diverge do esperado.")
    motivating_by_label["TEXTO II"]["table"] = {
        "caption": caption,
        "columns": columns,
        "rows": rows,
        "sourceText": str(motivating_by_label["TEXTO II"].get("creditText") or ""),
    }

    assignments = corrections.get("visualAssignments") or {}
    for item in motivating:
        keys = [str(value) for value in assignments.get(item["label"], [])]
        item["visualAssets"] = [copy.deepcopy(assets_by_key[key]) for key in keys]
        item["visualAssetPaths"] = [
            assets_by_key[key]["storagePath"] for key in keys
        ]
        item["textSha256"] = text_sha256(str(item["content"]))

    normalized_blocks: list[dict[str, Any]] = [
        {
            "type": "instructions",
            "order": 0,
            "content": essay.get("instructions"),
            "textSha256": text_sha256(str(essay.get("instructions") or "")),
            "sourcePdfPages": essay.get("source", {}).get("sourcePdfPages") or [],
        }
    ]
    for order, item in enumerate(motivating, start=1):
        normalized_blocks.append(
            {
                "type": "motivating_text",
                "order": order,
                "label": item["label"],
                "content": item["content"],
                "creditText": item.get("creditText"),
                "table": item.get("table"),
                "visualAssetPaths": item.get("visualAssetPaths") or [],
                "textSha256": item["textSha256"],
                "sourcePdfPages": item.get("sourcePdfPages") or [],
            }
        )
    normalized_blocks.append(
        {
            "type": "proposal",
            "order": len(normalized_blocks),
            "content": essay.get("proposalText"),
            "theme": essay.get("theme"),
            "textSha256": text_sha256(str(essay.get("proposalText") or "")),
            "sourcePdfPages": essay.get("source", {}).get("sourcePdfPages") or [],
        }
    )

    result = copy.deepcopy(essay)
    result["motivatingTexts"] = motivating
    result["blocks"] = normalized_blocks
    result["pages"] = pages
    result["visualAssets"] = assets
    result["reviewStatus"] = "corrected_pending_visual_review"
    result["publicationStatus"] = "blocked"
    blockers = list(result.get("publicationBlockers") or [])
    if "essay_visual_review_pending" not in blockers:
        blockers.insert(0, "essay_visual_review_pending")
    result["publicationBlockers"] = list(dict.fromkeys(blockers))
    correction_hash = sha256_file(corrections_path)
    result["extraction"] = {
        **(result.get("extraction") or {}),
        "editorialCorrection": {
            "path": relative(corrections_path),
            "sha256": correction_hash,
            "baselineContentHash": essay["contentHash"],
            "evidence": corrections.get("evidence") or [],
            "correctedAt": now_iso(),
        },
    }
    result["contentHash"] = canonical_hash(
        {
            "theme": result.get("theme"),
            "proposalText": result.get("proposalText"),
            "instructions": result.get("instructions"),
            "motivatingTexts": motivating,
            "blocks": normalized_blocks,
            "rawTextSha256": text_sha256(str(result.get("rawText") or "")),
            "visualAssets": [
                {
                    "path": asset["storagePath"],
                    "sha256": asset["sha256"],
                    "sourceRegion": asset["sourceRegion"],
                }
                for asset in assets
            ],
            "examSha256": result.get("source", {}).get("officialExamSha256"),
        }
    )
    json_dump(essay_path, result)

    checkpoint_path = output / "checkpoint.json"
    checkpoint = json_load(checkpoint_path)
    checkpoint["essayCorrection"] = {
        "path": relative(corrections_path),
        "sha256": correction_hash,
        "baselineContentHash": essay["contentHash"],
        "correctedContentHash": result["contentHash"],
        "essaySha256": sha256_file(essay_path),
    }
    checkpoint["stage"] = "essay_corrected_pending_visual_review"
    checkpoint["updatedAt"] = now_iso()
    json_dump(checkpoint_path, checkpoint)
    print(
        json.dumps(
            {
                "corpusId": config["id"],
                "motivatingTexts": len(motivating),
                "normalizedBlocks": len(normalized_blocks),
                "visualAssets": len(assets),
                "contentHash": result["contentHash"],
                "essaySha256": sha256_file(essay_path),
                "correctionsSha256": correction_hash,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
