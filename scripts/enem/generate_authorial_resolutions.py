#!/usr/bin/env python3
"""Generate checkpointed, question-specific ENEM resolutions with Codex.

The generator never changes publication state.  Its output is an editorial
input that still has to pass the corpus validator and a traceable review gate.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Iterable


ROOT = Path.cwd().resolve()
SCHEMA = ROOT / "scripts" / "enem" / "authorial-resolution-batch.schema.json"
KEYS = tuple("ABCDE")
WRITE_LOCK = threading.Lock()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary_name, path)
    finally:
        temporary = Path(temporary_name)
        if temporary.exists():
            temporary.unlink()


def digest(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def file_digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def root_relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return str(path.resolve())


def official_language(question: dict[str, Any]) -> str:
    explicit = str(question.get("officialLanguage") or "").upper()
    if explicit in {"ENGLISH", "SPANISH", "PORTUGUESE", "NOT_APPLICABLE"}:
        return explicit
    legacy = str(question.get("language") or "").lower()
    if "ingl" in legacy or legacy == "english":
        return "ENGLISH"
    if "espan" in legacy or legacy == "spanish":
        return "SPANISH"
    return "NOT_APPLICABLE"


def requires_visual_interpretation(question: dict[str, Any]) -> bool:
    """Derive the semantic flag without mutating the frozen source corpus.

    Older extractor payloads only persisted ``hasPromptVisual`` and
    ``hasAlternativeVisual``.  A question whose prompt/alternative contains an
    official visual necessarily requires that visual to be interpreted, even
    when the newer explicit flag is absent.
    """
    flags = question.get("flags") or {}
    return bool(
        flags.get("requiresVisualInterpretation")
        or flags.get("hasPromptVisual")
        or flags.get("hasAlternativeVisual")
    )


def minimal_question(question: dict[str, Any]) -> dict[str, Any]:
    alternatives = question.get("alternatives") or question.get("alternativas") or []
    normalized_alternatives = [
        {
            "key": item.get("key"),
            "text": item.get("text") or "",
            "imageUrl": item.get("imageUrl"),
        }
        for item in alternatives
    ]
    answer = question.get("answer")
    if answer is None:
        answer = question.get("alternativaCorreta")
    situation = question.get("answerSituation") or (
        "annulled" if answer == "ANULADA" else "confirmed"
    )
    source_id = str(question.get("id") or "").strip()
    if not source_id:
        raise ValueError("Questão sem id de origem.")
    return {
        "sourceId": source_id,
        "year": question.get("year", question.get("ano")),
        "day": question.get("day", question.get("dia")),
        "officialNumber": question.get(
            "officialNumber", question.get("numeroQuestao")
        ),
        "language": official_language(question),
        "knowledgeArea": question.get("area") or question.get("knowledgeArea"),
        "disciplinaryComponent": question.get("subject")
        or question.get("disciplina"),
        "content": question.get("content") or question.get("conteudo"),
        "subcontent": question.get("subcontent"),
        "supportText": question.get("supportText") or question.get("textoApoio"),
        "command": question.get("command"),
        "statement": question.get("statement") or question.get("enunciado"),
        "alternatives": normalized_alternatives,
        "answer": None if answer == "ANULADA" else answer,
        "answerSituation": situation,
        "requiresVisualInterpretation": requires_visual_interpretation(question),
        "visualFiles": visual_files(question),
    }


def visual_files(question: dict[str, Any]) -> list[str]:
    candidates: list[str] = []
    original_crops = question.get("originalCrops") or []
    prompt_assets = (
        question.get("assets") or []
        if requires_visual_interpretation(question)
        else []
    )
    # Toda questÃ£o leva ao revisor o recorte oficial completo. Recursos
    # adicionais entram quando a interpretaÃ§Ã£o visual faz parte da resposta.
    for item in [*original_crops, *prompt_assets]:
        storage = item.get("storagePath")
        if not storage:
            continue
        candidate = (ROOT / storage).resolve()
        if ROOT in candidate.parents and candidate.exists():
            candidates.append(candidate.relative_to(ROOT).as_posix())
    # Original crops contain the complete official region and are the safest
    # fallback.  Keep the prompt bounded for questions with many fragments.
    return list(dict.fromkeys(candidates))[:8]


PROMPT = """Você é o autor editorial do EstudAki. Produza uma resolução inédita e específica para CADA questão do lote JSON recebido em stdin.

Regras obrigatórias:
- Use apenas enunciado, alternativas, recursos visuais indicados e gabarito oficial fornecidos.
- Confira o raciocínio e nunca troque a letra oficial silenciosamente. Se houver aparente divergência, explique-a no texto sem fabricar outro gabarito.
- A resolução completa deve ensinar o caminho, interpretar fórmulas/tabelas/imagens quando existirem e justificar a correta.
- Comente A, B, C, D e E individualmente e de modo específico; não use comentários genéricos intercambiáveis.
- Inclua caminho de raciocínio, etapas, erro comum, dica, palavras-chave, conteúdo e subconteúdo.
- Preserve sourceId, officialNumber e language exatamente como vieram.
- Reproduza o gabarito em officialAnswer (use ANULADA quando for o caso). Antes de escrever, refaça a resolução e marque answerVerified=true somente quando o raciocínio realmente sustentar a resposta oficial. Não contorne divergências com frases como "segundo o gabarito"; reexamine tabela, gráfico, unidade, semântica do comando e recursos visuais.
- Preserve knowledgeArea e disciplinaryComponent existentes quando não estiverem nulos. Classifique conteúdo/subconteúdo com parcimônia.
- Não invente competência, habilidade, fonte, dado ausente nem resultado numérico.
- Se answerSituation for annulled, explique por que não há alternativa oficial única; ainda assim analise A-E.
- Se visualFiles não estiver vazio, consulte esses arquivos locais antes de resolver.
- Quando reviewContext existir, trate priorAudit apenas como pista de revisão: ele pode conter erro. Confira tudo contra a questão, as alternativas, os arquivos visuais e a letra oficial. sourceVerifiedGuidance registra uma leitura editorial já conferida contra a fonte e deve ser respeitada sem alterar officialAnswer.
- Retorne exatamente um item por questão, na mesma ordem, e somente no schema solicitado.
"""


def parse_json_output(value: str) -> dict[str, Any]:
    stripped = value.lstrip()
    try:
        parsed, _end = json.JSONDecoder().raw_decode(stripped)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Saída do Codex não é JSON: {error}") from error
    if not isinstance(parsed, dict):
        raise RuntimeError("Saída do Codex não é um objeto JSON.")
    return parsed


def validate_resolution(
    source: dict[str, Any],
    resolution: dict[str, Any],
    *,
    require_answer_evidence: bool = True,
) -> list[str]:
    errors: list[str] = []
    for key in ("sourceId", "officialNumber", "language"):
        if resolution.get(key) != source.get(key):
            errors.append(f"{key} divergente")
    expected_answer = source.get("answer") or "ANULADA"
    if (
        require_answer_evidence or "officialAnswer" in resolution
    ) and resolution.get("officialAnswer") != expected_answer:
        errors.append("officialAnswer divergente")
    if (
        require_answer_evidence or "answerVerified" in resolution
    ) and resolution.get("answerVerified") is not True:
        errors.append("gabarito não verificado pelo raciocínio")
    if (
        require_answer_evidence or "answerVerification" in resolution
    ) and len(str(resolution.get("answerVerification") or "").strip()) < 60:
        errors.append("verificação do gabarito curta ou ausente")
    minimums = {
        "shortComment": 40,
        "fullResolution": 180,
        "commonError": 30,
        "studyTip": 30,
        "content": 3,
        "subcontent": 3,
    }
    for key, minimum in minimums.items():
        if len(str(resolution.get(key) or "").strip()) < minimum:
            errors.append(f"{key} curto ou ausente")
    comments = resolution.get("alternativeComments")
    if not isinstance(comments, dict) or set(comments) != set(KEYS):
        errors.append("comentários A-E incompletos")
    elif any(len(str(comments[key]).strip()) < 25 for key in KEYS):
        errors.append("comentário de alternativa curto")
    if len(resolution.get("reasoningPath") or []) < 2:
        errors.append("caminho de raciocínio insuficiente")
    if not resolution.get("steps"):
        errors.append("etapas ausentes")
    if len(resolution.get("keywords") or []) < 2:
        errors.append("palavras-chave insuficientes")
    normalized = " ".join(
        str(resolution.get(key) or "").lower()
        for key in ("shortComment", "fullResolution")
    )
    if any(marker in normalized for marker in ("aguardando geração", "em revisão", "não disponível")):
        errors.append("placeholder editorial detectado")
    if source.get("answerSituation") != "annulled" and any(
        marker in normalized
        for marker in (
            "divergência entre",
            "inconsistência entre",
            "gabarito oficial fornecido",
            "preservo a letra oficial",
            "mantendo o gabarito oficial",
        )
    ):
        errors.append("divergência lógica não resolvida")
    return errors


def run_codex(
    questions: list[dict[str, Any]],
    review_context: dict[str, Any],
    model: str,
    effort: str,
    timeout: int,
) -> list[dict[str, Any]]:
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
        model,
        "-c",
        f'model_reasoning_effort="{effort}"',
        "--output-schema",
        str(SCHEMA),
        "--color",
        "never",
        PROMPT,
    ]
    completed = subprocess.run(
        command,
        input=json.dumps(
            {"questions": questions, "reviewContext": review_context},
            ensure_ascii=False,
        ),
        text=True,
        encoding="utf-8",
        errors="strict",
        capture_output=True,
        timeout=timeout,
        cwd=ROOT,
    )
    if completed.returncode != 0:
        tail = completed.stderr[-2000:].strip()
        raise RuntimeError(f"Codex retornou {completed.returncode}: {tail}")
    payload = parse_json_output(completed.stdout)
    resolutions = payload.get("resolutions")
    if not isinstance(resolutions, list):
        raise RuntimeError("Saída sem array resolutions.")
    if len(resolutions) != len(questions):
        raise RuntimeError(
            f"Lote incompleto: {len(resolutions)}/{len(questions)} resoluções."
        )
    for source, resolution in zip(questions, resolutions, strict=True):
        errors = validate_resolution(source, resolution)
        if errors:
            raise RuntimeError(f"{source['sourceId']}: {', '.join(errors)}")
    return resolutions


def batches(values: list[Any], size: int) -> Iterable[tuple[int, list[Any]]]:
    for start in range(0, len(values), size):
        yield start // size + 1, values[start : start + size]


def resolution_rows(value: Any, label: str) -> list[dict[str, Any]]:
    rows = value.get("resolutions") if isinstance(value, dict) else value
    if not isinstance(rows, list):
        raise SystemExit(f"{label}: array resolutions ausente.")
    if not all(isinstance(row, dict) for row in rows):
        raise SystemExit(f"{label}: resolução inválida no array.")
    return rows


def select_failed_questions(
    audit_path: Path, questions: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    payload = load_json(audit_path)
    audits = payload.get("audits") if isinstance(payload, dict) else None
    if not isinstance(audits, list):
        raise SystemExit("Relatório de seleção sem array audits.")
    if payload.get("complete") is not True or payload.get("audited") != len(questions):
        raise SystemExit(
            "A seleção seletiva exige uma auditoria completa do caderno inteiro."
        )

    source_by_id = {item["sourceId"]: item for item in questions}
    seen: set[str] = set()
    prior_audit: dict[str, Any] = {}
    selected_ids: list[str] = []
    for audit in audits:
        source_id = str(audit.get("sourceId") or "")
        if source_id in seen:
            raise SystemExit(f"Auditoria com sourceId duplicado: {source_id}")
        seen.add(source_id)
        source = source_by_id.get(source_id)
        if source is None:
            raise SystemExit(f"Auditoria referencia questão desconhecida: {source_id}")
        for key in ("officialNumber", "language"):
            if audit.get(key) != source.get(key):
                raise SystemExit(f"{source_id}: {key} divergente na auditoria.")
        if audit.get("verdict") == "FAIL":
            selected_ids.append(source_id)
            prior_audit[source_id] = {
                "issueCodes": audit.get("issueCodes") or [],
                "explanation": audit.get("explanation"),
                "recommendedAction": audit.get("recommendedAction"),
            }
        elif audit.get("verdict") != "PASS":
            raise SystemExit(f"{source_id}: veredito de auditoria inválido.")

    if seen != set(source_by_id):
        missing = sorted(set(source_by_id) - seen)
        raise SystemExit(f"Auditoria não cobre todas as questões: {missing[:5]}")
    if not selected_ids:
        raise SystemExit("A auditoria informada não possui FAILs para regenerar.")
    selected_set = set(selected_ids)
    selected = [item for item in questions if item["sourceId"] in selected_set]
    return selected, {
        "path": root_relative(audit_path),
        "sha256": file_digest(audit_path),
        "sourceHash": payload.get("sourceHash"),
        "selectedSourceIds": [item["sourceId"] for item in selected],
        "priorAudit": prior_audit,
    }


def load_guidance(
    path: Path | None, selected_ids: set[str]
) -> tuple[dict[str, str], dict[str, Any] | None]:
    if path is None:
        return {}, None
    payload = load_json(path)
    raw = payload.get("guidance") if isinstance(payload, dict) else None
    if not isinstance(raw, dict):
        raise SystemExit("Arquivo de orientação sem objeto guidance.")
    guidance = {
        str(source_id): str(note).strip()
        for source_id, note in raw.items()
        if str(note).strip()
    }
    unknown = sorted(set(guidance) - selected_ids)
    if unknown:
        raise SystemExit(
            f"Orientação referencia questões fora da seleção: {unknown[:5]}"
        )
    return guidance, {
        "path": root_relative(path),
        "sha256": file_digest(path),
        "guidedSourceIds": sorted(guidance),
    }


def validate_resolution_set(
    questions: list[dict[str, Any]],
    resolutions: list[dict[str, Any]],
    label: str,
    *,
    require_answer_evidence: bool = True,
    skip_validation_ids: set[str] | None = None,
) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for resolution in resolutions:
        source_id = str(resolution.get("sourceId") or "")
        if source_id in by_id:
            raise SystemExit(f"{label}: sourceId duplicado: {source_id}")
        by_id[source_id] = resolution
    expected = {question["sourceId"] for question in questions}
    if set(by_id) != expected:
        missing = sorted(expected - set(by_id))
        extra = sorted(set(by_id) - expected)
        raise SystemExit(
            f"{label}: identidades divergentes; ausentes={missing[:5]}, extras={extra[:5]}."
        )
    for question in questions:
        if skip_validation_ids and question["sourceId"] in skip_validation_ids:
            continue
        errors = validate_resolution(
            question,
            by_id[question["sourceId"]],
            require_answer_evidence=require_answer_evidence,
        )
        if errors:
            raise SystemExit(
                f"{label}: {question['sourceId']}: {', '.join(errors)}"
            )
    return by_id


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gera resoluções autorais checkpointadas para um caderno ENEM."
    )
    parser.add_argument("--questions", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--batch-size", type=int, default=5)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--model", default="gpt-5.4-mini")
    parser.add_argument("--effort", choices=["minimal", "low", "medium", "high"], default="low")
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--max-batches", type=int)
    parser.add_argument(
        "--select-failed-from",
        type=Path,
        help="Regenera somente os FAILs de uma auditoria completa.",
    )
    parser.add_argument(
        "--merge-from",
        type=Path,
        help="Lote completo anterior usado para preservar itens não selecionados.",
    )
    parser.add_argument(
        "--guidance",
        type=Path,
        help="Orientações verificadas por sourceId para a regeneração seletiva.",
    )
    parser.add_argument(
        "--include-numbers",
        help="Números oficiais adicionais, separados por vírgula, incluídos no merge seletivo.",
    )
    args = parser.parse_args()

    source_path = args.questions.resolve()
    output_path = args.output.resolve()
    raw = load_json(source_path)
    if not isinstance(raw, list) or not raw:
        raise SystemExit("O arquivo de questões deve conter um array não vazio.")
    questions = [minimal_question(item) for item in raw]
    identities = [
        (item["sourceId"], item["officialNumber"], item["language"])
        for item in questions
    ]
    if len(set(identities)) != len(identities):
        raise SystemExit("Há identidades duplicadas no arquivo de questões.")

    source_hash = digest(questions)
    selected_questions = questions
    selection: dict[str, Any] | None = None
    if args.select_failed_from:
        selected_questions, selection = select_failed_questions(
            args.select_failed_from.resolve(), questions
        )
        if not args.merge_from:
            raise SystemExit(
                "--select-failed-from exige --merge-from para preservar os PASSs."
            )
    elif args.merge_from:
        raise SystemExit("--merge-from só pode ser usado com --select-failed-from.")
    elif args.include_numbers:
        raise SystemExit("--include-numbers exige --select-failed-from.")

    if args.include_numbers:
        try:
            forced_numbers = {
                int(value.strip())
                for value in args.include_numbers.split(",")
                if value.strip()
            }
        except ValueError as error:
            raise SystemExit("--include-numbers contém número inválido.") from error
        question_numbers = {item["officialNumber"] for item in questions}
        unknown_numbers = sorted(forced_numbers - question_numbers)
        if unknown_numbers:
            raise SystemExit(
                f"--include-numbers fora do caderno: {unknown_numbers[:5]}"
            )
        selected_source_ids = {
            item["sourceId"] for item in selected_questions
        } | {
            item["sourceId"]
            for item in questions
            if item["officialNumber"] in forced_numbers
        }
        selected_questions = [
            item for item in questions if item["sourceId"] in selected_source_ids
        ]
        if selection is not None:
            selection["forcedOfficialNumbers"] = sorted(forced_numbers)
            selection["selectedSourceIds"] = [
                item["sourceId"] for item in selected_questions
            ]

    selected_ids = {item["sourceId"] for item in selected_questions}
    guidance, guidance_metadata = load_guidance(
        args.guidance.resolve() if args.guidance else None,
        selected_ids,
    )
    prior_audit = selection.get("priorAudit", {}) if selection else {}
    review_context: dict[str, Any] = {}
    for source_id in selected_ids:
        context: dict[str, Any] = {}
        if source_id in prior_audit:
            context["priorAudit"] = prior_audit[source_id]
        if source_id in guidance:
            context["sourceVerifiedGuidance"] = guidance[source_id]
        if context:
            review_context[source_id] = context

    base_payload: dict[str, Any] | None = None
    base_by_id: dict[str, dict[str, Any]] = {}
    base_provenance: dict[str, Any] = {}
    merge_metadata: dict[str, Any] | None = None
    if args.merge_from:
        merge_path = args.merge_from.resolve()
        base_payload = load_json(merge_path)
        if not isinstance(base_payload, dict) or base_payload.get("complete") is not True:
            raise SystemExit("O lote-base precisa estar completo.")
        base_rows = resolution_rows(base_payload, "Lote-base")
        base_by_id = validate_resolution_set(
            questions,
            base_rows,
            "Lote-base",
            require_answer_evidence=False,
            skip_validation_ids=selected_ids,
        )
        raw_provenance = base_payload.get("resolutionProvenance") or {}
        if isinstance(raw_provenance, dict):
            base_provenance = raw_provenance
        merge_metadata = {
            "basePath": root_relative(merge_path),
            "baseSha256": file_digest(merge_path),
            "baseResolutionSetHash": digest(base_rows),
            "baseModel": base_payload.get("model"),
            "baseEffort": base_payload.get("effort"),
        }

    parts_dir = output_path.parent / f"{output_path.stem}-partes"
    parts_dir.mkdir(parents=True, exist_ok=True)
    selection_hash = digest([item["sourceId"] for item in selected_questions])
    review_context_hash = digest(review_context)
    all_batches = list(batches(selected_questions, args.batch_size))
    if args.max_batches is not None:
        all_batches = all_batches[: args.max_batches]

    def execute(batch: tuple[int, list[dict[str, Any]]]) -> dict[str, Any]:
        number, values = batch
        batch_context = {
            item["sourceId"]: review_context[item["sourceId"]]
            for item in values
            if item["sourceId"] in review_context
        }
        batch_hash = digest(
            {"questions": values, "reviewContext": batch_context}
        )
        part = parts_dir / f"lote-{number:04d}.json"
        if part.exists():
            cached = load_json(part)
            cached_resolutions = cached.get("resolutions") or []
            if (
                cached.get("sourceHash") == source_hash
                and cached.get("batchHash") == batch_hash
                and cached.get("selectionHash") == selection_hash
                and cached.get("model") == args.model
                and cached.get("effort") == args.effort
                and len(cached_resolutions) == len(values)
                and not any(
                    validate_resolution(source, resolution)
                    for source, resolution in zip(
                        values, cached_resolutions, strict=True
                    )
                )
            ):
                return cached
        last_error: Exception | None = None
        for attempt in range(1, args.retries + 1):
            try:
                started = time.perf_counter()
                resolutions = run_codex(
                    values,
                    batch_context,
                    args.model,
                    args.effort,
                    args.timeout,
                )
                payload = {
                    "schemaVersion": 1,
                    "sourceHash": source_hash,
                    "selectionHash": selection_hash,
                    "reviewContextHash": digest(batch_context),
                    "batchHash": batch_hash,
                    "batch": number,
                    "attempt": attempt,
                    "model": args.model,
                    "effort": args.effort,
                    "elapsedSeconds": round(time.perf_counter() - started, 3),
                    "resolutions": resolutions,
                }
                with WRITE_LOCK:
                    atomic_json(part, payload)
                    print(
                        json.dumps(
                            {
                                "batch": number,
                                "questions": len(values),
                                "status": "completed",
                                "elapsedSeconds": payload["elapsedSeconds"],
                            },
                            ensure_ascii=False,
                        ),
                        flush=True,
                    )
                return payload
            except Exception as error:  # noqa: BLE001 - checkpointed retry
                last_error = error
                with WRITE_LOCK:
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
                if attempt < args.retries:
                    time.sleep(min(30, attempt * 5))
        raise RuntimeError(f"Lote {number} falhou: {last_error}")

    completed: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(execute, batch): batch[0] for batch in all_batches}
        for future in concurrent.futures.as_completed(futures):
            completed.append(future.result())

    completed.sort(key=lambda item: item["batch"])
    generated_resolutions = [
        resolution
        for item in completed
        for resolution in item.get("resolutions", [])
    ]
    processed_sources = [
        source
        for _number, values in all_batches
        for source in values
    ]
    generated_by_id = validate_resolution_set(
        processed_sources,
        generated_resolutions,
        "Resoluções regeneradas",
    )
    final_by_id = dict(base_by_id)
    final_by_id.update(generated_by_id)
    resolutions = [
        final_by_id[item["sourceId"]]
        for item in questions
        if item["sourceId"] in final_by_id
    ]
    complete = (
        len(generated_by_id) == len(selected_questions)
        and len(resolutions) == len(questions)
    )
    if complete:
        validate_resolution_set(
            questions,
            resolutions,
            "Lote final",
            require_answer_evidence=False,
        )

    part_by_source: dict[str, dict[str, Any]] = {}
    for item in completed:
        part_path = parts_dir / f"lote-{item['batch']:04d}.json"
        part_info = {
            "path": root_relative(part_path),
            "sha256": file_digest(part_path),
            "batchHash": item.get("batchHash"),
        }
        for resolution in item.get("resolutions", []):
            part_by_source[resolution["sourceId"]] = part_info

    resolution_provenance: dict[str, Any] = {}
    base_path = merge_metadata.get("basePath") if merge_metadata else None
    for resolution in resolutions:
        source_id = resolution["sourceId"]
        if source_id in generated_by_id:
            resolution_provenance[source_id] = {
                "mode": "regenerated",
                "model": args.model,
                "effort": args.effort,
                "resolutionHash": digest(resolution),
                "artifact": part_by_source[source_id],
                "reviewContextHash": digest(review_context.get(source_id, {})),
            }
            continue
        previous = base_provenance.get(source_id)
        provenance = dict(previous) if isinstance(previous, dict) else {}
        provenance.update(
            {
                "mode": "preserved_from_merge",
                "model": provenance.get("model")
                or (base_payload or {}).get("model"),
                "effort": provenance.get("effort")
                or (base_payload or {}).get("effort"),
                "resolutionHash": digest(resolution),
                "preservedFrom": base_path,
            }
        )
        resolution_provenance[source_id] = provenance

    preserved_resolutions = [
        resolution
        for resolution in resolutions
        if resolution["sourceId"] not in generated_by_id
    ]
    if merge_metadata is not None:
        merge_metadata.update(
            {
                "preservedQuestions": len(preserved_resolutions),
                "regeneratedQuestions": len(generated_by_id),
                "preservedResolutionSetHash": digest(preserved_resolutions),
                "regeneratedResolutionSetHash": digest(generated_resolutions),
                "finalResolutionSetHash": digest(resolutions),
            }
        )

    selection_report = None
    if selection is not None:
        selection_report = {
            key: value for key, value in selection.items() if key != "priorAudit"
        }
    report = {
        "schemaVersion": 2,
        "sourcePath": root_relative(source_path),
        "sourceHash": source_hash,
        "expectedQuestions": len(questions),
        "processedQuestions": len(resolutions),
        "selectedQuestions": len(selected_questions),
        "generatedQuestions": len(generated_by_id),
        "preservedQuestions": len(preserved_resolutions),
        "complete": complete,
        "generationMode": "selective_merge" if selection else "full",
        "model": args.model,
        "effort": args.effort,
        "selection": selection_report,
        "guidance": guidance_metadata,
        "reviewContextHash": review_context_hash,
        "merge": merge_metadata,
        "finalResolutionSetHash": digest(resolutions),
        "resolutionProvenance": resolution_provenance,
        "resolutions": resolutions,
    }
    atomic_json(output_path, report)
    print(
        json.dumps(
            {
                key: report[key]
                for key in (
                    "expectedQuestions",
                    "processedQuestions",
                    "selectedQuestions",
                    "generatedQuestions",
                    "preservedQuestions",
                    "complete",
                    "generationMode",
                    "model",
                    "effort",
                )
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0 if report["complete"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
