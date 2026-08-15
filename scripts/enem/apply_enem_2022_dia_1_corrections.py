#!/usr/bin/env python3
"""Aplica correções editoriais rastreáveis ao ENEM 2022, 1º dia.

O extrator genérico continua sendo a origem dos registros e recortes de
auditoria. Este pós-processamento usa somente correções verificadas contra o
caderno oficial, recompõe hashes e grava tanto o agregado quanto os arquivos
individuais. Ele não importa nem publica dados.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
from typing import Any

import fitz

from corpus_pipeline import (
    ROOT,
    asset_payload,
    canonical_hash,
    json_dump,
    repo_path,
    sha256_file,
)


DEFAULT_CONFIG = ROOT / "scripts" / "enem" / "config" / "enem-2022-dia-1.json"
DEFAULT_CORRECTIONS = (
    ROOT / "scripts" / "enem" / "config" / "enem-2022-dia-1-correcoes.json"
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def text_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalized_region(page: fitz.Page, raw: dict[str, Any]) -> fitz.Rect:
    rect = fitz.Rect(
        float(raw["x"]),
        float(raw["y"]),
        float(raw["x"]) + float(raw["width"]),
        float(raw["y"]) + float(raw["height"]),
    )
    clipped = rect & page.rect
    tolerance = 0.01
    if clipped.is_empty or any(
        abs(left - right) > tolerance
        for left, right in zip(tuple(rect), tuple(clipped), strict=True)
    ):
        raise ValueError(f"Região manual fora da página {page.number + 1}: {raw}")
    return clipped


def render_visuals(
    question: dict[str, Any],
    correction: dict[str, Any],
    document: fitz.Document,
    output: Path,
) -> list[dict[str, Any]]:
    regions = correction.get("visualRegions")
    if regions is None:
        return [
            item
            for item in question.get("assets", [])
            if item.get("type") == "official_prompt_visual"
        ]
    destination = output / "assets" / "questoes" / question["id"]
    destination.mkdir(parents=True, exist_ok=True)
    visuals: list[dict[str, Any]] = []
    for index, raw in enumerate(regions, start=1):
        page = document[int(raw["page"]) - 1]
        rect = normalized_region(page, raw)
        visuals.append(
            asset_payload(
                destination / f"visual-{index:02d}.png",
                page,
                rect,
                asset_type="official_prompt_visual",
                relation="statement",
                order=index - 1,
                alt_text=str(
                    raw.get("altText")
                    or f"Elemento visual oficial da questão {question['officialNumber']}"
                ),
            )
        )
    referenced = {Path(item["storagePath"]).name for item in visuals}
    for stale in destination.glob("visual-*.png"):
        if stale.name not in referenced:
            stale.unlink()
    return visuals


def image_block(asset: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "image",
        "content": asset["altText"],
        "altText": asset["altText"],
        "artifactPath": asset["artifactPath"],
        "assetSha256": asset["sha256"],
        "assetPath": asset["storagePath"],
        "sourcePdfPage": asset["sourcePdfPage"],
        "zoneOrder": 0,
        "sourceRegion": asset["sourceRegion"],
        "confidence": 1.0,
        "classificationMethod": "manual_editorial_region_verified_against_official_pdf",
    }


def planned_block(
    entry: dict[str, Any],
    originals: list[dict[str, Any]],
    visuals: list[dict[str, Any]],
) -> dict[str, Any]:
    if "visual" in entry:
        return image_block(visuals[int(entry["visual"])])
    if "existing" in entry:
        block = copy.deepcopy(originals[int(entry["existing"])])
    elif "mergeExisting" in entry:
        indexes = [int(index) for index in entry["mergeExisting"]]
        if not indexes:
            raise ValueError("mergeExisting exige ao menos um bloco")
        selected = [originals[index] for index in indexes]
        source_pages = {item.get("sourcePdfPage") for item in selected}
        if len(source_pages) != 1:
            raise ValueError("mergeExisting não pode atravessar páginas")
        block = copy.deepcopy(selected[0])
        separator = str(entry.get("separator", "\n"))
        block["content"] = separator.join(
            str(item.get("content") or "").strip() for item in selected
        )
        regions = [item.get("sourceRegion") for item in selected]
        if all(isinstance(region, dict) for region in regions):
            x0 = min(float(region["x"]) for region in regions)
            y0 = min(float(region["y"]) for region in regions)
            x1 = max(float(region["x"]) + float(region["width"]) for region in regions)
            y1 = max(float(region["y"]) + float(region["height"]) for region in regions)
            normalized = [region.get("normalized") for region in regions]
            union = {
                "x": x0,
                "y": y0,
                "width": x1 - x0,
                "height": y1 - y0,
            }
            if all(isinstance(region, dict) for region in normalized):
                nx0 = min(float(region["x"]) for region in normalized)
                ny0 = min(float(region["y"]) for region in normalized)
                nx1 = max(
                    float(region["x"]) + float(region["width"])
                    for region in normalized
                )
                ny1 = max(
                    float(region["y"]) + float(region["height"])
                    for region in normalized
                )
                union["normalized"] = {
                    "x": nx0,
                    "y": ny0,
                    "width": nx1 - nx0,
                    "height": ny1 - ny0,
                }
            block["sourceRegion"] = union
    elif "new" in entry:
        template = entry.get("templateExisting")
        block = copy.deepcopy(originals[int(template)]) if template is not None else {}
        block.update(copy.deepcopy(entry["new"]))
    else:
        raise ValueError(f"Entrada de blockPlan inválida: {entry}")
    if "type" in entry:
        block["type"] = entry["type"]
    if "content" in entry:
        block["content"] = entry["content"]
    if block.get("type") != "image":
        for key in ("altText", "artifactPath", "assetSha256", "assetPath"):
            block.pop(key, None)
        block["textSha256"] = text_hash(str(block.get("content") or ""))
        block["classificationMethod"] = "manual_editorial_correction_verified_against_official_pdf"
        block["confidence"] = 1.0
    return block


def rebuild_content(question: dict[str, Any]) -> None:
    blocks = question["blocks"]
    command_blocks = [item for item in blocks if item.get("type") == "command"]
    if len(command_blocks) != 1:
        raise ValueError(f"{question['id']}: esperado exatamente um bloco command")
    command = str(command_blocks[0].get("content") or "").strip()
    support = "\n\n".join(
        str(item.get("content") or "").strip()
        for item in blocks
        if item.get("type") not in {"image", "command"}
        and str(item.get("content") or "").strip()
    )
    question["supportText"] = support or None
    question["command"] = command
    question["statement"] = "\n\n".join(value for value in (support, command) if value)
    question["credits"] = [
        str(item.get("content") or "").strip()
        for item in blocks
        if item.get("type") == "credit" and str(item.get("content") or "").strip()
    ]


def refresh_hashes(question: dict[str, Any]) -> None:
    for index, block in enumerate(question["blocks"]):
        block["order"] = index
        if block.get("type") != "image":
            block["textSha256"] = text_hash(str(block.get("content") or ""))
    for index, alternative in enumerate(question["alternatives"]):
        alternative["order"] = index
        alternative["textSha256"] = text_hash(str(alternative.get("text") or ""))
    content_hash = canonical_hash(
        {
            "corpusId": question["corpusId"],
            "officialNumber": question["officialNumber"],
            "language": question["language"],
            "statement": question["statement"],
            "blocks": [
                {"type": block["type"], "content": block.get("content")}
                for block in question["blocks"]
            ],
            "alternatives": [
                {"key": item["key"], "text": item.get("text") or ""}
                for item in question["alternatives"]
            ],
        }
    )
    question["contentHash"] = content_hash
    question["deduplicationHash"] = canonical_hash(
        {
            "year": question["year"],
            "day": question["day"],
            "booklet": question["bookletNumber"],
            "number": question["officialNumber"],
            "language": question["language"],
            "contentHash": content_hash,
        }
    )


def apply_question(
    question: dict[str, Any],
    correction: dict[str, Any],
    document: fitz.Document,
    output: Path,
    correction_hash: str,
    *,
    skip_block_plan: bool = False,
) -> dict[str, Any]:
    result = copy.deepcopy(question)
    originals = copy.deepcopy(result.get("blocks") or [])
    visuals = render_visuals(result, correction, document, output)
    if correction.get("visualRegions") is not None:
        result["assets"] = [
            item
            for item in result.get("assets", [])
            if item.get("type") != "official_prompt_visual"
        ] + visuals
    plan = correction.get("blockPlan")
    if plan is not None and not skip_block_plan:
        result["blocks"] = [planned_block(entry, originals, visuals) for entry in plan]
    for key, value in (correction.get("alternativeTexts") or {}).items():
        matches = [item for item in result["alternatives"] if item.get("key") == key]
        if len(matches) != 1:
            raise ValueError(f"{result['id']}: alternativa {key} não localizada")
        matches[0]["text"] = value
    rebuild_content(result)
    result["flags"]["hasPromptVisual"] = bool(visuals)
    result["flags"]["hasImage"] = bool(result.get("assets"))
    result["confidence"]["text"] = 1.0
    result["confidence"]["alternatives"] = 1.0
    result["confidence"]["images"] = 1.0
    result["extraction"]["editorialCorrection"] = {
        "corpus": "enem-2022-dia-1-caderno-1-azul",
        "correctionsSha256": correction_hash,
        "evidence": correction.get("evidence"),
        "method": "manual_comparison_with_official_pdf",
    }
    refresh_hashes(result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--corrections", type=Path, default=DEFAULT_CORRECTIONS)
    parser.add_argument(
        "--cleanup-orphan-visuals",
        action="store_true",
        help="Remove somente visual-*.png não referenciado no agregado D1.",
    )
    parser.add_argument(
        "--emit-audit-subset",
        type=Path,
        help="Grava um agregado apenas com as ocorrências declaradas nas correções.",
    )
    parser.add_argument(
        "--audit-source-id",
        action="append",
        default=[],
        help="Limita --emit-audit-subset a um sourceId; pode ser repetido.",
    )
    parser.add_argument(
        "--apply-source-id",
        action="append",
        default=[],
        help="Aplica incrementalmente apenas o sourceId indicado; pode ser repetido.",
    )
    parser.add_argument(
        "--skip-block-plan",
        action="store_true",
        help="Em reaplicação incremental, mantém os blocos atuais e atualiza apenas os demais campos declarados.",
    )
    args = parser.parse_args()
    config_path = args.config.resolve()
    corrections_path = args.corrections.resolve()
    config = load_json(config_path)
    corrections = load_json(corrections_path)
    if corrections.get("corpusId") != config.get("id"):
        raise SystemExit("Arquivo de correções não pertence ao corpus configurado.")
    output = repo_path(config["outputDirectory"])
    aggregate_path = output / "questoes-estruturadas.json"
    rows = load_json(aggregate_path)
    if args.emit_audit_subset is not None:
        declared = set((corrections.get("questions") or {}).keys())
        selected = set(args.audit_source_id) if args.audit_source_id else declared
        if not selected <= declared:
            raise RuntimeError(f"sourceIds não declarados nas correções: {sorted(selected - declared)}")
        subset = [item for item in rows if item.get("id") in selected]
        if len(subset) != len(selected):
            raise RuntimeError(f"Subset incompleto: {len(subset)}/{len(selected)}")
        destination = args.emit_audit_subset.resolve()
        if output.resolve() not in destination.parents:
            raise RuntimeError("O subset de auditoria deve permanecer no diretório do corpus.")
        json_dump(destination, subset)
        print(
            json.dumps(
                {"output": destination.relative_to(ROOT).as_posix(), "rows": len(subset)},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    if args.cleanup_orphan_visuals:
        referenced = {
            repo_path(asset["storagePath"])
            for question in rows
            for asset in [
                *(question.get("assets") or []),
                *(question.get("originalCrops") or []),
            ]
            if asset.get("storagePath")
        }
        asset_root = (output / "assets" / "questoes").resolve()
        removed: list[str] = []
        for candidate in asset_root.rglob("visual-*.png"):
            resolved = candidate.resolve()
            if asset_root not in resolved.parents:
                raise RuntimeError(f"Candidato fora do diretório de assets: {resolved}")
            if resolved not in referenced:
                resolved.unlink()
                removed.append(resolved.relative_to(ROOT).as_posix())
        print(json.dumps({"removed": removed}, ensure_ascii=False, indent=2))
        return 0
    indexed = {item["id"]: item for item in rows}
    declared = corrections.get("questions") or {}
    selected_for_apply = set(args.apply_source_id) if args.apply_source_id else set(declared)
    if not selected_for_apply <= set(declared):
        raise SystemExit(
            f"Correções incrementais não declaradas: {sorted(selected_for_apply - set(declared))}"
        )
    requested = {
        source_id: correction
        for source_id, correction in declared.items()
        if source_id in selected_for_apply
    }
    if args.skip_block_plan and not args.apply_source_id:
        raise SystemExit("--skip-block-plan exige ao menos um --apply-source-id explícito.")
    if args.skip_block_plan and any(
        correction.get("visualRegions") is not None for correction in requested.values()
    ):
        raise SystemExit("--skip-block-plan não pode ser usado com correção de região visual.")
    missing = sorted(set(requested) - set(indexed))
    if missing:
        raise SystemExit(f"Questões corrigidas ausentes do corpus: {missing}")
    correction_hash = sha256_file(corrections_path)
    exam_path = repo_path(config["officialExamPdf"])
    with fitz.open(exam_path) as document:
        for source_id, correction in requested.items():
            indexed[source_id] = apply_question(
                indexed[source_id],
                correction,
                document,
                output,
                correction_hash,
                skip_block_plan=args.skip_block_plan,
            )
    for source_id, correction in declared.items():
        if source_id not in indexed:
            continue
        indexed[source_id].setdefault("extraction", {})["editorialCorrection"] = {
            "corpus": "enem-2022-dia-1-caderno-1-azul",
            "correctionsSha256": correction_hash,
            "evidence": correction.get("evidence"),
            "method": "manual_comparison_with_official_pdf",
        }
    corrected = [indexed[item["id"]] for item in rows]
    json_dump(aggregate_path, corrected)
    individual = output / "questoes"
    for question in corrected:
        language = str(question["language"]).lower()
        name = f"questao-{int(question['officialNumber']):03d}-{language}.json"
        json_dump(individual / name, question)
    checkpoint_path = output / "checkpoint.json"
    checkpoint = load_json(checkpoint_path)
    checkpoint["editorialCorrections"] = {
        "path": corrections_path.relative_to(ROOT).as_posix(),
        "sha256": correction_hash,
        "correctedOccurrences": len(declared),
        "sourceIds": list(declared),
        "lastAppliedSourceIds": list(requested),
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
                "lastAppliedOccurrences": len(requested),
                "questions": len(corrected),
                "alternatives": sum(len(item["alternatives"]) for item in corrected),
                "correctionsSha256": correction_hash,
                "outputSha256": sha256_file(aggregate_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
