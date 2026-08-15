#!/usr/bin/env python3
"""Consolida auditoria visual completa com reinspecoes dirigidas rastreaveis."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
from typing import Any

from audit_visual_fidelity import audit_source, validate
from generate_authorial_resolutions import ROOT, atomic_json, digest


CHECKS = (
    "statementFidelity",
    "elementOrder",
    "alternativeFidelity",
    "imageLegibility",
    "questionIsolation",
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def relative(path: Path) -> str:
    resolved = path.resolve()
    if resolved != ROOT and ROOT not in resolved.parents:
        raise ValueError(f"Arquivo fora do projeto: {resolved}")
    return resolved.relative_to(ROOT).as_posix()


def unique_by_id(values: list[dict[str, Any]], label: str) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for value in values:
        source_id = str(value.get("sourceId") or "")
        if not source_id or source_id in indexed:
            raise ValueError(f"{label}: sourceId ausente ou duplicado: {source_id!r}")
        indexed[source_id] = value
    return indexed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", required=True, type=Path)
    parser.add_argument("--baseline-audit", required=True, type=Path)
    parser.add_argument("--corrections", required=True, action="append", type=Path)
    parser.add_argument("--manual-review", required=True, type=Path)
    parser.add_argument("--supporting-audit", action="append", type=Path, default=[])
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    questions_path = args.questions.resolve()
    baseline_path = args.baseline_audit.resolve()
    manual_path = args.manual_review.resolve()
    output_path = args.output.resolve()
    rows = load_json(questions_path)
    if not isinstance(rows, list) or not rows:
        raise SystemExit("Corpus atual deve ser um array nao vazio.")
    sources = [audit_source(row) for row in rows]
    source_index = {item["sourceId"]: item for item in sources}
    row_index = {item["id"]: item for item in rows}
    if len(source_index) != len(rows) or len(row_index) != len(rows):
        raise SystemExit("Identidades duplicadas no corpus atual.")

    baseline = load_json(baseline_path)
    if not baseline.get("complete") or baseline.get("expected") != len(sources):
        raise SystemExit("Auditoria-base precisa ser integral.")
    baseline_index = unique_by_id(baseline.get("audits") or [], "auditoria-base")
    if set(baseline_index) != set(source_index):
        raise SystemExit("Auditoria-base nao cobre as identidades atuais.")

    correction_chain: list[dict[str, Any]] = []
    changed_ids: set[str] = set()
    corpus_ids = {str(row.get("corpusId") or "") for row in rows}
    if len(corpus_ids) != 1:
        raise SystemExit("Corpus atual possui corpusId inconsistente.")
    corpus_id = next(iter(corpus_ids))
    for raw_path in args.corrections:
        path = raw_path.resolve()
        value = load_json(path)
        if value.get("corpusId") != corpus_id:
            raise SystemExit(f"Correcao pertence a outro corpus: {path}")
        questions = value.get("questions") or {}
        if not isinstance(questions, dict) or not questions:
            raise SystemExit(f"Correcao sem questoes: {path}")
        changed_ids.update(questions)
        correction_chain.append(
            {
                "path": relative(path),
                "sha256": sha256_file(path),
                "sourceAudit": value.get("sourceAudit"),
                "changedSourceIds": list(questions),
            }
        )
    if not changed_ids <= set(source_index):
        raise SystemExit("Correcao referencia identidade ausente no corpus atual.")

    manual = load_json(manual_path)
    if manual.get("corpusId") != corpus_id:
        raise SystemExit("Revisao manual pertence a outro corpus.")
    manual_questions = manual.get("questions") or {}
    if set(manual_questions) != changed_ids:
        raise SystemExit(
            "Revisao manual deve cobrir exatamente as ocorrencias alteradas: "
            f"faltam={sorted(changed_ids - set(manual_questions))}; "
            f"excedem={sorted(set(manual_questions) - changed_ids)}."
        )

    final_audits: list[dict[str, Any]] = []
    carried = 0
    targeted = 0
    baseline_hash = sha256_file(baseline_path)
    manual_hash = sha256_file(manual_path)
    for source in sources:
        source_id = source["sourceId"]
        row = row_index[source_id]
        file_hashes = {
            path: sha256_file((ROOT / path).resolve())
            for path in source["sourceFiles"]
        }
        if source_id not in changed_ids:
            audit = copy.deepcopy(baseline_index[source_id])
            if audit.get("verdict") != "PASS":
                raise SystemExit(
                    f"{source_id}: FAIL da base sem correcao e reinspecao."
                )
            audit["evidenceLineage"] = {
                "mode": "baseline_pass_carried_forward",
                "baselineAuditPath": relative(baseline_path),
                "baselineAuditSha256": baseline_hash,
                "unchangedByCorrectionChain": True,
                "currentContentHash": row.get("contentHash"),
                "currentSourceFileHashes": file_hashes,
            }
            carried += 1
        else:
            review = manual_questions[source_id]
            if review.get("expectedContentHash") != row.get("contentHash"):
                raise SystemExit(f"{source_id}: contentHash mudou apos a reinspecao.")
            if review.get("verdict") != "PASS":
                raise SystemExit(f"{source_id}: reinspecao dirigida nao aprovada.")
            inspected = review.get("inspectedFiles") or []
            if set(inspected) != set(source["sourceFiles"]):
                raise SystemExit(f"{source_id}: reinspecao nao cobre todos os arquivos.")
            audit = {
                "sourceId": source_id,
                "officialNumber": source["officialNumber"],
                "language": source["language"],
                "verdict": "PASS",
                **{check: "PASS" for check in CHECKS},
                "inspectedFiles": inspected,
                "issueCodes": [],
                "evidence": review.get("evidence"),
                "recommendedAction": "Aprovar a fidelidade visual da versao atual.",
                "evidenceLineage": {
                    "mode": "targeted_current_visual_reinspection",
                    "manualReviewPath": relative(manual_path),
                    "manualReviewSha256": manual_hash,
                    "currentContentHash": row.get("contentHash"),
                    "currentSourceFileHashes": file_hashes,
                },
            }
            targeted += 1
        final_audits.append(audit)

    validate(sources, final_audits)
    supporting = []
    for raw_path in args.supporting_audit:
        path = raw_path.resolve()
        value = load_json(path)
        supporting.append(
            {
                "path": relative(path),
                "sha256": sha256_file(path),
                "sourceHash": value.get("sourceHash"),
                "expected": value.get("expected"),
                "audited": value.get("audited"),
                "passed": value.get("passed"),
                "failed": value.get("failed"),
                "complete": value.get("complete"),
                "canApprove": value.get("canApprove"),
                "executionStatus": value.get("executionStatus"),
            }
        )
    report = {
        "schemaVersion": 1,
        "corpusId": corpus_id,
        "sourceHash": digest(sources),
        "questionsArtifact": {
            "path": relative(questions_path),
            "sha256": sha256_file(questions_path),
        },
        "expected": len(sources),
        "audited": len(final_audits),
        "passed": len(final_audits),
        "failed": 0,
        "complete": True,
        "canApprove": True,
        "reviewMode": "full_baseline_plus_targeted_current_reinspection",
        "coverage": {
            "baselinePassesCarriedForward": carried,
            "targetedCurrentReinspections": targeted,
            "changedSourceIds": sorted(changed_ids),
        },
        "baselineAudit": {
            "path": relative(baseline_path),
            "sha256": baseline_hash,
            "sourceHash": baseline.get("sourceHash"),
            "expected": baseline.get("expected"),
            "audited": baseline.get("audited"),
            "passed": baseline.get("passed"),
            "failed": baseline.get("failed"),
            "complete": baseline.get("complete"),
        },
        "correctionChain": correction_chain,
        "manualReview": {
            "path": relative(manual_path),
            "sha256": manual_hash,
            "reviewMethod": manual.get("reviewMethod"),
            "sourceIds": sorted(manual_questions),
        },
        "supportingAudits": supporting,
        "audits": final_audits,
    }
    atomic_json(output_path, report)
    print(
        json.dumps(
            {
                "expected": report["expected"],
                "audited": report["audited"],
                "passed": report["passed"],
                "failed": report["failed"],
                "complete": report["complete"],
                "canApprove": report["canApprove"],
                "baselinePassesCarriedForward": carried,
                "targetedCurrentReinspections": targeted,
                "outputSha256": sha256_file(output_path),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
