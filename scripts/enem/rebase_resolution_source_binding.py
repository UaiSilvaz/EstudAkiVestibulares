#!/usr/bin/env python3
"""Rebind unchanged authorial resolutions after a traceable metadata-only source edit."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
from typing import Any

from generate_authorial_resolutions import (
    ROOT,
    atomic_json,
    digest,
    minimal_question,
    validate_resolution,
)


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
    parser.add_argument("--previous", type=Path, required=True)
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    previous_path = args.previous.resolve()
    question_path = args.questions.resolve()
    evidence_path = args.evidence.resolve()
    output_path = args.output.resolve()
    previous = load(previous_path)
    evidence = load(evidence_path)
    question_rows = load(question_path)
    questions = [minimal_question(row) for row in question_rows]
    resolutions = previous.get("resolutions") or []
    if previous.get("complete") is not True or len(resolutions) != len(questions):
        raise SystemExit("O conjunto anterior de resoluções não está completo.")
    if previous.get("sourceFileSha256") != evidence.get("questionsBeforeSha256"):
        raise SystemExit("A evidência não parte da mesma fonte das resoluções anteriores.")
    if sha256(question_path) != evidence.get("questionsAfterSha256"):
        raise SystemExit("A fonte atual não corresponde ao resultado da remediação registrada.")
    changes = evidence.get("changes") or []
    if evidence.get("changed") != len(changes) or not changes:
        raise SystemExit("A evidência de remediação não contém mudanças rastreáveis.")
    if any(
        change.get("before") is not True or change.get("after") is not False
        for change in changes
    ):
        raise SystemExit("A remediação contém mudança além de true→false no indicador visual.")

    source_by_id = {question["sourceId"]: question for question in questions}
    resolution_by_id = {resolution["sourceId"]: resolution for resolution in resolutions}
    if set(source_by_id) != set(resolution_by_id):
        raise SystemExit("As resoluções não cobrem exatamente a fonte atual.")
    for source_id, source in source_by_id.items():
        errors = validate_resolution(
            source,
            resolution_by_id[source_id],
            require_answer_evidence=True,
        )
        if errors:
            raise RuntimeError(f"{source_id}: {', '.join(errors)}")

    output = copy.deepcopy(previous)
    output["sourcePath"] = question_path.relative_to(ROOT).as_posix()
    output["sourceFileSha256"] = sha256(question_path)
    output["sourceHash"] = digest(questions)
    output["sourceRebase"] = {
        "method": "metadata_only_visual_interpretation_flag_rebase",
        "previousResolutionPath": previous_path.relative_to(ROOT).as_posix(),
        "previousResolutionSha256": sha256(previous_path),
        "previousSourceFileSha256": previous.get("sourceFileSha256"),
        "evidencePath": evidence_path.relative_to(ROOT).as_posix(),
        "evidenceSha256": sha256(evidence_path),
        "changedQuestions": [change["sourceId"] for change in changes],
        "authorialContentChanged": False,
    }
    expected_set_hash = digest(resolutions)
    if output.get("finalResolutionSetHash") != expected_set_hash:
        raise SystemExit("O hash do conjunto autoral anterior já estava inconsistente.")
    atomic_json(output_path, output)
    print(
        json.dumps(
            {
                "questions": len(questions),
                "changedMetadataFlags": len(changes),
                "authorialContentChanged": False,
                "sourceFileSha256": output["sourceFileSha256"],
                "sourceHash": output["sourceHash"],
                "resolutionSetHash": expected_set_hash,
                "outputSha256": sha256(output_path),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
