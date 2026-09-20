import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

type AssetIssue = {
  sourceId: string;
  label: string;
  reason: string;
  artifactPath: string | null;
};

type QuestionIssue = {
  sourceId: string;
  officialNumber: number | null;
  reasons: string[];
};

type AnswerConflict = {
  sourceId: string;
  officialNumber: number | null;
  reason: string;
};

type DuplicateQuestion = {
  key: string;
  kind: "contentHash" | "statement";
  sourceIds: string[];
};

function argument(name: string) {
  const equalPrefix = `${name}=`;
  const equalValue = process.argv.find((item) => item.startsWith(equalPrefix));
  if (equalValue) return equalValue.slice(equalPrefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function has(name: string) {
  return process.argv.includes(name);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is JsonRecord =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "na"
  );
}

function sha256(buffer: Buffer | string) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function normalizeStatement(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function repoPath(value: string) {
  const root = path.resolve(process.cwd());
  const resolved = path.resolve(root, value);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Caminho fora do repositorio: ${value}`);
  }
  return resolved;
}

async function findCorpusDir() {
  const explicit = argument("--corpus-dir");
  if (explicit) return repoPath(explicit);

  const year = Number(argument("--year") ?? "2024");
  const day = Number(argument("--day") ?? "2");
  const booklet = argument("--booklet") ?? argument("--caderno");
  const color = argument("--color") ?? argument("--cor");
  const base = repoPath(path.join("data", "QUESTÕES", "processamento"));
  const entries = await readdir(base, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(`enem-${year}-dia-${day}-`))
    .filter((name) => !booklet || name.includes(`caderno-${booklet}-`))
    .filter((name) => !color || name.includes(slugify(color)));

  if (candidates.length !== 1) {
    const available = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name.startsWith(`enem-${year}-dia-${day}-`));
    throw new Error(
      [
        `Nao foi possivel resolver um unico corpus para ENEM ${year} dia ${day}.`,
        `Filtro recebido: caderno=${booklet ?? "qualquer"}, cor=${color ?? "qualquer"}.`,
        `Disponiveis: ${available.join(", ") || "nenhum"}.`,
      ].join(" "),
    );
  }

  return path.join(base, candidates[0]!);
}

function expectedQuestionNumbers(provenance: JsonRecord, questions: JsonRecord[]) {
  const markers = asArray(asRecord(provenance.detection).markers);
  const detected = markers
    .map((marker) => asNumber(marker.officialNumber))
    .filter((value): value is number => value !== null);
  const fromQuestions = questions
    .map((question) => asNumber(question.officialNumber))
    .filter((value): value is number => value !== null);
  const numbers = detected.length ? detected : fromQuestions;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function questionIdentity(question: JsonRecord) {
  return {
    sourceId: asString(question.id) || "unknown",
    officialNumber: asNumber(question.officialNumber),
  };
}

function collectQuestionIssues(questions: JsonRecord[]) {
  const issues: QuestionIssue[] = [];
  for (const question of questions) {
    const identity = questionIdentity(question);
    const reasons: string[] = [];
    const alternatives = asArray(question.alternatives);
    const blocks = asArray(question.blocks);
    const originalCrops = asArray(question.originalCrops);
    const command = asString(question.command);
    const statement = asString(question.statement);

    if (!asString(question.contentHash).match(/^[a-f0-9]{64}$/i)) {
      reasons.push("contentHash ausente ou invalido");
    }
    if (!command.trim()) reasons.push("comando vazio");
    if (!statement.trim()) reasons.push("enunciado vazio");
    if (!blocks.length) reasons.push("blocos estruturados ausentes");
    if (alternatives.length !== 5) {
      reasons.push(`alternativas ${alternatives.length}/5`);
    }
    for (const alternative of alternatives) {
      const key = asString(alternative.key) || "?";
      const text = asString(alternative.text);
      const imageArtifacts = asArray(alternative.imageArtifacts);
      if (!text.trim() && imageArtifacts.length === 0) {
        reasons.push(`alternativa ${key} sem texto nem imagem`);
      }
    }
    if (!originalCrops.length) reasons.push("recorte administrativo ausente");
    if (asString(question.extractionStatus) !== "extracted") {
      reasons.push(`status de extracao: ${asString(question.extractionStatus) || "ausente"}`);
    }
    if (reasons.length) issues.push({ ...identity, reasons });
  }
  return issues;
}

function collectDuplicates(questions: JsonRecord[]) {
  const byContentHash = new Map<string, string[]>();
  const byStatement = new Map<string, string[]>();
  for (const question of questions) {
    const id = asString(question.id) || "unknown";
    const contentHash = asString(question.contentHash);
    if (contentHash) byContentHash.set(contentHash, [...(byContentHash.get(contentHash) ?? []), id]);
    const statementKey = normalizeStatement(
      `${asString(question.supportText)} ${asString(question.command)} ${asString(question.statement)}`,
    );
    if (statementKey) byStatement.set(statementKey, [...(byStatement.get(statementKey) ?? []), id]);
  }
  const rows: DuplicateQuestion[] = [];
  for (const [key, sourceIds] of byContentHash) {
    if (sourceIds.length > 1) rows.push({ key, kind: "contentHash", sourceIds });
  }
  for (const [key, sourceIds] of byStatement) {
    if (sourceIds.length > 1) rows.push({ key: sha256(key), kind: "statement", sourceIds });
  }
  return rows;
}

function compatibleAnswer(question: JsonRecord) {
  return asString(question.answerSituation) === "annulled"
    ? "ANULADA"
    : asString(question.answer).toUpperCase();
}

function collectAnswerConflicts(questions: JsonRecord[], answerKey: JsonRecord) {
  const answers = asArray(answerKey.answers);
  const byOccurrence = new Map(answers.map((answer) => [asString(answer.occurrenceId), answer]));
  const conflicts: AnswerConflict[] = [];
  for (const question of questions) {
    const { sourceId, officialNumber } = questionIdentity(question);
    const official = asRecord(question.officialAnswerKey);
    const byId = byOccurrence.get(sourceId);
    const expected = compatibleAnswer(question);
    if (!byId) {
      conflicts.push({ sourceId, officialNumber, reason: "gabarito oficial ausente para occurrenceId" });
      continue;
    }
    if (asNumber(byId.questionNumber) !== officialNumber) {
      conflicts.push({ sourceId, officialNumber, reason: "numero diverge do gabarito oficial" });
    }
    if (asString(byId.correctAlternative).toUpperCase() !== expected) {
      conflicts.push({ sourceId, officialNumber, reason: "alternativa diverge do gabarito oficial" });
    }
    if (asString(official.correctAlternative).toUpperCase() !== expected) {
      conflicts.push({ sourceId, officialNumber, reason: "metadado embedded de gabarito diverge" });
    }
    if (!asString(official.sourceSha256).match(/^[a-f0-9]{64}$/i)) {
      conflicts.push({ sourceId, officialNumber, reason: "hash do gabarito ausente/invalido" });
    }
    if (!asString(official.sourceUrl).startsWith("https://")) {
      conflicts.push({ sourceId, officialNumber, reason: "url oficial do gabarito ausente" });
    }
  }
  return conflicts;
}

function assetRefs(question: JsonRecord): JsonRecord[] {
  const alternativeAssets = asArray(question.alternatives).flatMap<JsonRecord>((alternative) => {
    const alternativeKey = asString(alternative.key) || null;
    const rawAssets = Array.isArray(alternative.imageArtifacts)
      ? alternative.imageArtifacts
      : [];
    return rawAssets.map((asset, index): JsonRecord => {
      if (asset && typeof asset === "object" && !Array.isArray(asset)) {
        return { ...(asset as JsonRecord), relation: "alternative", alternativeKey };
      }
      return {
        artifactPath: typeof asset === "string" ? asset : null,
        relation: "alternative",
        alternativeKey,
        order: index,
        __auditReason: "imageArtifacts deve ser objeto estruturado, nao caminho cru",
      };
    });
  });
  return [...asArray(question.assets), ...asArray(question.originalCrops), ...alternativeAssets];
}

async function collectAssetIssues(questions: JsonRecord[]) {
  const issues: AssetIssue[] = [];
  const checked = new Set<string>();
  for (const question of questions) {
    const { sourceId } = questionIdentity(question);
    const assets = assetRefs(question);
    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index]!;
      const label = `${sourceId} asset ${index + 1}`;
      const artifactPath = asString(asset.artifactPath) || null;
      const assetHash = asString(asset.sha256);
      const width = asNumber(asset.width);
      const height = asNumber(asset.height);
      const auditReason = asString(asset.__auditReason);
      if (auditReason) {
        issues.push({ sourceId, label, reason: auditReason, artifactPath });
        continue;
      }
      if (!artifactPath) {
        issues.push({ sourceId, label, reason: "artifactPath ausente", artifactPath });
        continue;
      }
      if (!assetHash.match(/^[a-f0-9]{64}$/i)) {
        issues.push({ sourceId, label, reason: "sha256 ausente/invalido", artifactPath });
      }
      if (!width || !height || width <= 0 || height <= 0) {
        issues.push({ sourceId, label, reason: "dimensoes invalidas", artifactPath });
      }
      const dedupeKey = `${artifactPath}:${assetHash}`;
      if (checked.has(dedupeKey)) continue;
      checked.add(dedupeKey);
      try {
        const absolutePath = repoPath(artifactPath);
        const metadata = await stat(absolutePath);
        if (!metadata.isFile()) {
          issues.push({ sourceId, label, reason: "artefato nao e arquivo", artifactPath });
          continue;
        }
        if (assetHash && sha256(await readFile(absolutePath)) !== assetHash) {
          issues.push({ sourceId, label, reason: "hash fisico diverge", artifactPath });
        }
      } catch (error) {
        issues.push({
          sourceId,
          label,
          reason: error instanceof Error ? `artefato inacessivel: ${error.message}` : "artefato inacessivel",
          artifactPath,
        });
      }
    }
  }
  return issues;
}

function compactValidationErrors(validation: JsonRecord) {
  return asStringArray(validation.errors);
}

function validationErrorQuestions(validation: JsonRecord) {
  const numbers = new Set<number>();
  for (const error of compactValidationErrors(validation)) {
    for (const match of error.matchAll(/q(\d{3})/gi)) {
      numbers.add(Number(match[1]));
    }
  }
  return [...numbers].sort((first, second) => first - second);
}

async function main() {
  const corpusDir = await findCorpusDir();
  const reportsDir = repoPath(argument("--reports-dir") ?? "reports");
  const dataReportsDir = repoPath(argument("--data-reports-dir") ?? "data/reports");
  const [
    questions,
    provenance,
    answerKey,
    validation,
    checkpoint,
  ] = await Promise.all([
    readJson<JsonRecord[]>(path.join(corpusDir, "questoes-estruturadas.json")),
    readJson<JsonRecord>(path.join(corpusDir, "proveniencia.json")),
    readJson<JsonRecord>(path.join(corpusDir, "gabarito-oficial.json")),
    readJson<JsonRecord>(path.join(corpusDir, "relatorio-validacao.json")),
    readJson<JsonRecord>(path.join(corpusDir, "checkpoint.json")),
  ]);

  const expectedNumbers = expectedQuestionNumbers(provenance, questions);
  const actualNumbers = new Set(
    questions
      .map((question) => asNumber(question.officialNumber))
      .filter((value): value is number => value !== null),
  );
  const missingQuestions = expectedNumbers.filter((number) => !actualNumbers.has(number));
  const questionIssues = collectQuestionIssues(questions);
  const duplicateQuestions = collectDuplicates(questions);
  const answerConflicts = collectAnswerConflicts(questions, answerKey);
  const assetIssues = await collectAssetIssues(questions);
  const gate = asRecord(validation.publicationGate);
  const validationErrors = compactValidationErrors(validation);
  const validationWarnings = asStringArray(validation.warnings);
  const issueNumbers = [
    ...new Set([
      ...validationErrorQuestions(validation),
      ...questionIssues.flatMap((issue) =>
        issue.officialNumber === null ? [] : [issue.officialNumber],
      ),
      ...answerConflicts.flatMap((issue) =>
        issue.officialNumber === null ? [] : [issue.officialNumber],
      ),
    ]),
  ].sort((first, second) => first - second);

  const firstQuestion = questions[0] ?? {};
  const pilot = {
    corpusId: asString(validation.corpusId) || asString(provenance.corpusId),
    directory: path.relative(process.cwd(), corpusDir).replaceAll("\\", "/"),
    year: asNumber(answerKey.year) ?? asNumber(firstQuestion.year),
    day: asNumber(answerKey.day) ?? asNumber(firstQuestion.day),
    application: asString(answerKey.application) || asString(firstQuestion.application),
    modality: asString(answerKey.modality) || asString(firstQuestion.modality),
    bookletNumber: asNumber(answerKey.bookletNumber) ?? asNumber(firstQuestion.bookletNumber),
    bookletColor: asString(answerKey.bookletColor) || asString(firstQuestion.bookletColor),
    officialExamUrl: asString(asRecord(provenance.officialExam).url),
    officialAnswerKeyUrl: asString(asRecord(provenance.officialAnswerKey).url),
    officialSourcePageUrl: asString(asRecord(provenance.officialExam).sourcePageUrl),
    generatedAt: new Date().toISOString(),
  };

  const counts = {
    expectedLogicalQuestions: asNumber(asRecord(validation.checks).expectedLogicalQuestions) ?? expectedNumbers.length,
    logicalQuestions: asNumber(asRecord(validation.checks).logicalQuestions) ?? actualNumbers.size,
    printedOccurrences: questions.length,
    alternatives: questions.reduce((sum, question) => sum + asArray(question.alternatives).length, 0),
    answerAssignments: asArray(answerKey.answers).length,
    assetReferences: questions.reduce((sum, question) => sum + assetRefs(question).length, 0),
    validationErrors: validationErrors.length,
    validationWarnings: validationWarnings.length,
    questionIssues: questionIssues.length,
    duplicateGroups: duplicateQuestions.length,
    answerConflicts: answerConflicts.length,
    assetIssues: assetIssues.length,
    needsReviewQuestions: issueNumbers.length,
  };

  const canPublish = gate.canPublish === true;
  const status = canPublish && counts.validationErrors === 0 && counts.questionIssues === 0
    ? "READY_TO_IMPORT"
    : "NEEDS_REVIEW";

  const importSummary = {
    schemaVersion: 1,
    status,
    pilot,
    counts,
    publicationGate: gate,
    checkpoint: {
      stage: asString(checkpoint.stage),
      expectedLogicalQuestions: asNumber(checkpoint.expectedLogicalQuestions),
      expectedPrintedOccurrences: asNumber(checkpoint.expectedPrintedOccurrences),
      completedOccurrences: Array.isArray(checkpoint.completedOccurrences)
        ? checkpoint.completedOccurrences.length
        : 0,
      failedOccurrences: Array.isArray(checkpoint.failedOccurrences)
        ? checkpoint.failedOccurrences.length
        : 0,
    },
    questionsInReview: issueNumbers,
  };

  const validationReport = {
    schemaVersion: 1,
    status,
    generatedAt: pilot.generatedAt,
    pilot,
    checks: asRecord(validation.checks),
    requirements: asRecord(validation.requirements),
    errors: validationErrors,
    warnings: validationWarnings,
    knownGaps: Array.isArray(validation.knownGaps) ? validation.knownGaps : [],
    questionIssues,
  };

  const missingReport = {
    schemaVersion: 1,
    generatedAt: pilot.generatedAt,
    expectedNumbers,
    missingQuestions,
    incompleteQuestions: questionIssues,
  };

  const answerReport = {
    schemaVersion: 1,
    generatedAt: pilot.generatedAt,
    source: asRecord(answerKey.source),
    conflicts: answerConflicts,
  };

  const assetReport = {
    schemaVersion: 1,
    generatedAt: pilot.generatedAt,
    issues: assetIssues,
  };

  const duplicateReport = {
    schemaVersion: 1,
    generatedAt: pilot.generatedAt,
    duplicates: duplicateQuestions,
  };

  const markdown = [
    `# Auditoria piloto ${pilot.corpusId}`,
    "",
    `Gerado em: ${pilot.generatedAt}`,
    "",
    `Status: **${status}**`,
    "",
    "## Fonte oficial",
    "",
    `- Pagina INEP: ${pilot.officialSourcePageUrl}`,
    `- Prova: ${pilot.officialExamUrl}`,
    `- Gabarito: ${pilot.officialAnswerKeyUrl}`,
    "",
    "## Contagens",
    "",
    `- Questoes logicas: ${counts.logicalQuestions}/${counts.expectedLogicalQuestions}`,
    `- Ocorrencias estruturadas: ${counts.printedOccurrences}`,
    `- Alternativas: ${counts.alternatives}`,
    `- Gabaritos associados: ${counts.answerAssignments}`,
    `- Referencias de asset: ${counts.assetReferences}`,
    `- Questoes em revisao: ${counts.needsReviewQuestions}`,
    "",
    "## Bloqueios",
    "",
    ...(validationErrors.length
      ? validationErrors.map((error) => `- ${error}`)
      : ["- Nenhum erro estrutural registrado pelo validador."]),
    "",
    "## Decisao",
    "",
    canPublish
      ? "O gate de publicacao informa que este pacote pode avancar, desde que as etapas editoriais posteriores estejam completas."
      : "O gate de publicacao esta bloqueado. Nenhuma questao deste piloto deve ser publicada ate a revisao dos itens listados.",
    "",
  ].join("\n");

  await Promise.all([mkdir(reportsDir, { recursive: true }), mkdir(dataReportsDir, { recursive: true })]);
  const outputs = [
    ["import-summary.json", importSummary],
    ["validation-report.json", validationReport],
    ["missing-questions.json", missingReport],
    ["duplicate-questions.json", duplicateReport],
    ["answer-conflicts.json", answerReport],
    ["assets-errors.json", assetReport],
  ] as const;

  await Promise.all(
    outputs.flatMap(([fileName, payload]) => [
      writeFile(path.join(reportsDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8"),
      writeFile(
        path.join(dataReportsDir, `${slugify(String(pilot.corpusId))}-${fileName}`),
        `${JSON.stringify(payload, null, 2)}\n`,
        "utf8",
      ),
    ]),
  );
  const mdName = `${slugify(String(pilot.corpusId))}-audit.md`;
  await Promise.all([
    writeFile(path.join(reportsDir, mdName), markdown, "utf8"),
    writeFile(path.join(dataReportsDir, mdName), markdown, "utf8"),
  ]);

  const consoleSummary = {
    status,
    pilot,
    counts,
    reports: {
      directory: path.relative(process.cwd(), reportsDir).replaceAll("\\", "/"),
      dataDirectory: path.relative(process.cwd(), dataReportsDir).replaceAll("\\", "/"),
      markdown: path.join(path.relative(process.cwd(), reportsDir), mdName).replaceAll("\\", "/"),
    },
  };
  console.log(JSON.stringify(consoleSummary, null, 2));

  if (status !== "READY_TO_IMPORT" && has("--fail-on-blocker")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
