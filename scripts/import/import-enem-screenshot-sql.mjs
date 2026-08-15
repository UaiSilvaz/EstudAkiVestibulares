import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const LETTERS = ["A", "B", "C", "D", "E"];
const DEFAULT_ROOT = path.join("data", "QUEST\u00d5ES", "processamento");
const DEFAULT_OUTPUT = path.join("data", "reports", "enem-production-sql");

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function has(name) {
  return process.argv.includes(name);
}

function positionalArguments() {
  const flagsWithValue = new Set(["--root", "--output", "--batch-size"]);
  const output = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (flagsWithValue.has(arg)) {
      index += 1;
      continue;
    }
    if (!arg.startsWith("--")) output.push(arg);
  }
  return output;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableId(prefix, value) {
  return `${prefix}_${sha256(value).slice(0, 24)}`;
}

function slugify(value) {
  return (
    `${value ?? ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "a-classificar"
  );
}

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  return Number.isFinite(value) ? String(value) : "null";
}

function sqlJson(value) {
  return sql(JSON.stringify(value));
}

function sqlJsonb(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function subjectFor(question) {
  if (question.subject?.trim()) return question.subject.trim();
  const area = slugify(question.area);
  if (area.includes("matematica")) return "Matem\u00e1tica";
  if (area.includes("linguagens")) return "Linguagens";
  if (area.includes("humanas")) return "Ci\u00eancias Humanas";
  if (area.includes("natureza")) return "Ci\u00eancias da Natureza";
  return "A classificar";
}

function topicFor(question) {
  return question.content?.trim() || question.area?.trim() || "Quest\u00f5es oficiais ENEM";
}

function difficultyFor(question) {
  const normalized = slugify(question.difficulty);
  if (normalized.includes("hard") || normalized.includes("dificil")) return "HARD";
  if (normalized.includes("easy") || normalized.includes("facil")) return "EASY";
  return "MEDIUM";
}

function languageFor(question) {
  const normalized = slugify(question.language);
  if (normalized === "ingles" || normalized === "english") return "ENGLISH";
  if (normalized === "espanhol" || normalized === "spanish") return "SPANISH";
  return "NOT_APPLICABLE";
}

function answerSituation(question) {
  return question.answerSituation === "annulled" ||
    question.officialAnswerKey?.situation === "annulled" ||
    question.answer === "ANULADA"
    ? "ANNULLED"
    : "CONFIRMED";
}

function correctAnswer(question) {
  if (answerSituation(question) === "ANNULLED") return "ANULADA";
  const answer = question.officialAnswerKey?.correctAlternative ?? question.answer ?? "";
  return LETTERS.includes(answer) ? answer : "A";
}

function questionStatement(question) {
  const statement = question.statement?.trim();
  if (statement && statement.length > 40) return statement;
  const parts = [question.supportText?.trim(), question.command?.trim()].filter(Boolean);
  if (parts.length) return parts.join("\n\n");
  return (
    `Print oficial da questao ${question.officialNumber} do ENEM ${question.year}. ` +
    "Use a imagem abaixo para ler o enunciado completo e responda pelas alternativas."
  );
}

function dayLabel(day) {
  return `${day}\u00ba dia`;
}

function regionFields(region) {
  return {
    regionX: region?.x ?? null,
    regionY: region?.y ?? null,
    regionWidth: region?.width ?? null,
    regionHeight: region?.height ?? null,
    normalizedX: region?.normalized?.x ?? null,
    normalizedY: region?.normalized?.y ?? null,
    normalizedWidth: region?.normalized?.width ?? null,
    normalizedHeight: region?.normalized?.height ?? null,
  };
}

async function questionRoot(input) {
  const direct = path.resolve(input);
  try {
    if ((await stat(direct)).isDirectory()) return direct;
  } catch {}

  const dataRoot = path.resolve("data");
  for (const entry of await readdir(dataRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("QUEST")) continue;
    const candidate = path.join(dataRoot, entry.name, "processamento");
    if ((await stat(candidate)).isDirectory()) return candidate;
  }
  throw new Error("Diretorio data/QUESTOES/processamento nao encontrado.");
}

async function copyFacsimile(asset, destinationParts) {
  const source = path.resolve(process.cwd(), asset.artifactPath);
  const storagePath = destinationParts.join("/");
  const destination = path.resolve(process.cwd(), "storage", "questoes", ...destinationParts);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  return {
    url: `/api/questions/assets/${storagePath}`,
    storagePath,
  };
}

async function readQuestions(root, requested) {
  const dirs = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("enem-"))
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => !requested.length || requested.some((item) => dir.includes(item)))
    .sort();

  const questions = [];
  const skipped = [];
  for (const dir of dirs) {
    const questionsDir = path.join(dir, "questoes");
    try {
      if (!(await stat(questionsDir)).isDirectory()) continue;
    } catch {
      continue;
    }
    const files = (await readdir(questionsDir))
      .filter((file) => file.endsWith(".json"))
      .map((file) => path.join(questionsDir, file))
      .sort();

    for (const file of files) {
      const question = JSON.parse(await readFile(file, "utf8"));
      question.corpusId = question.corpusId ?? question.pilotId ?? path.basename(dir);
      question.id =
        question.id ??
        `${question.corpusId}-q${String(question.officialNumber).padStart(3, "0")}-${question.language ?? "portugues"}`;
      const facsimiles = (question.assets ?? [])
        .filter((asset) => asset.type === "official_prompt_facsimile")
        .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
      if (!facsimiles.length) {
        skipped.push({ file, reason: "missing_facsimile" });
        continue;
      }
      questions.push({ dir, facsimiles, question });
    }
  }
  return { questions, skipped };
}

async function prepareRows(items) {
  const subjects = new Map();
  const topics = new Map();
  const questions = [];
  const alternatives = [];
  const images = [];
  const metadata = [];

  for (const item of items) {
    const { facsimiles, question } = item;
    const subjectName = subjectFor(question);
    const subjectSlug = slugify(subjectName);
    const subjectId = stableId("subj", subjectSlug);
    const topicName = topicFor(question);
    const topicSlug = `${subjectSlug}-${slugify(topicName)}`;
    const topicId = stableId("topic", topicSlug);
    const questionId = stableId("q", question.id);
    const official = answerSituation(question);
    const answer = correctAnswer(question);
    const officialLanguage = languageFor(question);
    const day = dayLabel(question.day);

    subjects.set(subjectSlug, {
      id: subjectId,
      name: subjectName,
      slug: subjectSlug,
      description: `Questoes oficiais de ${subjectName} no ENEM.`,
    });
    topics.set(topicSlug, {
      id: topicId,
      subjectId,
      subjectSlug,
      name: topicName,
      slug: topicSlug,
    });

    const copiedFacsimiles = [];
    for (const [index, asset] of facsimiles.entries()) {
      const copied = await copyFacsimile(asset, [
        "enem",
        String(question.year),
        `dia-${question.day}`,
        question.corpusId,
        question.id,
        `enunciado-facsimile-${String(index + 1).padStart(2, "0")}.png`,
      ]);
      copiedFacsimiles.push({ asset, ...copied });
    }

    const alternativeRows = LETTERS.map((key, order) => {
      const source = question.alternatives?.find((alternative) => alternative.key === key);
      const firstRegion = source?.sourceRegions?.[0];
      return {
        id: stableId("qa", `${questionId}:${key}`),
        questionId,
        key,
        text: source?.text?.trim() || `Alternativa ${key}`,
        imageUrl: null,
        explanation:
          official === "ANNULLED"
            ? "Questao anulada no gabarito oficial."
            : key === answer
              ? "Alternativa indicada pelo gabarito oficial do Inep."
              : "Alternativa diferente da resposta oficial do Inep.",
        correct: official === "CONFIRMED" && key === answer,
        order,
        sourcePdfPage: firstRegion?.sourcePdfPage ?? null,
        ...regionFields(firstRegion?.sourceRegion),
        confidence: source?.confidence ?? null,
      };
    });

    const imageRows = copiedFacsimiles.map((item, index) => ({
      id: stableId("qi", `${questionId}:${index}`),
      questionId,
      url: item.url,
      description: "Recorte oficial da questao no caderno do Inep.",
      altText:
        item.asset.altText ??
        `Print oficial da questao ${question.officialNumber} do ENEM ${question.year}`,
      order: index,
      width: item.asset.width ?? null,
      height: item.asset.height ?? null,
      storagePath: item.storagePath,
      sha256Hash: item.asset.sha256 ?? null,
      sourcePdfPage: item.asset.sourcePdfPage ?? null,
      ...regionFields(item.asset.sourceRegion),
    }));

    const publicImages = imageRows.map((image) => ({
      url: image.url,
      altText: image.altText,
      description: image.description,
      order: image.order,
      width: image.width,
      height: image.height,
      assetType: "PROMPT_FACSIMILE",
      relation: "STATEMENT",
      storagePath: image.storagePath,
      sha256Hash: image.sha256Hash,
    }));

    questions.push({
      id: questionId,
      vestibularSlug: "enem",
      subjectId,
      subjectSlug,
      topicId,
      topicSlug,
      year: question.year,
      exam: `ENEM ${question.year}`,
      phase: question.application ?? "regular",
      day,
      questionNumber: question.officialNumber,
      difficulty: difficultyFor(question),
      statement: questionStatement(question),
      supportText: question.supportText?.trim() || null,
      alternatives: alternativeRows.map(({ key, text, imageUrl }) => ({ key, text, imageUrl })),
      alternativeExplanations: Object.fromEntries(
        alternativeRows.map((alternative) => [alternative.key, alternative.explanation]),
      ),
      correctAlternative: answer,
      explanation: [
        "Gabarito oficial vinculado ao documento do Inep.",
        `Questao ${question.officialNumber}, ENEM ${question.year}, ${day}, caderno ${question.bookletColor ?? "oficial"}.`,
        `Resposta oficial: ${answer}.`,
        "O enunciado foi publicado como recorte oficial da prova para preservar a diagramacao original.",
      ].join("\n"),
      pedagogyComment: "Questao oficial do ENEM publicada por print do caderno do Inep.",
      skill: question.area ?? "Questao oficial ENEM",
      imageUrl: publicImages[0]?.url ?? null,
      images: publicImages,
      tags: [
        "ENEM",
        String(question.year),
        day,
        question.area ?? subjectName,
        question.bookletColor ?? "caderno oficial",
        "print oficial",
      ],
      source: "Inep",
      sourceName: "Instituto Nacional de Estudos e Pesquisas Educacionais Anisio Teixeira",
      sourceUrl: question.source?.officialExamUrl ?? question.source?.sourcePageUrl ?? null,
      sourceCitation: `ENEM ${question.year}, ${day}, caderno ${question.bookletColor ?? "oficial"}, questao ${question.officialNumber}.`,
      answerSituation: official,
      officialLanguage,
      officialGroup: question.variantGroupId ?? null,
      officialVariant: question.language,
      reviewNotes: "Publicado por importacao de prints oficiais com gabarito oficial Inep.",
      contentHash: sha256(`enem-print:${question.id}`),
    });

    alternatives.push(...alternativeRows);
    images.push(...imageRows);
    metadata.push({
      id: stableId("qpm", questionId),
      questionId,
      knowledgeArea: question.area ?? subjectName,
      disciplinaryComponent: subjectName,
      concepts: [topicName],
      keywords: ["ENEM", String(question.year), subjectName],
      estimatedMinutes: Math.max(1, Math.round((question.estimatedTimeSeconds ?? 180) / 60)),
      provenance: { corpusId: question.corpusId, sourceId: question.id },
    });
  }

  return {
    subjects: [...subjects.values()],
    topics: [...topics.values()],
    questions,
    alternatives,
    images,
    metadata,
  };
}

function values(rows, mapper) {
  return rows.map((row) => `  (${mapper(row).join(", ")})`).join(",\n");
}

function buildBatchSql(rows) {
  const questionIds = rows.questions.map((question) => sql(question.id)).join(", ");
  return [
    "begin;",
    `insert into "Vestibular" ("id", "name", "slug", "color", "description", "createdAt", "updatedAt")
values ('vest_enem', 'ENEM', 'enem', '#1E73FF', 'Exame Nacional do Ensino Medio.', now(), now())
on conflict ("slug") do update set "name" = excluded."name", "color" = excluded."color", "description" = excluded."description", "updatedAt" = now();`,
    rows.subjects.length
      ? `insert into "Subject" ("id", "name", "slug", "color", "description", "createdAt", "updatedAt")
values
${values(rows.subjects, (row) => [
  sql(row.id),
  sql(row.name),
  sql(row.slug),
  "'#2563EB'",
  sql(row.description),
  "now()",
  "now()",
])}
on conflict ("slug") do update set "name" = excluded."name", "description" = excluded."description", "updatedAt" = now();`
      : "",
    rows.topics.length
      ? `insert into "Topic" ("id", "subjectId", "name", "slug", "createdAt", "updatedAt")
values
${values(rows.topics, (row) => [
  sql(row.id),
  `(select "id" from "Subject" where "slug" = ${sql(row.subjectSlug)})`,
  sql(row.name),
  sql(row.slug),
  "now()",
  "now()",
])}
on conflict ("slug") do update set "subjectId" = excluded."subjectId", "name" = excluded."name", "updatedAt" = now();`
      : "",
    rows.questions.length
      ? `insert into "Question" ("id", "vestibularId", "subjectId", "topicId", "year", "exam", "phase", "day", "questionNumber", "difficulty", "statement", "supportText", "alternatives", "alternativeExplanations", "correctAlternative", "explanation", "pedagogyComment", "skill", "imageUrl", "images", "tags", "source", "sourceName", "sourceUrl", "sourceCitation", "sourceType", "answerSituation", "officialLanguage", "officialGroup", "officialVariant", "reviewState", "reviewNotes", "contentHash", "status", "createdAt", "updatedAt")
values
${values(rows.questions, (row) => [
  sql(row.id),
  `(select "id" from "Vestibular" where "slug" = 'enem')`,
  `(select "id" from "Subject" where "slug" = ${sql(row.subjectSlug)})`,
  `(select "id" from "Topic" where "slug" = ${sql(row.topicSlug)})`,
  sqlNumber(row.year),
  sql(row.exam),
  sql(row.phase),
  sql(row.day),
  sqlNumber(row.questionNumber),
  sql(row.difficulty),
  sql(row.statement),
  sql(row.supportText),
  sqlJson(row.alternatives),
  sqlJson(row.alternativeExplanations),
  sql(row.correctAlternative),
  sql(row.explanation),
  sql(row.pedagogyComment),
  sql(row.skill),
  sql(row.imageUrl),
  sqlJson(row.images),
  sqlJson(row.tags),
  sql(row.source),
  sql(row.sourceName),
  sql(row.sourceUrl),
  sql(row.sourceCitation),
  "'OFFICIAL'",
  sql(row.answerSituation),
  sql(row.officialLanguage),
  sql(row.officialGroup),
  sql(row.officialVariant),
  "'APPROVED'",
  sql(row.reviewNotes),
  sql(row.contentHash),
  "'PUBLISHED'",
  "now()",
  "now()",
])}
on conflict ("id") do update set
  "vestibularId" = excluded."vestibularId",
  "subjectId" = excluded."subjectId",
  "topicId" = excluded."topicId",
  "year" = excluded."year",
  "exam" = excluded."exam",
  "phase" = excluded."phase",
  "day" = excluded."day",
  "questionNumber" = excluded."questionNumber",
  "difficulty" = excluded."difficulty",
  "statement" = excluded."statement",
  "supportText" = excluded."supportText",
  "alternatives" = excluded."alternatives",
  "alternativeExplanations" = excluded."alternativeExplanations",
  "correctAlternative" = excluded."correctAlternative",
  "explanation" = excluded."explanation",
  "pedagogyComment" = excluded."pedagogyComment",
  "skill" = excluded."skill",
  "imageUrl" = excluded."imageUrl",
  "images" = excluded."images",
  "tags" = excluded."tags",
  "source" = excluded."source",
  "sourceName" = excluded."sourceName",
  "sourceUrl" = excluded."sourceUrl",
  "sourceCitation" = excluded."sourceCitation",
  "sourceType" = excluded."sourceType",
  "answerSituation" = excluded."answerSituation",
  "officialLanguage" = excluded."officialLanguage",
  "officialGroup" = excluded."officialGroup",
  "officialVariant" = excluded."officialVariant",
  "reviewState" = excluded."reviewState",
  "reviewNotes" = excluded."reviewNotes",
  "contentHash" = excluded."contentHash",
  "status" = excluded."status",
  "updatedAt" = now();`
      : "",
    questionIds ? `delete from "QuestionAlternative" where "questionId" in (${questionIds});` : "",
    questionIds ? `delete from "QuestionImage" where "questionId" in (${questionIds});` : "",
    questionIds ? `delete from "question_pedagogical_metadata" where "question_id" in (${questionIds});` : "",
    rows.alternatives.length
      ? `insert into "QuestionAlternative" ("id", "questionId", "key", "text", "imageUrl", "explanation", "correct", "order", "sourcePdfPage", "regionX", "regionY", "regionWidth", "regionHeight", "normalizedX", "normalizedY", "normalizedWidth", "normalizedHeight", "confidence", "createdAt", "updatedAt")
values
${values(rows.alternatives, (row) => [
  sql(row.id),
  sql(row.questionId),
  sql(row.key),
  sql(row.text),
  sql(row.imageUrl),
  sql(row.explanation),
  row.correct ? "true" : "false",
  sqlNumber(row.order),
  sqlNumber(row.sourcePdfPage),
  sqlNumber(row.regionX),
  sqlNumber(row.regionY),
  sqlNumber(row.regionWidth),
  sqlNumber(row.regionHeight),
  sqlNumber(row.normalizedX),
  sqlNumber(row.normalizedY),
  sqlNumber(row.normalizedWidth),
  sqlNumber(row.normalizedHeight),
  sqlNumber(row.confidence),
  "now()",
  "now()",
])};`
      : "",
    rows.images.length
      ? `insert into "QuestionImage" ("id", "questionId", "url", "description", "altText", "order", "width", "height", "assetType", "relation", "storagePath", "mimeType", "sha256Hash", "sourcePdfPage", "regionX", "regionY", "regionWidth", "regionHeight", "normalizedX", "normalizedY", "normalizedWidth", "normalizedHeight", "createdAt", "updatedAt")
values
${values(rows.images, (row) => [
  sql(row.id),
  sql(row.questionId),
  sql(row.url),
  sql(row.description),
  sql(row.altText),
  sqlNumber(row.order),
  sqlNumber(row.width),
  sqlNumber(row.height),
  "'PROMPT_FACSIMILE'",
  "'STATEMENT'",
  sql(row.storagePath),
  "'image/png'",
  sql(row.sha256Hash),
  sqlNumber(row.sourcePdfPage),
  sqlNumber(row.regionX),
  sqlNumber(row.regionY),
  sqlNumber(row.regionWidth),
  sqlNumber(row.regionHeight),
  sqlNumber(row.normalizedX),
  sqlNumber(row.normalizedY),
  sqlNumber(row.normalizedWidth),
  sqlNumber(row.normalizedHeight),
  "now()",
  "now()",
])};`
      : "",
    rows.metadata.length
      ? `insert into "question_pedagogical_metadata" ("id", "question_id", "knowledge_area", "disciplinary_component", "concepts", "keywords", "estimated_minutes", "classification_source", "classification_confidence", "review_status", "reviewed_by", "reviewed_at", "provenance", "created_at", "updated_at")
values
${values(rows.metadata, (row) => [
  sql(row.id),
  sql(row.questionId),
  sql(row.knowledgeArea),
  sql(row.disciplinaryComponent),
  sqlJsonb(row.concepts),
  sqlJsonb(row.keywords),
  sqlNumber(row.estimatedMinutes),
  "'screenshot-sql-importer'",
  "0.75",
  "'APPROVED'",
  "'screenshot-sql-importer'",
  "now()",
  sqlJsonb(row.provenance),
  "now()",
  "now()",
])}
on conflict ("question_id") do update set
  "knowledge_area" = excluded."knowledge_area",
  "disciplinary_component" = excluded."disciplinary_component",
  "concepts" = excluded."concepts",
  "keywords" = excluded."keywords",
  "estimated_minutes" = excluded."estimated_minutes",
  "classification_source" = excluded."classification_source",
  "classification_confidence" = excluded."classification_confidence",
  "review_status" = excluded."review_status",
  "reviewed_by" = excluded."reviewed_by",
  "reviewed_at" = excluded."reviewed_at",
  "provenance" = excluded."provenance",
  "updated_at" = now();`
      : "",
    "commit;",
    "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function main() {
  const root = await questionRoot(argument("--root", DEFAULT_ROOT));
  const outputDir = path.resolve(argument("--output", DEFAULT_OUTPUT));
  const batchSize = Number(argument("--batch-size", "50"));
  const requested = positionalArguments();
  await mkdir(outputDir, { recursive: true });

  const { questions, skipped } = await readQuestions(root, requested);
  const batches = chunk(questions, Number.isInteger(batchSize) && batchSize > 0 ? batchSize : 50);
  const files = [];

  for (const [index, batch] of batches.entries()) {
    const rows = await prepareRows(batch);
    const filePath = path.join(outputDir, `enem-production-import-${String(index + 1).padStart(3, "0")}.sql`);
    await writeFile(filePath, buildBatchSql(rows), "utf8");
    files.push({ filePath, questions: rows.questions.length, images: rows.images.length });
  }

  const summary = {
    root,
    outputDir,
    batches: files.length,
    questions: questions.length,
    skipped: skipped.length,
    skippedPreview: skipped.slice(0, 20),
    files,
  };
  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...summary, files: files.slice(0, 5) }, null, 2));

  if (has("--execute")) {
    for (const [index, file] of files.entries()) {
      console.log(JSON.stringify({ executing: index + 1, total: files.length, file: file.filePath }));
      const result = spawnSync(
        "npx",
        ["supabase", "db", "query", "--linked", "--log-level", "fatal", "--file", file.filePath],
        { stdio: "inherit", shell: process.platform === "win32" },
      );
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
