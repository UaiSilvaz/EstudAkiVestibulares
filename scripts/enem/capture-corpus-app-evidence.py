#!/usr/bin/env python3
"""Capture traceable functional evidence for a published ENEM corpus booklet.

The harness performs read-only corpus checks and real browser checks. It creates
one isolated student account only to exercise the attempt endpoint, then removes
that account and its test activity with an exact-ID cleanup guard.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CORPUS = Path(
    "data/QUESTÕES/processamento/enem-2022-dia-2-caderno-5-amarelo"
)
REQUIRED_CHECKS = (
    "answerFlow",
    "correction",
    "mobile",
    "adminOriginalPage",
    "answerKeyNotLeaked",
    "languageSelection",
)
CORRECTION_ONLY_KEYS = {
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
AUDIT_ONLY_ASSET_TYPES = {"PROMPT_FACSIMILE", "ORIGINAL_REFERENCE"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def compact_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def signed_session_cookie(user_id: str, secret: str, now: int | None = None) -> str:
    issued_at = now or int(time.time())
    expires_at = issued_at + 60 * 60 * 24 * 30
    encoded_user = base64.urlsafe_b64encode(user_id.encode("utf-8")).decode("ascii").rstrip("=")
    payload = f"v1.{encoded_user}.{expires_at}"
    signature = base64.urlsafe_b64encode(
        hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    ).decode("ascii").rstrip("=")
    return f"{payload}.{signature}"


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")


def relative_to_repo(path: Path) -> str:
    resolved = path.resolve()
    if resolved != ROOT and ROOT not in resolved.parents:
        raise ValueError(f"Evidence path is outside the repository: {resolved}")
    return resolved.relative_to(ROOT).as_posix()


def resolve_repo_path(value: str | Path) -> Path:
    candidate = (ROOT / Path(value)).resolve()
    if candidate != ROOT and ROOT not in candidate.parents:
        raise ValueError(f"Path is outside the repository: {value}")
    return candidate


def forbidden_key_hits(value: Any, prefix: str = "$") -> list[str]:
    hits: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            own_path = f"{prefix}.{key}"
            if key in CORRECTION_ONLY_KEYS:
                hits.append(own_path)
            hits.extend(forbidden_key_hits(child, own_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            hits.extend(forbidden_key_hits(child, f"{prefix}[{index}]"))
    return hits


def visible_media_count(question: dict[str, Any]) -> int:
    images = question.get("images") if isinstance(question.get("images"), list) else []
    visible = 0
    for image in images:
        if isinstance(image, str):
            visible += int(bool(image.strip()))
            continue
        if not isinstance(image, dict) or not str(image.get("url") or "").strip():
            continue
        asset_type = str(image.get("assetType") or "").upper()
        relation = str(image.get("relation") or "").upper()
        if asset_type in AUDIT_ONLY_ASSET_TYPES or relation == "ADMIN_REFERENCE":
            continue
        visible += 1
    for alternative in question.get("alternatives") or []:
        if isinstance(alternative, dict) and str(alternative.get("imageUrl") or "").strip():
            visible += 1
    return visible


def audit_only_urls(question: dict[str, Any]) -> list[str]:
    output: list[str] = []
    for image in question.get("images") or []:
        if not isinstance(image, dict):
            continue
        asset_type = str(image.get("assetType") or "").upper()
        relation = str(image.get("relation") or "").upper()
        if asset_type in AUDIT_ONLY_ASSET_TYPES or relation == "ADMIN_REFERENCE":
            url = str(image.get("url") or "").strip()
            if url:
                output.append(url)
    return output


def wait_for_url(base_url: str, timeout_seconds: int, server: subprocess.Popen[Any] | None) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error = "server did not answer"
    while time.monotonic() < deadline:
        if server is not None and server.poll() is not None:
            raise RuntimeError(f"Development server exited with code {server.returncode}.")
        try:
            with urllib.request.urlopen(f"{base_url}/login", timeout=3) as response:
                if response.status < 500:
                    return
        except urllib.error.HTTPError as error:
            if error.code < 500:
                return
            last_error = f"HTTP {error.code}"
        except Exception as error:  # noqa: BLE001 - diagnostic retry loop
            last_error = str(error)
        time.sleep(1)
    raise TimeoutError(f"Server not ready after {timeout_seconds}s: {last_error}")


def stop_server(server: subprocess.Popen[Any]) -> dict[str, Any]:
    result: dict[str, Any] = {"pid": server.pid, "stopped": False}
    if server.poll() is not None:
        result.update({"stopped": True, "exitCode": server.returncode, "alreadyExited": True})
        return result
    if os.name == "nt":
        completed = subprocess.run(
            ["taskkill", "/PID", str(server.pid), "/T", "/F"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        result.update(
            {
                "stopped": completed.returncode == 0,
                "taskkillExitCode": completed.returncode,
                "taskkillStdout": completed.stdout.strip(),
                "taskkillStderr": completed.stderr.strip(),
            }
        )
    else:
        server.terminate()
        try:
            server.wait(timeout=15)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=10)
        result["stopped"] = server.poll() is not None
    return result


def locate_chrome(explicit: str | None) -> str:
    candidates = [
        explicit,
        os.environ.get("CHROME_PATH"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        shutil.which("google-chrome"),
        shutil.which("chromium"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(Path(candidate).resolve())
    raise FileNotFoundError("Chrome/Edge executable not found; pass --chrome-path.")


def attach_diagnostics(
    page: Page,
    label: str,
    console_log: list[dict[str, Any]],
    network_log: list[dict[str, Any]],
) -> None:
    page.on(
        "console",
        lambda message: console_log.append(
            {"page": label, "type": message.type, "text": message.text}
        ),
    )
    page.on(
        "pageerror",
        lambda error: console_log.append(
            {"page": label, "type": "pageerror", "text": str(error)}
        ),
    )
    page.on(
        "response",
        lambda response: network_log.append(
            {
                "page": label,
                "method": response.request.method,
                "resourceType": response.request.resource_type,
                "status": response.status,
                "url": response.url,
            }
        ),
    )
    page.on(
        "requestfailed",
        lambda request: network_log.append(
            {
                "page": label,
                "method": request.method,
                "resourceType": request.resource_type,
                "status": None,
                "url": request.url,
                "failure": request.failure,
            }
        ),
    )


def wait_for_images(page: Page, selector: str, timeout_seconds: int = 20) -> list[dict[str, Any]]:
    deadline = time.monotonic() + timeout_seconds
    state: list[dict[str, Any]] = []
    while time.monotonic() < deadline:
        state = page.locator(selector).evaluate_all(
            """(images) => images.map((image) => ({
                src: image.currentSrc || image.src,
                alt: image.alt,
                complete: image.complete,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                rect: (() => {
                  const value = image.getBoundingClientRect();
                  return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
                })(),
              }))"""
        )
        if state and all(item["complete"] and item["naturalWidth"] > 0 for item in state):
            return state
        time.sleep(0.25)
    return state


def login_student(
    context: BrowserContext,
    base_url: str,
    email: str,
    password: str,
    session_secret: str,
) -> dict[str, Any]:
    response = context.request.post(
        f"{base_url}/api/auth/login",
        data={"email": email, "password": password, "name": "Auditoria funcional ENEM"},
        timeout=60_000,
        fail_on_status_code=False,
    )
    payload = response.json()
    if response.status != 200 or not isinstance(payload, dict) or not payload.get("user"):
        raise RuntimeError(f"Temporary student login failed ({response.status}): {payload}")
    user = payload["user"]
    # `next start` marks the real login cookie Secure. For a loopback HTTP audit,
    # install an equivalent signed non-Secure cookie only in this browser context.
    context.add_cookies(
        [
            {
                "name": "estudaki_user_id",
                "value": signed_session_cookie(str(user["id"]), session_secret),
                "url": base_url,
            }
        ]
    )
    return user


def cleanup_student(email: str, user_id: str, created_after: str) -> dict[str, Any]:
    command = [
        "npx.cmd" if os.name == "nt" else "npx",
        "tsx",
        "scripts/enem/cleanup-corpus-app-evidence-user.ts",
        "--email",
        email,
        "--expected-id",
        user_id,
        "--created-after",
        created_after,
    ]
    completed = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    payload: dict[str, Any] = {
        "exitCode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
    }
    if completed.returncode == 0:
        try:
            payload["result"] = json.loads(completed.stdout.strip().splitlines()[-1])
        except (IndexError, json.JSONDecodeError):
            payload["parseError"] = "Cleanup output was not valid JSON."
    return payload


def record_artifact(
    artifacts: dict[Path, tuple[str, str]], path: Path, kind: str, note: str
) -> None:
    if path.is_file():
        artifacts[path.resolve()] = (kind, note)


def browser_checks(
    browser: Browser,
    *,
    base_url: str,
    exam_id: str,
    job_id: str,
    output: Path,
    source_questions: list[dict[str, Any]],
    student_email: str,
    student_password: str,
    admin_user_id: str | None,
    session_secret: str | None,
    temporary_user_holder: dict[str, Any],
    result_holder: dict[str, Any],
    artifacts: dict[Path, tuple[str, str]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    console_log: list[dict[str, Any]] = []
    network_log: list[dict[str, Any]] = []
    details = result_holder["details"]
    checks = result_holder["checks"]

    desktop = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        device_scale_factor=1,
        locale="pt-BR",
    )
    try:
        if not session_secret:
            raise ValueError("A session secret is required for the isolated browser session.")
        user = login_student(
            desktop, base_url, student_email, student_password, session_secret
        )
        temporary_user_holder.clear()
        temporary_user_holder.update(user)
        details["temporaryStudent"] = user

        api_response = desktop.request.get(
            f"{base_url}/api/provas-antigas/{exam_id}/questoes",
            timeout=60_000,
            fail_on_status_code=False,
        )
        api_payload = api_response.json()
        initial_payload_path = output / "initial-student-payload.json"
        write_json(initial_payload_path, api_payload)
        record_artifact(
            artifacts,
            initial_payload_path,
            "initial-payload",
            "Payload autenticado anterior à tentativa; usado para conferir estrutura, ordem e ausência de gabarito/resolução.",
        )

        questions = api_payload.get("questions") if isinstance(api_payload, dict) else None
        if api_response.status != 200 or not isinstance(questions, list):
            raise RuntimeError(
                f"Student question API failed ({api_response.status}): {api_payload}"
            )

        expected_numbers = [int(item["officialNumber"]) for item in source_questions]
        actual_numbers = [item.get("questionNumber") for item in questions]
        structure_failures: list[dict[str, Any]] = []
        media_questions: list[int] = []
        for index, question in enumerate(questions):
            alternatives = question.get("alternatives")
            keys = [item.get("key") for item in alternatives or [] if isinstance(item, dict)]
            if not str(question.get("statement") or "").strip():
                structure_failures.append({"index": index, "reason": "empty statement"})
            if keys != list("ABCDE"):
                structure_failures.append(
                    {"index": index, "reason": "alternatives", "keys": keys}
                )
            for alternative in alternatives or []:
                if not isinstance(alternative, dict) or not (
                    str(alternative.get("text") or "").strip()
                    or str(alternative.get("imageUrl") or "").strip()
                ):
                    structure_failures.append(
                        {
                            "index": index,
                            "reason": "empty alternative",
                            "key": alternative.get("key") if isinstance(alternative, dict) else None,
                        }
                    )
            if visible_media_count(question) > 0:
                media_questions.append(int(question.get("questionNumber") or 0))

        payload_hits = forbidden_key_hits(api_payload)
        answer_situation_values = sorted(
            {
                str(question.get("answerSituation"))
                for question in questions
                if question.get("answerSituation") is not None
            }
        )
        structural_audit = {
            "status": api_response.status,
            "questionCount": len(questions),
            "expectedNumbers": expected_numbers,
            "actualNumbers": actual_numbers,
            "officialOrderCorrect": actual_numbers == expected_numbers == list(range(91, 181)),
            "structureFailures": structure_failures,
            "questionsWithStudentMedia": media_questions,
            "correctionOnlyKeyHits": payload_hits,
            "answerSituationMetadataValues": answer_situation_values,
            "availableLanguages": api_payload.get("availableLanguages"),
            "selectedLanguage": api_payload.get("selectedLanguage"),
        }
        audit_path = output / "initial-payload-audit.json"
        write_json(audit_path, structural_audit)
        record_artifact(
            artifacts,
            audit_path,
            "payload-audit",
            "Resultado rastreável da validação das 90 questões no payload anterior à tentativa.",
        )

        desktop_page = desktop.new_page()
        attach_diagnostics(desktop_page, "student-desktop", console_log, network_log)
        proof_url = f"{base_url}/provas-antigas/{exam_id}/resolver?modo=prova"
        navigation = desktop_page.goto(proof_url, wait_until="domcontentloaded", timeout=120_000)
        if navigation is None or navigation.status >= 400:
            raise RuntimeError(
                f"Desktop proof navigation failed: {navigation.status if navigation else 'no response'}"
            )
        desktop_page.get_by_text(re.compile(r"Questão 91\s*·\s*1 de 90")).wait_for(
            timeout=120_000
        )
        desktop_page.locator('button[role="radio"]').first.wait_for(timeout=30_000)
        initial_html = navigation.text()
        initial_html_path = output / "desktop-initial-response.html"
        write_text(initial_html_path, initial_html)
        record_artifact(
            artifacts,
            initial_html_path,
            "initial-html",
            "Resposta HTML/RSC inicial do modo prova, capturada antes de qualquer alternativa ser marcada.",
        )
        html_forbidden_tokens = sorted(
            key for key in CORRECTION_ONLY_KEYS if key in initial_html
        )

        radios = desktop_page.locator('button[role="radio"]')
        first_statement = re.sub(r"\s+", " ", str(questions[0]["statement"])).strip()
        desktop_text = re.sub(r"\s+", " ", desktop_page.locator("article").inner_text()).strip()
        desktop_initial = output / "student-desktop-initial.png"
        desktop_page.screenshot(path=str(desktop_initial), full_page=True)
        record_artifact(
            artifacts,
            desktop_initial,
            "student-desktop-screenshot",
            "Modo prova em desktop antes da tentativa, mostrando texto estruturado e alternativas A–E.",
        )

        radios.first.click()
        selected_before_submit = radios.first.get_attribute("aria-checked") == "true"
        card_after_selection = desktop_page.locator(
            'button[aria-label^="Questão 91, marcada A"]'
        ).count()
        checks["answerFlow"] = bool(
            selected_before_submit and card_after_selection == 1 and radios.count() == 5
        )
        details["answerFlow"] = {
            "selectedAlternative": "A",
            "radioSelected": selected_before_submit,
            "answerCardUpdated": card_after_selection == 1,
            "alternativeCount": radios.count(),
        }

        desktop_page.once("dialog", lambda dialog: dialog.accept())
        with desktop_page.expect_response(
            lambda response: response.request.method == "POST"
            and response.url.endswith(f"/api/provas-antigas/{exam_id}/attempt"),
            timeout=120_000,
        ) as response_info:
            desktop_page.get_by_role("button", name="Finalizar").click()
        attempt_response = response_info.value
        correction_payload = attempt_response.json()
        correction_path = output / "attempt-correction-response.json"
        write_json(correction_path, correction_payload)
        record_artifact(
            artifacts,
            correction_path,
            "correction-response",
            "Resposta do servidor após entrega; contém correção e resolução, liberadas somente depois da tentativa.",
        )
        desktop_page.get_by_text("Prova finalizada. Gabarito e comentários liberados.").wait_for(
            timeout=60_000
        )
        correction_heading = desktop_page.locator(
            "h2",
            has_text=re.compile(
                r"Resposta correta|Resposta incorreta|Em branco|Questão anulada"
            ),
        ).first
        correction_heading.wait_for(timeout=30_000)
        desktop_correction = output / "student-desktop-correction.png"
        desktop_page.screenshot(path=str(desktop_correction), full_page=True)
        record_artifact(
            artifacts,
            desktop_correction,
            "student-correction-screenshot",
            "Correção real da questão 91 em desktop, após persistência da tentativa temporária.",
        )

        results = correction_payload.get("results") if isinstance(correction_payload, dict) else []
        active_result = next(
            (item for item in results or [] if item.get("officialNumber") == 91), None
        )
        explanation = str(active_result.get("explanation") or "") if active_result else ""
        alternative_comments = (
            active_result.get("alternativeExplanations") if active_result else None
        )
        technical_correction_passed = bool(
            attempt_response.status == 200
            and correction_payload.get("submitted") is True
            and len(results or []) == 90
            and active_result
            and active_result.get("selectedAlternative") == "A"
            and re.fullmatch(r"[A-E]", str(active_result.get("correctAlternative") or ""))
            and explanation.strip()
        )
        placeholder_resolution = bool(
            re.search(
                r"aguardando\s+(?:gera[cç][aã]o|revis[aã]o)|n[aã]o\s+publicar\s+antes",
                " ".join(
                    [
                        explanation,
                        str(active_result.get("pedagogyComment") or "")
                        if active_result
                        else "",
                    ]
                ),
                re.IGNORECASE,
            )
        )
        resolution_quality_passed = bool(
            not placeholder_resolution
            and len(explanation.strip()) >= 180
            and isinstance(alternative_comments, dict)
            and set(alternative_comments) == set("ABCDE")
            and all(
                len(str(alternative_comments.get(letter) or "").strip()) >= 25
                for letter in "ABCDE"
            )
            and active_result
            and isinstance(active_result.get("authorialResolution"), dict)
            and str(active_result["authorialResolution"].get("commonError") or "").strip()
            and str(active_result["authorialResolution"].get("studyTip") or "").strip()
        )
        checks["correction"] = bool(
            technical_correction_passed and resolution_quality_passed
        )
        details["correction"] = {
            "status": attempt_response.status,
            "submitted": correction_payload.get("submitted"),
            "resultCount": len(results or []),
            "activeResult": {
                "officialNumber": active_result.get("officialNumber") if active_result else None,
                "selectedAlternative": active_result.get("selectedAlternative") if active_result else None,
                "correctAlternativeReleased": active_result.get("correctAlternative") if active_result else None,
                "explanationLength": len(explanation),
                "alternativeCommentKeys": sorted(alternative_comments or {}),
            },
            "uiHeading": correction_heading.inner_text(),
            "resolutionQuality": {
                "passed": resolution_quality_passed,
                "placeholderDetected": placeholder_resolution,
                "authorialResolutionPresent": bool(
                    active_result and active_result.get("authorialResolution") is not None
                ),
                "alternativeCommentsComplete": isinstance(alternative_comments, dict)
                and set(alternative_comments) == set("ABCDE")
                and all(
                    len(str(alternative_comments.get(letter) or "").strip()) >= 25
                    for letter in "ABCDE"
                ),
                "explanationSubstantive": len(explanation.strip()) >= 180,
                "commonErrorPresent": bool(
                    active_result
                    and isinstance(active_result.get("authorialResolution"), dict)
                    and str(active_result["authorialResolution"].get("commonError") or "").strip()
                ),
                "studyTipPresent": bool(
                    active_result
                    and isinstance(active_result.get("authorialResolution"), dict)
                    and str(active_result["authorialResolution"].get("studyTip") or "").strip()
                ),
                "note": "Qualidade autoral é requisito do check de correção, não apenas um aviso.",
            },
        }

        checks["answerKeyNotLeaked"] = bool(
            not payload_hits
            and not html_forbidden_tokens
            and active_result
            and active_result.get("correctAlternative")
        )
        details["answerKeyNotLeaked"] = {
            "initialApiForbiddenKeyHits": payload_hits,
            "initialHtmlForbiddenTokens": html_forbidden_tokens,
            "correctionReleasedAfterSubmission": bool(
                active_result and active_result.get("correctAlternative")
            ),
            "answerSituationMetadataValues": answer_situation_values,
            "note": "answerSituation é metadado de situação, não contém a letra correta nem a resolução; o modo prova não o recebe em suas props.",
        }

        checks["languageSelection"] = bool(
            api_payload.get("availableLanguages") == []
            and api_payload.get("selectedLanguage") is None
            and desktop_page.get_by_text("Escolha a língua estrangeira").count() == 0
        )
        details["languageSelection"] = {
            "day": 2,
            "expected": "not-applicable",
            "availableLanguages": api_payload.get("availableLanguages"),
            "selectedLanguage": api_payload.get("selectedLanguage"),
            "selectorVisible": desktop_page.get_by_text("Escolha a língua estrangeira").count()
            > 0,
        }

        details["structuredCorpus"] = {
            "questionCount": len(questions),
            "sourceQuestionCount": len(source_questions),
            "officialOrderCorrect": actual_numbers == expected_numbers,
            "structureFailureCount": len(structure_failures),
            "mediaQuestionCount": len(media_questions),
            "desktopAlternativeCount": radios.count(),
            "firstQuestionTextMatched": first_statement[:100] in desktop_text,
        }

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=1,
            is_mobile=True,
            has_touch=True,
            locale="pt-BR",
        )
        try:
            login_student(
                mobile, base_url, student_email, student_password, session_secret
            )
            mobile_page = mobile.new_page()
            attach_diagnostics(mobile_page, "student-mobile", console_log, network_log)
            mobile_navigation = mobile_page.goto(
                proof_url, wait_until="domcontentloaded", timeout=120_000
            )
            if mobile_navigation is None or mobile_navigation.status >= 400:
                raise RuntimeError("Mobile proof navigation failed.")
            mobile_page.get_by_text(re.compile(r"Questão 91\s*·\s*1 de 90")).wait_for(
                timeout=120_000
            )
            media_number = 93 if 93 in media_questions else media_questions[0]
            mobile_page.locator(
                f'button[aria-label^="Questão {media_number},"]'
            ).click()
            expected_position = media_number - 90
            mobile_page.get_by_text(
                re.compile(
                    rf"Questão {media_number}\s*·\s*{expected_position} de 90"
                )
            ).wait_for(timeout=30_000)
            image_state = wait_for_images(mobile_page, "article img")
            mobile_audit = mobile_page.evaluate(
                """() => ({
                  innerWidth: window.innerWidth,
                  documentScrollWidth: document.documentElement.scrollWidth,
                  bodyScrollWidth: document.body.scrollWidth,
                  devicePixelRatio: window.devicePixelRatio,
                  radiogroup: (() => {
                    const element = document.querySelector('[role="radiogroup"]');
                    if (!element) return null;
                    const rect = element.getBoundingClientRect();
                    return { left: rect.left, right: rect.right, width: rect.width };
                  })(),
                })"""
            )
            mobile_audit.update(
                {
                    "questionNumber": media_number,
                    "alternativeCount": mobile_page.locator(
                        'button[role="radio"]'
                    ).count(),
                    "images": image_state,
                }
            )
            rendered_urls = [urlparse(item["src"]).path for item in image_state]
            sample_question = next(
                question
                for question in questions
                if question.get("questionNumber") == media_number
            )
            forbidden_rendered = [
                url
                for url in audit_only_urls(sample_question)
                if urlparse(url).path in rendered_urls
            ]
            mobile_audit["auditOnlyUrlsRendered"] = forbidden_rendered
            mobile_path = output / f"student-mobile-question-{media_number}.png"
            mobile_page.screenshot(path=str(mobile_path), full_page=True)
            record_artifact(
                artifacts,
                mobile_path,
                "student-mobile-screenshot",
                f"Renderização mobile real da questão {media_number}, incluindo mídias e alternativas estruturadas.",
            )
            mobile_audit_path = output / "mobile-layout-audit.json"
            write_json(mobile_audit_path, mobile_audit)
            record_artifact(
                artifacts,
                mobile_audit_path,
                "mobile-layout-audit",
                "Medições de viewport, overflow, alternativas e carregamento das imagens no navegador mobile.",
            )
            images_loaded = bool(image_state) and all(
                item["complete"] and item["naturalWidth"] > 0 for item in image_state
            )
            images_fit = all(
                item["rect"]["left"] >= -1
                and item["rect"]["right"] <= mobile_audit["innerWidth"] + 1
                for item in image_state
            )
            checks["mobile"] = bool(
                mobile_audit["documentScrollWidth"] <= mobile_audit["innerWidth"] + 1
                and mobile_audit["bodyScrollWidth"] <= mobile_audit["innerWidth"] + 1
                and mobile_audit["alternativeCount"] == 5
                and images_loaded
                and images_fit
                and not forbidden_rendered
            )
            details["mobile"] = {
                "questionNumber": media_number,
                "viewportWidth": mobile_audit["innerWidth"],
                "documentScrollWidth": mobile_audit["documentScrollWidth"],
                "alternativeCount": mobile_audit["alternativeCount"],
                "imageCount": len(image_state),
                "imagesLoaded": images_loaded,
                "imagesFitViewport": images_fit,
                "auditOnlyUrlsRendered": forbidden_rendered,
            }
        finally:
            mobile.close()

        admin = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            device_scale_factor=1,
            locale="pt-BR",
        )
        try:
            admin_cookie = (
                signed_session_cookie(admin_user_id, session_secret)
                if admin_user_id and session_secret
                else "local-admin"
            )
            admin.add_cookies(
                [
                    {
                        "name": "estudaki_user_id",
                        "value": admin_cookie,
                        "url": base_url,
                    }
                ]
            )
            admin_page = admin.new_page()
            attach_diagnostics(admin_page, "admin-original", console_log, network_log)
            admin_url = (
                f"{base_url}/admin/importacoes-enem/{job_id}/revisao/93"
            )
            admin_navigation = admin_page.goto(
                admin_url, wait_until="domcontentloaded", timeout=120_000
            )
            if admin_navigation is None or admin_navigation.status >= 400:
                raise RuntimeError("Admin review navigation failed.")
            original_link = admin_page.get_by_role(
                "link", name="Página original registrada"
            )
            original_link.wait_for(timeout=120_000)
            href = original_link.get_attribute("href")
            if not href:
                raise RuntimeError("Admin original-page link has no href.")
            absolute_original = urljoin(admin_url, href)
            original_request_url = absolute_original.split("#", 1)[0]
            admin_images = wait_for_images(admin_page, "figure img")
            figure_captions = admin_page.locator("figure figcaption").all_inner_texts()
            admin_screenshot = output / "admin-original-question-93.png"
            admin_page.screenshot(path=str(admin_screenshot), full_page=True)
            record_artifact(
                artifacts,
                admin_screenshot,
                "admin-original-screenshot",
                "Painel administrativo da questão 93 com referência original e comparação estruturada.",
            )

            consolidated_request_url = (
                f"{base_url}/api/admin/importacoes-enem/{job_id}/arquivo?kind=consolidated"
            )
            consolidated_response = admin.request.get(
                consolidated_request_url,
                headers={"Range": "bytes=0-65535"},
                timeout=120_000,
                fail_on_status_code=False,
            )
            consolidated_body = consolidated_response.body()
            admin_page.get_by_role("button", name="PDF consolidado").click()
            consolidated_frame = admin_page.locator(
                'iframe[title="PDF consolidado do banco"]'
            )
            consolidated_frame.wait_for(timeout=30_000)
            consolidated_frame_src = consolidated_frame.get_attribute("src")
            consolidated_screenshot = output / "admin-consolidated-viewer-question-93.png"
            admin_page.screenshot(path=str(consolidated_screenshot), full_page=True)
            record_artifact(
                artifacts,
                consolidated_screenshot,
                "admin-consolidated-viewer-screenshot",
                "Visualizador administrativo apontando para a página consolidada da questão 93.",
            )

            external_check: dict[str, Any]
            try:
                external_response = admin.request.get(
                    original_request_url,
                    headers={"Range": "bytes=0-65535"},
                    timeout=30_000,
                    fail_on_status_code=False,
                )
                external_body = external_response.body()
                external_check = {
                    "status": external_response.status,
                    "contentType": external_response.headers.get("content-type"),
                    "contentLength": len(external_body),
                    "responseSha256": sha256_bytes(external_body),
                    "startsWithPdfSignature": external_body.startswith(b"%PDF"),
                }
            except Exception as error:  # noqa: BLE001 - external availability is recorded, not fabricated
                external_check = {
                    "status": None,
                    "error": f"{type(error).__name__}: {error}",
                }

            original_audit = {
                "adminUrl": admin_url,
                "originalLink": absolute_original,
                "externalRequestUrl": original_request_url,
                "externalCheck": external_check,
                "consolidatedRequestUrl": consolidated_request_url,
                "consolidatedStatus": consolidated_response.status,
                "consolidatedContentType": consolidated_response.headers.get("content-type"),
                "consolidatedContentRange": consolidated_response.headers.get("content-range"),
                "consolidatedChunkLength": len(consolidated_body),
                "consolidatedChunkSha256": sha256_bytes(consolidated_body),
                "consolidatedStartsWithPdfSignature": consolidated_body.startswith(b"%PDF"),
                "consolidatedFrameSrc": consolidated_frame_src,
                "renderedImageCount": len(admin_images),
                "renderedImagesLoaded": bool(admin_images)
                and all(item["complete"] and item["naturalWidth"] > 0 for item in admin_images),
                "figureCaptions": figure_captions,
            }
            original_audit_path = output / "admin-original-page-audit.json"
            write_json(original_audit_path, original_audit)
            record_artifact(
                artifacts,
                original_audit_path,
                "admin-original-audit",
                "Comprovação do fac-símile, link Inep e PDF consolidado disponíveis ao administrador, com hashes das respostas obtidas.",
            )
            checks["adminOriginalPage"] = bool(
                re.match(r"^https?://", absolute_original)
                and consolidated_response.status in {200, 206}
                and str(consolidated_response.headers.get("content-type") or "").lower().startswith(
                    "application/pdf"
                )
                and consolidated_body.startswith(b"%PDF")
                and consolidated_frame_src
                and "kind=consolidated" in consolidated_frame_src
                and "#page=" in consolidated_frame_src
                and original_audit["renderedImagesLoaded"]
                and any("Página oficial" in caption for caption in figure_captions)
            )
            details["adminOriginalPage"] = original_audit
        finally:
            admin.close()

        console_path = output / "browser-console.json"
        network_path = output / "browser-network.json"
        write_json(console_path, console_log)
        write_json(network_path, network_log)
        record_artifact(
            artifacts,
            console_path,
            "browser-console",
            "Mensagens de console e erros de página observados durante a execução.",
        )
        record_artifact(
            artifacts,
            network_path,
            "browser-network",
            "Status e URLs das requisições reais feitas pelos navegadores desktop, mobile e admin.",
        )
        details["diagnostics"] = {
            "consoleEntries": len(console_log),
            "pageErrors": sum(1 for item in console_log if item["type"] == "pageerror"),
            "networkEntries": len(network_log),
            "failedRequests": sum(1 for item in network_log if item.get("failure")),
            "httpErrors": sum(
                1
                for item in network_log
                if isinstance(item.get("status"), int) and item["status"] >= 400
            ),
        }
        return {"checks": checks, "details": details}, user
    finally:
        desktop.close()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS))
    parser.add_argument("--exam-id", default="pa-enem-2022-dia-2")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--base-url", default="http://127.0.0.1:3212")
    parser.add_argument("--output-dir")
    parser.add_argument("--tester", default="Codex functional evidence harness")
    parser.add_argument("--chrome-path")
    parser.add_argument("--start-server", action="store_true")
    parser.add_argument("--server-mode", choices=("dev", "production"), default="dev")
    parser.add_argument("--server-timeout", type=int, default=180)
    parser.add_argument("--admin-user-id")
    parser.add_argument(
        "--session-secret",
        default="codex-app-evidence-session-secret-2026-local-only",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_arguments()
    started_at = utc_now()
    run_id = f"app-evidence-{compact_timestamp()}-{os.getpid()}"
    corpus_dir = resolve_repo_path(args.corpus_dir)
    questions_path = corpus_dir / "questoes-estruturadas.json"
    if not questions_path.is_file():
        raise FileNotFoundError(f"Structured corpus not found: {questions_path}")
    source_questions = json.loads(questions_path.read_text(encoding="utf-8"))
    if not isinstance(source_questions, list) or not source_questions:
        raise ValueError("questoes-estruturadas.json must contain a non-empty array.")
    source_questions.sort(key=lambda item: int(item["officialOrder"]))
    corpus_id = str(source_questions[0]["pilotId"])
    tested_source_ids = [str(item["id"]) for item in source_questions]

    output = (
        resolve_repo_path(args.output_dir)
        if args.output_dir
        else corpus_dir / "app-evidence" / run_id
    )
    output.mkdir(parents=True, exist_ok=False)
    artifacts: dict[Path, tuple[str, str]] = {}
    server: subprocess.Popen[Any] | None = None
    server_log_handle = None
    server_log = output / "next-dev-server.log"
    server_stop: dict[str, Any] | None = None
    temporary_user: dict[str, Any] = {}
    cleanup: dict[str, Any] | None = None
    test_result: dict[str, Any] = {
        "checks": {name: False for name in REQUIRED_CHECKS},
        "details": {},
    }
    failures: list[str] = []
    warnings: list[str] = []
    browser_version: str | None = None
    chrome_path = locate_chrome(args.chrome_path)
    base_url = args.base_url.rstrip("/")
    student_email = (
        f"{run_id.lower()}@app-evidence.estudaki.invalid"
    )
    student_password = "Evidence-Only-2026!"

    try:
        if args.start_server:
            server_log_handle = server_log.open("w", encoding="utf-8", errors="replace")
            command = [
                "npm.cmd" if os.name == "nt" else "npm",
                "run",
                "start" if args.server_mode == "production" else "dev",
                "--",
                "--hostname",
                "127.0.0.1",
                "--port",
                str(urlparse(base_url).port or 3212),
            ]
            creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            server = subprocess.Popen(
                command,
                cwd=ROOT,
                stdout=server_log_handle,
                stderr=subprocess.STDOUT,
                creationflags=creationflags,
                env={**os.environ, "SESSION_SECRET": args.session_secret},
            )
        wait_for_url(base_url, args.server_timeout, server)

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                executable_path=chrome_path,
                args=["--disable-dev-shm-usage"],
            )
            try:
                browser_version = browser.version
                test_result, returned_user = browser_checks(
                    browser,
                    base_url=base_url,
                    exam_id=args.exam_id,
                    job_id=args.job_id,
                    output=output,
                    source_questions=source_questions,
                    student_email=student_email,
                    student_password=student_password,
                    admin_user_id=args.admin_user_id,
                    session_secret=args.session_secret,
                    temporary_user_holder=temporary_user,
                    result_holder=test_result,
                    artifacts=artifacts,
                )
                temporary_user.clear()
                temporary_user.update(returned_user)
            finally:
                browser.close()
    except Exception as error:  # noqa: BLE001 - the report must survive a real test failure
        failures.append(f"{type(error).__name__}: {error}")
    finally:
        if temporary_user.get("id"):
            cleanup = cleanup_student(
                student_email, str(temporary_user["id"]), started_at
            )
            cleanup_path = output / "temporary-user-cleanup.json"
            write_json(cleanup_path, cleanup)
            record_artifact(
                artifacts,
                cleanup_path,
                "database-cleanup",
                "Limpeza exata do usuário temporário, tentativas e atividades geradas pela auditoria.",
            )
            cleanup_ok = bool(
                cleanup.get("exitCode") == 0
                and cleanup.get("result", {}).get("cleaned") is True
            )
            if not cleanup_ok:
                failures.append("Temporary evidence user cleanup failed.")
        if server is not None:
            server_stop = stop_server(server)
        if server_log_handle is not None:
            server_log_handle.close()
            record_artifact(
                artifacts,
                server_log,
                "server-log",
                "Log do servidor Next.js usado exclusivamente nesta captura funcional.",
            )

    checks = test_result["checks"]
    details = test_result["details"]
    if details.get("answerKeyNotLeaked", {}).get("answerSituationMetadataValues"):
        warnings.append(
            "The generic student API exposes answerSituation metadata; no answer letter or resolution was present, and proof-mode props omit this field."
        )
    if details.get("correction", {}).get("resolutionQuality", {}).get("passed") is False:
        quality = details["correction"]["resolutionQuality"]
        number = details["correction"].get("activeResult", {}).get("officialNumber")
        failures.append(
            "Authorial resolution quality failed"
            f" for question {number}: placeholder={quality.get('placeholderDetected')},"
            f" authorialResolution={quality.get('authorialResolutionPresent')},"
            f" explanationSubstantive={quality.get('explanationSubstantive')},"
            f" alternativeCommentsComplete={quality.get('alternativeCommentsComplete')},"
            f" commonError={quality.get('commonErrorPresent')},"
            f" studyTip={quality.get('studyTipPresent')}."
        )
    for check in REQUIRED_CHECKS:
        if checks.get(check) is not True:
            failures.append(f"Required functional check failed: {check}")
    failures = list(dict.fromkeys(failures))
    warnings = list(dict.fromkeys(warnings))

    artifact_entries = [
        {
            "path": relative_to_repo(path),
            "sha256": sha256_file(path),
            "kind": kind,
            "note": note,
        }
        for path, (kind, note) in sorted(
            artifacts.items(), key=lambda item: relative_to_repo(item[0])
        )
    ]
    completed_at = utc_now()
    report = {
        "schemaVersion": 1,
        "runId": run_id,
        "corpusId": corpus_id,
        "examId": args.exam_id,
        "jobId": args.job_id,
        "startedAt": started_at,
        "completedAt": completed_at,
        "baseUrl": base_url,
        "overallPassed": not failures,
        "coverage": {
            "sourceOccurrences": len(source_questions),
            "testedSourceIds": len(tested_source_ids),
            "structuralApiOccurrences": details.get("structuredCorpus", {}).get(
                "questionCount", 0
            ),
            "visualDesktopQuestions": [91],
            "visualMobileQuestions": [details.get("mobile", {}).get("questionNumber")],
            "adminOriginalQuestions": [93],
            "correctedQuestions": [91],
            "integralVisualReviewClaimed": False,
        },
        "checks": checks,
        "details": details,
        "failures": failures,
        "warnings": warnings,
        "temporaryUserCleanup": cleanup,
        "serverStop": server_stop,
        "environment": {
            "python": sys.version,
            "platform": platform.platform(),
            "browserVersion": browser_version,
            "browserExecutable": chrome_path,
        },
        "artifacts": artifact_entries,
    }
    report_path = output / "run-report.json"
    write_json(report_path, report)

    if not failures:
        corrected_number = details.get("correction", {}).get("activeResult", {}).get(
            "officialNumber"
        )
        mobile_number = details.get("mobile", {}).get("questionNumber")
        resolution_quality = details.get("correction", {}).get("resolutionQuality", {})
        resolution_note = (
            f"A questão {corrected_number} devolveu resolução autoral substantiva, "
            "comentários específicos A–E, erro comum e dica após a entrega."
            if resolution_quality.get("passed") is True
            else "A qualidade autoral não foi comprovada; esta evidência foi bloqueada."
        )
        evidence = {
            "schemaVersion": 1,
            "corpusId": corpus_id,
            "complete": True,
            "testedAt": completed_at,
            "tester": args.tester,
            "baseUrl": base_url,
            "testedSourceIds": tested_source_ids,
            "checks": {name: True for name in REQUIRED_CHECKS},
            "evidence": artifact_entries,
            "notes": (
                "Cobertura estrutural, ordem oficial e ausência de campos de correção verificadas nas 90 ocorrências via payload real. "
                f"Renderização visual amostrada em desktop e na questão {mobile_number} em mobile; "
                f"correção real exercitada na questão {corrected_number}; página oficial auditável verificada no painel administrativo. "
                "Esta evidência funcional não declara revisão visual integral das 90 questões e não altera o conteúdo do corpus. "
                + resolution_note
            ),
        }
        evidence_path = output / "corpus-app-evidence.json"
        write_json(evidence_path, evidence)
    else:
        evidence_path = None

    print(
        json.dumps(
            {
                "passed": not failures,
                "output": relative_to_repo(output),
                "report": relative_to_repo(report_path),
                "appEvidence": relative_to_repo(evidence_path)
                if evidence_path
                else None,
                "checks": checks,
                "failures": failures,
                "warnings": warnings,
            },
            ensure_ascii=True,
        )
    )
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
