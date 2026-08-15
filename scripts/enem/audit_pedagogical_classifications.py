#!/usr/bin/env python3
"""Audit ENEM pedagogical classifications against the official matrix."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import subprocess
import threading
from pathlib import Path
from typing import Any

from generate_authorial_resolutions import ROOT, atomic_json, digest, minimal_question
from generate_pedagogical_classifications import (
    AREA_CODES,
    DISCIPLINES,
    matrix_indexes,
    source_question,
)


SCHEMA = ROOT / "scripts" / "enem" / "pedagogical-classification-audit.schema.json"
LOCK = threading.Lock()
PROMPT = """Atue como revisor pedagógico independente do ENEM. Audite CADA par questão+classificação usando exclusivamente a Matriz de Referência oficial incluída no payload.

Regras:
- Releia o comando e identifique a operação cognitiva central antes de julgar competência e habilidade. A habilidade precisa existir, pertencer à competência e ser a melhor correspondência, não apenas uma possibilidade remota.
- Verifique disciplina, conteúdo e subconteúdo específicos; língua inglesa e língua espanhola não podem ser misturadas.
- Verifique dificuldade, tempo, interdisciplinaridade, tipos de raciocínio, necessidade de cálculo e necessidade de interpretação visual.
- Se visualFiles existir e a classificação depender do recurso, abra os arquivos locais antes do veredito. Se não puder inspecioná-los, marque NEEDS_VISUAL_REVIEW e FAIL.
- Uma habilidade alternativa plausível não é falha por si só. Use AMBIGUOUS_MATRIX_MAPPING apenas quando a escolha registrada não puder ser sustentada com segurança e exigir revisão humana.
- PASS exige os quatro grupos de verificação aprovados, issueCodes vazio e notas com evidência concreta da questão. Preserve sourceId, officialNumber e language e mantenha a mesma ordem.
- Não altere a classificação: apenas audite. Retorne somente o schema solicitado.
"""


def parse_output(value: str) -> dict[str, Any]:
    parsed, _end = json.JSONDecoder().raw_decode(value.lstrip())
    if not isinstance(parsed, dict):
        raise RuntimeError("Saída da auditoria pedagógica não é objeto JSON.")
    return parsed


def validate_audits(sources: list[dict[str, Any]], audits: list[dict[str, Any]]) -> None:
    if len(sources) != len(audits):
        raise RuntimeError(f"Auditoria incompleta: {len(audits)}/{len(sources)}")
    for source, audit in zip(sources, audits, strict=True):
        question = source["question"]
        for key in ("sourceId", "officialNumber", "language"):
            if audit.get(key) != question.get(key):
                raise RuntimeError(f"{question['sourceId']}: {key} divergente")
        checks = (
            audit.get("matrixAlignment") == "PASS"
            and audit.get("disciplineAndContent") == "PASS"
            and audit.get("difficultyAndTime") == "PASS"
            and audit.get("reasoningAndFlags") == "PASS"
        )
        passed = audit.get("verdict") == "PASS"
        if passed != checks:
            raise RuntimeError(f"{question['sourceId']}: veredito incoerente")
        if passed and audit.get("issueCodes"):
            raise RuntimeError(f"{question['sourceId']}: PASS com issueCodes")
        if not passed and not audit.get("issueCodes"):
            raise RuntimeError(f"{question['sourceId']}: FAIL sem issueCodes")


def validate_classifications(
    questions: list[dict[str, Any]],
    classifications: list[dict[str, Any]],
    competencies: dict[str, Any],
    abilities: dict[str, tuple[str, Any]],
) -> None:
    if len(questions) != len(classifications):
        raise SystemExit(f"Classificação incompleta: {len(classifications)}/{len(questions)}")
    seen: set[str] = set()
    for question, item in zip(questions, classifications, strict=True):
        source_id = question["sourceId"]
        if item.get("sourceId") != source_id or source_id in seen:
            raise SystemExit(f"Classificação fora de ordem ou duplicada: {source_id}")
        seen.add(source_id)
        for key in ("officialNumber", "language", "knowledgeArea"):
            if item.get(key) != question.get(key):
                raise SystemExit(f"{source_id}: {key} divergente")
        area_code = AREA_CODES[question["knowledgeArea"]]
        competency = item.get("competencyCode")
        ability = item.get("abilityCode")
        if competency not in competencies or not str(competency).startswith(f"{area_code}-"):
            raise SystemExit(f"{source_id}: competência inválida")
        if ability not in abilities or abilities[str(ability)][0] != competency:
            raise SystemExit(f"{source_id}: habilidade inválida")
        if item.get("disciplinaryComponent") not in DISCIPLINES[area_code]:
            raise SystemExit(f"{source_id}: disciplina não canônica")
        if len(item.get("cognitiveAxes") or []) != len(set(item.get("cognitiveAxes") or [])):
            raise SystemExit(f"{source_id}: eixos cognitivos duplicados")
        if len(item.get("reasoningTypes") or []) != len(set(item.get("reasoningTypes") or [])):
            raise SystemExit(f"{source_id}: tipos de raciocínio duplicados")
        if bool(item.get("requiresVisualInterpretation")) != bool(question["requiresVisualInterpretation"]):
            raise SystemExit(f"{source_id}: flag visual divergente da extração")
        confidence = float(item.get("confidence", 0))
        if confidence < 0.85 and not bool(item.get("reviewRequired")):
            raise SystemExit(f"{source_id}: gate de confiança incoerente")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", required=True, type=Path)
    parser.add_argument("--classifications", required=True, type=Path)
    parser.add_argument("--matrix", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--batch-size", type=int, default=5)
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--model", default="gpt-5.6-sol")
    parser.add_argument("--effort", default="high")
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--retries", type=int, default=3)
    args = parser.parse_args()

    question_rows = json.loads(args.questions.resolve().read_text(encoding="utf-8"))
    classification_payload = json.loads(args.classifications.resolve().read_text(encoding="utf-8"))
    matrix = json.loads(args.matrix.resolve().read_text(encoding="utf-8"))
    questions = [minimal_question(row) for row in question_rows]
    classification_sources = [source_question(row) for row in question_rows]
    classifications = classification_payload.get("classifications") or []
    competencies, abilities = matrix_indexes(matrix)
    expected_classification_hash = digest(
        {
            "questions": classification_sources,
            "matrixHash": matrix["officialPdfSha256"],
        }
    )
    if classification_payload.get("sourceHash") != expected_classification_hash:
        raise SystemExit("Classificação pertence a outra versão da fonte ou da matriz.")
    if (
        classification_payload.get("complete") is not True
        or classification_payload.get("expected") != len(questions)
        or classification_payload.get("classified") != len(questions)
        or classification_payload.get("matrixPdfSha256") != matrix["officialPdfSha256"]
    ):
        raise SystemExit("Relatório de classificação não comprova cobertura integral da fonte atual.")
    validate_classifications(questions, classifications, competencies, abilities)

    pairs: list[dict[str, Any]] = []
    for question, classification in zip(questions, classifications, strict=True):
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

    source_hash = digest(
        {
            "pairs": pairs,
            "matrixPdfSha256": matrix["officialPdfSha256"],
        }
    )
    output = args.output.resolve()
    parts_dir = output.parent / f"{output.stem}-partes"
    parts_dir.mkdir(parents=True, exist_ok=True)
    batches = [
        (index // args.batch_size + 1, pairs[index : index + args.batch_size])
        for index in range(0, len(pairs), args.batch_size)
    ]

    def run_batch(entry: tuple[int, list[dict[str, Any]]]) -> dict[str, Any]:
        number, values = entry
        batch_hash = digest(values)
        path = parts_dir / f"lote-{number:04d}.json"
        if path.exists():
            cached = json.loads(path.read_text(encoding="utf-8"))
            if cached.get("sourceHash") == source_hash and cached.get("batchHash") == batch_hash:
                validate_audits(values, cached.get("audits") or [])
                return cached

        def request(request_values: list[dict[str, Any]]) -> list[dict[str, Any]]:
            area_codes = {
                AREA_CODES[value["question"]["knowledgeArea"]]
                for value in request_values
            }
            completed = subprocess.run(
                [
                    "codex", "exec", "--ephemeral", "--ignore-rules", "-s", "read-only",
                    "-C", str(ROOT), "-m", args.model,
                    "-c", f'model_reasoning_effort="{args.effort}"',
                    "--output-schema", str(SCHEMA), "--color", "never", PROMPT,
                ],
                input=json.dumps(
                    {
                        "matrixDocument": {
                            "name": matrix["name"],
                            "officialUrl": matrix["officialUrl"],
                            "officialPdfSha256": matrix["officialPdfSha256"],
                            "areas": [
                                area
                                for area in matrix["areas"]
                                if area["areaCode"] in area_codes
                            ],
                        },
                        "pairs": request_values,
                    },
                    ensure_ascii=False,
                ),
                text=True,
                encoding="utf-8",
                capture_output=True,
                timeout=args.timeout,
                cwd=ROOT,
            )
            if completed.returncode:
                raise RuntimeError(completed.stderr[-2000:])
            audits = parse_output(completed.stdout).get("audits")
            if not isinstance(audits, list):
                raise RuntimeError("Saída sem audits.")
            validate_audits(request_values, audits)
            return audits

        last_error: Exception | None = None
        for attempt in range(1, args.retries + 1):
            try:
                audits = request(values)
                result = {
                    "schemaVersion": 1,
                    "sourceHash": source_hash,
                    "batchHash": batch_hash,
                    "batch": number,
                    "model": args.model,
                    "effort": args.effort,
                    "audits": audits,
                }
                with LOCK:
                    atomic_json(path, result)
                    print(json.dumps({"batch": number, "status": "completed"}), flush=True)
                return result
            except Exception as error:  # noqa: BLE001
                last_error = error
                with LOCK:
                    print(
                        json.dumps(
                            {"batch": number, "attempt": attempt, "status": "retrying", "error": str(error)},
                            ensure_ascii=False,
                        ),
                        flush=True,
                    )
        if len(values) > 1:
            audits = [audit for value in values for audit in request([value])]
            validate_audits(values, audits)
            result = {
                "schemaVersion": 1,
                "sourceHash": source_hash,
                "batchHash": batch_hash,
                "batch": number,
                "model": args.model,
                "effort": args.effort,
                "fallback": "single_question",
                "audits": audits,
            }
            with LOCK:
                atomic_json(path, result)
                print(json.dumps({"batch": number, "status": "completed_individually"}), flush=True)
            return result
        raise RuntimeError(f"Lote {number}: {last_error}")

    results: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(run_batch, batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
    results.sort(key=lambda item: item["batch"])
    audits = [audit for result in results for audit in result["audits"]]
    failed = [audit for audit in audits if audit["verdict"] == "FAIL"]
    report = {
        "schemaVersion": 1,
        "sourceHash": source_hash,
        "classificationSourceHash": classification_payload.get("sourceHash"),
        "matrixPath": args.matrix.resolve().relative_to(ROOT).as_posix(),
        "matrixPdfSha256": matrix["officialPdfSha256"],
        "expected": len(pairs),
        "audited": len(audits),
        "passed": len(audits) - len(failed),
        "failed": len(failed),
        "complete": len(audits) == len(pairs),
        "canApprove": len(audits) == len(pairs) and not failed,
        "model": args.model,
        "effort": args.effort,
        "audits": audits,
    }
    atomic_json(output, report)
    print(
        json.dumps(
            {key: report[key] for key in ("expected", "audited", "passed", "failed", "complete", "canApprove")},
            indent=2,
        )
    )
    return 0 if report["canApprove"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
