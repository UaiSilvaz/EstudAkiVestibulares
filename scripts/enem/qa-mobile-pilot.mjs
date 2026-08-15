import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.PILOT_QA_BASE_URL || "http://localhost:3107";
const targetPath = process.env.PILOT_QA_PATH;
const email = process.env.PILOT_QA_EMAIL;
const password = process.env.PILOT_QA_PASSWORD;
const sessionCookie = process.env.PILOT_QA_SESSION_COOKIE;
const output = process.env.PILOT_QA_OUTPUT;
const expectedText = process.env.PILOT_QA_EXPECTED_TEXT || "";
const auditAllQuestions = process.env.PILOT_QA_ALL_QUESTIONS === "true";
const firstOfficialNumber = Number(process.env.PILOT_QA_FIRST_QUESTION || "91");
const expectedQuestionCount = Number(process.env.PILOT_QA_QUESTION_COUNT || "90");
const browserPath =
  process.env.PILOT_QA_BROWSER ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

if (!targetPath || !output || (!sessionCookie && (!email || !password))) {
  throw new Error(
    "Defina caminho/saída e use PILOT_QA_SESSION_COOKIE ou e-mail/senha de QA.",
  );
}

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForJson(url, options) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await delay(125);
  }
  throw lastError ?? new Error(`Timeout ao consultar ${url}.`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (!payload.id) return;
      const pending = this.pending.get(payload.id);
      if (!pending) return;
      this.pending.delete(payload.id);
      if (payload.error) pending.reject(new Error(payload.error.message));
      else pending.resolve(payload.result ?? {});
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new CdpClient(socket);
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Falha ao avaliar JavaScript no navegador.");
  }
  return result.result?.value;
}

async function waitForPage(client, text = expectedText) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = await evaluate(
      client,
      `({ ready: document.readyState === "complete", text: document.body?.innerText || "" })`,
    );
    if (state?.ready && (!text || state.text.includes(text))) return;
    await delay(250);
  }
  throw new Error(`A página não exibiu o texto esperado: ${text}.`);
}

async function waitForQuestionAssets(client) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await evaluate(
      client,
      `(() => {
        const images = [...document.images].filter((image) =>
          (image.currentSrc || image.src).includes("/api/questions/assets/"),
        );
        return {
          count: images.length,
          pending: images.filter((image) => !image.complete).length,
        };
      })()`,
    );
    if (state.count > 0 && state.pending === 0) return;
    await delay(50);
  }
  throw new Error("As mídias da questão não concluíram o carregamento.");
}

async function auditCurrentQuestion(client) {
  return evaluate(
    client,
    `(() => {
      const match = document.body.innerText.match(/Questão\\s+(\\d+)/);
      const images = [...document.images].filter((image) =>
        (image.currentSrc || image.src).includes("/api/questions/assets/"),
      );
      return {
        officialNumber: match ? Number(match[1]) : null,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        contentImageCount: images.length,
        brokenContentImages: images.filter(
          (image) => !image.complete || image.naturalWidth < 1,
        ).length,
        maxRenderedImageWidth: Math.max(
          0,
          ...images.map((image) => image.getBoundingClientRect().width),
        ),
      };
    })()`,
  );
}

async function advanceQuestion(client) {
  const advanced = await evaluate(
    client,
    `(() => {
      const button = [...document.querySelectorAll("button")].find(
        (candidate) => candidate.textContent?.trim().startsWith("Próxima") && !candidate.disabled,
      );
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
  if (!advanced) throw new Error("Botão Próxima não encontrado durante a auditoria integral.");
  await delay(75);
}

async function auditQuestionSequence(client) {
  const questions = [];
  for (let index = 0; index < expectedQuestionCount; index += 1) {
    await waitForQuestionAssets(client);
    questions.push(await auditCurrentQuestion(client));
    if (index < expectedQuestionCount - 1) await advanceQuestion(client);
  }
  const expectedNumbers = Array.from(
    { length: expectedQuestionCount },
    (_, index) => firstOfficialNumber + index,
  );
  const actualNumbers = questions.map((question) => question.officialNumber);
  return {
    checked: questions.length,
    first: actualNumbers[0] ?? null,
    last: actualNumbers.at(-1) ?? null,
    sequenceMatches: actualNumbers.every(
      (number, index) => number === expectedNumbers[index],
    ),
    horizontalOverflowQuestions: questions
      .filter((question) => question.horizontalOverflow)
      .map((question) => question.officialNumber),
    brokenImageQuestions: questions
      .filter((question) => question.brokenContentImages > 0)
      .map((question) => question.officialNumber),
    questionsWithoutContentImages: questions
      .filter((question) => question.contentImageCount < 1)
      .map((question) => question.officialNumber),
    maxRenderedImageWidth: Math.max(
      0,
      ...questions.map((question) => question.maxRenderedImageWidth),
    ),
  };
}

async function terminateBrowserTree(browserProcess) {
  if (browserProcess.exitCode !== null) return;
  if (process.platform === "win32" && browserProcess.pid) {
    const killer = spawn(
      "taskkill",
      ["/PID", String(browserProcess.pid), "/T", "/F"],
      { stdio: "ignore", windowsHide: true },
    );
    await Promise.race([
      new Promise((resolve) => killer.once("exit", resolve)),
      delay(3_000),
    ]);
    return;
  }
  browserProcess.kill();
  await Promise.race([
    new Promise((resolve) => browserProcess.once("exit", resolve)),
    delay(2_000),
  ]);
}

const debugPort = 9337;
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), "estudaki-enem-mobile-"));
const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDirectory}`,
    "--window-size=390,844",
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

let client;
try {
  await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const target = targets.find((item) => item.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("Aba do navegador não encontrada.");
  client = await CdpClient.connect(target.webSocketDebuggerUrl);
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Network.enable"),
    client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    }),
    client.send("Emulation.setTouchEmulationEnabled", { enabled: true }),
  ]);

  if (sessionCookie) {
    const cookie = await client.send("Network.setCookie", {
      name: "estudaki_user_id",
      value: sessionCookie,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    });
    if (!cookie.success) throw new Error("Não foi possível aplicar a sessão de QA.");
  } else {
    await client.send("Page.navigate", { url: `${baseUrl}/login` });
    await waitForPage(client, "");
    const login = await evaluate(
      client,
      `(async () => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: ${JSON.stringify(email)}, password: ${JSON.stringify(password)} }),
        });
        return { status: response.status, body: await response.text() };
      })()`,
    );
    if (login.status !== 200) throw new Error(`Login falhou com HTTP ${login.status}.`);
  }

  await client.send("Page.navigate", { url: new URL(targetPath, baseUrl).toString() });
  await waitForPage(client);
  await delay(1_200);
  const audit = await evaluate(
    client,
    `(() => {
      const images = [...document.images];
      const contentImages = images.filter((image) =>
        (image.currentSrc || image.src).includes("/api/questions/assets/"),
      );
      const root = document.documentElement;
      return {
        url: location.href,
        title: document.title,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        scrollWidth: root.scrollWidth,
        scrollHeight: root.scrollHeight,
        horizontalOverflow: root.scrollWidth > innerWidth + 1,
        imageCount: images.length,
        brokenImages: images.filter((image) => !image.complete || image.naturalWidth < 1).length,
        brokenImageSources: images
          .filter((image) => !image.complete || image.naturalWidth < 1)
          .map((image) => image.currentSrc || image.src),
        contentImageCount: contentImages.length,
        brokenContentImages: contentImages.filter(
          (image) => !image.complete || image.naturalWidth < 1,
        ).length,
        maxRenderedImageWidth: Math.max(0, ...images.map((image) => image.getBoundingClientRect().width)),
        bodyTextIncludesExpected: ${JSON.stringify(expectedText)} === "" || document.body.innerText.includes(${JSON.stringify(expectedText)}),
      };
    })()`,
  );
  const questionSequenceAudit = auditAllQuestions
    ? await auditQuestionSequence(client)
    : null;
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  const outputPath = path.resolve(output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
  console.log(
    JSON.stringify(
      { ...audit, questionSequenceAudit, screenshot: outputPath },
      null,
      2,
    ),
  );
  if (
    audit.horizontalOverflow ||
    audit.brokenContentImages ||
    !audit.bodyTextIncludesExpected ||
    (questionSequenceAudit &&
      (!questionSequenceAudit.sequenceMatches ||
        questionSequenceAudit.horizontalOverflowQuestions.length > 0 ||
        questionSequenceAudit.brokenImageQuestions.length > 0 ||
        questionSequenceAudit.questionsWithoutContentImages.length > 0))
  ) {
    process.exitCode = 1;
  }
} finally {
  client?.close();
  await terminateBrowserTree(browser);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(profileDirectory, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 4) {
        console.warn(`Não foi possível remover o perfil temporário: ${error.message}`);
        break;
      }
      await delay(500);
    }
  }
}
