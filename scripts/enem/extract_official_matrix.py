#!/usr/bin/env python3
"""Transcreve visualmente a matriz oficial do ENEM para um catálogo validado."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any

import fitz

from generate_authorial_resolutions import ROOT, atomic_json


SCHEMA = ROOT / "scripts" / "enem" / "matrix-area.schema.json"
OFFICIAL_URL = "https://download.inep.gov.br/enem/outros_documentos/enem_matriz_referencia.pdf"
AREAS = {
    "LC": {
        "name": "Linguagens, Códigos e suas Tecnologias",
        "pages": [3, 4, 5, 6],
        "competencies": 9,
        "ranges": {1: (1, 4), 2: (5, 8), 3: (9, 11), 4: (12, 14), 5: (15, 17), 6: (18, 20), 7: (21, 24), 8: (25, 27), 9: (28, 30)},
    },
    "MT": {
        "name": "Matemática e suas Tecnologias",
        "pages": [7, 8, 9],
        "competencies": 7,
        "ranges": {1: (1, 5), 2: (6, 9), 3: (10, 14), 4: (15, 18), 5: (19, 23), 6: (24, 26), 7: (27, 30)},
    },
    "CN": {
        "name": "Ciências da Natureza e suas Tecnologias",
        "pages": [10, 11, 12, 13],
        "competencies": 8,
        "ranges": {1: (1, 4), 2: (5, 7), 3: (8, 12), 4: (13, 16), 5: (17, 19), 6: (20, 23), 7: (24, 27), 8: (28, 30)},
    },
    "CH": {
        "name": "Ciências Humanas e suas Tecnologias",
        "pages": [14, 15, 16],
        "competencies": 6,
        "ranges": {1: (1, 5), 2: (6, 10), 3: (11, 15), 4: (16, 20), 5: (21, 25), 6: (26, 30)},
    },
}
PROMPT = """Transcreva fielmente a área indicada da Matriz de Referência oficial do ENEM anexada em imagens.

Regras:
- Leia visualmente todas as páginas anexadas; o texto incorporado do PDF usa fonte corrompida e não é fonte confiável.
- Preserve acentos, pontuação e redação oficial. Não resuma nem parafraseie.
- Use códigos no formato AREA-Cn para competências e AREA-Hn para habilidades.
- Relacione cada habilidade à competência sob a qual está impressa.
- Inclua exatamente H1 a H30 uma única vez, sem lacunas ou duplicações.
- Retorne somente o JSON do schema.
"""


def sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def parse_output(value: str) -> dict[str, Any]:
    parsed, _end = json.JSONDecoder().raw_decode(value.lstrip())
    if not isinstance(parsed, dict):
        raise RuntimeError("Saída da matriz não é objeto JSON.")
    return parsed


def validate(area_code: str, payload: dict[str, Any]) -> None:
    config = AREAS[area_code]
    if payload.get("areaCode") != area_code:
        raise RuntimeError(f"{area_code}: código de área divergente")
    if payload.get("areaName") != config["name"]:
        raise RuntimeError(f"{area_code}: nome oficial divergente")
    competencies = payload.get("competencies") or []
    if len(competencies) != config["competencies"]:
        raise RuntimeError(f"{area_code}: competências incompletas")
    actual_competencies = {item.get("code") for item in competencies}
    expected_competencies = {
        f"{area_code}-C{number}" for number in config["ranges"]
    }
    if actual_competencies != expected_competencies:
        raise RuntimeError(f"{area_code}: códigos de competência inválidos")
    skills: list[tuple[str, str]] = []
    for competency in competencies:
        number = int(str(competency["code"]).split("C")[-1])
        start, end = config["ranges"][number]
        expected = {f"{area_code}-H{index}" for index in range(start, end + 1)}
        actual = {item.get("code") for item in competency.get("skills") or []}
        if actual != expected:
            raise RuntimeError(
                f"{area_code}: habilidades incompatíveis com {competency['code']}"
            )
        skills.extend(
            (item["code"], item["description"]) for item in competency["skills"]
        )
    if len(skills) != 30 or len({code for code, _description in skills}) != 30:
        raise RuntimeError(f"{area_code}: catálogo não contém 30 habilidades únicas")
    if any(len(description.strip()) < 15 for _code, description in skills):
        raise RuntimeError(f"{area_code}: descrição de habilidade curta")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pdf",
        type=Path,
        default=ROOT / "data" / "provas" / "enem" / "enem_matriz_referencia.pdf",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data" / "provas" / "enem" / "matriz-referencia-enem.json",
    )
    parser.add_argument("--model", default="gpt-5.6-sol")
    parser.add_argument("--effort", default="high")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--timeout", type=int, default=1200)
    parser.add_argument("--retries", type=int, default=3)
    args = parser.parse_args()

    pdf = args.pdf.resolve()
    if not pdf.is_file():
        raise SystemExit(f"PDF oficial não encontrado: {pdf}")
    pdf_hash = sha256(pdf)
    render_dir = pdf.parent / "matriz-referencia-paginas"
    render_dir.mkdir(parents=True, exist_ok=True)
    document = fitz.open(pdf)
    try:
        for config in AREAS.values():
            for page_number in config["pages"]:
                target = render_dir / f"pagina-{page_number:02d}.png"
                if not target.exists():
                    page = document[page_number - 1]
                    page.get_pixmap(matrix=fitz.Matrix(2.4, 2.4), alpha=False).save(target)
    finally:
        document.close()

    parts_dir = args.output.resolve().parent / f"{args.output.stem}-partes"
    parts_dir.mkdir(parents=True, exist_ok=True)

    def process(area_code: str) -> dict[str, Any]:
        config = AREAS[area_code]
        part = parts_dir / f"{area_code.lower()}.json"
        if part.exists():
            cached = json.loads(part.read_text(encoding="utf-8"))
            if cached.get("officialPdfSha256") == pdf_hash:
                validate(area_code, cached["area"])
                return cached
        images = [render_dir / f"pagina-{number:02d}.png" for number in config["pages"]]
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
        ]
        for image in images:
            command.extend(["--image", str(image)])
        command.extend(
            [
                "--output-schema",
                str(SCHEMA),
                "--color",
                "never",
                f"Área esperada: {area_code} — {config['name']}.\n\n{PROMPT}",
            ]
        )
        last_error: Exception | None = None
        for attempt in range(1, args.retries + 1):
            try:
                completed = subprocess.run(
                    command,
                    text=True,
                    encoding="utf-8",
                    capture_output=True,
                    timeout=args.timeout,
                    cwd=ROOT,
                )
                if completed.returncode:
                    raise RuntimeError(completed.stderr[-2000:])
                area = parse_output(completed.stdout)
                validate(area_code, area)
                result = {
                    "schemaVersion": 1,
                    "officialPdfSha256": pdf_hash,
                    "officialUrl": OFFICIAL_URL,
                    "pages": config["pages"],
                    "model": args.model,
                    "effort": args.effort,
                    "attempt": attempt,
                    "area": area,
                }
                atomic_json(part, result)
                print(json.dumps({"area": area_code, "status": "completed"}), flush=True)
                return result
            except Exception as error:  # noqa: BLE001 - retry checkpointed
                last_error = error
                print(
                    json.dumps(
                        {"area": area_code, "attempt": attempt, "error": str(error)},
                        ensure_ascii=False,
                    ),
                    flush=True,
                )
        raise RuntimeError(f"{area_code}: {last_error}")

    results: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(process, area_code) for area_code in AREAS]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
    by_code = {result["area"]["areaCode"]: result for result in results}
    report = {
        "schemaVersion": 1,
        "name": "Matriz de Referência do Enem",
        "officialUrl": OFFICIAL_URL,
        "officialPdf": pdf.relative_to(ROOT).as_posix(),
        "officialPdfSha256": pdf_hash,
        "model": args.model,
        "effort": args.effort,
        "areas": [by_code[area_code]["area"] for area_code in AREAS],
    }
    atomic_json(args.output.resolve(), report)
    print(json.dumps({"areas": len(report["areas"]), "skills": 120}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
