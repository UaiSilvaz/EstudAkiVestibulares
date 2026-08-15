#!/usr/bin/env python3
"""Audita visualmente cada digitalização contra seus recortes oficiais.

O relatório não muda estado de publicação. Ele produz evidência individual,
checkpointada e verificável para o gate editorial do importador do corpus.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import subprocess
import threading
from pathlib import Path
from typing import Any

from generate_authorial_resolutions import (
    ROOT,
    atomic_json,
    digest,
    official_language,
)


SCHEMA = ROOT / "scripts" / "enem" / "visual-fidelity-audit.schema.json"
LOCK = threading.Lock()
CHECKS = (
    "statementFidelity",
    "elementOrder",
    "alternativeFidelity",
    "imageLegibility",
    "questionIsolation",
)
PROMPT = """Atue como revisor visual editorial independente do EstudAki. Audite CADA digitalização recebida contra TODOS os recortes oficiais listados em sourceFiles.

É obrigatório abrir visualmente cada arquivo local com a ferramenta de imagem antes do veredito. Compare texto de apoio, comando, parágrafos, símbolos, fórmulas, créditos, ordem dos blocos, número, idioma e alternativas A-E. Verifique se imagens/tabelas/gráficos necessários estão legíveis e se não entrou conteúdo de outra questão. O fac-símile é referência de auditoria, não substitui a digitalização estruturada.

PASS exige fidelidade integral em todos os cinco checks e inspectedFiles deve enumerar exatamente todos os sourceFiles consultados. Um sufixo espúrio, palavra truncada, alternativa vazia, elemento fora de ordem, mídia ilegível ou mistura de questões exige FAIL. Descreva evidência concreta e localizável, não uma afirmação genérica. Preserve sourceId, officialNumber e language e responda somente no schema solicitado, na mesma ordem.
"""


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def source_files(row: dict[str, Any]) -> list[str]:
    candidates: list[str] = []
    for item in [*(row.get("originalCrops") or []), *(row.get("assets") or [])]:
        storage = item.get("storagePath")
        if not storage:
            continue
        path = (ROOT / storage).resolve()
        if ROOT not in path.parents or not path.is_file():
            continue
        candidates.append(path.relative_to(ROOT).as_posix())
    return list(dict.fromkeys(candidates))


def audit_source(row: dict[str, Any]) -> dict[str, Any]:
    alternatives = row.get("alternatives") or row.get("alternativas") or []
    files = source_files(row)
    if not files:
        raise ValueError(f"{row.get('id')}: sem recorte oficial local para revisão visual")
    return {
        "sourceId": str(row.get("id") or "").strip(),
        "year": row.get("year", row.get("ano")),
        "day": row.get("day", row.get("dia")),
        "officialNumber": row.get("officialNumber", row.get("numeroQuestao")),
        "officialOrder": row.get("officialOrder", row.get("ordemOficial")),
        "printedOccurrenceOrder": row.get("printedOccurrenceOrder"),
        "language": official_language(row),
        "supportText": row.get("supportText") or row.get("textoApoio"),
        "command": row.get("command"),
        "statement": row.get("statement") or row.get("enunciado"),
        "blocks": [
            {
                "type": item.get("type"),
                "order": item.get("order"),
                "content": item.get("content"),
                "sourcePdfPage": item.get("sourcePdfPage"),
            }
            for item in (row.get("blocks") or [])
        ],
        "alternatives": [
            {
                "key": item.get("key"),
                "order": item.get("order"),
                "text": item.get("text") or "",
                "imageUrl": item.get("imageUrl"),
            }
            for item in alternatives
        ],
        "flags": row.get("flags") or {},
        "sourceFiles": files,
    }


def parse_output(value: str) -> dict[str, Any]:
    parsed, _end = json.JSONDecoder().raw_decode(value.lstrip())
    if not isinstance(parsed, dict):
        raise RuntimeError("Saída da auditoria visual não é objeto JSON.")
    return parsed


def validate(sources: list[dict[str, Any]], audits: list[dict[str, Any]]) -> None:
    if len(sources) != len(audits):
        raise RuntimeError(f"Auditoria visual incompleta: {len(audits)}/{len(sources)}")
    for source, audit in zip(sources, audits, strict=True):
        for key in ("sourceId", "officialNumber", "language"):
            if audit.get(key) != source.get(key):
                raise RuntimeError(f"{source['sourceId']}: {key} divergente")
        all_pass = all(audit.get(key) == "PASS" for key in CHECKS)
        verdict_pass = audit.get("verdict") == "PASS"
        if all_pass != verdict_pass:
            raise RuntimeError(f"{source['sourceId']}: veredito visual incoerente")
        inspected = set(audit.get("inspectedFiles") or [])
        required = set(source["sourceFiles"])
        if inspected != required:
            raise RuntimeError(
                f"{source['sourceId']}: arquivos inspecionados não cobrem a evidência oficial"
            )
        if verdict_pass and audit.get("issueCodes"):
            raise RuntimeError(f"{source['sourceId']}: PASS visual com issueCodes")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Auditoria visual integral e checkpointada de um caderno ENEM."
    )
    parser.add_argument("--questions", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--batch-size", type=int, default=3)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--model", default="gpt-5.4-mini")
    parser.add_argument("--effort", default="medium")
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--max-batches", type=int)
    parser.add_argument(
        "--assemble-existing",
        action="store_true",
        help="Consolida apenas checkpoints válidos já gravados, sem chamar o auditor.",
    )
    args = parser.parse_args()

    rows = load_json(args.questions.resolve())
    if not isinstance(rows, list) or not rows:
        raise SystemExit("O arquivo de questões deve conter um array não vazio.")
    sources = [audit_source(row) for row in rows]
    identities = [
        (item["sourceId"], item["officialNumber"], item["language"])
        for item in sources
    ]
    if len(identities) != len(set(identities)):
        raise SystemExit("Identidades duplicadas na auditoria visual.")

    source_hash = digest(sources)
    output = args.output.resolve()
    parts_dir = output.parent / f"{output.stem}-partes"
    parts_dir.mkdir(parents=True, exist_ok=True)
    batches = [
        (index // args.batch_size + 1, sources[index : index + args.batch_size])
        for index in range(0, len(sources), args.batch_size)
    ]
    if args.max_batches is not None:
        batches = batches[: args.max_batches]

    if args.assemble_existing:
        results: list[dict[str, Any]] = []
        missing_batches: list[int] = []
        for number, values in batches:
            path = parts_dir / f"lote-{number:04d}.json"
            if not path.exists():
                missing_batches.append(number)
                continue
            cached = load_json(path)
            if (
                cached.get("sourceHash") != source_hash
                or cached.get("batchHash") != digest(values)
            ):
                missing_batches.append(number)
                continue
            validate(values, cached.get("audits") or [])
            results.append(cached)
        results.sort(key=lambda item: item["batch"])
        audits = [audit for result in results for audit in result["audits"]]
        failed = [audit for audit in audits if audit["verdict"] == "FAIL"]
        report = {
            "schemaVersion": 1,
            "sourceHash": source_hash,
            "expected": len(sources),
            "audited": len(audits),
            "passed": len(audits) - len(failed),
            "failed": len(failed),
            "complete": len(audits) == len(sources),
            "canApprove": len(audits) == len(sources) and not failed,
            "executionStatus": "assembled_from_existing_checkpoints",
            "missingBatches": missing_batches,
            "audits": audits,
        }
        atomic_json(output, report)
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
                        "missingBatches",
                    )
                },
                indent=2,
            )
        )
        return 0 if report["canApprove"] else 2

    command = [
        "codex",
        "exec",
        "--ephemeral",
        "--ignore-rules",
        "-s",
        "read-only",
        "-C",
        str(ROOT),
        "-m",
        args.model,
        "-c",
        f'model_reasoning_effort="{args.effort}"',
        "--output-schema",
        str(SCHEMA),
        "--color",
        "never",
        PROMPT,
    ]

    def request(values: list[dict[str, Any]]) -> list[dict[str, Any]]:
        completed = subprocess.run(
            command,
            input=json.dumps({"questions": values}, ensure_ascii=False),
            text=True,
            encoding="utf-8",
            capture_output=True,
            timeout=args.timeout,
            cwd=ROOT,
        )
        if completed.returncode:
            raise RuntimeError(completed.stderr[-2000:])
        payload = parse_output(completed.stdout)
        audits = payload.get("audits")
        if not isinstance(audits, list):
            raise RuntimeError("Saída visual sem audits.")
        validate(values, audits)
        return audits

    def run_batch(entry: tuple[int, list[dict[str, Any]]]) -> dict[str, Any]:
        number, values = entry
        batch_hash = digest(values)
        path = parts_dir / f"lote-{number:04d}.json"
        if path.exists():
            cached = load_json(path)
            if (
                cached.get("sourceHash") == source_hash
                and cached.get("batchHash") == batch_hash
            ):
                validate(values, cached.get("audits") or [])
                return cached
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
                    print(
                        json.dumps({"batch": number, "status": "completed"}),
                        flush=True,
                    )
                return result
            except Exception as error:  # noqa: BLE001 - retry checkpointed
                last_error = error
                with LOCK:
                    print(
                        json.dumps(
                            {
                                "batch": number,
                                "attempt": attempt,
                                "status": "retrying",
                                "error": str(error),
                            },
                            ensure_ascii=False,
                        ),
                        flush=True,
                    )
        if len(values) > 1:
            isolated = [audit for value in values for audit in request([value])]
            validate(values, isolated)
            result = {
                "schemaVersion": 1,
                "sourceHash": source_hash,
                "batchHash": batch_hash,
                "batch": number,
                "model": args.model,
                "effort": args.effort,
                "fallback": "single_question",
                "audits": isolated,
            }
            with LOCK:
                atomic_json(path, result)
            return result
        raise RuntimeError(f"Lote visual {number}: {last_error}")

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
        "expected": len(sources),
        "audited": len(audits),
        "passed": len(audits) - len(failed),
        "failed": len(failed),
        "complete": len(audits) == len(sources),
        "canApprove": len(audits) == len(sources) and not failed,
        "audits": audits,
    }
    atomic_json(output, report)
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
                )
            },
            indent=2,
        )
    )
    return 0 if report["canApprove"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
