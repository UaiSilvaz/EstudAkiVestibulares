#!/usr/bin/env python3
"""Synchronize audited pedagogical fields without changing authorial solution text."""

from __future__ import annotations

import argparse
import copy
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


CLASSIFICATION_FIELDS = (
    "difficulty",
    "estimatedMinutes",
    "knowledgeArea",
    "disciplinaryComponent",
    "content",
    "subcontent",
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


def authorial_payload(resolution: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in resolution.items()
        if key not in CLASSIFICATION_FIELDS
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--resolutions", type=Path, required=True)
    parser.add_argument("--resolution-audit", type=Path, required=True)
    parser.add_argument("--classifications", type=Path, required=True)
    parser.add_argument("--classification-audit", type=Path, required=True)
    parser.add_argument("--output-resolutions", type=Path, required=True)
    parser.add_argument("--output-audit", type=Path, required=True)
    args = parser.parse_args()

    question_path = args.questions.resolve()
    resolution_path = args.resolutions.resolve()
    previous_audit_path = args.resolution_audit.resolve()
    classification_path = args.classifications.resolve()
    classification_audit_path = args.classification_audit.resolve()
    output_resolution_path = args.output_resolutions.resolve()
    output_audit_path = args.output_audit.resolve()
    source_sha = sha256(question_path)
    questions = [minimal_question(row) for row in load(question_path)]
    sources = {question["sourceId"]: question for question in questions}
    previous_payload = load(resolution_path)
    previous_audit = load(previous_audit_path)
    classification_payload = load(classification_path)
    classification_audit = load(classification_audit_path)
    previous_resolutions = previous_payload.get("resolutions") or []
    classifications = classification_payload.get("classifications") or []

    if previous_payload.get("sourceFileSha256") != source_sha:
        raise SystemExit("As resoluções anteriores não pertencem à fonte atual.")
    if (
        previous_audit.get("sourceFileSha256") != source_sha
        or previous_audit.get("canApprove") is not True
        or previous_audit.get("passed") != len(questions)
        or previous_audit.get("failed") != 0
    ):
        raise SystemExit("A auditoria autoral anterior não aprova integralmente a fonte atual.")
    if (
        classification_payload.get("sourceByteSha256") != source_sha
        or classification_payload.get("complete") is not True
        or classification_payload.get("reviewRequired") != 0
        or classification_payload.get("classified") != len(questions)
    ):
        raise SystemExit("A classificação final não está completa ou não pertence à fonte.")
    if (
        classification_audit.get("sourceByteSha256") != source_sha
        or classification_audit.get("classificationSourceHash")
        != classification_payload.get("sourceHash")
        or classification_audit.get("canApprove") is not True
        or classification_audit.get("passed") != len(questions)
        or classification_audit.get("failed") != 0
    ):
        raise SystemExit("A auditoria pedagógica não aprova a classificação final atual.")
    if previous_audit.get("resolutionSetHash") != digest(previous_resolutions):
        raise SystemExit("O hash do conjunto autoral anterior diverge de sua auditoria.")

    previous_by_id = {item["sourceId"]: item for item in previous_resolutions}
    classification_by_id = {item["sourceId"]: item for item in classifications}
    previous_audit_by_id = {
        item["sourceId"]: item for item in previous_audit.get("audits") or []
    }
    if (
        set(sources) != set(previous_by_id)
        or set(sources) != set(classification_by_id)
        or set(sources) != set(previous_audit_by_id)
    ):
        raise SystemExit("Fonte, resoluções, classificações e auditoria não têm cobertura 1:1.")

    synchronized: list[dict[str, Any]] = []
    audit_rows: list[dict[str, Any]] = []
    changes: list[dict[str, Any]] = []
    for source in questions:
        source_id = source["sourceId"]
        before = previous_by_id[source_id]
        classification = classification_by_id[source_id]
        after = copy.deepcopy(before)
        changed_fields: dict[str, dict[str, Any]] = {}
        for field in CLASSIFICATION_FIELDS:
            if after.get(field) != classification.get(field):
                changed_fields[field] = {
                    "before": after.get(field),
                    "after": classification.get(field),
                }
                after[field] = copy.deepcopy(classification.get(field))
        if digest(authorial_payload(before)) != digest(authorial_payload(after)):
            raise RuntimeError(f"{source_id}: conteúdo autoral mudou durante a sincronização.")
        errors = validate_resolution(source, after, require_answer_evidence=True)
        if errors:
            raise RuntimeError(f"{source_id}: {', '.join(errors)}")
        synchronized.append(after)
        prior_audit = previous_audit_by_id[source_id]
        if prior_audit.get("verdict") != "PASS":
            raise RuntimeError(f"{source_id}: PASS autoral anterior ausente.")
        audit_row = copy.deepcopy(prior_audit)
        audit_row["resolutionHash"] = digest(after)
        if changed_fields:
            audit_row["explanation"] = (
                str(prior_audit.get("explanation") or "")
                + " O texto autoral, a lógica da resposta e os comentários A–E permaneceram "
                "idênticos; somente campos pedagógicos foram sincronizados com a classificação "
                "final auditada."
            )
            audit_row["reviewMethod"] = (
                "previous_authorial_pass_plus_audited_classification_metadata_sync"
            )
            changes.append(
                {
                    "sourceId": source_id,
                    "officialNumber": source["officialNumber"],
                    "changedFields": changed_fields,
                    "authorialPayloadSha256": digest(authorial_payload(after)),
                    "beforeResolutionSha256": digest(before),
                    "afterResolutionSha256": digest(after),
                }
            )
        audit_rows.append(audit_row)

    output_payload = copy.deepcopy(previous_payload)
    output_payload["sourceByteSha256"] = source_sha
    output_payload["resolutions"] = synchronized
    output_payload["finalResolutionSetHash"] = digest(synchronized)
    output_payload["classificationSync"] = {
        "method": "audited_pedagogical_metadata_only_sync",
        "previousResolutionPath": relative(resolution_path),
        "previousResolutionSha256": sha256(resolution_path),
        "previousResolutionAuditPath": relative(previous_audit_path),
        "previousResolutionAuditSha256": sha256(previous_audit_path),
        "classificationPath": relative(classification_path),
        "classificationSha256": sha256(classification_path),
        "classificationAuditPath": relative(classification_audit_path),
        "classificationAuditSha256": sha256(classification_audit_path),
        "changedResolutions": len(changes),
        "authorialContentChanged": False,
        "changes": changes,
    }
    atomic_json(output_resolution_path, output_payload)

    audit_payload = {
        "schemaVersion": 1,
        "method": "previous_authorial_90_pass_plus_audited_classification_metadata_sync",
        "sourcePath": relative(question_path),
        "sourceByteSha256": source_sha,
        "sourceFileSha256": source_sha,
        "resolutionPath": relative(output_resolution_path),
        "resolutionFileSha256": sha256(output_resolution_path),
        "resolutionSetHash": digest(synchronized),
        "previousResolutionPath": relative(resolution_path),
        "previousResolutionSha256": sha256(resolution_path),
        "previousAuditPath": relative(previous_audit_path),
        "previousAuditSha256": sha256(previous_audit_path),
        "classificationPath": relative(classification_path),
        "classificationSha256": sha256(classification_path),
        "classificationAuditPath": relative(classification_audit_path),
        "classificationAuditSha256": sha256(classification_audit_path),
        "classificationMetadataChanges": len(changes),
        "authorialContentChanges": 0,
        "expected": len(questions),
        "audited": len(audit_rows),
        "passed": len(audit_rows),
        "failed": 0,
        "complete": len(audit_rows) == len(questions),
        "canApprove": len(audit_rows) == len(questions),
        "audits": audit_rows,
    }
    atomic_json(output_audit_path, audit_payload)
    print(
        json.dumps(
            {
                "expected": len(questions),
                "passed": len(audit_rows),
                "classificationMetadataChanges": len(changes),
                "authorialContentChanges": 0,
                "resolutionSetHash": digest(synchronized),
                "resolutionFileSha256": sha256(output_resolution_path),
                "auditFileSha256": sha256(output_audit_path),
            },
            ensure_ascii=True,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
