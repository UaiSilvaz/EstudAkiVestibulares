#!/usr/bin/env python3
"""Finalize authorial-resolution audit with explicit manual review decisions."""

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


CHECKS = ("contentFidelity", "answerLogic", "alternativeAnalysis")


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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--resolutions", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--manual-decisions", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    question_path = args.questions.resolve()
    questions = [minimal_question(row) for row in load(question_path)]
    source_by_id = {row["sourceId"]: row for row in questions}
    resolution_path = args.resolutions.resolve()
    resolution_payload = load(resolution_path)
    resolutions = resolution_payload.get("resolutions") or []
    resolution_by_id = {row["sourceId"]: row for row in resolutions}
    if set(source_by_id) != set(resolution_by_id):
        raise SystemExit("Resolucoes nao cobrem exatamente a fonte.")
    if resolution_payload.get("sourceFileSha256") != sha256(question_path):
        raise SystemExit("Resolucoes nao estao vinculadas aos bytes da fonte congelada.")

    baseline_path = args.baseline.resolve()
    baseline_payload = load(baseline_path)
    baseline_by_id = {
        row["sourceId"]: row for row in baseline_payload.get("audits") or []
    }
    decisions_path = args.manual_decisions.resolve()
    decisions_payload = load(decisions_path)
    decisions = decisions_payload.get("decisions") or []
    decision_by_id = {row["sourceId"]: row for row in decisions}
    if len(decision_by_id) != len(decisions):
        raise SystemExit("Decisoes manuais duplicadas.")

    provenance = resolution_payload.get("resolutionProvenance") or {}
    changed_ids = {
        source_id
        for source_id, item in provenance.items()
        if item.get("mode") != "preserved_from_complete_independently_audited_base"
    }
    if changed_ids != set(decision_by_id):
        raise SystemExit(
            "Decisoes manuais devem cobrir exatamente as resolucoes alteradas."
        )

    audits: list[dict[str, Any]] = []
    for source in questions:
        source_id = source["sourceId"]
        resolution = resolution_by_id[source_id]
        errors = validate_resolution(source, resolution, require_answer_evidence=True)
        if errors:
            raise RuntimeError(f"{source_id}: {', '.join(errors)}")
        resolution_hash = digest(resolution)
        decision = decision_by_id.get(source_id)
        if decision:
            if decision.get("approved") is not True:
                raise RuntimeError(f"{source_id}: decisao manual nao aprovada.")
            explanation = (
                "Revisão editorial manual do enunciado, gabarito, resolução completa "
                "e comentários A–E. Evidência lógica: "
                + resolution["answerVerification"]
            )
            if decision.get("note"):
                explanation += " Nota editorial: " + str(decision["note"])
            method = "manual_full_resolution_and_A_E_review"
        else:
            baseline = baseline_by_id.get(source_id)
            if (
                not baseline
                or baseline.get("verdict") != "PASS"
                or any(baseline.get(check) != "PASS" for check in CHECKS)
            ):
                raise RuntimeError(f"{source_id}: PASS anterior ausente.")
            explanation = (
                str(baseline.get("explanation") or "")
                + " O texto autoral previamente aprovado foi preservado; somente foram "
                "acrescentados os campos de vínculo explícito ao gabarito, usando a própria "
                "evidência lógica desta auditoria-base."
            )
            method = "independent_pass_carried_forward_unchanged_authorial_content"

        audits.append(
            {
                "sourceId": source_id,
                "officialNumber": source["officialNumber"],
                "language": source["language"],
                "verdict": "PASS",
                **{check: "PASS" for check in CHECKS},
                "issueCodes": [],
                "explanation": explanation,
                "recommendedAction": "Manter a resolução autoral atual.",
                "reviewMethod": method,
                "officialAnswer": resolution["officialAnswer"],
                "answerVerification": resolution["answerVerification"],
                "resolutionHash": resolution_hash,
                "provenance": provenance[source_id],
            }
        )

    report = {
        "schemaVersion": 1,
        "method": "independent_baseline_plus_manual_review_of_every_changed_resolution",
        "sourcePath": relative(question_path),
        "sourceFileSha256": sha256(question_path),
        "resolutionPath": relative(resolution_path),
        "resolutionFileSha256": sha256(resolution_path),
        "resolutionSetHash": digest(resolutions),
        "baselinePath": relative(baseline_path),
        "baselineSha256": sha256(baseline_path),
        "manualDecisionsPath": relative(decisions_path),
        "manualDecisionsSha256": sha256(decisions_path),
        "expected": len(questions),
        "audited": len(audits),
        "passed": len(audits),
        "failed": 0,
        "complete": len(audits) == len(questions),
        "canApprove": len(audits) == len(questions),
        "manualReviews": len(decision_by_id),
        "carriedForwardPasses": len(questions) - len(decision_by_id),
        "audits": audits,
    }
    atomic_json(args.output.resolve(), report)
    print(
        json.dumps(
            {
                key: report[key]
                for key in (
                    "expected",
                    "audited",
                    "passed",
                    "failed",
                    "complete",
                    "canApprove",
                    "manualReviews",
                    "carriedForwardPasses",
                    "sourceFileSha256",
                    "resolutionSetHash",
                )
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
