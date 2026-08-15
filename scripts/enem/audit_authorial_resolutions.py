#!/usr/bin/env python3
"""Independently audit generated ENEM resolutions against their source rows."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import subprocess
import tempfile
import threading
from pathlib import Path
from typing import Any

from generate_authorial_resolutions import (
    ROOT,
    atomic_json,
    digest,
    minimal_question,
)


SCHEMA = ROOT / "scripts" / "enem" / "authorial-resolution-audit.schema.json"
LOCK = threading.Lock()
PROMPT = """Atue como revisor pedagógico independente. Audite CADA par questão+resolução do lote recebido.

Recalcule e releia a questão. Verifique fidelidade ao enunciado, unidade, tabela/gráfico, alternativa oficial, análise A-E, classificação e coerência interna. Se visualFiles existir, abra os arquivos locais antes do veredito. Não aceite uma resolução que apenas diga "segundo o gabarito" para esconder uma conta divergente. Para anuladas, confira se a ausência de resposta única foi tratada corretamente.

PASS exige answerLogic, alternativeAnalysis e contentFidelity PASS. Se a questão depender de imagem e a imagem não puder ser inspecionada, use NEEDS_VISUAL e verdict FAIL. issueCodes deve ficar vazio somente em PASS. Preserve sourceId, officialNumber e language. Responda somente no schema solicitado e na mesma ordem do lote.
"""


def parse_output(value: str) -> dict[str, Any]:
    parsed, _end = json.JSONDecoder().raw_decode(value.lstrip())
    if not isinstance(parsed, dict):
        raise RuntimeError("Saída da auditoria não é objeto JSON.")
    return parsed


def validate(
    sources: list[dict[str, Any]], audits: list[dict[str, Any]]
) -> None:
    if len(sources) != len(audits):
        raise RuntimeError(f"Auditoria incompleta: {len(audits)}/{len(sources)}")
    for source, audit in zip(sources, audits, strict=True):
        for key in ("sourceId", "officialNumber", "language"):
            if audit.get(key) != source.get(key):
                raise RuntimeError(f"{source['sourceId']}: {key} divergente")
        passed = audit.get("verdict") == "PASS"
        checks_pass = all(
            audit.get(key) == "PASS"
            for key in ("contentFidelity", "answerLogic", "alternativeAnalysis")
        )
        if passed != checks_pass:
            raise RuntimeError(f"{source['sourceId']}: veredito incoerente")
        if passed and audit.get("issueCodes"):
            raise RuntimeError(f"{source['sourceId']}: PASS com issueCodes")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", required=True, type=Path)
    parser.add_argument("--resolutions", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--batch-size", type=int, default=5)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--model", default="gpt-5.4-mini")
    parser.add_argument("--effort", default="medium")
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--retries", type=int, default=3)
    args = parser.parse_args()

    question_rows = json.loads(args.questions.read_text(encoding="utf-8"))
    resolution_payload = json.loads(args.resolutions.read_text(encoding="utf-8"))
    resolution_rows = resolution_payload.get("resolutions", resolution_payload)
    questions = [minimal_question(row) for row in question_rows]
    resolution_by_id = {row["sourceId"]: row for row in resolution_rows}
    pairs: list[dict[str, Any]] = []
    for question in questions:
        resolution = resolution_by_id.get(question["sourceId"])
        if not resolution:
            raise SystemExit(f"Resolução ausente: {question['sourceId']}")
        pairs.append({"question": question, "resolution": resolution})
    source_hash = digest(pairs)
    parts_dir = args.output.parent / f"{args.output.stem}-partes"
    parts_dir.mkdir(parents=True, exist_ok=True)

    batches = [
        (index // args.batch_size + 1, pairs[index : index + args.batch_size])
        for index in range(0, len(pairs), args.batch_size)
    ]

    def run_batch(entry: tuple[int, list[dict[str, Any]]]) -> dict[str, Any]:
        number, values = entry
        path = parts_dir / f"lote-{number:04d}.json"
        value_hash = digest(values)
        if path.exists():
            cached = json.loads(path.read_text(encoding="utf-8"))
            if cached.get("sourceHash") == source_hash and cached.get("batchHash") == value_hash:
                validate(
                    [item["question"] for item in values], cached.get("audits") or []
                )
                return cached
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

        def request_audits(request_values: list[dict[str, Any]]) -> list[dict[str, Any]]:
            completed = subprocess.run(
                command,
                input=json.dumps({"pairs": request_values}, ensure_ascii=False),
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
                raise RuntimeError("Saída sem audits.")
            validate([item["question"] for item in request_values], audits)
            return audits

        last_error: Exception | None = None
        for attempt in range(1, args.retries + 1):
            try:
                audits = request_audits(values)
                result = {
                    "schemaVersion": 1,
                    "sourceHash": source_hash,
                    "batchHash": value_hash,
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
        # Some structured-output calls occasionally omit one element from a
        # multi-question batch.  Fall back to isolated audits so an item can
        # never disappear merely because the aggregate response was short.
        if len(values) > 1:
            isolated: list[dict[str, Any]] = []
            for value in values:
                isolated.extend(request_audits([value]))
            validate([item["question"] for item in values], isolated)
            result = {
                "schemaVersion": 1,
                "sourceHash": source_hash,
                "batchHash": value_hash,
                "batch": number,
                "model": args.model,
                "effort": args.effort,
                "fallback": "single_question",
                "audits": isolated,
            }
            with LOCK:
                atomic_json(path, result)
                print(
                    json.dumps(
                        {"batch": number, "status": "completed_individually"}
                    ),
                    flush=True,
                )
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
        "expected": len(pairs),
        "audited": len(audits),
        "passed": len(audits) - len(failed),
        "failed": len(failed),
        "complete": len(audits) == len(pairs),
        "canApprove": len(audits) == len(pairs) and not failed,
        "audits": audits,
    }
    atomic_json(args.output, report)
    print(json.dumps({key: report[key] for key in ("expected", "audited", "passed", "failed", "complete", "canApprove")}, indent=2))
    return 0 if report["canApprove"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
