#!/usr/bin/env python3
"""Valida e vincula a auditoria visual final de uma proposta de redacao."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from corpus_pipeline import (
    ROOT,
    image_dimensions,
    json_dump,
    json_load,
    now_iso,
    repo_path,
    sha256_file,
)


CHECKS = (
    "instructionsFidelity",
    "motivatingTextsFidelity",
    "proposalFidelity",
    "elementOrder",
    "imageLegibility",
    "creditIsolation",
    "noDuplicatedContent",
)


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def content_sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--review", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    config = json_load(args.config.resolve())
    review_path = args.review.resolve()
    review = json_load(review_path)
    corpus_output = repo_path(config["outputDirectory"])
    essay_path = corpus_output / "redacao.json"
    essay = json_load(essay_path)
    if (
        review.get("corpusId") != config.get("id")
        or review.get("essayId") != essay.get("id")
        or review.get("expectedContentHash") != essay.get("contentHash")
        or review.get("verdict") != "PASS"
        or any((review.get("checks") or {}).get(check) != "PASS" for check in CHECKS)
    ):
        raise SystemExit("Revisao visual da redacao nao corresponde ao artefato atual.")

    motivating = essay.get("motivatingTexts") or []
    if [item.get("label") for item in motivating] != [
        "TEXTO I",
        "TEXTO II",
        "TEXTO III",
        "TEXTO IV",
    ] or [item.get("order") for item in motivating] != [0, 1, 2, 3]:
        raise SystemExit("Textos motivadores ausentes ou fora de ordem.")
    for item in motivating:
        content = str(item.get("content") or "").strip()
        credit = str(item.get("creditText") or "").strip()
        if not content or not credit:
            raise SystemExit(f"{item.get('label')}: conteudo ou credito ausente.")
        if credit in content:
            raise SystemExit(f"{item.get('label')}: credito duplicado no conteudo.")
        if item.get("textSha256") != content_sha256(content):
            raise SystemExit(f"{item.get('label')}: hash textual divergente.")

    table = motivating[1].get("table") or {}
    if (
        len(table.get("columns") or []) != 2
        or len(table.get("rows") or []) != 2
        or any(len(row) != 2 for row in table.get("rows") or [])
    ):
        raise SystemExit("Tabela do TEXTO II incompleta.")
    if len(motivating[1].get("visualAssets") or []) != 1:
        raise SystemExit("TEXTO II sem tabela visual vinculada.")
    if len(motivating[3].get("visualAssets") or []) != 1:
        raise SystemExit("TEXTO IV sem capa visual vinculada.")
    if any(item.get("visualAssets") for item in (motivating[0], motivating[2])):
        raise SystemExit("Midia vinculada ao texto motivador incorreto.")

    blocks = essay.get("blocks") or []
    expected_types = [
        "instructions",
        "motivating_text",
        "motivating_text",
        "motivating_text",
        "motivating_text",
        "proposal",
    ]
    if (
        [item.get("type") for item in blocks] != expected_types
        or [item.get("order") for item in blocks] != list(range(6))
    ):
        raise SystemExit("Blocos normalizados da redacao estao incompletos.")
    if not str(essay.get("instructions") or "").strip():
        raise SystemExit("Instrucoes da redacao ausentes.")
    if not str(essay.get("proposalText") or "").strip() or not str(
        essay.get("theme") or ""
    ).strip():
        raise SystemExit("Proposta ou tema da redacao ausente.")

    facsimiles = [
        item["facsimile"]["storagePath"] for item in essay.get("pages") or []
    ]
    visuals = [item["storagePath"] for item in essay.get("visualAssets") or []]
    expected_files = list(dict.fromkeys([*facsimiles, *visuals]))
    inspected = review.get("inspectedFiles") or []
    if set(inspected) != set(expected_files):
        raise SystemExit("Revisao nao cobre pagina e recortes atuais da redacao.")
    inspected_hashes: dict[str, dict[str, Any]] = {}
    for artifact in inspected:
        path = repo_path(str(artifact))
        if not path.is_file():
            raise SystemExit(f"Evidencia visual ausente: {artifact}")
        width, height = image_dimensions(path)
        if width < 100 or height < 100:
            raise SystemExit(f"Evidencia visual pequena demais: {artifact}")
        inspected_hashes[artifact] = {
            "sha256": sha256_file(path),
            "width": width,
            "height": height,
        }

    correction = (essay.get("extraction") or {}).get("editorialCorrection") or {}
    output_path = args.output.resolve()
    report = {
        "schemaVersion": 1,
        "corpusId": config["id"],
        "essayId": essay["id"],
        "generatedAt": now_iso(),
        "essayContentHash": essay["contentHash"],
        "essayArtifact": {
            "path": relative(essay_path),
            "sha256BeforeReviewMetadata": sha256_file(essay_path),
        },
        "expected": 1,
        "audited": 1,
        "passed": 1,
        "failed": 0,
        "complete": True,
        "canApproveVisual": True,
        "publicationAuthorized": False,
        "checks": review["checks"],
        "evidence": review.get("evidence"),
        "inspectedFiles": inspected,
        "inspectedFileEvidence": inspected_hashes,
        "reviewSource": {
            "path": relative(review_path),
            "sha256": sha256_file(review_path),
        },
        "editorialCorrection": correction,
    }
    json_dump(output_path, report)
    audit_hash = sha256_file(output_path)

    essay["reviewStatus"] = "visual_review_passed"
    essay["publicationStatus"] = "blocked"
    essay["publicationBlockers"] = [
        value
        for value in essay.get("publicationBlockers") or []
        if value != "essay_visual_review_pending"
    ]
    essay["visualAudit"] = {
        "path": relative(output_path),
        "sha256": audit_hash,
        "essayContentHash": essay["contentHash"],
        "complete": True,
        "passed": 1,
        "failed": 0,
        "canApproveVisual": True,
    }
    json_dump(essay_path, essay)

    checkpoint_path = corpus_output / "checkpoint.json"
    checkpoint = json_load(checkpoint_path)
    checkpoint["essayAudit"] = essay["visualAudit"]
    checkpoint["stage"] = "essay_visual_review_passed_pending_pedagogy"
    checkpoint["updatedAt"] = now_iso()
    json_dump(checkpoint_path, checkpoint)
    print(
        json.dumps(
            {
                "essayContentHash": essay["contentHash"],
                "auditSha256": audit_hash,
                "essaySha256": sha256_file(essay_path),
                "expected": 1,
                "audited": 1,
                "passed": 1,
                "failed": 0,
                "complete": True,
                "canApproveVisual": True,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
