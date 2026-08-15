#!/usr/bin/env python3
"""Merge audited and selectively regenerated resolutions onto a frozen source."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from generate_authorial_resolutions import (
    ROOT,
    atomic_json,
    digest,
    minimal_question,
    validate_resolution,
)


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def resolution_rows(payload: Any, label: str) -> list[dict[str, Any]]:
    rows = payload.get("resolutions") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        raise SystemExit(f"{label}: resolutions ausente.")
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--parts", type=Path, required=True)
    parser.add_argument("--baseline-audit", type=Path, required=True)
    parser.add_argument("--overrides", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    question_path = args.questions.resolve()
    raw_questions = load(question_path)
    questions = [minimal_question(row) for row in raw_questions]
    source_by_id = {row["sourceId"]: row for row in questions}
    if len(source_by_id) != len(questions):
        raise SystemExit("Identidades duplicadas na fonte.")

    base_path = args.base.resolve()
    base_rows = resolution_rows(load(base_path), "Base")
    final_by_id = {row["sourceId"]: dict(row) for row in base_rows}
    if set(final_by_id) != set(source_by_id):
        raise SystemExit("A base nao cobre exatamente a fonte congelada.")

    part_paths = sorted(args.parts.resolve().glob("lote-*.json"))
    regenerated_ids: set[str] = set()
    part_by_id: dict[str, dict[str, str]] = {}
    for part_path in part_paths:
        payload = load(part_path)
        for resolution in resolution_rows(payload, relative(part_path)):
            source_id = resolution["sourceId"]
            if source_id not in source_by_id or source_id in regenerated_ids:
                raise SystemExit(f"Parte com identidade invalida/duplicada: {source_id}")
            final_by_id[source_id] = resolution
            regenerated_ids.add(source_id)
            part_by_id[source_id] = {
                "path": relative(part_path),
                "sha256": sha256(part_path),
            }

    override_path = args.overrides.resolve()
    override_payload = load(override_path)
    overrides = override_payload.get("overrides") or {}
    if not isinstance(overrides, dict):
        raise SystemExit("Overrides invalidos.")
    manual_ids: set[str] = set()
    for source_id, values in overrides.items():
        if source_id not in source_by_id or not isinstance(values, dict):
            raise SystemExit(f"Override invalido: {source_id}")
        final_by_id[source_id] = {**final_by_id[source_id], **values}
        manual_ids.add(source_id)

    audit_path = args.baseline_audit.resolve()
    baseline_audits = {
        row["sourceId"]: row for row in (load(audit_path).get("audits") or [])
    }
    for source_id, source in source_by_id.items():
        resolution = final_by_id[source_id]
        expected_answer = source.get("answer") or "ANULADA"
        resolution["officialAnswer"] = expected_answer
        if "answerVerified" not in resolution:
            audit = baseline_audits.get(source_id)
            if not audit or audit.get("answerLogic") != "PASS":
                raise SystemExit(
                    f"{source_id}: sem verificacao anterior para completar answerVerified."
                )
            resolution["answerVerified"] = True
            resolution["answerVerification"] = (
                "Verificação independente registrada na auditoria anterior: "
                + str(audit.get("explanation") or "")
            )
        errors = validate_resolution(source, resolution, require_answer_evidence=True)
        if errors:
            raise SystemExit(f"{source_id}: {', '.join(errors)}")

    resolutions = [final_by_id[row["sourceId"]] for row in questions]
    provenance: dict[str, Any] = {}
    for resolution in resolutions:
        source_id = resolution["sourceId"]
        if source_id in manual_ids:
            mode = "manual_verified_remediation"
            artifact = {"path": relative(override_path), "sha256": sha256(override_path)}
        elif source_id in regenerated_ids:
            mode = "selectively_regenerated_high_effort"
            artifact = part_by_id[source_id]
        else:
            mode = "preserved_from_complete_independently_audited_base"
            artifact = {"path": relative(base_path), "sha256": sha256(base_path)}
        provenance[source_id] = {
            "mode": mode,
            "artifact": artifact,
            "resolutionHash": digest(resolution),
        }

    report = {
        "schemaVersion": 2,
        "sourcePath": relative(question_path),
        "sourceFileSha256": sha256(question_path),
        "sourceHash": digest(questions),
        "expectedQuestions": len(questions),
        "processedQuestions": len(resolutions),
        "complete": len(resolutions) == len(questions),
        "generationMode": "verified_artifact_merge_on_frozen_source",
        "base": {"path": relative(base_path), "sha256": sha256(base_path)},
        "baselineAudit": {"path": relative(audit_path), "sha256": sha256(audit_path)},
        "regeneratedParts": len(part_paths),
        "regeneratedQuestions": len(regenerated_ids),
        "manualRemediations": len(manual_ids),
        "preservedQuestions": len(questions) - len(regenerated_ids | manual_ids),
        "finalResolutionSetHash": digest(resolutions),
        "resolutionProvenance": provenance,
        "resolutions": resolutions,
    }
    atomic_json(args.output.resolve(), report)
    print(
        json.dumps(
            {
                key: report[key]
                for key in (
                    "expectedQuestions",
                    "processedQuestions",
                    "complete",
                    "regeneratedQuestions",
                    "manualRemediations",
                    "preservedQuestions",
                    "sourceFileSha256",
                    "sourceHash",
                    "finalResolutionSetHash",
                )
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
