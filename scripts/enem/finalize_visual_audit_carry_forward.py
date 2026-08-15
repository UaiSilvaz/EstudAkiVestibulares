#!/usr/bin/env python3
"""Finalize a visual audit after narrowly scoped, traceable remediation.

This does not manufacture a new visual review.  It carries forward an
independent complete audit only when every previously inspected path still
exists, rechecks all physical hashes and ordered media links, and requires a
manual reinspection record for every previous FAIL.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from audit_visual_fidelity import audit_source, source_files
from generate_authorial_resolutions import ROOT, atomic_json, digest


CHECKS = (
    "statementFidelity",
    "elementOrder",
    "alternativeFidelity",
    "imageLegibility",
    "questionIsolation",
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def file_sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def validate_current_question(row: dict[str, Any]) -> dict[str, str]:
    source_id = str(row.get("id") or "")
    errors: list[str] = []
    blocks = row.get("blocks") or []
    if [block.get("order") for block in blocks] != list(range(len(blocks))):
        errors.append("ordem de blocos nao contigua")
    command_indexes = [
        index for index, block in enumerate(blocks) if block.get("type") == "command"
    ]
    if len(command_indexes) != 1:
        errors.append("quantidade de comandos diferente de um")
    elif any(
        block.get("type") in {"support_text", "credit", "image"}
        for block in blocks[command_indexes[0] + 1 :]
    ):
        errors.append("conteudo estruturado depois do comando")
    if [item.get("key") for item in row.get("alternatives") or []] != list("ABCDE"):
        errors.append("alternativas A-E ausentes ou fora de ordem")

    declared = [*(row.get("originalCrops") or []), *(row.get("assets") or [])]
    hashes: dict[str, str] = {}
    for asset in declared:
        storage = str(asset.get("storagePath") or "")
        expected_hash = str(asset.get("sha256") or "")
        local_path = (ROOT / storage).resolve()
        if not storage or ROOT not in local_path.parents or not local_path.is_file():
            errors.append(f"arquivo ausente ou fora do repositorio: {storage}")
            continue
        physical_hash = file_sha256(local_path)
        hashes[storage] = physical_hash
        if physical_hash != expected_hash:
            errors.append(f"hash fisico divergente: {storage}")

    visuals = [asset for asset in row.get("assets") or [] if asset.get("type") == "visual"]
    image_blocks = [block for block in blocks if block.get("type") == "image"]
    for asset in visuals:
        linked = [
            block
            for block in image_blocks
            if block.get("assetSha256") == asset.get("sha256")
            and (block.get("assetPath") or block.get("storagePath"))
            == asset.get("storagePath")
        ]
        if len(linked) != 1:
            errors.append(f"visual sem um unico bloco IMAGE: {asset.get('storagePath')}")
            continue
        block = linked[0]
        if (
            block.get("sourcePdfPage") != asset.get("sourcePdfPage")
            or block.get("sourceRegion") != asset.get("sourceRegion")
            or not str(block.get("altText") or "").strip()
        ):
            errors.append(f"metadados do bloco IMAGE divergentes: {asset.get('storagePath')}")
    declared_visual_links = {
        (asset.get("sha256"), asset.get("storagePath")) for asset in visuals
    }
    for block in image_blocks:
        link = (
            block.get("assetSha256"),
            block.get("assetPath") or block.get("storagePath"),
        )
        if link not in declared_visual_links:
            errors.append(f"bloco IMAGE orfao: {link}")

    if errors:
        raise RuntimeError(f"{source_id}: " + "; ".join(errors))
    return hashes


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--manual", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    rows = load_json(args.questions.resolve())
    baseline = load_json(args.baseline.resolve())
    manual_payload = load_json(args.manual.resolve())
    if not isinstance(rows, list) or not rows:
        raise SystemExit("Manifesto de questoes invalido.")
    baseline_by_id = {item["sourceId"]: item for item in baseline.get("audits") or []}
    manual_by_id = {item["sourceId"]: item for item in manual_payload.get("audits") or []}
    failed_baseline_ids = {
        source_id
        for source_id, audit in baseline_by_id.items()
        if audit.get("verdict") != "PASS"
    }
    if failed_baseline_ids != set(manual_by_id):
        raise SystemExit(
            "Registros manuais devem corresponder exatamente aos FAIL da auditoria-base."
        )

    sources = [audit_source(row) for row in rows]
    audits: list[dict[str, Any]] = []
    for row, current_source in zip(rows, sources):
        source_id = current_source["sourceId"]
        baseline_audit = baseline_by_id.get(source_id)
        if not baseline_audit:
            raise RuntimeError(f"{source_id}: ausente na auditoria-base.")
        current_files = source_files(row)
        baseline_files = baseline_audit.get("inspectedFiles") or []
        if baseline_files != current_files:
            raise RuntimeError(
                f"{source_id}: conjunto/ordem de arquivos mudou desde a auditoria-base."
            )
        physical_hashes = validate_current_question(row)
        manual = manual_by_id.get(source_id)
        if manual:
            if manual.get("verdict") != "PASS" or any(
                manual.get(check) != "PASS" for check in CHECKS
            ):
                raise RuntimeError(f"{source_id}: reauditoria manual nao esta integralmente PASS.")
            reinspected = manual.get("reinspectedFiles") or []
            if not reinspected or any(path not in current_files for path in reinspected):
                raise RuntimeError(f"{source_id}: arquivos reinspecionados invalidos.")
            for path in reinspected:
                if path not in physical_hashes:
                    raise RuntimeError(f"{source_id}: reinspection sem hash fisico: {path}.")
            evidence = manual["evidence"]
            review_method = "manual_remediation_reinspection_plus_baseline_unchanged_files"
        else:
            if baseline_audit.get("verdict") != "PASS" or any(
                baseline_audit.get(check) != "PASS" for check in CHECKS
            ):
                raise RuntimeError(f"{source_id}: auditoria-base nao esta integralmente PASS.")
            evidence = (
                baseline_audit["evidence"]
                + " O manifesto atual preserva os arquivos previamente inspecionados; "
                "seus hashes fisicos foram reconferidos e todo visual principal agora "
                "possui bloco IMAGE unico, ordenado e ligado pelo mesmo SHA-256."
            )
            review_method = "independent_visual_pass_carried_forward_with_current_hash_and_link_checks"

        audits.append(
            {
                "sourceId": source_id,
                "officialNumber": current_source["officialNumber"],
                "language": current_source["language"],
                "verdict": "PASS",
                **{check: "PASS" for check in CHECKS},
                "inspectedFiles": current_files,
                "inspectedFileHashes": {
                    path: physical_hashes[path] for path in current_files
                },
                "issueCodes": [],
                "evidence": evidence,
                "recommendedAction": "Manter a digitalizacao atual.",
                "reviewMethod": review_method,
                "baselineSourceHash": baseline.get("sourceHash"),
                "baselineAuditEvidence": baseline_audit.get("evidence"),
                "currentAuditSourceHash": digest(current_source),
                "reinspectedFiles": (manual or {}).get("reinspectedFiles", []),
            }
        )

    report = {
        "schemaVersion": 1,
        "method": "independent_baseline_plus_traceable_remediation_and_current_media_linkage",
        "questionsSha256": file_sha256(args.questions.resolve()),
        "sourceHash": digest(sources),
        "baselinePath": args.baseline.resolve().relative_to(ROOT).as_posix(),
        "baselineFileSha256": file_sha256(args.baseline.resolve()),
        "baselineSourceHash": baseline.get("sourceHash"),
        "manualEvidencePath": args.manual.resolve().relative_to(ROOT).as_posix(),
        "manualEvidenceSha256": file_sha256(args.manual.resolve()),
        "expected": len(rows),
        "audited": len(audits),
        "passed": len(audits),
        "failed": 0,
        "complete": len(audits) == len(rows),
        "canApprove": len(audits) == len(rows),
        "audits": audits,
    }
    atomic_json(args.output.resolve(), report)
    print(
        json.dumps(
            {key: report[key] for key in ("expected", "audited", "passed", "failed", "complete", "canApprove", "questionsSha256", "sourceHash")},
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
