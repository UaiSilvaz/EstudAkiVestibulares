#!/usr/bin/env python3
"""Consolidate only already-inspected D1 evidence into the corpus review schema."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "data" / "QUESTÕES" / "processamento" / "enem-2022-dia-1-caderno-1-azul"
SOURCE = CORPUS / "questoes-estruturadas.json"
VISUAL = CORPUS / "auditoria-visual-final-v2.json"
RESOLUTION_AUDIT = CORPUS / "auditoria-resolucoes-autorais-final.json"
KEY = CORPUS / "gabarito-oficial.json"
APP = CORPUS / "evidencias" / "app-preview-review-final.json"
ESSAY = CORPUS / "redacao.json"
CLASSIFICATIONS = CORPUS / "classificacoes-pedagogicas-final.json"
CLASSIFICATION_AUDIT = CORPUS / "auditoria-classificacoes-pedagogicas-final.json"
OFFICIAL_EXAM = ROOT / "data" / "provas" / "enem" / "2022" / "prova-1-dia.pdf"
OFFICIAL_KEY = ROOT / "data" / "provas" / "enem" / "2022" / "gabarito-1-dia.pdf"
OUTPUT = CORPUS / "review-evidence-final.json"
PROVENANCE_OUTPUT = CORPUS / "evidencias" / "review-evidence-final-provenance.json"

EXPECTED_HASHES = {
    SOURCE: "230462373545012111642aac18c65ab7b2e5edae6492bf9a568c1ab925abfef6",
    VISUAL: "8a5748fc41d9b49e79ce68c3817c2982cf9f41f29fc976746da089f5039f2149",
    RESOLUTION_AUDIT: "4b42cd2a7b70d5322ebf805d64d3cd5ffd53f10b743ae016c568c38e438ea23f",
    KEY: "b99b37138b55b89ae85ebb1a2d905f89528b5af0e2cae8e28c95daf2df641e75",
    APP: "a8234914756d2f72f8c42d56e12edbb7c94bbf834f8a43ba0f1cc7247db6e9f0",
    ESSAY: "4155db805a28db4f993af9ad5cf1e37b3ecfec129868d4f5ec402e39a2b4f292",
    CLASSIFICATIONS: "eea765e6535d97141b9e7b2f55f3398476c56dd59281e55a429d827c2a337691",
    CLASSIFICATION_AUDIT: "04e26073c79514e12ae96f233a2b49a1daa3756c8b22c460243936deb657036e",
    OFFICIAL_EXAM: "4aafd3567873578507f2bd47970c71d701c3db776654188b7d597e7284303adc",
    OFFICIAL_KEY: "023dda43b3b4e7b275d7155d9d856451dc14d607f891601c65f9a0fcc3c8ed7e",
}
REVIEWER = "estudaki-editorial-codex-d1-frozen"
ESSAY_REVIEWED_AT = "2026-07-18T17:25:12Z"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def language(value: str) -> str:
    return {
        "ingles": "ENGLISH",
        "espanhol": "SPANISH",
        "portugues": "NOT_APPLICABLE",
        "comum": "NOT_APPLICABLE",
    }[value.strip().lower()]


def evidence_item(path: Path, kind: str, note: str) -> dict[str, str]:
    require(path.is_file(), f"Evidência física ausente: {path}")
    return {"path": relative(path), "sha256": sha256(path), "kind": kind, "note": note}


def verify_frozen_inputs() -> None:
    for path, expected in EXPECTED_HASHES.items():
        require(path.is_file(), f"Entrada congelada ausente: {path}")
        require(sha256(path) == expected, f"Entrada congelada alterada: {path}")


def main() -> int:
    verify_frozen_inputs()
    source: list[dict[str, Any]] = load(SOURCE)
    visual = load(VISUAL)
    resolution = load(RESOLUTION_AUDIT)
    app = load(APP)
    essay = load(ESSAY)

    require(len(source) == 95, "A fonte congelada não possui 95 ocorrências.")
    require(
        visual.get("complete") is True
        and visual.get("expected") == 95
        and visual.get("audited") == 95
        and visual.get("passed") == 95
        and visual.get("failed") == 0,
        "Auditoria visual integral ausente.",
    )
    require(
        resolution.get("complete") is True
        and resolution.get("expected") == 95
        and resolution.get("audited") == 95
        and resolution.get("passed") == 95
        and resolution.get("failed") == 0,
        "Auditoria editorial das resoluções não está integral.",
    )
    required_app_checks = {
        "answerFlow",
        "correction",
        "mobile",
        "adminOriginalPage",
        "answerKeyNotLeaked",
        "languageSelection",
    }
    require(app.get("complete") is True, "Prova funcional não está completa.")
    require(
        all(app.get("checks", {}).get(check) is True for check in required_app_checks),
        "Prova funcional possui check reprovado.",
    )
    require(
        set(app.get("testedSourceIds") or []) == {row["id"] for row in source},
        "Prova funcional não cobre as 95 ocorrências.",
    )
    require(
        app.get("details", {}).get("adminOriginalPage", {}).get("pdfSignature") is True,
        "Consulta real do PDF oficial não foi comprovada.",
    )

    visuals = {row["sourceId"]: row for row in visual["audits"]}
    resolutions = {row["sourceId"]: row for row in resolution["audits"]}
    require(len(visuals) == 95 and len(resolutions) == 95, "Índices de auditoria incompletos.")

    common_evidence = [
        evidence_item(SOURCE, "structured-corpus", "Fonte estruturada congelada revisada."),
        evidence_item(VISUAL, "visual-audit", "Auditoria visual integral 95/95."),
        evidence_item(
            RESOLUTION_AUDIT,
            "editorial-resolution-audit",
            "Leitura editorial integral com vínculo ao gabarito e comentários A–E.",
        ),
        evidence_item(KEY, "official-answer-key-map", "Mapeamento ao gabarito oficial do Inep."),
        evidence_item(APP, "production-preview", "Prévia real desktop/mobile e correção pós-entrega."),
        evidence_item(
            CLASSIFICATION_AUDIT,
            "pedagogical-classification-audit",
            "Auditoria da classificação pedagógica vinculada à mesma fonte.",
        ),
    ]
    question_reviews: list[dict[str, Any]] = []
    for row in source:
        source_id = row["id"]
        visual_row = visuals.get(source_id)
        resolution_row = resolutions.get(source_id)
        require(visual_row is not None and resolution_row is not None, f"{source_id}: auditoria ausente.")
        require(row.get("year") == 2022 and row.get("day") == 1, f"{source_id}: ano/dia incorreto.")
        require(str(row.get("statement") or "").strip(), f"{source_id}: enunciado vazio.")
        require(str(row.get("command") or "").strip(), f"{source_id}: comando vazio.")
        alternatives = row.get("alternatives") or []
        require([item.get("key") for item in alternatives] == list("ABCDE"), f"{source_id}: alternativas inválidas.")
        require(
            all(str(item.get("text") or "").strip() or item.get("imageArtifacts") for item in alternatives),
            f"{source_id}: alternativa sem conteúdo.",
        )
        require(
            all(
                visual_row.get(field) == "PASS"
                for field in (
                    "verdict",
                    "statementFidelity",
                    "elementOrder",
                    "alternativeFidelity",
                    "imageLegibility",
                    "questionIsolation",
                )
            ),
            f"{source_id}: auditoria visual reprovada.",
        )
        require(
            resolution_row.get("verdict") == "PASS"
            and resolution_row.get("identityMatch") == "PASS"
            and resolution_row.get("officialAnswerMatch") == "PASS"
            and resolution_row.get("alternativeAnalysis") == "PASS",
            f"{source_id}: auditoria editorial/gabarito reprovada.",
        )
        require(
            row.get("officialAnswerKey", {}).get("sourceSha256") == EXPECTED_HASHES[OFFICIAL_KEY],
            f"{source_id}: gabarito não aponta para o documento oficial congelado.",
        )
        original_url = str(row.get("source", {}).get("originalPageUrl") or "")
        require(
            original_url.startswith(
                "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_PV_impresso_D1_CD1.pdf#page="
            ),
            f"{source_id}: página original inválida.",
        )
        inspected: list[dict[str, str]] = []
        for inspected_input in visual_row.get("inspectedFiles") or []:
            inspected_path = ROOT / inspected_input
            inspected.append(
                evidence_item(
                    inspected_path,
                    "visual-inspection-artifact",
                    f"Recorte/fac-símile efetivamente inspecionado para {source_id}.",
                )
            )
        require(inspected, f"{source_id}: arquivos visuais inspecionados ausentes.")
        question_reviews.append(
            {
                "sourceId": source_id,
                "officialNumber": row["officialNumber"],
                "language": language(row["language"]),
                "reviewedAt": resolution_row["editorialReviewedAt"],
                "reviewer": resolution_row["editorialReviewer"],
                "checks": {
                    "statementComplete": True,
                    "elementOrderCorrect": True,
                    "alternativesComplete": True,
                    "imagesLegible": True,
                    "officialAnswerConfirmed": True,
                    "numberYearDayCorrect": True,
                    "originalPageAccessible": True,
                    "noMixedContent": True,
                },
                "evidence": [*common_evidence, *inspected],
                "notes": (
                    f"{visual_row['evidence']} {resolution_row['reviewNotes']} "
                    "A prévia de produção confirmou estrutura respondível, ausência de gabarito inicial e acesso ao PDF oficial."
                ),
            }
        )

    require(essay.get("corpusId") == source[0]["corpusId"], "Redação pertence a outro corpus.")
    require(essay.get("year") == 2022 and essay.get("day") == 1, "Ano/dia da redação incorreto.")
    require(str(essay.get("theme") or "").strip(), "Tema da redação vazio.")
    require(str(essay.get("proposalText") or "").strip(), "Proposta da redação vazia.")
    require(str(essay.get("instructions") or "").strip(), "Instruções da redação vazias.")
    essay_evidence = [
        evidence_item(ESSAY, "structured-essay", "Proposta de redação estruturada e textos motivadores."),
        evidence_item(OFFICIAL_EXAM, "official-exam-pdf", "PDF oficial do Inep com hash congelado."),
        evidence_item(APP, "official-page-access", "Consulta HTTP 206 ao PDF oficial e link administrativo com fragmento de página."),
    ]
    pages = essay.get("pages") or []
    require(pages, "A redação não possui página oficial.")
    for page in pages:
        facsimile = page.get("facsimile") or {}
        facsimile_path = ROOT / str(facsimile.get("artifactPath") or "")
        require(sha256(facsimile_path) == facsimile.get("sha256"), "Hash do fac-símile da redação diverge.")
        essay_evidence.append(
            evidence_item(
                facsimile_path,
                "essay-official-page-facsimile",
                f"Página oficial {page['sourcePdfPage']} inspecionada integralmente em resolução original.",
            )
        )
    for asset in essay.get("visualAssets") or []:
        asset_path = ROOT / str(asset.get("artifactPath") or "")
        require(sha256(asset_path) == asset.get("sha256"), "Hash de mídia da redação diverge.")
        essay_evidence.append(
            evidence_item(asset_path, "essay-motivating-visual", str(asset.get("altText") or "Mídia motivadora."))
        )

    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    output = {
        "schemaVersion": 1,
        "corpusId": source[0]["corpusId"],
        "complete": True,
        "generatedAt": generated_at,
        "questions": question_reviews,
        "essay": {
            "reviewedAt": ESSAY_REVIEWED_AT,
            "reviewer": REVIEWER,
            "checks": {
                "themeComplete": True,
                "promptComplete": True,
                "instructionsComplete": True,
                "imagesLegible": True,
                "originalPageAccessible": True,
                "noMixedContent": True,
            },
            "evidence": essay_evidence,
            "notes": (
                "A página oficial 20 foi inspecionada integralmente em resolução original: instruções, textos I–IV, "
                "infográfico, tema e comando estão completos, legíveis, na ordem oficial e sem conteúdo de questões objetivas."
            ),
        },
    }
    atomic_json(OUTPUT, output)
    provenance = {
        "schemaVersion": 1,
        "corpusId": output["corpusId"],
        "generatedAt": generated_at,
        "sourceByteSha256": EXPECTED_HASHES[SOURCE],
        "reviewEvidence": {"path": relative(OUTPUT), "sha256": sha256(OUTPUT)},
        "counts": {
            "questions": len(question_reviews),
            "questionEvidenceItems": sum(len(row["evidence"]) for row in question_reviews),
            "essayPages": len(pages),
            "essayEvidenceItems": len(essay_evidence),
        },
        "frozenInputs": [
            {"path": relative(path), "sha256": expected} for path, expected in EXPECTED_HASHES.items()
        ],
        "result": "PASS",
    }
    atomic_json(PROVENANCE_OUTPUT, provenance)
    print(
        json.dumps(
            {
                "complete": True,
                "questions": len(question_reviews),
                "essay": True,
                "reviewEvidence": relative(OUTPUT),
                "reviewEvidenceSha256": sha256(OUTPUT),
                "provenance": relative(PROVENANCE_OUTPUT),
                "provenanceSha256": sha256(PROVENANCE_OUTPUT),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
