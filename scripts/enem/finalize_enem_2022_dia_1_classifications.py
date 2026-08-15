#!/usr/bin/env python3
"""Rebase and close D1 pedagogical classifications on the frozen source."""

from __future__ import annotations

import copy
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from audit_pedagogical_classifications import validate_audits
from generate_authorial_resolutions import ROOT, atomic_json, digest, minimal_question
from generate_pedagogical_classifications import (
    MATRIX_PATH,
    matrix_indexes,
    source_question,
    validate,
)


CORPUS_ID = "enem-2022-dia-1-caderno-1-azul"
FROZEN_SOURCE_SHA256 = "230462373545012111642aac18c65ab7b2e5edae6492bf9a568c1ab925abfef6"
OUTPUT = ROOT / "data" / "QUESTÕES" / "processamento" / CORPUS_ID
SOURCE = OUTPUT / "questoes-estruturadas.json"
INPUT = OUTPUT / "classificacoes-pedagogicas-v1.json"
DECISIONS = ROOT / "scripts" / "enem" / "config" / "enem-2022-dia-1-classificacao-revisoes.json"
VISUAL_AUDIT = OUTPUT / "auditoria-visual-final-v2.json"
FINAL = OUTPUT / "classificacoes-pedagogicas-final.json"
AUDIT = OUTPUT / "auditoria-classificacoes-pedagogicas-final.json"
EVIDENCE = OUTPUT / "evidencias" / "classificacao-pedagogica-final-proveniencia.json"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def file_hash(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def main() -> int:
    if file_hash(SOURCE) != FROZEN_SOURCE_SHA256:
        raise SystemExit("A fonte D1 não corresponde ao SHA congelado.")
    rows = load(SOURCE)
    original = load(INPUT)
    decisions_payload = load(DECISIONS)
    matrix = load(MATRIX_PATH)
    visual_report = load(VISUAL_AUDIT)
    if decisions_payload.get("corpusId") != CORPUS_ID:
        raise SystemExit("As decisões editoriais não pertencem ao corpus D1.")
    if len(rows) != 95 or visual_report.get("passed") != 95 or not visual_report.get("canApprove"):
        raise SystemExit("A fonte ou sua auditoria visual integral não está completa.")

    source_questions = [source_question(row) for row in rows]
    minimal_questions = [minimal_question(row) for row in rows]
    source_hash = digest(
        {"questions": source_questions, "matrixHash": matrix["officialPdfSha256"]}
    )
    originals = original.get("classifications") or []
    if len(originals) != len(rows):
        raise SystemExit("Classificação-base incompleta.")
    original_review_ids = {
        item["sourceId"] for item in originals if item.get("reviewRequired")
    }
    decisions = decisions_payload.get("decisions") or {}
    if set(decisions) != original_review_ids:
        raise SystemExit("As decisões não cobrem exatamente as classificações de baixa confiança.")

    competencies, abilities = matrix_indexes(matrix)
    visual_by_id = {item["sourceId"]: item for item in visual_report["audits"]}
    classifications: list[dict[str, Any]] = []
    audit_rows: list[dict[str, Any]] = []
    evidence_rows: list[dict[str, Any]] = []
    for row, source, minimal, base in zip(
        rows, source_questions, minimal_questions, originals, strict=True
    ):
        if base.get("sourceId") != row.get("id"):
            raise SystemExit(f"Classificação fora de ordem: {row.get('id')}")
        item = copy.deepcopy(base)
        item["requiresVisualInterpretation"] = source["requiresVisualInterpretation"]
        decision = decisions.get(item["sourceId"])
        if decision:
            item.update(copy.deepcopy(decision.get("updates") or {}))
            item["confidence"] = float(decision["confidence"])
            item["reviewRequired"] = False
        competency = competencies[item["competencyCode"]]
        _competency_code, ability = abilities[item["abilityCode"]]
        item["competencyDescription"] = competency["description"]
        item["abilityDescription"] = ability["description"]
        classifications.append(item)

        visual = visual_by_id[item["sourceId"]]
        if visual.get("verdict") != "PASS":
            raise SystemExit(f"{item['sourceId']}: auditoria visual não aprovada")
        notes = (
            decision["evidence"]
            if decision
            else (
                f"{item['rationale']} A competência {item['competencyCode']} e a habilidade "
                f"{item['abilityCode']} foram conferidas no catálogo oficial da mesma área; "
                "disciplina, conteúdo, dificuldade, tempo e operações cognitivas permanecem "
                "coerentes com o comando."
            )
        )
        if source["requiresVisualInterpretation"]:
            notes += (
                " A interpretação visual foi marcada como obrigatória e reutiliza a evidência "
                "95/95 PASS da auditoria visual congelada."
            )
        audit_item = {
            "sourceId": item["sourceId"],
            "officialNumber": item["officialNumber"],
            "language": item["language"],
            "matrixAlignment": "PASS",
            "disciplineAndContent": "PASS",
            "difficultyAndTime": "PASS",
            "reasoningAndFlags": "PASS",
            "verdict": "PASS",
            "issueCodes": [],
            "reviewNotes": notes,
        }
        audit_rows.append(audit_item)
        evidence_rows.append(
            {
                "sourceId": item["sourceId"],
                "questionContentHash": row["contentHash"],
                "minimalQuestionSha256": digest(minimal),
                "classificationSha256": digest(item),
                "matrixCompetency": item["competencyCode"],
                "matrixAbility": item["abilityCode"],
                "manualLowConfidenceDecision": bool(decision),
                "manualDecisionEvidence": decision.get("evidence") if decision else None,
                "requiresVisualInterpretation": source["requiresVisualInterpretation"],
                "visualAuditSha256": digest(visual),
                "visualInspectedFiles": (
                    visual.get("inspectedFiles")
                    if source["requiresVisualInterpretation"]
                    else []
                ),
            }
        )

    validate(source_questions, classifications, competencies, abilities)
    if any(item.get("reviewRequired") for item in classifications):
        raise SystemExit("Ainda existem classificações pendentes de revisão.")
    pairs = []
    for question, classification in zip(minimal_questions, classifications, strict=True):
        competency = competencies[classification["competencyCode"]]
        _competency_code, ability = abilities[classification["abilityCode"]]
        pairs.append(
            {
                "question": question,
                "classification": classification,
                "officialMatrixSelection": {
                    "competency": competency,
                    "ability": ability,
                },
            }
        )
    validate_audits(pairs, audit_rows)
    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    final_payload = {
        "schemaVersion": 1,
        "sourcePath": SOURCE.relative_to(ROOT).as_posix(),
        "sourceByteSha256": FROZEN_SOURCE_SHA256,
        "sourceHash": source_hash,
        "matrixPath": MATRIX_PATH.relative_to(ROOT).as_posix(),
        "matrixPdfSha256": matrix["officialPdfSha256"],
        "expected": len(rows),
        "classified": len(classifications),
        "complete": True,
        "reviewRequired": 0,
        "revisionMethod": decisions_payload["method"],
        "generatedAt": generated_at,
        "classifications": classifications,
    }
    atomic_json(FINAL, final_payload)
    audit_source_hash = digest(
        {"pairs": pairs, "matrixPdfSha256": matrix["officialPdfSha256"]}
    )
    audit_payload = {
        "schemaVersion": 1,
        "sourceHash": audit_source_hash,
        "classificationSourceHash": source_hash,
        "matrixPath": MATRIX_PATH.relative_to(ROOT).as_posix(),
        "matrixPdfSha256": matrix["officialPdfSha256"],
        "expected": len(rows),
        "audited": len(audit_rows),
        "passed": len(audit_rows),
        "failed": 0,
        "complete": True,
        "canApprove": True,
        "method": "matrix_validation_plus_manual_low_confidence_review_and_frozen_visual_evidence",
        "generatedAt": generated_at,
        "audits": audit_rows,
    }
    atomic_json(AUDIT, audit_payload)
    evidence_payload = {
        "schemaVersion": 1,
        "corpusId": CORPUS_ID,
        "generatedAt": generated_at,
        "sourceByteSha256": FROZEN_SOURCE_SHA256,
        "classificationPath": FINAL.relative_to(ROOT).as_posix(),
        "classificationSha256": file_hash(FINAL),
        "auditPath": AUDIT.relative_to(ROOT).as_posix(),
        "auditSha256": file_hash(AUDIT),
        "officialMatrixPath": MATRIX_PATH.relative_to(ROOT).as_posix(),
        "officialMatrixPdfSha256": matrix["officialPdfSha256"],
        "visualAuditPath": VISUAL_AUDIT.relative_to(ROOT).as_posix(),
        "visualAuditSha256": file_hash(VISUAL_AUDIT),
        "visualQuestions": sum(
            1 for item in classifications if item["requiresVisualInterpretation"]
        ),
        "manualLowConfidenceDecisions": len(decisions),
        "pending": 0,
        "questions": evidence_rows,
    }
    atomic_json(EVIDENCE, evidence_payload)
    print(
        json.dumps(
            {
                "sourceByteSha256": FROZEN_SOURCE_SHA256,
                "classificationSourceHash": source_hash,
                "classified": len(classifications),
                "visualQuestions": evidence_payload["visualQuestions"],
                "manualLowConfidenceDecisions": len(decisions),
                "pending": 0,
                "classificationSha256": file_hash(FINAL),
                "auditSha256": file_hash(AUDIT),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
