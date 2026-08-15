#!/usr/bin/env python3
"""Create a hash-bound source freeze after structural and visual approval."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path.cwd().resolve()


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def relative(path: Path) -> str:
    resolved = path.resolve()
    if resolved != ROOT and ROOT not in resolved.parents:
        raise ValueError(f"Arquivo fora do repositorio: {path}")
    return resolved.relative_to(ROOT).as_posix()


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus-id", required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--visual-audit", type=Path, required=True)
    parser.add_argument("--structural-validation", type=Path, required=True)
    parser.add_argument("--official-answers", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--corrections", type=Path, required=True)
    parser.add_argument("--official-exam", type=Path, required=True)
    parser.add_argument("--official-answer-key", type=Path, required=True)
    parser.add_argument(
        "--evidence",
        action="append",
        default=[],
        help="Entrada nome=caminho que tambem sera vinculada por hash.",
    )
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    source_path = args.source.resolve()
    rows = load(source_path)
    audit = load(args.visual_audit.resolve())
    structural = load(args.structural_validation.resolve())
    if not isinstance(rows, list) or not rows:
        raise SystemExit("Fonte estruturada invalida.")
    if (
        not audit.get("canApprove")
        or audit.get("passed") != len(rows)
        or audit.get("failed") != 0
    ):
        raise SystemExit("Auditoria visual nao aprovou integralmente a fonte.")
    if structural.get("status") != "passed" or structural.get("errors"):
        raise SystemExit("Validacao estrutural nao esta aprovada.")

    evidence_paths: dict[str, Path] = {}
    for item in args.evidence:
        name, separator, path_value = item.partition("=")
        if not separator or not name or not path_value:
            raise SystemExit(f"Evidencia invalida: {item}")
        evidence_paths[name] = Path(path_value).resolve()

    core_paths = {
        "structuredSource": source_path,
        "officialAnswers": args.official_answers.resolve(),
        "structuralValidation": args.structural_validation.resolve(),
        "finalVisualAudit": args.visual_audit.resolve(),
        "editorialCorrections": args.corrections.resolve(),
        "extractionConfig": args.config.resolve(),
        "officialExamPdf": args.official_exam.resolve(),
        "officialAnswerKeyPdf": args.official_answer_key.resolve(),
        **evidence_paths,
    }
    for name, path in core_paths.items():
        if not path.is_file():
            raise SystemExit(f"{name}: arquivo ausente: {path}")

    answer_assignments = sum(
        1
        for row in rows
        if row.get("officialAnswerKey")
        and row.get("answerSituation") in {"confirmed", "annulled"}
    )
    manifest = {
        "schemaVersion": 1,
        "corpusId": args.corpus_id,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "status": "source_frozen_for_downstream_generation",
        "sourceFrozen": True,
        "publicationAuthorized": False,
        "printedOccurrences": len(rows),
        "alternatives": sum(len(row.get("alternatives") or []) for row in rows),
        "answerAssignments": answer_assignments,
        "assetReferences": sum(
            len(row.get("assets") or []) + len(row.get("originalCrops") or [])
            for row in rows
        ),
        "visualAudit": {
            "passed": audit.get("passed"),
            "failed": audit.get("failed"),
            "method": audit.get("method"),
            "sourceHash": audit.get("sourceHash"),
        },
        "sourceByteSha256": sha256(source_path),
        "hashes": {
            name: {"path": relative(path), "sha256": sha256(path)}
            for name, path in core_paths.items()
        },
    }
    atomic_json(args.output.resolve(), manifest)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
