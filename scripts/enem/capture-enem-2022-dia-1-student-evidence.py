#!/usr/bin/env python3
"""Exercise the published ENEM 2022 D1 student flow with an ephemeral account."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import platform
import re
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from playwright.sync_api import BrowserContext, Page, sync_playwright


ROOT = Path(__file__).resolve().parents[2]
BASE_SCRIPT = Path(__file__).with_name("capture-corpus-app-evidence.py")
SPEC = importlib.util.spec_from_file_location("corpus_app_evidence_base", BASE_SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Não foi possível carregar as rotinas comuns de evidência.")
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)

DEFAULT_CORPUS = ROOT / "data" / "QUESTÕES" / "processamento" / "enem-2022-dia-1-caderno-1-azul"
LANGUAGES = ("ENGLISH", "SPANISH")
EXPECTED_THEME = "Desafios para a valorização de comunidades e povos tradicionais no Brasil"
REQUIRED_CHECKS = (
    "languageVariants",
    "initialPayloadProtected",
    "structuredQuestions",
    "proofAttemptCorrection",
    "studyAndProofModes",
    "mobile",
    "essayProposal",
    "temporaryUserCleanup",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS))
    parser.add_argument("--exam-id", default="pa-enem-2022-dia-1")
    parser.add_argument("--job-id", default="cmrpua3ix0002s9pcwehaqog7")
    parser.add_argument("--base-url", default="http://127.0.0.1:3213")
    parser.add_argument("--output-dir")
    parser.add_argument("--tester", default="Codex D1 post-publication student harness")
    parser.add_argument("--chrome-path")
    parser.add_argument("--start-server", action="store_true")
    parser.add_argument("--server-timeout", type=int, default=240)
    parser.add_argument(
        "--session-secret",
        default="codex-d1-student-evidence-session-secret-2026-local-only",
    )
    return parser.parse_args()


def record(
    artifacts: dict[Path, tuple[str, str]],
    path: Path,
    kind: str,
    note: str,
) -> None:
    BASE.record_artifact(artifacts, path, kind, note)


def attach(page: Page, label: str, console: list[dict[str, Any]], network: list[dict[str, Any]]) -> None:
    BASE.attach_diagnostics(page, label, console, network)


def wait_images(page: Page, selector: str) -> list[dict[str, Any]]:
    return BASE.wait_for_images(page, selector, timeout_seconds=30)


def variant_payload(
    context: BrowserContext,
    *,
    base_url: str,
    exam_id: str,
    language: str,
    output: Path,
    artifacts: dict[Path, tuple[str, str]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    response = context.request.get(
        f"{base_url}/api/provas-antigas/{exam_id}/questoes?idioma={language}",
        timeout=120_000,
        fail_on_status_code=False,
    )
    payload = response.json()
    payload_path = output / f"initial-{language.lower()}-student-payload.json"
    BASE.write_json(payload_path, payload)
    record(
        artifacts,
        payload_path,
        "initial-student-payload",
        f"Payload público {language} antes de qualquer tentativa.",
    )
    questions = payload.get("questions") if isinstance(payload, dict) else None
    if response.status != 200 or not isinstance(questions, list):
        raise RuntimeError(f"Payload {language} inválido ({response.status}): {payload}")
    failures: list[str] = []
    for question in questions:
        alternatives = question.get("alternatives") or []
        if not str(question.get("statement") or "").strip():
            failures.append(f"{question.get('id')}: enunciado vazio")
        if [item.get("key") for item in alternatives] != list("ABCDE"):
            failures.append(f"{question.get('id')}: alternativas fora de A-E")
        if any(
            not (str(item.get("text") or "").strip() or item.get("imageUrl"))
            for item in alternatives
        ):
            failures.append(f"{question.get('id')}: alternativa vazia")
    audit = {
        "status": response.status,
        "language": language,
        "selectedLanguage": payload.get("selectedLanguage"),
        "availableLanguages": payload.get("availableLanguages"),
        "questionCount": len(questions),
        "numbers": [item.get("questionNumber") for item in questions],
        "questionIds": [item.get("id") for item in questions],
        "officialLanguages": [item.get("officialLanguage") for item in questions],
        "structureFailures": failures,
        "forbiddenKeyHits": BASE.forbidden_key_hits(payload),
        "valid": bool(
            payload.get("selectedLanguage") == language
            and set(payload.get("availableLanguages") or []) == set(LANGUAGES)
            and len(questions) == 90
            and [item.get("questionNumber") for item in questions] == list(range(1, 91))
            and [item.get("officialLanguage") for item in questions[:5]] == [language] * 5
            and all(item.get("officialLanguage") == "NOT_APPLICABLE" for item in questions[5:])
            and not failures
            and not BASE.forbidden_key_hits(payload)
        ),
    }
    return payload, audit


def proof_flow(
    context: BrowserContext,
    *,
    base_url: str,
    exam_id: str,
    english_payload: dict[str, Any],
    output: Path,
    artifacts: dict[Path, tuple[str, str]],
    console: list[dict[str, Any]],
    network: list[dict[str, Any]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    questions = english_payload["questions"]
    page = context.new_page()
    attach(page, "student-proof-english", console, network)
    url = f"{base_url}/provas-antigas/{exam_id}/resolver?modo=prova&idioma=ENGLISH"
    navigation = page.goto(url, wait_until="domcontentloaded", timeout=120_000)
    if navigation is None or navigation.status >= 400:
        raise RuntimeError("Modo prova não abriu.")
    page.get_by_text(re.compile(r"Questão 1\s*·\s*1 de 90")).wait_for(timeout=120_000)
    radios = page.locator('button[role="radio"]')
    radios.first.wait_for(timeout=30_000)
    proof_link = page.get_by_role("link", name=re.compile(r"Modo prova"))
    study_link = page.get_by_role("link", name=re.compile(r"Modo estudo"))
    english_link = page.get_by_role("link", name="Inglês")
    spanish_link = page.get_by_role("link", name="Espanhol")
    initial_html = navigation.text()
    html_path = output / "proof-initial-response.html"
    BASE.write_text(html_path, initial_html)
    record(artifacts, html_path, "initial-proof-html", "HTML inicial do modo prova, antes da resposta.")
    before_path = output / "student-proof-english-before-submit.png"
    page.screenshot(path=str(before_path), full_page=True)
    record(artifacts, before_path, "student-proof-screenshot", "Modo prova em inglês antes da entrega.")
    first_statement = re.sub(r"\s+", " ", str(questions[0]["statement"])).strip()
    rendered = re.sub(r"\s+", " ", page.locator("article").inner_text()).strip()
    mode_state = {
        "proofAriaCurrent": proof_link.get_attribute("aria-current"),
        "studyAriaCurrent": study_link.get_attribute("aria-current"),
        "englishAriaCurrent": english_link.get_attribute("aria-current"),
        "spanishHref": spanish_link.get_attribute("href"),
        "languageSelectorVisible": page.get_by_text("Escolha a língua estrangeira").count() == 1,
        "firstStatementMatched": first_statement[:120] in rendered,
    }
    initial_html_hits = sorted(key for key in BASE.CORRECTION_ONLY_KEYS if key in initial_html)
    radios.first.click()
    selected = radios.first.get_attribute("aria-checked") == "true"
    card_selected = page.locator('button[aria-label^="Questão 1, marcada A"]').count() == 1
    page.once("dialog", lambda dialog: dialog.accept())
    with page.expect_response(
        lambda response: response.request.method == "POST"
        and response.url.endswith(f"/api/provas-antigas/{exam_id}/attempt"),
        timeout=120_000,
    ) as response_info:
        page.get_by_role("button", name="Finalizar").click()
    attempt = response_info.value
    correction = attempt.json()
    correction_path = output / "proof-correction-after-submit.json"
    BASE.write_json(correction_path, correction)
    record(
        artifacts,
        correction_path,
        "post-submit-correction",
        "Correção pública liberada somente depois da entrega.",
    )
    page.get_by_text("Prova finalizada. Gabarito e comentários liberados.").wait_for(timeout=60_000)
    after_path = output / "student-proof-english-after-submit.png"
    page.screenshot(path=str(after_path), full_page=True)
    record(artifacts, after_path, "student-correction-screenshot", "Correção da questão 1 após a entrega.")
    results = correction.get("results") if isinstance(correction, dict) else []
    active = next((item for item in results or [] if item.get("officialNumber") == 1), None)
    explanation = str(active.get("explanation") or "") if active else ""
    alternatives = active.get("alternativeExplanations") if active else None
    authorial = active.get("authorialResolution") if active else None
    quality = bool(
        attempt.status == 200
        and correction.get("submitted") is True
        and len(results or []) == 90
        and active
        and active.get("selectedAlternative") == "A"
        and re.fullmatch(r"[A-E]", str(active.get("correctAlternative") or ""))
        and len(explanation.strip()) >= 180
        and isinstance(alternatives, dict)
        and set(alternatives) == set("ABCDE")
        and all(len(str(alternatives.get(letter) or "").strip()) >= 25 for letter in "ABCDE")
        and isinstance(authorial, dict)
        and str(authorial.get("commonError") or "").strip()
        and str(authorial.get("studyTip") or "").strip()
    )
    attempt_detail = {
        "status": attempt.status,
        "submitted": correction.get("submitted"),
        "resultCount": len(results or []),
        "selectedBeforeSubmit": selected,
        "answerCardUpdated": card_selected,
        "initialHtmlForbiddenTokens": initial_html_hits,
        "activeResult": {
            "officialNumber": active.get("officialNumber") if active else None,
            "selectedAlternative": active.get("selectedAlternative") if active else None,
            "correctAlternative": active.get("correctAlternative") if active else None,
            "explanationLength": len(explanation),
            "alternativeCommentKeys": sorted(alternatives or {}),
            "commonErrorPresent": bool(isinstance(authorial, dict) and authorial.get("commonError")),
            "studyTipPresent": bool(isinstance(authorial, dict) and authorial.get("studyTip")),
        },
        "qualityPassed": quality,
    }
    page.close()
    return mode_state, attempt_detail


def study_mode(
    context: BrowserContext,
    *,
    base_url: str,
    exam_id: str,
    output: Path,
    artifacts: dict[Path, tuple[str, str]],
    console: list[dict[str, Any]],
    network: list[dict[str, Any]],
) -> dict[str, Any]:
    page = context.new_page()
    attach(page, "student-study-english", console, network)
    url = f"{base_url}/provas-antigas/{exam_id}/resolver?modo=estudo&idioma=ENGLISH"
    navigation = page.goto(url, wait_until="domcontentloaded", timeout=120_000)
    if navigation is None or navigation.status >= 400:
        raise RuntimeError("Modo estudo não abriu.")
    page.get_by_role("heading", name="Questão 1", exact=True).wait_for(timeout=120_000)
    page.locator('button[role="radio"]').first.wait_for(timeout=30_000)
    state = {
        "studyAriaCurrent": page.get_by_role("link", name=re.compile(r"Modo estudo")).get_attribute("aria-current"),
        "proofAriaCurrent": page.get_by_role("link", name=re.compile(r"Modo prova")).get_attribute("aria-current"),
        "englishAriaCurrent": page.get_by_role("link", name="Inglês").get_attribute("aria-current"),
        "languageSelectorVisible": page.get_by_text("Escolha a língua estrangeira").count() == 1,
        "alternativeCount": page.locator('button[role="radio"]').count(),
    }
    screenshot = output / "student-study-english.png"
    page.screenshot(path=str(screenshot), full_page=True)
    record(artifacts, screenshot, "student-study-screenshot", "Modo estudo publicado em inglês.")
    page.close()
    return state


def mobile_spanish(
    context: BrowserContext,
    *,
    base_url: str,
    exam_id: str,
    spanish_payload: dict[str, Any],
    output: Path,
    artifacts: dict[Path, tuple[str, str]],
    console: list[dict[str, Any]],
    network: list[dict[str, Any]],
) -> dict[str, Any]:
    page = context.new_page()
    attach(page, "student-mobile-spanish", console, network)
    url = f"{base_url}/provas-antigas/{exam_id}/resolver?modo=prova&idioma=SPANISH"
    navigation = page.goto(url, wait_until="domcontentloaded", timeout=120_000)
    if navigation is None or navigation.status >= 400:
        raise RuntimeError("Modo prova mobile em espanhol não abriu.")
    page.get_by_text(re.compile(r"Questão 1\s*·\s*1 de 90")).wait_for(timeout=120_000)
    questions = spanish_payload["questions"]
    media = next(question for question in questions if BASE.visible_media_count(question) > 0)
    number = int(media["questionNumber"])
    if number != 1:
        page.locator(f'button[aria-label^="Questão {number},"]').click()
        page.get_by_text(re.compile(rf"Questão {number}\s*·\s*{number} de 90")).wait_for(timeout=30_000)
    images = wait_images(page, "article img")
    layout = page.evaluate(
        """() => ({innerWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth})"""
    )
    article_text = re.sub(r"\s+", " ", page.locator("article").inner_text()).strip()
    expected_text = re.sub(r"\s+", " ", str(media["statement"])).strip()
    layout.update(
        {
            "questionNumber": number,
            "alternativeCount": page.locator('button[role="radio"]').count(),
            "spanishAriaCurrent": page.get_by_role("link", name="Espanhol").get_attribute("aria-current"),
            "statementMatched": expected_text[:120] in article_text,
            "images": images,
        }
    )
    screenshot = output / f"student-mobile-spanish-question-{number}.png"
    page.screenshot(path=str(screenshot), full_page=True)
    record(artifacts, screenshot, "student-mobile-screenshot", f"Questão {number} em espanhol a 390 px.")
    audit_path = output / "mobile-spanish-layout-audit.json"
    BASE.write_json(audit_path, layout)
    record(artifacts, audit_path, "mobile-layout-audit", "Medições reais de overflow e mídia em espanhol.")
    page.close()
    return layout


def essay_flow(
    context: BrowserContext,
    *,
    base_url: str,
    output: Path,
    artifacts: dict[Path, tuple[str, str]],
    console: list[dict[str, Any]],
    network: list[dict[str, Any]],
) -> dict[str, Any]:
    page = context.new_page()
    attach(page, "student-essay", console, network)
    navigation = page.goto(f"{base_url}/redacao", wait_until="domcontentloaded", timeout=120_000)
    if navigation is None or navigation.status >= 400:
        raise RuntimeError("Módulo de redação não abriu.")
    selector = page.locator("select")
    selector.wait_for(timeout=120_000)
    option = selector.locator("option", has_text=re.compile(r"ENEM 2022.*Desafios para a valorização"))
    if option.count() != 1:
        raise RuntimeError("Proposta oficial ENEM 2022 não apareceu no seletor.")
    value = option.get_attribute("value")
    if not value:
        raise RuntimeError("Proposta oficial sem valor de seleção.")
    selector.select_option(value)
    page.get_by_role("heading", name=EXPECTED_THEME, exact=True).wait_for(timeout=30_000)
    article = page.locator("article", has=page.get_by_role("heading", name=EXPECTED_THEME, exact=True))
    original = article.get_by_role("link", name="Consultar original")
    href = original.get_attribute("href") or ""
    prompt = article.locator("p.whitespace-pre-line").first.inner_text()
    instructions = article.locator("ul li").all_inner_texts()
    details = article.locator("details")
    details.locator("summary").click()
    motivating_text = details.inner_text()
    images = wait_images(page, "article img")
    screenshot = output / "student-essay-enem-2022.png"
    page.screenshot(path=str(screenshot), full_page=True)
    record(artifacts, screenshot, "student-essay-screenshot", "Proposta oficial ENEM 2022 no módulo de redação.")
    audit = {
        "theme": EXPECTED_THEME,
        "selectorValue": value,
        "promptLength": len(prompt.strip()),
        "instructions": instructions,
        "motivatingTextLength": len(motivating_text.strip()),
        "motivatingSections": [label for label in ("TEXTO I", "TEXTO II", "TEXTO III", "TEXTO IV") if label in motivating_text],
        "originalHref": href,
        "images": images,
    }
    audit_path = output / "student-essay-audit.json"
    BASE.write_json(audit_path, audit)
    record(artifacts, audit_path, "student-essay-audit", "Tema, proposta, instruções, textos, mídias e original da redação.")
    page.close()
    return audit


def main() -> int:
    args = parse_args()
    started_at = BASE.utc_now()
    run_id = f"d1-student-evidence-{BASE.compact_timestamp()}-{os.getpid()}"
    corpus = BASE.resolve_repo_path(args.corpus_dir)
    source_path = corpus / "questoes-estruturadas.json"
    source = json.loads(source_path.read_text(encoding="utf-8"))
    if len(source) != 95:
        raise RuntimeError("A evidência D1 exige exatamente 95 ocorrências impressas.")
    source.sort(key=lambda item: int(item.get("printedOccurrenceOrder") or item["officialOrder"]))
    corpus_id = str(source[0].get("corpusId") or source[0].get("pilotId"))
    output = (
        BASE.resolve_repo_path(args.output_dir)
        if args.output_dir
        else corpus / "student-evidence" / run_id
    )
    output.mkdir(parents=True, exist_ok=False)
    artifacts: dict[Path, tuple[str, str]] = {}
    checks = {name: False for name in REQUIRED_CHECKS}
    details: dict[str, Any] = {}
    failures: list[str] = []
    console: list[dict[str, Any]] = []
    network: list[dict[str, Any]] = []
    temporary_user: dict[str, Any] = {}
    cleanup: dict[str, Any] | None = None
    server: subprocess.Popen[Any] | None = None
    server_log_handle = None
    server_stop: dict[str, Any] | None = None
    browser_version: str | None = None
    base_url = args.base_url.rstrip("/")
    student_email = f"{run_id.lower()}@app-evidence.estudaki.invalid"
    student_password = "Evidence-Only-2026!"
    server_log = output / "next-production-server.log"
    try:
        if args.start_server:
            server_log_handle = server_log.open("w", encoding="utf-8", errors="replace")
            server = subprocess.Popen(
                [
                    "npm.cmd" if os.name == "nt" else "npm",
                    "run",
                    "start",
                    "--",
                    "--hostname",
                    "127.0.0.1",
                    "--port",
                    str(urlparse(base_url).port or 3213),
                ],
                cwd=ROOT,
                stdout=server_log_handle,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                env={**os.environ, "SESSION_SECRET": args.session_secret},
            )
        BASE.wait_for_url(base_url, args.server_timeout, server)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                executable_path=BASE.locate_chrome(args.chrome_path),
                args=["--disable-dev-shm-usage"],
            )
            browser_version = browser.version
            try:
                desktop = browser.new_context(viewport={"width": 1440, "height": 1000}, locale="pt-BR")
                user = BASE.login_student(
                    desktop,
                    base_url,
                    student_email,
                    student_password,
                    args.session_secret,
                )
                temporary_user.update(user)
                payloads: dict[str, dict[str, Any]] = {}
                audits: dict[str, dict[str, Any]] = {}
                for language in LANGUAGES:
                    payloads[language], audits[language] = variant_payload(
                        desktop,
                        base_url=base_url,
                        exam_id=args.exam_id,
                        language=language,
                        output=output,
                        artifacts=artifacts,
                    )
                audit_path = output / "language-payload-audit.json"
                BASE.write_json(audit_path, audits)
                record(artifacts, audit_path, "language-payload-audit", "Validação estrutural das duas variantes.")
                english_ids = set(audits["ENGLISH"]["questionIds"])
                spanish_ids = set(audits["SPANISH"]["questionIds"])
                checks["languageVariants"] = bool(
                    audits["ENGLISH"]["valid"]
                    and audits["SPANISH"]["valid"]
                    and len(english_ids | spanish_ids) == 95
                    and len(english_ids & spanish_ids) == 85
                )
                checks["initialPayloadProtected"] = not any(
                    audit["forbiddenKeyHits"] for audit in audits.values()
                )
                checks["structuredQuestions"] = all(audit["valid"] for audit in audits.values())
                details["languages"] = {
                    "english": audits["ENGLISH"],
                    "spanish": audits["SPANISH"],
                    "unionQuestionIds": len(english_ids | spanish_ids),
                    "commonQuestionIds": len(english_ids & spanish_ids),
                }
                proof_state, attempt = proof_flow(
                    desktop,
                    base_url=base_url,
                    exam_id=args.exam_id,
                    english_payload=payloads["ENGLISH"],
                    output=output,
                    artifacts=artifacts,
                    console=console,
                    network=network,
                )
                checks["proofAttemptCorrection"] = bool(
                    attempt["qualityPassed"]
                    and attempt["selectedBeforeSubmit"]
                    and attempt["answerCardUpdated"]
                    and not attempt["initialHtmlForbiddenTokens"]
                )
                study_state = study_mode(
                    desktop,
                    base_url=base_url,
                    exam_id=args.exam_id,
                    output=output,
                    artifacts=artifacts,
                    console=console,
                    network=network,
                )
                checks["studyAndProofModes"] = bool(
                    proof_state["proofAriaCurrent"] == "page"
                    and proof_state["studyAriaCurrent"] is None
                    and proof_state["englishAriaCurrent"] == "page"
                    and proof_state["languageSelectorVisible"]
                    and proof_state["firstStatementMatched"]
                    and study_state["studyAriaCurrent"] == "page"
                    and study_state["proofAriaCurrent"] is None
                    and study_state["englishAriaCurrent"] == "page"
                    and study_state["languageSelectorVisible"]
                    and study_state["alternativeCount"] == 5
                )
                details["proof"] = {"mode": proof_state, "attempt": attempt}
                details["study"] = study_state
                essay = essay_flow(
                    desktop,
                    base_url=base_url,
                    output=output,
                    artifacts=artifacts,
                    console=console,
                    network=network,
                )
                checks["essayProposal"] = bool(
                    essay["promptLength"] >= 180
                    and len(essay["instructions"]) >= 4
                    and set(essay["motivatingSections"]) == {"TEXTO I", "TEXTO II", "TEXTO III", "TEXTO IV"}
                    and essay["motivatingTextLength"] >= 1000
                    and essay["originalHref"].startswith("https://download.inep.gov.br/")
                    and "#page=20" in essay["originalHref"]
                    and len(essay["images"]) == 4
                    and all(image["complete"] and image["naturalWidth"] > 0 for image in essay["images"])
                )
                details["essay"] = essay
                desktop.close()

                mobile = browser.new_context(
                    viewport={"width": 390, "height": 844},
                    is_mobile=True,
                    has_touch=True,
                    locale="pt-BR",
                )
                BASE.login_student(
                    mobile,
                    base_url,
                    student_email,
                    student_password,
                    args.session_secret,
                )
                mobile_result = mobile_spanish(
                    mobile,
                    base_url=base_url,
                    exam_id=args.exam_id,
                    spanish_payload=payloads["SPANISH"],
                    output=output,
                    artifacts=artifacts,
                    console=console,
                    network=network,
                )
                mobile.close()
                checks["mobile"] = bool(
                    mobile_result["documentWidth"] <= mobile_result["innerWidth"] + 1
                    and mobile_result["bodyWidth"] <= mobile_result["innerWidth"] + 1
                    and mobile_result["alternativeCount"] == 5
                    and mobile_result["spanishAriaCurrent"] == "page"
                    and mobile_result["statementMatched"]
                    and mobile_result["images"]
                    and all(
                        image["complete"]
                        and image["naturalWidth"] > 0
                        and image["rect"]["left"] >= -1
                        and image["rect"]["right"] <= mobile_result["innerWidth"] + 1
                        for image in mobile_result["images"]
                    )
                )
                details["mobile"] = mobile_result
            finally:
                browser.close()
    except Exception as error:
        failures.append(f"{type(error).__name__}: {error}")
    finally:
        if temporary_user.get("id"):
            cleanup = BASE.cleanup_student(student_email, str(temporary_user["id"]), started_at)
            cleanup_path = output / "temporary-user-cleanup.json"
            BASE.write_json(cleanup_path, cleanup)
            record(artifacts, cleanup_path, "temporary-user-cleanup", "Exclusão transacional e verificação residual da conta temporária.")
            remaining = cleanup.get("result", {}).get("remaining") or {}
            checks["temporaryUserCleanup"] = bool(
                cleanup.get("exitCode") == 0
                and cleanup.get("result", {}).get("cleaned") is True
                and remaining
                and all(count == 0 for count in remaining.values())
            )
        if server is not None:
            server_stop = BASE.stop_server(server)
        if server_log_handle is not None:
            server_log_handle.close()
            record(artifacts, server_log, "production-server-log", "Log da instância Next isolada.")

    console_path = output / "browser-console.json"
    network_path = output / "browser-network.json"
    BASE.write_json(console_path, console)
    BASE.write_json(network_path, network)
    record(artifacts, console_path, "browser-console", "Console observado nos fluxos públicos.")
    record(artifacts, network_path, "browser-network", "Rede observada nos fluxos públicos.")
    for check in REQUIRED_CHECKS:
        if checks.get(check) is not True:
            failures.append(f"Required check failed: {check}")
    failures = list(dict.fromkeys(failures))
    artifact_entries = [
        {
            "path": BASE.relative_to_repo(path),
            "sha256": BASE.sha256_file(path),
            "kind": kind,
            "note": note,
        }
        for path, (kind, note) in sorted(
            artifacts.items(), key=lambda item: BASE.relative_to_repo(item[0])
        )
    ]
    completed_at = BASE.utc_now()
    report = {
        "schemaVersion": 1,
        "runId": run_id,
        "corpusId": corpus_id,
        "examId": args.exam_id,
        "jobId": args.job_id,
        "startedAt": started_at,
        "completedAt": completed_at,
        "baseUrl": base_url,
        "complete": not failures,
        "checks": checks,
        "details": details,
        "failures": failures,
        "temporaryUser": {
            "id": temporary_user.get("id"),
            "email": student_email,
            "cleanup": cleanup,
        },
        "server": {"pid": server.pid if server else None, "stop": server_stop},
        "environment": {
            "python": sys.version,
            "platform": platform.platform(),
            "browserVersion": browser_version,
        },
        "sourceOccurrences": len(source),
        "testedSourceIds": [item["id"] for item in source],
        "artifacts": artifact_entries,
    }
    report_path = output / "run-report.json"
    BASE.write_json(report_path, report)
    stable = {
        "schemaVersion": 1,
        "corpusId": corpus_id,
        "complete": not failures,
        "testedAt": completed_at,
        "tester": args.tester,
        "baseUrl": base_url,
        "testedSourceIds": [item["id"] for item in source],
        "checks": checks,
        "evidence": [
            *artifact_entries,
            {
                "path": BASE.relative_to_repo(report_path),
                "sha256": BASE.sha256_file(report_path),
                "kind": "student-flow-report",
                "note": "Relatório completo, inclusive limpeza da conta temporária.",
            },
        ],
        "notes": (
            "Fluxo público pós-publicação em produção isolada: 90 questões em inglês, 90 em espanhol, "
            "união de 95 ocorrências e interseção comum de 85; modos prova/estudo, correção autoral, "
            "mobile, redação oficial e cleanup transacional exercitados sem resíduo."
        ),
    }
    stable_path = corpus / "evidencias" / "student-post-publication-final.json"
    BASE.write_json(stable_path, stable)
    print(
        json.dumps(
            {
                "passed": not failures,
                "output": BASE.relative_to_repo(output),
                "report": BASE.relative_to_repo(report_path),
                "reportSha256": BASE.sha256_file(report_path),
                "evidence": BASE.relative_to_repo(stable_path),
                "evidenceSha256": BASE.sha256_file(stable_path),
                "checks": checks,
                "failures": failures,
                "serverStop": server_stop,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
