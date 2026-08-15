#!/usr/bin/env python3
"""Aplica correções editoriais auditadas a um corpus ENEM sem importar/publicar."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any

import fitz

from apply_enem_2022_dia_1_corrections import (
    load_json,
    normalized_region,
    planned_block,
    rebuild_content,
    refresh_hashes,
    render_visuals,
)
from corpus_pipeline import ROOT, asset_payload, json_dump, repo_path, sha256_file


def render_alternative_visuals(
    question: dict[str, Any],
    correction: dict[str, Any],
    document: fitz.Document,
    output: Path,
) -> dict[str, list[dict[str, Any]]]:
    """Renderiza recortes editoriais completos para alternativas visuais.

    O extrator geométrico continua sendo a origem normal. Este caminho é usado
    apenas quando a auditoria visual comprova que o recorte automático contém
    uma fração do gráfico ou conteúdo da alternativa vizinha.
    """

    declared = correction.get("alternativeVisualRegions")
    if declared is None:
        grouped: dict[str, list[dict[str, Any]]] = {}
        for asset in question.get("assets", []):
            key = asset.get("alternativeKey")
            if asset.get("type") == "official_alternative_visual" and key:
                grouped.setdefault(str(key), []).append(asset)
        return grouped
    destination = output / "assets" / "questoes" / question["id"]
    destination.mkdir(parents=True, exist_ok=True)
    grouped = {}
    alternative_order = {
        str(item.get("key")): int(item.get("order", index))
        for index, item in enumerate(question.get("alternatives", []))
    }
    for raw_key, regions in declared.items():
        key = str(raw_key).upper()
        if key not in alternative_order:
            raise ValueError(f"{question['id']}: alternativa visual {key} não localizada.")
        rendered: list[dict[str, Any]] = []
        for part, raw in enumerate(regions, start=1):
            page = document[int(raw["page"]) - 1]
            rect = normalized_region(page, raw)
            asset = asset_payload(
                destination / f"alternativa-{key.lower()}-{part:02d}.png",
                page,
                rect,
                asset_type="official_alternative_visual",
                relation="alternative",
                order=alternative_order[key],
                alt_text=str(
                    raw.get("altText")
                    or (
                        f"Elemento visual da alternativa {key} da questão "
                        f"{question['officialNumber']}"
                    )
                ),
            )
            asset["alternativeKey"] = key
            rendered.append(asset)
        grouped[key] = rendered
        referenced = {Path(item["storagePath"]).name for item in rendered}
        for stale in destination.glob(f"alternativa-{key.lower()}-*.png"):
            if stale.name not in referenced:
                stale.unlink()
    return grouped


def replace_visual_blocks(
    blocks: list[dict[str, Any]],
    visuals: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    output = copy.deepcopy(blocks)
    image_indexes = [
        index for index, block in enumerate(output) if block.get("type") == "image"
    ]
    if len(image_indexes) != len(visuals):
        raise ValueError(
            "Correção visual sem blockPlan exige a mesma quantidade de blocos e regiões: "
            f"blocos={len(image_indexes)} regiões={len(visuals)}."
        )
    for visual_index, (block_index, visual) in enumerate(
        zip(image_indexes, visuals, strict=True)
    ):
        replacement = planned_block({"visual": visual_index}, [], visuals)
        replacement["order"] = output[block_index].get("order")
        output[block_index] = replacement
    return output


def apply_question(
    question: dict[str, Any],
    correction: dict[str, Any],
    document: fitz.Document,
    output: Path,
    corrections_path: Path,
    corrections_sha256: str,
) -> dict[str, Any]:
    baseline = correction.get("baselineContentHash")
    if baseline != question.get("contentHash"):
        raise ValueError(
            f"{question['id']}: baselineContentHash divergente; "
            "revisar a correção contra a extração atual."
        )
    result = copy.deepcopy(question)
    originals = copy.deepcopy(result.get("blocks") or [])
    visuals = render_visuals(result, correction, document, output)
    alternative_visuals = render_alternative_visuals(
        result, correction, document, output
    )
    if correction.get("visualRegions") is not None:
        result["assets"] = [
            item
            for item in result.get("assets", [])
            if item.get("type") != "official_prompt_visual"
        ] + visuals
    if correction.get("alternativeVisualRegions") is not None:
        replaced_keys = set(alternative_visuals)
        result["assets"] = [
            item
            for item in result.get("assets", [])
            if not (
                item.get("type") == "official_alternative_visual"
                and item.get("alternativeKey") in replaced_keys
            )
        ] + [
            asset
            for key in sorted(alternative_visuals, key=lambda item: "ABCDE".index(item))
            for asset in alternative_visuals[key]
        ]
        for alternative in result.get("alternatives", []):
            key = str(alternative.get("key"))
            if key in alternative_visuals:
                alternative["imageArtifacts"] = [
                    item["artifactPath"] for item in alternative_visuals[key]
                ]
    plan = correction.get("blockPlan")
    if plan is not None:
        result["blocks"] = [
            planned_block(entry, originals, visuals) for entry in plan
        ]
    elif correction.get("visualRegions") is not None:
        result["blocks"] = replace_visual_blocks(originals, visuals)
    for key, value in (correction.get("alternativeTexts") or {}).items():
        alternative = next(
            (
                item
                for item in result.get("alternatives", [])
                if item.get("key") == key
            ),
            None,
        )
        if alternative is None:
            raise ValueError(f"{result['id']}: alternativa {key} não localizada.")
        alternative["text"] = value
    rebuild_content(result)
    result["flags"]["hasPromptVisual"] = bool(visuals)
    result["flags"]["hasAlternativeVisual"] = any(alternative_visuals.values())
    result["flags"]["hasImage"] = bool(result.get("assets"))
    result["confidence"]["text"] = 1.0
    result["confidence"]["alternatives"] = 1.0
    result["confidence"]["images"] = 1.0
    result.setdefault("extraction", {})["editorialCorrection"] = {
        "corpus": result["corpusId"],
        "correctionsPath": corrections_path.relative_to(ROOT).as_posix(),
        "correctionsSha256": corrections_sha256,
        "sourceAudit": correction.get("sourceAudit"),
        "evidence": correction.get("evidence"),
        "method": "manual_comparison_with_official_pdf",
    }
    refresh_hashes(result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--corrections", required=True, type=Path)
    args = parser.parse_args()
    config_path = args.config.resolve()
    corrections_path = args.corrections.resolve()
    config = load_json(config_path)
    corrections = load_json(corrections_path)
    if corrections.get("corpusId") != config.get("id"):
        raise SystemExit("Arquivo de correções não pertence ao corpus configurado.")
    source_audit = corrections.get("sourceAudit") or {}
    audit_path = repo_path(source_audit.get("path", ""))
    if not audit_path.is_file() or sha256_file(audit_path) != source_audit.get("sha256"):
        raise SystemExit("Auditoria visual de origem ausente ou com hash divergente.")
    audit = load_json(audit_path)
    failed_ids = {
        item.get("sourceId")
        for item in audit.get("audits", [])
        if item.get("verdict") == "FAIL"
    }
    declared = corrections.get("questions") or {}
    if set(declared) != failed_ids:
        raise SystemExit(
            "Correções não cobrem exatamente os FAIL da auditoria: "
            f"faltam={sorted(failed_ids - set(declared))}; "
            f"excedem={sorted(set(declared) - failed_ids)}."
        )
    output = repo_path(config["outputDirectory"])
    aggregate_path = output / "questoes-estruturadas.json"
    rows = load_json(aggregate_path)
    indexed = {item["id"]: item for item in rows}
    missing = sorted(set(declared) - set(indexed))
    if missing:
        raise SystemExit(f"Ocorrências corrigidas ausentes: {missing}")
    corrections_sha256 = sha256_file(corrections_path)
    with fitz.open(repo_path(config["officialExamPdf"])) as document:
        for source_id, correction in declared.items():
            correction = {**correction, "sourceAudit": source_audit}
            indexed[source_id] = apply_question(
                indexed[source_id],
                correction,
                document,
                output,
                corrections_path,
                corrections_sha256,
            )
    corrected = [indexed[item["id"]] for item in rows]
    json_dump(aggregate_path, corrected)
    individual = output / "questoes"
    for question in corrected:
        json_dump(
            individual
            / f"questao-{int(question['officialNumber']):03d}-{question['language'].lower()}.json",
            question,
        )
    checkpoint_path = output / "checkpoint.json"
    checkpoint = load_json(checkpoint_path)
    checkpoint["editorialCorrections"] = {
        "path": corrections_path.relative_to(ROOT).as_posix(),
        "sha256": corrections_sha256,
        "sourceAudit": source_audit,
        "correctedOccurrences": len(declared),
        "sourceIds": list(declared),
    }
    checkpoint["stage"] = "editorially_corrected_pending_visual_reaudit"
    checkpoint["publicationAuthorized"] = False
    checkpoint["canPublish"] = False
    json_dump(checkpoint_path, checkpoint)
    print(
        json.dumps(
            {
                "corpusId": config["id"],
                "correctedOccurrences": len(declared),
                "questions": len(corrected),
                "alternatives": sum(len(item["alternatives"]) for item in corrected),
                "correctionsSha256": corrections_sha256,
                "outputSha256": sha256_file(aggregate_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
