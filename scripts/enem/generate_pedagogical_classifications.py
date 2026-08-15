#!/usr/bin/env python3
"""Classifica questões contra a matriz oficial, com checkpoints por lote."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import subprocess
import threading
from pathlib import Path
from typing import Any

from generate_authorial_resolutions import ROOT, atomic_json, digest, minimal_question


SCHEMA = ROOT / "scripts" / "enem" / "pedagogical-classification-batch.schema.json"
MATRIX_PATH = ROOT / "data" / "provas" / "enem" / "matriz-referencia-enem.json"
LOCK = threading.Lock()
AREA_CODES = {
    "Linguagens, Códigos e suas Tecnologias": "LC",
    "Ciências Humanas e suas Tecnologias": "CH",
    "Ciências da Natureza e suas Tecnologias": "CN",
    "Matemática e suas Tecnologias": "MT",
}
DISCIPLINES = {
    "LC": {"Língua Portuguesa", "Literatura", "Língua Inglesa", "Língua Espanhola", "Arte", "Educação Física", "Tecnologias da Informação e Comunicação"},
    "CH": {"História", "Geografia", "Filosofia", "Sociologia"},
    "CN": {"Biologia", "Física", "Química"},
    "MT": {"Matemática"},
}
PROMPT = """Classifique pedagogicamente CADA questão oficial recebida usando SOMENTE a matriz de referência do ENEM incluída no payload.

Regras:
- Escolha uma competência e uma habilidade exatas do catálogo da mesma área; não invente códigos ou descrições.
- Use somente os nomes canônicos de disciplina autorizados pelo schema. Para variante inglesa use Língua Inglesa; para espanhola, Língua Espanhola.
- Conteúdo e subconteúdo devem ser específicos e curtos, sem criar uma segunda disciplina.
- Estime dificuldade e tempo pelo trabalho real para resolver, não pela extensão do texto.
- Marque cálculo, interpretação visual, interdisciplinaridade, áreas secundárias, tipos de raciocínio e eixos cognitivos de modo coerente.
- Preserve sourceId, officialNumber, language, knowledgeArea e requiresVisualInterpretation fornecidos.
- confidence deve refletir a segurança real. reviewRequired=true sempre que confidence < 0.85 ou houver ambiguidade entre habilidades.
- A rationale deve citar elementos concretos do comando e explicar por que a habilidade escolhida mede a operação cognitiva central.
- Retorne exatamente um item por questão, na mesma ordem, e somente no schema.
"""


def parse_output(value: str) -> dict[str, Any]:
    parsed, _end = json.JSONDecoder().raw_decode(value.lstrip())
    if not isinstance(parsed, dict):
        raise RuntimeError("Saída de classificação não é objeto JSON.")
    return parsed


def area_catalog(matrix: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {area["areaCode"]: area for area in matrix["areas"]}


def matrix_indexes(matrix: dict[str, Any]) -> tuple[dict[str, Any], dict[str, tuple[str, Any]]]:
    competencies: dict[str, Any] = {}
    abilities: dict[str, tuple[str, Any]] = {}
    for area in matrix["areas"]:
        for competency in area["competencies"]:
            competencies[competency["code"]] = competency
            for ability in competency["skills"]:
                abilities[ability["code"]] = (competency["code"], ability)
    return competencies, abilities


def source_question(row: dict[str, Any]) -> dict[str, Any]:
    item = minimal_question(row)
    area = str(item.get("knowledgeArea") or "")
    if area not in AREA_CODES:
        raise ValueError(f"{item['sourceId']}: área ausente ou não canônica: {area}")
    return {
        "sourceId": item["sourceId"],
        "officialNumber": item["officialNumber"],
        "language": item["language"],
        "knowledgeArea": area,
        "supportText": item["supportText"],
        "command": item["command"],
        "statement": item["statement"],
        "alternatives": item["alternatives"],
        "requiresVisualInterpretation": item["requiresVisualInterpretation"],
        "visualFiles": item["visualFiles"],
    }


def validate(
    sources: list[dict[str, Any]],
    classifications: list[dict[str, Any]],
    competencies: dict[str, Any],
    abilities: dict[str, tuple[str, Any]],
) -> None:
    if len(sources) != len(classifications):
        raise RuntimeError(
            f"Classificação incompleta: {len(classifications)}/{len(sources)}"
        )
    for source, classification in zip(sources, classifications, strict=True):
        for key in ("sourceId", "officialNumber", "language", "knowledgeArea"):
            if classification.get(key) != source.get(key):
                raise RuntimeError(f"{source['sourceId']}: {key} divergente")
        area_code = AREA_CODES[source["knowledgeArea"]]
        competency_code = classification.get("competencyCode")
        ability_code = classification.get("abilityCode")
        if competency_code not in competencies or not str(competency_code).startswith(f"{area_code}-"):
            raise RuntimeError(f"{source['sourceId']}: competência fora da área")
        ability = abilities.get(str(ability_code))
        if not ability or ability[0] != competency_code:
            raise RuntimeError(f"{source['sourceId']}: habilidade incompatível")
        if classification.get("disciplinaryComponent") not in DISCIPLINES[area_code]:
            raise RuntimeError(f"{source['sourceId']}: disciplina não canônica")
        expected_discipline = {
            "ENGLISH": "Língua Inglesa",
            "SPANISH": "Língua Espanhola",
        }.get(source["language"])
        if expected_discipline and classification.get("disciplinaryComponent") != expected_discipline:
            raise RuntimeError(f"{source['sourceId']}: disciplina de língua divergente")
        if classification.get("requiresVisualInterpretation") is not source["requiresVisualInterpretation"]:
            raise RuntimeError(f"{source['sourceId']}: flag visual divergente")
        confidence = float(classification.get("confidence", 0))
        # Baixa confiança sempre exige revisão. Confiança alta não elimina a
        # possibilidade de ambiguidade editorial entre duas habilidades.
        if confidence < 0.85 and not bool(classification.get("reviewRequired")):
            raise RuntimeError(f"{source['sourceId']}: gate de confiança incoerente")
        interdisciplinary = bool(classification.get("interdisciplinary"))
        secondary = classification.get("interdisciplinaryAreas") or []
        if interdisciplinary != bool(secondary):
            raise RuntimeError(f"{source['sourceId']}: interdisciplinaridade incoerente")
        if area_code in secondary or len(secondary) != len(set(secondary)):
            raise RuntimeError(f"{source['sourceId']}: áreas interdisciplinares inválidas")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--matrix", type=Path, default=MATRIX_PATH)
    parser.add_argument("--batch-size", type=int, default=5)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--model", default="gpt-5.4-mini")
    parser.add_argument("--effort", default="low")
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--max-batches", type=int)
    args = parser.parse_args()

    rows = json.loads(args.questions.resolve().read_text(encoding="utf-8"))
    matrix = json.loads(args.matrix.resolve().read_text(encoding="utf-8"))
    sources = [source_question(row) for row in rows]
    competencies, abilities = matrix_indexes(matrix)
    catalog = area_catalog(matrix)
    source_hash = digest({"questions": sources, "matrixHash": matrix["officialPdfSha256"]})
    output = args.output.resolve()
    parts_dir = output.parent / f"{output.stem}-partes"
    parts_dir.mkdir(parents=True, exist_ok=True)
    batches = [
        (index // args.batch_size + 1, sources[index : index + args.batch_size])
        for index in range(0, len(sources), args.batch_size)
    ]
    if args.max_batches is not None:
        batches = batches[: args.max_batches]

    def request(values: list[dict[str, Any]]) -> list[dict[str, Any]]:
        area_codes = {AREA_CODES[value["knowledgeArea"]] for value in values}
        payload = {
            "questions": values,
            "matrix": [catalog[area_code] for area_code in sorted(area_codes)],
        }
        completed = subprocess.run(
            [
                "codex", "exec", "--ephemeral", "--ignore-rules", "-s", "read-only",
                "-C", str(ROOT), "-m", args.model,
                "-c", f'model_reasoning_effort="{args.effort}"',
                "--output-schema", str(SCHEMA), "--color", "never", PROMPT,
            ],
            input=json.dumps(payload, ensure_ascii=False),
            text=True,
            encoding="utf-8",
            capture_output=True,
            timeout=args.timeout,
            cwd=ROOT,
        )
        if completed.returncode:
            raise RuntimeError(completed.stderr[-2000:])
        result = parse_output(completed.stdout).get("classifications")
        if not isinstance(result, list):
            raise RuntimeError("Saída sem classifications.")
        validate(values, result, competencies, abilities)
        return result

    def process(entry: tuple[int, list[dict[str, Any]]]) -> dict[str, Any]:
        number, values = entry
        batch_hash = digest(values)
        part = parts_dir / f"lote-{number:04d}.json"
        if part.exists():
            cached = json.loads(part.read_text(encoding="utf-8"))
            if cached.get("sourceHash") == source_hash and cached.get("batchHash") == batch_hash:
                validate(values, cached.get("classifications") or [], competencies, abilities)
                return cached
        last_error: Exception | None = None
        for attempt in range(1, args.retries + 1):
            try:
                classifications = request(values)
                result = {
                    "schemaVersion": 1,
                    "sourceHash": source_hash,
                    "batchHash": batch_hash,
                    "batch": number,
                    "model": args.model,
                    "effort": args.effort,
                    "classifications": classifications,
                }
                with LOCK:
                    atomic_json(part, result)
                    print(json.dumps({"batch": number, "status": "completed"}), flush=True)
                return result
            except Exception as error:  # noqa: BLE001
                last_error = error
                with LOCK:
                    print(json.dumps({"batch": number, "attempt": attempt, "error": str(error)}, ensure_ascii=False), flush=True)
        if len(values) > 1:
            isolated = [item for value in values for item in request([value])]
            validate(values, isolated, competencies, abilities)
            result = {
                "schemaVersion": 1,
                "sourceHash": source_hash,
                "batchHash": batch_hash,
                "batch": number,
                "model": args.model,
                "effort": args.effort,
                "fallback": "single_question",
                "classifications": isolated,
            }
            with LOCK:
                atomic_json(part, result)
            return result
        raise RuntimeError(f"Lote {number}: {last_error}")

    completed: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(process, batch) for batch in batches]
        for future in concurrent.futures.as_completed(futures):
            completed.append(future.result())
    completed.sort(key=lambda item: item["batch"])
    classifications = [
        item for batch in completed for item in batch["classifications"]
    ]
    for item in classifications:
        competency = competencies[item["competencyCode"]]
        _competency_code, ability = abilities[item["abilityCode"]]
        item["competencyDescription"] = competency["description"]
        item["abilityDescription"] = ability["description"]
    report = {
        "schemaVersion": 1,
        "sourceHash": source_hash,
        "matrixPath": args.matrix.resolve().relative_to(ROOT).as_posix(),
        "matrixPdfSha256": matrix["officialPdfSha256"],
        "expected": len(sources),
        "classified": len(classifications),
        "complete": len(classifications) == len(sources),
        "reviewRequired": sum(bool(item["reviewRequired"]) for item in classifications),
        "model": args.model,
        "effort": args.effort,
        "classifications": classifications,
    }
    atomic_json(output, report)
    print(json.dumps({key: report[key] for key in ("expected", "classified", "complete", "reviewRequired")}, indent=2))
    return 0 if report["complete"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
