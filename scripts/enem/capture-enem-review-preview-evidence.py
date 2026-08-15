#!/usr/bin/env python3
"""Exercise the real admin REVIEW preview without publishing or writing attempts."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from playwright.sync_api import BrowserContext, Page, sync_playwright


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CORPUS = ROOT / "data" / "QUESTÕES" / "processamento" / "enem-2022-dia-1-caderno-1-azul"
CHECKS = (
    "answerFlow",
    "correction",
    "mobile",
    "adminOriginalPage",
    "answerKeyNotLeaked",
    "languageSelection",
)
FORBIDDEN_KEYS = {
    "answer",
    "correct",
    "correctAlternative",
    "officialAnswerKey",
    "explanation",
    "alternativeExplanations",
    "pedagogyComment",
    "authorialResolution",
    "fullResolution",
    "shortComment",
    "reasoningPath",
    "steps",
    "alternativeComments",
    "commonError",
    "studyTip",
    "resolution",
}


def now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def forbidden_hits(value: Any, prefix: str = "$") -> list[str]:
    hits: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{prefix}.{key}"
            if key in FORBIDDEN_KEYS:
                hits.append(child_path)
            hits.extend(forbidden_hits(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            hits.extend(forbidden_hits(child, f"{prefix}[{index}]"))
    return hits


def locate_browser(explicit: str | None) -> str:
    candidates = (
        explicit,
        os.environ.get("CHROME_PATH"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        shutil.which("google-chrome"),
        shutil.which("chromium"),
    )
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(Path(candidate).resolve())
    raise FileNotFoundError("Chrome/Edge não localizado; informe --chrome-path.")


def wait_server(base_url: str, timeout: int, process: subprocess.Popen[Any] | None) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process is not None and process.poll() is not None:
            raise RuntimeError(f"Servidor encerrou com código {process.returncode}.")
        try:
            with urllib.request.urlopen(f"{base_url}/login", timeout=3) as response:
                if response.status < 500:
                    return
        except urllib.error.HTTPError as error:
            if error.code < 500:
                return
        except Exception:
            pass
        time.sleep(1)
    raise TimeoutError("Servidor Next não ficou pronto dentro do prazo.")


def stop_server(process: subprocess.Popen[Any]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            cwd=ROOT,
            capture_output=True,
            timeout=30,
            check=False,
        )
    else:
        process.terminate()
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()


def admin_context(
    browser: Any,
    base_url: str,
    viewport: dict[str, int],
    session_cookie: str,
) -> BrowserContext:
    context = browser.new_context(viewport=viewport, locale="pt-BR")
    context.add_cookies(
        [{"name": "estudaki_user_id", "value": session_cookie, "url": base_url}]
    )
    return context


def wait_images(page: Page) -> list[dict[str, Any]]:
    deadline = time.monotonic() + 30
    state: list[dict[str, Any]] = []
    while time.monotonic() < deadline:
        state = page.locator("article img").evaluate_all(
            """(images) => images.map((image) => {
              const rect = image.getBoundingClientRect();
              return {src: image.currentSrc || image.src, complete: image.complete,
                naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
                left: rect.left, right: rect.right, width: rect.width};
            })"""
        )
        if state and all(row["complete"] and row["naturalWidth"] > 0 for row in state):
            return state
        time.sleep(0.25)
    return state


def visible_media(question: dict[str, Any]) -> bool:
    for image in question.get("images") or []:
        if isinstance(image, str) and image.strip():
            return True
        if not isinstance(image, dict) or not image.get("url"):
            continue
        if str(image.get("assetType") or "").upper() in {"PROMPT_FACSIMILE", "ORIGINAL_REFERENCE"}:
            continue
        if str(image.get("relation") or "").upper() == "ADMIN_REFERENCE":
            continue
        return True
    return any(item.get("imageUrl") for item in question.get("alternatives") or [])


def fetch_official_pdf(
    href: str,
    attempts: int = 4,
) -> tuple[int, str | None, bytes, list[dict[str, Any]]]:
    traces: list[dict[str, Any]] = []
    url = href.split("#", 1)[0]
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(url, headers={"Range": "bytes=0-65535"})
            with urllib.request.urlopen(request, timeout=120) as response:
                status = response.status
                content_type = response.headers.get("content-type")
                body = response.read(65536)
            traces.append(
                {
                    "attempt": attempt,
                    "status": status,
                    "bytesRead": len(body),
                    "pdfSignature": body.startswith(b"%PDF"),
                }
            )
            if status in {200, 206} and body.startswith(b"%PDF"):
                return status, content_type, body, traces
        except Exception as error:
            traces.append({"attempt": attempt, "error": str(error)})
        if attempt < attempts:
            time.sleep(attempt)
    raise RuntimeError(f"PDF oficial não respondeu corretamente após {attempts} tentativas: {traces}")


def validate_initial_payload(
    payload: dict[str, Any],
    selected: str | None,
    expected_numbers: list[int],
    expected_languages: list[str],
) -> dict[str, Any]:
    questions = payload.get("questions")
    if not isinstance(questions, list):
        raise RuntimeError("Payload inicial sem questions[].")
    failures: list[str] = []
    for question in questions:
        alternatives = question.get("alternatives") or []
        if not str(question.get("statement") or "").strip():
            failures.append(f"{question.get('sourceId')}: enunciado vazio")
        if [row.get("key") for row in alternatives] != list("ABCDE"):
            failures.append(f"{question.get('sourceId')}: alternativas fora de A–E")
        if any(not (str(row.get("text") or "").strip() or row.get("imageUrl")) for row in alternatives):
            failures.append(f"{question.get('sourceId')}: alternativa vazia")
    return {
        "selectedLanguage": payload.get("selectedLanguage"),
        "availableLanguages": payload.get("availableLanguages"),
        "questionCount": len(questions),
        "numbers": [row.get("questionNumber") for row in questions],
        "sourceIds": [row.get("sourceId") for row in questions],
        "structureFailures": failures,
        "forbiddenKeyHits": forbidden_hits(payload),
        "valid": (
            payload.get("selectedLanguage") == selected
            and payload.get("availableLanguages") == expected_languages
            and len(questions) == 90
            and [row.get("questionNumber") for row in questions] == expected_numbers
            and not failures
            and not forbidden_hits(payload)
        ),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS))
    parser.add_argument("--base-url", default="http://127.0.0.1:3213")
    parser.add_argument("--output-dir")
    parser.add_argument("--start-server", action="store_true")
    parser.add_argument("--server-timeout", type=int, default=240)
    parser.add_argument("--chrome-path")
    parser.add_argument("--tester", default="Codex ENEM REVIEW preview harness")
    parser.add_argument(
        "--session-cookie",
        default=os.environ.get("ESTUDAKI_REVIEW_SESSION_COOKIE", "local-admin"),
        help="Valor da sessão administrativa; em produção, prefira ESTUDAKI_REVIEW_SESSION_COOKIE.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    corpus = Path(args.corpus_dir).resolve()
    source_path = corpus / "questoes-estruturadas.json"
    source = json.loads(source_path.read_text(encoding="utf-8"))
    if len(source) not in {90, 95}:
        raise RuntimeError("A evidência exige 90 questões comuns ou 95 ocorrências com variantes.")
    corpus_id = source[0].get("corpusId") or source[0].get("pilotId")
    if not corpus_id:
        raise RuntimeError("A fonte não possui corpusId/pilotId.")
    expected_numbers = sorted({int(row["officialNumber"]) for row in source})
    if len(expected_numbers) != 90:
        raise RuntimeError("A fonte não representa exatamente 90 números oficiais.")
    expected_languages = ["ENGLISH", "SPANISH"] if len(source) == 95 else []
    requested_languages: list[str | None] = expected_languages or [None]
    output = (
        Path(args.output_dir).resolve()
        if args.output_dir
        else corpus / "app-evidence-review" / datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    )
    output.mkdir(parents=True, exist_ok=False)
    base_url = args.base_url.rstrip("/")
    server: subprocess.Popen[Any] | None = None
    log_handle = None
    log_path = output / "next-server.log"
    artifacts: list[tuple[Path, str, str]] = []
    checks = {name: False for name in CHECKS}
    details: dict[str, Any] = {}
    console_rows: list[dict[str, Any]] = []
    network_rows: list[dict[str, Any]] = []

    try:
        if args.start_server:
            log_handle = log_path.open("w", encoding="utf-8", errors="replace")
            command = [
                "npm.cmd" if os.name == "nt" else "npm",
                "run",
                "dev",
                "--",
                "--hostname",
                "127.0.0.1",
                "--port",
                str(urlparse(base_url).port or 3213),
            ]
            server = subprocess.Popen(
                command,
                cwd=ROOT,
                stdout=log_handle,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                env={**os.environ, "NODE_ENV": "development"},
            )
        wait_server(base_url, args.server_timeout, server)

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                executable_path=locate_browser(args.chrome_path),
                args=["--disable-dev-shm-usage"],
            )
            try:
                desktop = admin_context(
                    browser,
                    base_url,
                    {"width": 1440, "height": 1000},
                    args.session_cookie,
                )
                try:
                    payloads: dict[str, dict[str, Any]] = {}
                    payload_audits: dict[str, dict[str, Any]] = {}
                    for chosen in requested_languages:
                        query = f"?idioma={chosen}" if chosen else ""
                        response = desktop.request.get(
                            f"{base_url}/api/admin/importacoes-enem/{args.job_id}/preview/questoes{query}",
                            fail_on_status_code=False,
                            timeout=120_000,
                        )
                        payload = response.json()
                        payload_key = chosen or "NOT_APPLICABLE"
                        path = output / f"initial-{payload_key.lower()}.json"
                        write_json(path, payload)
                        artifacts.append((path, "initial-payload", f"Payload REVIEW inicial da variante {payload_key}, antes da entrega."))
                        if response.status != 200:
                            raise RuntimeError(f"API {payload_key} retornou {response.status}: {payload}")
                        payloads[payload_key] = payload
                        payload_audits[payload_key] = validate_initial_payload(
                            payload,
                            chosen,
                            expected_numbers,
                            expected_languages,
                        )
                    audit_path = output / "initial-payload-audit.json"
                    write_json(audit_path, payload_audits)
                    artifacts.append((audit_path, "payload-audit", "Auditoria de ordem, A–E e ausência de campos de correção em todas as variantes aplicáveis."))
                    all_source_ids = {row["id"] for row in source}
                    checks["answerKeyNotLeaked"] = all(
                        row["valid"] and not row["forbiddenKeyHits"] for row in payload_audits.values()
                    )
                    if expected_languages:
                        english_ids = set(payload_audits["ENGLISH"]["sourceIds"])
                        spanish_ids = set(payload_audits["SPANISH"]["sourceIds"])
                        checks["languageSelection"] = bool(
                            payload_audits["ENGLISH"]["valid"]
                            and payload_audits["SPANISH"]["valid"]
                            and english_ids | spanish_ids == all_source_ids
                            and len(english_ids & spanish_ids) == 85
                        )
                    else:
                        common_ids = set(payload_audits["NOT_APPLICABLE"]["sourceIds"])
                        checks["languageSelection"] = bool(
                            payload_audits["NOT_APPLICABLE"]["valid"]
                            and common_ids == all_source_ids
                        )
                    details["initialPayloads"] = payload_audits

                    page = desktop.new_page()
                    page.on("console", lambda message: console_rows.append({"type": message.type, "text": message.text}))
                    page.on("pageerror", lambda error: console_rows.append({"type": "pageerror", "text": str(error)}))
                    page.on("response", lambda response: network_rows.append({"status": response.status, "method": response.request.method, "url": response.url}))
                    desktop_language = expected_languages[0] if expected_languages else None
                    desktop_query = f"?idioma={desktop_language}" if desktop_language else ""
                    preview_url = f"{base_url}/admin/importacoes-enem/{args.job_id}/preview{desktop_query}"
                    navigation = page.goto(preview_url, wait_until="domcontentloaded", timeout=120_000)
                    if navigation is None or navigation.status >= 400:
                        raise RuntimeError("Falha ao abrir a prévia desktop.")
                    first_number = expected_numbers[0]
                    page.get_by_text(re.compile(rf"Questão {first_number}\s*·\s*1 de 90")).wait_for(timeout=120_000)
                    radios = page.locator('button[role="radio"]')
                    radios.first.wait_for(timeout=30_000)
                    initial_shot = output / "desktop-before-submit.png"
                    page.screenshot(path=str(initial_shot), full_page=True)
                    artifacts.append((initial_shot, "desktop-screenshot", "Prévia administrativa desktop antes da entrega."))

                    original_link = page.get_by_role("link", name="Página original")
                    original_link.wait_for(timeout=30_000)
                    original_href = original_link.get_attribute("href") or ""
                    original_status, original_content_type, original_body, original_attempts = (
                        fetch_official_pdf(original_href)
                    )
                    original_audit = {
                        "href": original_href,
                        "status": original_status,
                        "contentType": original_content_type,
                        "bytesRead": len(original_body),
                        "sha256": hashlib.sha256(original_body).hexdigest(),
                        "pdfSignature": original_body.startswith(b"%PDF"),
                        "pageFragment": "#page=" in original_href,
                        "attempts": original_attempts,
                    }
                    original_path = output / "admin-original-page-audit.json"
                    write_json(original_path, original_audit)
                    artifacts.append((original_path, "admin-original-audit", "Consulta real do PDF oficial ligado à questão ativa."))
                    checks["adminOriginalPage"] = bool(
                        re.match(r"^https://download\.inep\.gov\.br/", original_href)
                        and original_status in {200, 206}
                        and original_body.startswith(b"%PDF")
                        and "#page=" in original_href
                    )
                    details["adminOriginalPage"] = original_audit

                    radios.first.click()
                    card_selected = page.locator(
                        f'button[aria-label^="Questão {first_number}, marcada A"]'
                    ).count() == 1
                    checks["answerFlow"] = bool(
                        radios.count() == 5
                        and radios.first.get_attribute("aria-checked") == "true"
                        and card_selected
                    )
                    page.once("dialog", lambda dialog: dialog.accept())
                    with page.expect_response(
                        lambda response: response.request.method == "POST" and response.url.endswith("/preview/attempt"),
                        timeout=120_000,
                    ) as response_info:
                        page.get_by_role("button", name="Finalizar").click()
                    attempt_response = response_info.value
                    correction = attempt_response.json()
                    correction_path = output / "correction-after-submit.json"
                    write_json(correction_path, correction)
                    artifacts.append((correction_path, "correction-response", "Correção REVIEW liberada somente após a entrega administrativa, sem persistir tentativa."))
                    page.get_by_text(re.compile(r"Prévia finalizada sem registrar tentativa")).wait_for(timeout=60_000)
                    correction_shot = output / "desktop-after-submit.png"
                    page.screenshot(path=str(correction_shot), full_page=True)
                    artifacts.append((correction_shot, "desktop-correction-screenshot", "Correção autoral renderizada após a entrega."))
                    results = correction.get("results") if isinstance(correction, dict) else None
                    first_result = results[0] if isinstance(results, list) and results else {}
                    checks["correction"] = bool(
                        attempt_response.status == 200
                        and correction.get("preview") is True
                        and correction.get("gainedXp") == 0
                        and isinstance(results, list)
                        and len(results) == 90
                        and re.fullmatch(r"[A-E]", str(first_result.get("correctAlternative") or ""))
                        and len(str(first_result.get("explanation") or "")) >= 180
                        and set(first_result.get("alternativeExplanations") or {}) == set("ABCDE")
                        and first_result.get("authorialResolution")
                    )
                    details["correction"] = {
                        "status": attempt_response.status,
                        "results": len(results or []),
                        "preview": correction.get("preview"),
                        "gainedXp": correction.get("gainedXp"),
                        "firstQuestion": first_result.get("officialNumber"),
                        "explanationLength": len(str(first_result.get("explanation") or "")),
                    }
                finally:
                    desktop.close()

                mobile = admin_context(
                    browser,
                    base_url,
                    {"width": 390, "height": 844},
                    args.session_cookie,
                )
                try:
                    page = mobile.new_page()
                    mobile_language = expected_languages[-1] if expected_languages else None
                    mobile_query = f"?idioma={mobile_language}" if mobile_language else ""
                    url = f"{base_url}/admin/importacoes-enem/{args.job_id}/preview{mobile_query}"
                    navigation = page.goto(url, wait_until="domcontentloaded", timeout=120_000)
                    if navigation is None or navigation.status >= 400:
                        raise RuntimeError("Falha ao abrir a prévia mobile.")
                    page.get_by_text(
                        re.compile(rf"Questão {expected_numbers[0]}\s*·\s*1 de 90")
                    ).wait_for(timeout=120_000)
                    mobile_payload_key = mobile_language or "NOT_APPLICABLE"
                    mobile_questions = payloads[mobile_payload_key]["questions"]
                    media_question = next(row for row in mobile_questions if visible_media(row))
                    number = int(media_question["questionNumber"])
                    page.locator(f'button[aria-label^="Questão {number},"]').click()
                    images = wait_images(page)
                    layout = page.evaluate(
                        """() => ({innerWidth: window.innerWidth,
                          documentWidth: document.documentElement.scrollWidth,
                          bodyWidth: document.body.scrollWidth})"""
                    )
                    alternative_count = page.locator('button[role="radio"]').count()
                    mobile_shot = output / f"mobile-question-{number}.png"
                    page.screenshot(path=str(mobile_shot), full_page=True)
                    artifacts.append((mobile_shot, "mobile-screenshot", f"Questão visual {number} renderizada na prévia mobile."))
                    layout.update({"questionNumber": number, "alternativeCount": alternative_count, "images": images})
                    layout_path = output / "mobile-layout-audit.json"
                    write_json(layout_path, layout)
                    artifacts.append((layout_path, "mobile-layout-audit", "Medições reais de overflow, A–E e legibilidade das imagens em 390 px."))
                    checks["mobile"] = bool(
                        layout["documentWidth"] <= layout["innerWidth"] + 1
                        and layout["bodyWidth"] <= layout["innerWidth"] + 1
                        and alternative_count == 5
                        and images
                        and all(
                            row["complete"]
                            and row["naturalWidth"] > 0
                            and row["left"] >= -1
                            and row["right"] <= layout["innerWidth"] + 1
                            for row in images
                        )
                    )
                    details["mobile"] = layout
                finally:
                    mobile.close()
            finally:
                browser.close()
    finally:
        if server is not None:
            stop_server(server)
        if log_handle is not None:
            log_handle.close()

    console_path = output / "browser-console.json"
    network_path = output / "browser-network.json"
    write_json(console_path, console_rows)
    write_json(network_path, network_rows)
    artifacts.extend(
        [
            (console_path, "browser-console", "Console observado durante a prévia."),
            (network_path, "browser-network", "Requisições observadas durante a prévia."),
        ]
    )
    if log_path.is_file():
        artifacts.append((log_path, "server-log", "Log do servidor Next isolado da evidência."))
    evidence_items = [
        {
            "path": path.resolve().relative_to(ROOT).as_posix(),
            "sha256": sha256(path),
            "kind": kind,
            "note": note,
        }
        for path, kind, note in artifacts
        if path.is_file()
    ]
    evidence = {
        "schemaVersion": 1,
        "corpusId": corpus_id,
        "complete": all(checks.values()),
        "testedAt": now(),
        "tester": args.tester,
        "baseUrl": base_url,
        "testedSourceIds": [row["id"] for row in source],
        "checks": checks,
        "evidence": evidence_items,
        "notes": (
            f"Prévia administrativa real de {len(requested_languages)} variante(s), cobrindo {len(source)} ocorrências da fonte enquanto questões e resoluções permanecem em REVIEW; "
            "nenhuma tentativa, XP, aprovação ou publicação foi gravada."
        ),
        "details": details,
    }
    final_path = corpus / "evidencias" / "app-preview-review-final.json"
    write_json(final_path, evidence)
    print(json.dumps({"complete": evidence["complete"], "checks": checks, "evidence": str(final_path), "sha256": sha256(final_path)}, ensure_ascii=False, indent=2))
    return 0 if evidence["complete"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
