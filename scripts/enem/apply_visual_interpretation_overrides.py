#!/usr/bin/env python3
"""Apply reviewed visual-interpretation flags without re-extracting stable content."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from generate_authorial_resolutions import ROOT, atomic_json, digest


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()

    questions_path = args.questions.resolve()
    config_path = args.config.resolve()
    audit_path = args.audit.resolve()
    evidence_path = args.evidence.resolve()
    questions = load(questions_path)
    config = load(config_path)
    audit = load(audit_path)
    overrides = config.get("visualInterpretationOverrides") or {}
    if not isinstance(questions, list) or len(questions) != 90:
        raise SystemExit("A fonte não contém exatamente 90 questões.")
    if not overrides or any(not isinstance(value, bool) for value in overrides.values()):
        raise SystemExit("Overrides visuais ausentes ou inválidos.")
    if audit.get("complete") is not True or audit.get("audited") != 90:
        raise SystemExit("A auditoria pedagógica que fundamenta os overrides está incompleta.")
    audit_by_number = {
        str(row["officialNumber"]): row for row in audit.get("audits") or []
    }
    expected_issue = "WRONG_VISUAL_FLAG"
    if any(
        key not in audit_by_number
        or expected_issue not in (audit_by_number[key].get("issueCodes") or [])
        for key in overrides
    ):
        raise SystemExit("Há override sem divergência visual explícita na auditoria independente.")

    before_file_sha = sha256(questions_path)
    rows_by_number = {str(row["officialNumber"]): row for row in questions}
    changes: list[dict[str, Any]] = []
    for key, target in overrides.items():
        row = rows_by_number.get(key)
        if row is None:
            raise SystemExit(f"Questão inexistente no override: {key}")
        before = bool((row.get("flags") or {}).get("requiresVisualInterpretation"))
        if before == target:
            raise SystemExit(f"Questão {key}: override não altera o valor atual.")
        before_hash = digest(row)
        row.setdefault("flags", {})["requiresVisualInterpretation"] = target
        changes.append(
            {
                "sourceId": row["id"],
                "officialNumber": row["officialNumber"],
                "before": before,
                "after": target,
                "beforeQuestionSha256": before_hash,
                "afterQuestionSha256": digest(row),
                "auditIssueCodes": audit_by_number[key]["issueCodes"],
                "auditReviewNotes": audit_by_number[key]["reviewNotes"],
            }
        )

    atomic_json(questions_path, questions)
    questions_directory = questions_path.parent / "questoes"
    for row in questions:
        atomic_json(
            questions_directory / f"questao-{row['officialNumber']}.json",
            row,
        )
    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    evidence = {
        "schemaVersion": 1,
        "method": "independent_pedagogical_audit_visual_flag_remediation",
        "generatedAt": generated_at,
        "questionsPath": questions_path.relative_to(ROOT).as_posix(),
        "questionsBeforeSha256": before_file_sha,
        "questionsAfterSha256": sha256(questions_path),
        "configPath": config_path.relative_to(ROOT).as_posix(),
        "configSha256": sha256(config_path),
        "auditPath": audit_path.relative_to(ROOT).as_posix(),
        "auditSha256": sha256(audit_path),
        "changed": len(changes),
        "changes": changes,
    }
    atomic_json(evidence_path, evidence)
    print(json.dumps(evidence, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
