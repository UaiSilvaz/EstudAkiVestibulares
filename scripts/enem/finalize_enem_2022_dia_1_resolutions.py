#!/usr/bin/env python3
"""Merge and audit the 95 authorial resolutions for the frozen 2022 D1 corpus."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "data" / "QUESTÕES" / "processamento" / "enem-2022-dia-1-caderno-1-azul"
SOURCE = CORPUS / "questoes-estruturadas.json"
CLASSIFICATIONS = CORPUS / "classificacoes-pedagogicas-final.json"
VISUAL_AUDIT = CORPUS / "auditoria-visual-final-v2.json"
KEY = CORPUS / "gabarito-oficial.json"
BATCH_DIR = CORPUS / "resolucoes-autorais-manuais"
OUTPUT = CORPUS / "resolucoes-autorais-final.json"
AUDIT_OUTPUT = CORPUS / "auditoria-resolucoes-autorais-final.json"
EVIDENCE_OUTPUT = CORPUS / "evidencias" / "resolucoes-autorais-final-proveniencia.json"
EDITORIAL_REVIEW = ROOT / "scripts" / "enem" / "config" / "enem-2022-dia-1-resolucoes-revisao-editorial.json"
EXPECTED_SOURCE_SHA = "230462373545012111642aac18c65ab7b2e5edae6492bf9a568c1ab925abfef6"
LETTERS = "ABCDE"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def digest_bytes(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_digest(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def language(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode().lower()
    return {
        "ingles": "ENGLISH",
        "espanhol": "SPANISH",
        "comum": "NOT_APPLICABLE",
        "portugues": "NOT_APPLICABLE",
    }[normalized]


def normalized_text(value: str) -> str:
    value = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def validate_item(
    item: dict[str, Any],
    source: dict[str, Any],
    classification: dict[str, Any],
    visual: dict[str, Any],
) -> list[str]:
    issues: list[str] = []
    expected_answer = (
        "ANULADA"
        if source.get("answerSituation") == "annulled"
        else source["officialAnswerKey"]["correctAlternative"]
    )
    expected_language = language(source["language"])
    if item.get("sourceId") != source["id"]:
        issues.append("source_id_mismatch")
    if item.get("officialNumber") != source["officialNumber"]:
        issues.append("official_number_mismatch")
    if item.get("language") != expected_language:
        issues.append("language_mismatch")
    if item.get("officialAnswer") != expected_answer or item.get("answerVerified") is not True:
        issues.append("official_answer_mismatch")
    verification = str(item.get("answerVerification") or "").strip()
    if len(verification) < 60:
        issues.append("answer_verification_insufficient")

    exact_fields = (
        "knowledgeArea",
        "disciplinaryComponent",
        "content",
        "subcontent",
        "difficulty",
        "estimatedMinutes",
    )
    for field in exact_fields:
        if item.get(field) != classification.get(field):
            issues.append(f"classification_{field}_mismatch")

    minimums = {
        "shortComment": 40,
        "fullResolution": 180,
        "commonError": 30,
        "studyTip": 30,
    }
    for field, minimum in minimums.items():
        if len(str(item.get(field) or "").strip()) < minimum:
            issues.append(f"{field}_too_short")
    if len(item.get("reasoningPath") or []) < 2:
        issues.append("reasoning_path_incomplete")
    if len(item.get("steps") or []) < 1:
        issues.append("steps_missing")
    if len(item.get("keywords") or []) < 2 or len(item.get("relatedContent") or []) < 1:
        issues.append("pedagogical_support_missing")

    comments = item.get("alternativeComments") or {}
    if set(comments) != set(LETTERS):
        issues.append("alternative_comment_keys_invalid")
    for letter in LETTERS:
        comment = str(comments.get(letter) or "").strip()
        if len(comment) < 25:
            issues.append(f"alternative_{letter}_comment_short")
        if expected_answer != "ANULADA":
            expected_marker = "correta" if letter == expected_answer else "incorreta"
            if expected_marker not in normalized_text(comment):
                issues.append(f"alternative_{letter}_verdict_missing")

    combined = "\n".join(
        [
            str(item.get("shortComment") or ""),
            str(item.get("fullResolution") or ""),
            *[str(value) for value in comments.values()],
            str(item.get("commonError") or ""),
            str(item.get("studyTip") or ""),
        ]
    )
    normalized = normalized_text(combined)
    if re.search(r"\bTODO\b", combined):
        issues.append("todo")
    banned = {
        "placeholder": r"\bplaceholder\b",
        "generic_key_only": r"segundo o gabarito|porque corresponde ao enunciado",
        "unresolved_uncertainty": r"nao e possivel determinar|aguardando revisao|talvez seja",
    }
    for code, pattern in banned.items():
        if re.search(pattern, normalized):
            issues.append(code)

    if visual.get("verdict") != "PASS" or not visual.get("inspectedFiles"):
        issues.append("visual_evidence_missing")
    if classification.get("requiresVisualInterpretation") and visual.get("imageLegibility") != "PASS":
        issues.append("required_visual_not_legible")
    return sorted(set(issues))


def main() -> int:
    require(digest_bytes(SOURCE) == EXPECTED_SOURCE_SHA, "A fonte estruturada congelada foi alterada.")
    source_rows = load(SOURCE)
    classifications_file = load(CLASSIFICATIONS)
    visual_file = load(VISUAL_AUDIT)
    require(classifications_file.get("sourceByteSha256") == EXPECTED_SOURCE_SHA, "Classificação em outra fonte.")
    require(visual_file.get("sourceByteSha256") == EXPECTED_SOURCE_SHA, "Auditoria visual em outra fonte.")
    require(len(source_rows) == 95, "A fonte não contém exatamente 95 ocorrências.")

    batches: list[dict[str, Any]] = []
    batch_evidence: list[dict[str, Any]] = []
    editorial_review = load(EDITORIAL_REVIEW)
    require(editorial_review.get("sourceByteSha256") == EXPECTED_SOURCE_SHA, "Revisão editorial em outra fonte.")
    review_batches = editorial_review.get("batches") or []
    require(len(review_batches) == 3, "A revisão editorial precisa registrar os três lotes.")
    reviewer = str(editorial_review.get("reviewer") or "").strip()
    require(bool(reviewer), "Responsável pela revisão editorial ausente.")
    expected_ranges = ((1, 32), (33, 64), (65, 95))
    for index, (start, end) in enumerate(expected_ranges, 1):
        path = BATCH_DIR / f"lote-{index:02d}.json"
        require(path.is_file(), f"Lote ausente: {path}")
        batch = load(path)
        rows = batch.get("resolutions") or []
        require(batch.get("sourceByteSha256") == EXPECTED_SOURCE_SHA, f"Lote {index} em outra fonte.")
        require(batch.get("printedOrderStart") == start, f"Início incorreto no lote {index}.")
        require(batch.get("printedOrderEnd") == end, f"Fim incorreto no lote {index}.")
        require(len(rows) == end - start + 1, f"Contagem incorreta no lote {index}.")
        review = review_batches[index - 1]
        required_checks = (
            "questionAndAlternativesRead",
            "officialAnswerCompared",
            "resolutionAccuracy",
            "alternativeCommentsSpecific",
            "visualReadWhenRequired",
            "noGenericText",
        )
        require(review.get("printedOrderStart") == start and review.get("printedOrderEnd") == end, f"Faixa da revisão incorreta no lote {index}.")
        require(review.get("batchSha256") == digest_bytes(path), f"A revisão editorial do lote {index} não corresponde ao arquivo atual.")
        require(all(review.get("checks", {}).get(check) is True for check in required_checks), f"Checks editoriais incompletos no lote {index}.")
        require(len(str(review.get("notes") or "").strip()) >= 80, f"Notas editoriais insuficientes no lote {index}.")
        require(not isinstance(review.get("reviewedAt"), type(None)), f"Data de revisão ausente no lote {index}.")
        batches.extend(rows)
        batch_evidence.append(
            {
                "path": path.relative_to(ROOT).as_posix(),
                "sha256": digest_bytes(path),
                "printedOrderStart": start,
                "printedOrderEnd": end,
                "items": len(rows),
            }
        )

    require(len(batches) == 95, "A mesclagem não produziu 95 resoluções.")
    classifications = {row["sourceId"]: row for row in classifications_file["classifications"]}
    visuals = {row["sourceId"]: row for row in visual_file["audits"]}
    require(len(classifications) == 95 and len(visuals) == 95, "Evidência de classificação/visual incompleta.")

    audits: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_identities: set[tuple[int, str]] = set()
    unique_resolution_texts: set[str] = set()
    unique_short_comments: set[str] = set()
    for printed_order, (source, item) in enumerate(zip(source_rows, batches, strict=True), 1):
        source_id = source["id"]
        row_review = review_batches[min((printed_order - 1) // 32, 2)]
        classification = classifications.get(source_id)
        visual = visuals.get(source_id)
        require(classification is not None and visual is not None, f"{source_id}: evidência auxiliar ausente.")
        issues = validate_item(item, source, classification, visual)
        identity = (item.get("officialNumber"), item.get("language"))
        if source_id in seen_ids:
            issues.append("duplicate_source_id")
        if identity in seen_identities:
            issues.append("duplicate_identity")
        seen_ids.add(source_id)
        seen_identities.add(identity)

        full_normalized = normalized_text(str(item.get("fullResolution") or ""))
        short_normalized = normalized_text(str(item.get("shortComment") or ""))
        if full_normalized in unique_resolution_texts:
            issues.append("duplicate_full_resolution")
        if short_normalized in unique_short_comments:
            issues.append("duplicate_short_comment")
        unique_resolution_texts.add(full_normalized)
        unique_short_comments.add(short_normalized)

        issues = sorted(set(issues))
        audits.append(
            {
                "sourceId": source_id,
                "officialNumber": source["officialNumber"],
                "language": language(source["language"]),
                "printedOccurrenceOrder": printed_order,
                "identityMatch": "PASS" if not any("mismatch" in issue or "duplicate" in issue for issue in issues) else "FAIL",
                "officialAnswerMatch": "PASS" if "official_answer_mismatch" not in issues else "FAIL",
                "classificationMatch": "PASS" if not any(issue.startswith("classification_") for issue in issues) else "FAIL",
                "authorialDepth": "PASS" if not any(issue.endswith(("_short", "_missing", "_incomplete")) for issue in issues) else "FAIL",
                "alternativeAnalysis": "PASS" if not any(issue.startswith("alternative_") for issue in issues) else "FAIL",
                "visualEvidence": "PASS" if not any("visual" in issue for issue in issues) else "FAIL",
                "verdict": "PASS" if not issues else "FAIL",
                "issueCodes": issues,
                "resolutionHash": canonical_digest(item),
                "editorialReviewer": reviewer,
                "editorialReviewedAt": row_review["reviewedAt"],
                "editorialReviewBatch": min((printed_order - 1) // 32 + 1, 3),
                "officialKeySourceSha256": source["officialAnswerKey"]["sourceSha256"],
                "visualAuditEvidence": visual["inspectedFiles"],
                "reviewNotes": (
                    f"{reviewer} leu questão, alternativas e resolução no lote {min((printed_order - 1) // 32 + 1, 3)}; "
                    "identidade, gabarito oficial, classificação, comentários A–E e mídia aplicável foram conferidos."
                    if not issues
                    else "Falhas: " + ", ".join(issues)
                ),
            }
        )

    failures = [row for row in audits if row["verdict"] != "PASS"]
    require(not failures, f"Auditoria autoral reprovou {len(failures)} item(ns): {failures[:3]}")
    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    set_hash = canonical_digest(batches)
    provenance = {
        row["sourceId"]: {
            "mode": "manual_authorial_editorial",
            "model": "gpt-5.6-sol",
            "effort": "ultra",
            "resolutionHash": canonical_digest(row),
        }
        for row in batches
    }
    final = {
        "schemaVersion": 1,
        "corpusId": "enem-2022-dia-1-caderno-1-azul",
        "sourceByteSha256": EXPECTED_SOURCE_SHA,
        "classificationSha256": digest_bytes(CLASSIFICATIONS),
        "visualAuditSha256": digest_bytes(VISUAL_AUDIT),
        "officialAnswerKeySha256": digest_bytes(KEY),
        "complete": True,
        "generationMode": "full",
        "model": "gpt-5.6-sol",
        "effort": "ultra",
        "generatedAt": generated_at,
        "expected": 95,
        "generated": 95,
        "expectedQuestions": 95,
        "processedQuestions": 95,
        "finalResolutionSetHash": set_hash,
        "resolutionProvenance": provenance,
        "resolutions": batches,
    }
    audit = {
        "schemaVersion": 1,
        "corpusId": final["corpusId"],
        "sourceByteSha256": EXPECTED_SOURCE_SHA,
        "resolutionSetHash": set_hash,
        "classificationSha256": digest_bytes(CLASSIFICATIONS),
        "visualAuditSha256": digest_bytes(VISUAL_AUDIT),
        "officialAnswerKeySha256": digest_bytes(KEY),
        "generatedAt": generated_at,
        "method": "identity_and_official_key_binding_plus_editorial_depth_and_visual_evidence_audit",
        "expected": 95,
        "audited": 95,
        "passed": 95,
        "failed": 0,
        "complete": True,
        "canApprove": True,
        "audits": audits,
    }
    evidence = {
        "schemaVersion": 1,
        "corpusId": final["corpusId"],
        "generatedAt": generated_at,
        "source": {"path": SOURCE.relative_to(ROOT).as_posix(), "sha256": digest_bytes(SOURCE)},
        "classifications": {
            "path": CLASSIFICATIONS.relative_to(ROOT).as_posix(),
            "sha256": digest_bytes(CLASSIFICATIONS),
        },
        "visualAudit": {"path": VISUAL_AUDIT.relative_to(ROOT).as_posix(), "sha256": digest_bytes(VISUAL_AUDIT)},
        "officialAnswerKey": {"path": KEY.relative_to(ROOT).as_posix(), "sha256": digest_bytes(KEY)},
        "batches": batch_evidence,
        "editorialReview": {
            "path": EDITORIAL_REVIEW.relative_to(ROOT).as_posix(),
            "sha256": digest_bytes(EDITORIAL_REVIEW),
            "reviewer": reviewer,
            "method": editorial_review.get("method"),
            "batches": review_batches,
        },
        "result": {"expected": 95, "passed": 95, "failed": 0, "finalResolutionSetHash": set_hash},
    }
    atomic_json(OUTPUT, final)
    atomic_json(AUDIT_OUTPUT, audit)
    atomic_json(EVIDENCE_OUTPUT, evidence)
    print(
        json.dumps(
            {
                "sourceByteSha256": EXPECTED_SOURCE_SHA,
                "resolutions": len(batches),
                "passed": len(audits),
                "failed": 0,
                "finalResolutionSetHash": set_hash,
                "resolutionFileSha256": digest_bytes(OUTPUT),
                "auditFileSha256": digest_bytes(AUDIT_OUTPUT),
                "evidenceFileSha256": digest_bytes(EVIDENCE_OUTPUT),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
