import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  ContentStatus,
  Difficulty,
  OfficialQuestionLanguage,
  Prisma,
  PrismaClient,
  QuestionAnswerSituation,
  QuestionAssetRelation,
  QuestionAssetType,
  QuestionReviewState,
  QuestionSourceType,
} from "@prisma/client";
import { slugify } from "./question-bank-core";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

type BankIndexQuestion = {
  id: string;
  year: number;
  day: number;
  number: number;
  foreignLanguage?: string | null;
  area: string;
  path: string;
  validationStatus: string;
  correctAlternative?: string | null;
  answerStatus: string;
  assetCount: number;
};

type RawQuestion = {
  id: string;
  occurrenceId?: string;
  exam: {
    name: string;
    year: number;
    application: string;
    day: number;
    booklet: string;
    bookletNumber: number;
    bookletCode?: string | null;
  };
  number: number;
  foreignLanguage?: string | null;
  area: string;
  metadata?: {
    subject?: string | null;
    topic?: string | null;
    subtopic?: string | null;
    difficulty?: string | null;
  };
  statement: {
    text?: string | null;
    rawExtractedText?: string | null;
    blocks?: Array<{ type?: string; content?: string; src?: string }>;
  };
  assets?: Array<{
    id?: string;
    type?: string;
    path: string;
    position?: string;
    sourcePage?: number;
    mergedParts?: number;
  }>;
  alternatives: Array<{
    letter: string;
    text?: string | null;
    images?: string[];
  }>;
  answer: {
    correctAlternative?: string | null;
    status: string;
    source?: string;
  };
  source: {
    examPdf?: string;
    pages?: number[];
    answerKeyPdf?: string;
    answerKeyPages?: number[];
    sourceType?: string;
  };
  validation: {
    status: string;
    textConfidence?: number;
    alternativesConfidence?: number;
    answerConfidence?: number;
    assetsConfidence?: number;
    requiresManualReview?: boolean;
    warnings?: string[];
  };
  visualAssets?: string[];
  audit?: { sourceQuestion?: string | null };
};

type PreparedQuestion = {
  question: Prisma.QuestionCreateManyInput;
  alternatives: Prisma.QuestionAlternativeCreateManyInput[];
  images: Prisma.QuestionImageCreateManyInput[];
  metadata: Prisma.QuestionPedagogicalMetadataCreateManyInput;
  oldExamLink: Prisma.ProvaAntigaQuestaoCreateManyInput;
  group: { year: number; day: number; assetCount: number; reviewRequired: boolean };
};

const DEFAULT_SOURCE_DIR = path.resolve("data/import/enem-question-bank-2018-2025");
const STORAGE_RELATIVE_ROOT = "enem-question-bank-2018-2025";
const STORAGE_ROOT = path.resolve("storage", "questoes", STORAGE_RELATIVE_ROOT);
const OUTPUT_DIR = path.resolve("scripts/import/output");
const SOURCE_URL_BASE =
  "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos";
const LETTERS = ["A", "B", "C", "D", "E"] as const;

function arg(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function has(name: string) {
  return process.argv.includes(name);
}

function ordinalDay(day: number) {
  return `${day}\u00ba dia`;
}

function sourceUrlForYear(year: number) {
  return `${SOURCE_URL_BASE}/${year}`;
}

function sha256Text(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForComparison(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function statementText(raw: RawQuestion) {
  return (
    normalizeText(raw.statement.text ?? raw.statement.rawExtractedText) ||
    `Questao ${raw.number} do ENEM ${raw.exam.year}. Consulte o fac-simile oficial para o enunciado.`
  );
}

function mentionsVisualElement(raw: RawQuestion) {
  return /\b(grafico|tabela|figura|charge|tirinha|diagrama|ilustracao|mapa|cartum|imagem|foto|esquema)\b/i.test(
    normalizeForComparison(`${raw.statement.text ?? ""} ${raw.statement.rawExtractedText ?? ""}`),
  );
}

function hasDuplicateOrEmptyAlternatives(raw: RawQuestion) {
  const normalized = raw.alternatives.map((item) => normalizeForComparison(item.text));
  return normalized.some((item) => !item) || new Set(normalized).size !== normalized.length;
}

function hasUnreliableAlternativeText(raw: RawQuestion) {
  return (
    hasDuplicateOrEmptyAlternatives(raw) ||
    (raw.validation.warnings ?? []).some((warning) =>
      /corrupted|ocr_.*alternative|alternatives.*manual|visual_verification/i.test(warning),
    )
  );
}

function cleanPathSegment(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || randomUUID();
}

function safeAssetRelativePath(...segments: string[]) {
  return segments.map(cleanPathSegment).join("/");
}

function mimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return null;
}

function difficultyFor(raw: RawQuestion) {
  const value = slugify(raw.metadata?.difficulty ?? "");
  if (["easy", "facil"].includes(value)) return Difficulty.EASY;
  if (["hard", "dificil"].includes(value)) return Difficulty.HARD;
  const length = normalizeText(raw.statement.text ?? raw.statement.rawExtractedText).length;
  const assetCount = (raw.assets?.length ?? 0) + (raw.visualAssets?.length ?? 0);
  if (length < 550 && assetCount === 0) return Difficulty.EASY;
  if (length > 1400 || assetCount >= 2 || raw.validation.requiresManualReview) return Difficulty.HARD;
  return Difficulty.MEDIUM;
}

function languageOf(raw: RawQuestion) {
  const value = slugify(raw.foreignLanguage ?? "");
  if (value === "english" || value === "ingles") return OfficialQuestionLanguage.ENGLISH;
  if (value === "spanish" || value === "espanhol") return OfficialQuestionLanguage.SPANISH;
  return OfficialQuestionLanguage.NOT_APPLICABLE;
}

function subjectFor(raw: RawQuestion) {
  const language = languageOf(raw);
  if (language === OfficialQuestionLanguage.ENGLISH) return "Ingl\u00eas";
  if (language === OfficialQuestionLanguage.SPANISH) return "Espanhol";
  if (/natureza/i.test(raw.area)) return "Ci\u00eancias da Natureza";
  if (/humanas/i.test(raw.area)) return "Ci\u00eancias Humanas";
  if (/matem/i.test(raw.area)) return "Matem\u00e1tica";
  if (/linguagens/i.test(raw.area)) return "Linguagens";
  return normalizeText(raw.metadata?.subject) || "A classificar";
}

function topicFor(raw: RawQuestion, subjectName: string) {
  return (
    normalizeText(raw.metadata?.topic) ||
    normalizeText(raw.metadata?.subtopic) ||
    `${subjectName} no ENEM`
  );
}

function answerSituation(raw: RawQuestion) {
  return raw.answer.status === "annulled"
    ? QuestionAnswerSituation.ANNULLED
    : QuestionAnswerSituation.CONFIRMED;
}

function correctAlternative(raw: RawQuestion) {
  return answerSituation(raw) === QuestionAnswerSituation.ANNULLED
    ? "ANULADA"
    : normalizeText(raw.answer.correctAlternative).toUpperCase().slice(0, 1);
}

function contentHash(raw: RawQuestion, alternatives: Array<{ key: string; text: string; imageUrl?: string | null }>) {
  return sha256Text(
    JSON.stringify({
      id: raw.id,
      year: raw.exam.year,
      day: raw.exam.day,
      number: raw.number,
      language: raw.foreignLanguage ?? null,
      statement: statementText(raw),
      alternatives,
      answer: raw.answer,
    }),
  );
}

function genericExplanation(raw: RawQuestion, answer: string) {
  if (answerSituation(raw) === QuestionAnswerSituation.ANNULLED) {
    return "Questao anulada pelo gabarito oficial do ENEM. A alternativa escolhida fica registrada apenas para estudo e nao recebe pontuacao.";
  }
  return [
    `Gabarito oficial do ENEM ${raw.exam.year}, ${ordinalDay(raw.exam.day)}: alternativa ${answer}.`,
    "O item foi importado do banco estruturado fornecido com associacao ao gabarito oficial.",
    "A resolucao detalhada pode ser enriquecida posteriormente na curadoria pedagogica.",
  ].join(" ");
}

function alternativeExplanations(raw: RawQuestion, answer: string) {
  return Object.fromEntries(
    LETTERS.map((letter) => [
      letter,
      answerSituation(raw) === QuestionAnswerSituation.ANNULLED
        ? "Questao anulada pelo gabarito oficial."
        : letter === answer
          ? `Alternativa ${letter}: corresponde ao gabarito oficial.`
          : `Alternativa ${letter}: nao corresponde ao gabarito oficial, que indica ${answer}.`,
    ]),
  );
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function copyAsset(sourcePath: string, relativeAssetPath: string, copied: Set<string>) {
  const target = path.resolve(STORAGE_ROOT, relativeAssetPath);
  const allowedPrefix = `${STORAGE_ROOT}${path.sep}`;
  if (!target.startsWith(allowedPrefix)) throw new Error(`Caminho de asset invalido: ${relativeAssetPath}`);
  if (!copied.has(relativeAssetPath)) {
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(sourcePath, target);
    copied.add(relativeAssetPath);
  }
  return {
    url: `/api/questions/assets/${STORAGE_RELATIVE_ROOT}/${relativeAssetPath.replaceAll("\\", "/")}`,
    storagePath: `storage/questoes/${STORAGE_RELATIVE_ROOT}/${relativeAssetPath.replaceAll("\\", "/")}`,
    mimeType: mimeType(target),
    sha256Hash: sha256Text(await readFile(target)),
  };
}

function sourcePagePath(sourceDir: string, raw: RawQuestion, page: number) {
  return path.join(sourceDir, "source-pages", String(raw.exam.year), `dia-${raw.exam.day}`, `pdf-page-${page}.jpeg`);
}

async function prepareAssets(input: {
  raw: RawQuestion;
  questionDir: string;
  sourceDir: string;
  copied: Set<string>;
}) {
  const { raw, questionDir, sourceDir, copied } = input;
  const questionId = cleanPathSegment(raw.id);
  const base = safeAssetRelativePath(String(raw.exam.year), `dia-${raw.exam.day}`, questionId);
  const images: Prisma.QuestionImageCreateManyInput[] = [];
  const visibleImages: Array<{
    url: string;
    altText: string;
    description: string;
    order: number;
    assetType: QuestionAssetType;
    relation: QuestionAssetRelation;
  }> = [];
  const alternativeImageUrls = new Map<string, string>();
  let order = 0;
  const shouldUsePromptFacsimile =
    raw.validation.status !== "validated" ||
    raw.validation.requiresManualReview === true ||
    raw.alternatives.some((item) => !normalizeText(item.text) || (item.images?.length ?? 0) > 0) ||
    hasUnreliableAlternativeText(raw) ||
    (!(raw.assets?.length ?? 0) && mentionsVisualElement(raw));

  const addImage = async (inputImage: {
    filePath: string;
    fileName: string;
    assetType: QuestionAssetType;
    relation: QuestionAssetRelation;
    alternativeKey?: string | null;
    description: string;
    sourcePdfPage?: number | null;
    visible: boolean;
    sharedRelativePath?: string;
  }) => {
    const relativeAssetPath =
      inputImage.sharedRelativePath ??
      safeAssetRelativePath(base, `${String(order + 1).padStart(3, "0")}-${inputImage.fileName}`);
    const copiedAsset = await copyAsset(inputImage.filePath, relativeAssetPath, copied);
    const row: Prisma.QuestionImageCreateManyInput = {
      id: randomUUID(),
      questionId: raw.id,
      url: copiedAsset.url,
      description: inputImage.description,
      altText: inputImage.description,
      order,
      assetType: inputImage.assetType,
      relation: inputImage.relation,
      alternativeKey: inputImage.alternativeKey ?? null,
      storagePath: copiedAsset.storagePath,
      mimeType: copiedAsset.mimeType,
      sha256Hash: copiedAsset.sha256Hash,
      sourcePdfPage: inputImage.sourcePdfPage ?? null,
      consolidatedPdfPage: inputImage.sourcePdfPage ?? null,
    };
    images.push(row);
    if (inputImage.visible) {
      visibleImages.push({
        url: copiedAsset.url,
        altText: inputImage.description,
        description: inputImage.description,
        order,
        assetType: inputImage.assetType,
        relation: inputImage.relation,
      });
    }
    if (inputImage.relation === QuestionAssetRelation.ALTERNATIVE && inputImage.alternativeKey) {
      alternativeImageUrls.set(inputImage.alternativeKey, copiedAsset.url);
    }
    order += 1;
  };

  if (shouldUsePromptFacsimile && raw.audit?.sourceQuestion) {
    const filePath = path.join(questionDir, raw.audit.sourceQuestion);
    await addImage({
      filePath,
      fileName: `prompt-${path.basename(raw.audit.sourceQuestion)}`,
      assetType: QuestionAssetType.PROMPT_FACSIMILE,
      relation: QuestionAssetRelation.STATEMENT,
      description: `Recorte oficial da questao ${raw.number}.`,
      sourcePdfPage: raw.source.pages?.[0] ?? null,
      visible: true,
    });
  } else if (shouldUsePromptFacsimile) {
    for (const page of raw.source.pages ?? []) {
      const filePath = sourcePagePath(sourceDir, raw, page);
      await addImage({
        filePath,
        fileName: `prompt-pdf-page-${page}.jpeg`,
        assetType: QuestionAssetType.PROMPT_FACSIMILE,
        relation: QuestionAssetRelation.STATEMENT,
        description: `Pagina oficial da questao ${raw.number}.`,
        sourcePdfPage: page,
        visible: true,
        sharedRelativePath: safeAssetRelativePath(
          "source-pages",
          String(raw.exam.year),
          `dia-${raw.exam.day}`,
          `pdf-page-${page}.jpeg`,
        ),
      });
    }
  }

  for (const asset of raw.assets ?? []) {
    const filePath = path.join(questionDir, asset.path);
    await addImage({
      filePath,
      fileName: path.basename(asset.path),
      assetType: QuestionAssetType.VISUAL,
      relation: QuestionAssetRelation.STATEMENT,
      description: `Imagem oficial da questao ${raw.number}.`,
      sourcePdfPage: asset.sourcePage ?? raw.source.pages?.[0] ?? null,
      visible: !shouldUsePromptFacsimile,
    });
  }

  for (const alternative of raw.alternatives) {
    for (const [index, imagePath] of (alternative.images ?? []).entries()) {
      const filePath = path.join(questionDir, imagePath);
      await addImage({
        filePath,
        fileName: `${alternative.letter.toLowerCase()}-${index + 1}-${path.basename(imagePath)}`,
        assetType: QuestionAssetType.ALTERNATIVE_VISUAL,
        relation: QuestionAssetRelation.ALTERNATIVE,
        alternativeKey: alternative.letter,
        description: `Imagem oficial da alternativa ${alternative.letter}.`,
        sourcePdfPage: raw.source.pages?.[0] ?? null,
        visible: false,
      });
    }
  }

  return { imageRows: images, visibleImages, alternativeImageUrls };
}

function reviewNotes(raw: RawQuestion) {
  const warnings = raw.validation.warnings ?? [];
  if (raw.validation.status === "validated" && !warnings.length) {
    return "Importado do banco ENEM 2018-2025 com validacao automatica.";
  }
  return [
    "Importado do banco ENEM 2018-2025 com alerta de revisao visual.",
    warnings.length ? `Alertas: ${warnings.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

async function prepareQuestion(input: {
  sourceDir: string;
  indexDir: string;
  item: BankIndexQuestion;
  vestibularId: string;
  subjectId: string;
  topicId: string;
  copied: Set<string>;
}) {
  const { sourceDir, indexDir, item, vestibularId, subjectId, topicId, copied } = input;
  const questionPath = path.resolve(indexDir, item.path);
  const questionDir = path.dirname(questionPath);
  const raw = await readJson<RawQuestion>(questionPath);
  if (raw.id !== item.id) throw new Error(`ID divergente em ${questionPath}: ${raw.id} != ${item.id}`);
  const language = languageOf(raw);
  const situation = answerSituation(raw);
  const answer = correctAlternative(raw);
  if (situation === QuestionAnswerSituation.CONFIRMED && !LETTERS.includes(answer as (typeof LETTERS)[number])) {
    throw new Error(`${raw.id}: gabarito invalido.`);
  }
  const preparedAssets = await prepareAssets({ raw, questionDir, sourceDir, copied });
  const normalizedAlternatives = raw.alternatives.map((alternative, index) => {
    const key = normalizeText(alternative.letter).toUpperCase().slice(0, 1) || LETTERS[index];
    const usePlaceholder = hasUnreliableAlternativeText(raw);
    const text =
      usePlaceholder
        ? `Alternativa ${key} indicada no fac-simile oficial da questao.`
        : normalizeText(alternative.text) ||
      `Alternativa ${key} indicada no fac-simile oficial da questao.`;
    return {
      key,
      text,
      imageUrl: preparedAssets.alternativeImageUrls.get(key) ?? null,
    };
  });
  const hash = contentHash(raw, normalizedAlternatives);
  const explanation = genericExplanation(raw, answer);
  const altExplanations = alternativeExplanations(raw, answer);
  const variant = language === OfficialQuestionLanguage.NOT_APPLICABLE ? null : language;
  const officialGroup = variant ? `enem-${raw.exam.year}-d${raw.exam.day}-q${String(raw.number).padStart(3, "0")}-lingua` : null;
  const sourcePdfPage = raw.source.pages?.[0] ?? 1;
  const sourceUrl = `${sourceUrlForYear(raw.exam.year)}#page=${sourcePdfPage}`;
  const tags = [
    "ENEM",
    "oficial",
    String(raw.exam.year),
    `${raw.exam.day}-dia`,
    `caderno-${raw.exam.bookletNumber}-${raw.exam.booklet}`,
    slugify(raw.area),
    variant === OfficialQuestionLanguage.ENGLISH ? "ingles" : null,
    variant === OfficialQuestionLanguage.SPANISH ? "espanhol" : null,
    raw.validation.status === "validated" ? "validado" : "revisao-visual",
    situation === QuestionAnswerSituation.ANNULLED ? "anulada" : null,
  ].filter(Boolean);

  const question: Prisma.QuestionCreateManyInput = {
    id: raw.id,
    vestibularId,
    subjectId,
    topicId,
    year: raw.exam.year,
    exam: `ENEM ${raw.exam.year} - ${ordinalDay(raw.exam.day)} - Caderno ${raw.exam.bookletNumber} ${raw.exam.booklet}`,
    phase: raw.exam.application,
    day: ordinalDay(raw.exam.day),
    questionNumber: raw.number,
    difficulty: difficultyFor(raw),
    statement: statementText(raw),
    supportText: null,
    alternatives: JSON.stringify(normalizedAlternatives),
    alternativeExplanations: JSON.stringify(altExplanations),
    correctAlternative: answer,
    explanation,
    pedagogyComment:
      raw.validation.status === "validated"
        ? "Questao oficial importada com estrutura validada automaticamente pelo pacote de origem."
        : "Questao oficial importada com fac-simile para revisao visual por causa de alerta do pacote de origem.",
    skill: raw.area,
    imageUrl: preparedAssets.visibleImages[0]?.url ?? null,
    images: JSON.stringify(preparedAssets.visibleImages),
    tags: JSON.stringify(tags),
    source: "INEP/gov.br",
    sourceName: `INEP - ENEM ${raw.exam.year}`,
    sourceUrl,
    sourceCitation: `${raw.source.examPdf ?? "PDF oficial"}; paginas ${raw.source.pages?.join(", ") ?? "n/d"}. Gabarito: ${raw.source.answerKeyPdf ?? "PDF oficial"}.`,
    sourceAccessedAt: "2026-08-22",
    sourceType: QuestionSourceType.OFFICIAL,
    answerSituation: situation,
    officialLanguage: language,
    officialGroup,
    officialVariant: variant,
    reviewState: QuestionReviewState.APPROVED,
    reviewNotes: reviewNotes(raw),
    contentHash: hash,
    status: ContentStatus.PUBLISHED,
    pilotTestPublishedAt: new Date(),
  };

  const alternatives = normalizedAlternatives.map((alternative, index) => ({
    id: randomUUID(),
    questionId: raw.id,
    key: alternative.key,
    text: alternative.text,
    imageUrl: alternative.imageUrl,
    explanation: altExplanations[alternative.key] ?? null,
    correct: situation === QuestionAnswerSituation.CONFIRMED && alternative.key === answer,
    order: index,
    sourcePdfPage,
    consolidatedPdfPage: sourcePdfPage,
  }));

  const metadata: Prisma.QuestionPedagogicalMetadataCreateManyInput = {
    id: randomUUID(),
    questionId: raw.id,
    knowledgeArea: raw.area,
    disciplinaryComponent: subjectFor(raw),
    keywords: [raw.area, subjectFor(raw), `ENEM ${raw.exam.year}`],
    classificationSource: "enem-question-bank-2018-2025",
    classificationConfidence: raw.validation.status === "validated" ? 1 : 0.7,
    reviewStatus: QuestionReviewState.APPROVED,
    reviewNotes: reviewNotes(raw),
    reviewedBy: "import-enem-zip-bank",
    reviewedAt: new Date(),
    provenance: {
      sourceQuestionId: raw.id,
      validation: raw.validation,
      source: raw.source,
    },
  };

  const oldExamLink: Prisma.ProvaAntigaQuestaoCreateManyInput = {
    id: randomUUID(),
    provaAntigaId: `pa-enem-${raw.exam.year}-dia-${raw.exam.day}`,
    questaoId: raw.id,
    numeroQuestao: raw.number,
    officialLanguage: language,
    officialGroup,
    officialVariant: variant,
    ordem: raw.number,
    paginaPdf: sourcePdfPage,
    extractedStatement: statementText(raw).slice(0, 1000),
    extractionConfidence: raw.validation.textConfidence ?? null,
    pageStart: sourcePdfPage,
    pageEnd: raw.source.pages?.at(-1) ?? sourcePdfPage,
    hasImage: preparedAssets.imageRows.length > 0,
    needsHumanReview: raw.validation.requiresManualReview ?? raw.validation.status !== "validated",
  };

  return {
    question,
    alternatives,
    images: preparedAssets.imageRows,
    metadata,
    oldExamLink,
    group: {
      year: raw.exam.year,
      day: raw.exam.day,
      assetCount: preparedAssets.imageRows.length,
      reviewRequired: raw.validation.status !== "validated" || raw.validation.requiresManualReview === true,
    },
  } satisfies PreparedQuestion;
}

async function createManyInBatches<T>(
  label: string,
  items: T[],
  createMany: (data: T[]) => Promise<{ count: number }>,
  size = 500,
) {
  let count = 0;
  for (let index = 0; index < items.length; index += size) {
    const result = await createMany(items.slice(index, index + size));
    count += result.count;
  }
  return { label, count };
}

async function main() {
  const confirmed = has("--confirm-import");
  const sourceDir = path.resolve(arg("dir") ?? DEFAULT_SOURCE_DIR);
  const indexDir = path.join(sourceDir, "indexes");
  const questionIndexPath = path.join(indexDir, "questions.json");
  const questionsIndex = await readJson<BankIndexQuestion[]>(questionIndexPath);
  const sourceIds = new Set(questionsIndex.map((item) => item.id));
  if (sourceIds.size !== questionsIndex.length) throw new Error("O indice contem IDs duplicados.");

  const subjectNames = Array.from(
    new Set(
      await Promise.all(
        questionsIndex.map(async (item) => {
          const raw = await readJson<RawQuestion>(path.resolve(indexDir, item.path));
          return subjectFor(raw);
        }),
      ),
    ),
  );

  const dryRunSummary = {
    sourceDir,
    indexedQuestions: questionsIndex.length,
    validation: Object.fromEntries(
      Array.from(new Set(questionsIndex.map((item) => item.validationStatus))).map((status) => [
        status,
        questionsIndex.filter((item) => item.validationStatus === status).length,
      ]),
    ),
    answerStatus: Object.fromEntries(
      Array.from(new Set(questionsIndex.map((item) => item.answerStatus))).map((status) => [
        status,
        questionsIndex.filter((item) => item.answerStatus === status).length,
      ]),
    ),
    groups: Object.fromEntries(
      Array.from(new Set(questionsIndex.map((item) => `${item.year}-dia-${item.day}`))).map((key) => [
        key,
        questionsIndex.filter((item) => `${item.year}-dia-${item.day}` === key).length,
      ]),
    ),
    subjects: subjectNames,
    confirmed,
  };
  console.log(JSON.stringify(dryRunSummary, null, 2));
  if (!confirmed) {
    console.log("Dry-run concluido. Use --confirm-import para substituir as questoes ENEM atuais.");
    return;
  }

  await rm(STORAGE_ROOT, { recursive: true, force: true });
  await mkdir(STORAGE_ROOT, { recursive: true });

  const vestibular = await db.vestibular.upsert({
    where: { slug: "enem" },
    update: {
      name: "ENEM",
      color: "#1E73FF",
      description: "Exame Nacional do Ensino Medio com questoes oficiais organizadas por ano e dia.",
    },
    create: {
      name: "ENEM",
      slug: "enem",
      color: "#1E73FF",
      description: "Exame Nacional do Ensino Medio com questoes oficiais organizadas por ano e dia.",
    },
  });

  const subjectMap = new Map<string, string>();
  const topicMap = new Map<string, string>();
  for (const subjectName of subjectNames) {
    const subjectSlug = slugify(subjectName);
    const subject = await db.subject.upsert({
      where: { slug: subjectSlug },
      update: { name: subjectName },
      create: {
        name: subjectName,
        slug: subjectSlug,
        description: `Questoes de ${subjectName}.`,
      },
    });
    subjectMap.set(subjectName, subject.id);
    const topicName = `${subjectName} no ENEM`;
    const topicSlug = `${subjectSlug}-enem`;
    const topic = await db.topic.upsert({
      where: { slug: topicSlug },
      update: { name: topicName, subjectId: subject.id },
      create: { name: topicName, slug: topicSlug, subjectId: subject.id },
    });
    topicMap.set(topicName, topic.id);
  }

  const copied = new Set<string>();
  const prepared: PreparedQuestion[] = [];
  for (const item of questionsIndex) {
    const raw = await readJson<RawQuestion>(path.resolve(indexDir, item.path));
    const subjectName = subjectFor(raw);
    const topicName = topicFor(raw, subjectName);
    const topicSlug = `${slugify(subjectName)}-${slugify(topicName)}`;
    let topicId = topicMap.get(topicName);
    if (!topicId) {
      const subjectId = subjectMap.get(subjectName);
      if (!subjectId) throw new Error(`Materia nao encontrada: ${subjectName}`);
      const topic = await db.topic.upsert({
        where: { slug: topicSlug },
        update: { name: topicName, subjectId },
        create: { name: topicName, slug: topicSlug, subjectId },
      });
      topicId = topic.id;
      topicMap.set(topicName, topic.id);
    }
    prepared.push(
      await prepareQuestion({
        sourceDir,
        indexDir,
        item,
        vestibularId: vestibular.id,
        subjectId: subjectMap.get(subjectName)!,
        topicId,
        copied,
      }),
    );
    if (prepared.length % 100 === 0) {
      console.log(JSON.stringify({ prepared: prepared.length, total: questionsIndex.length }));
    }
  }

  const contentHashes = prepared.map((item) => item.question.contentHash).filter(Boolean);
  if (new Set(contentHashes).size !== contentHashes.length) throw new Error("Hashes de conteudo duplicados.");

  const before = await db.question.count({ where: { vestibularId: vestibular.id } });
  const relationCountsBefore = {
    attempts: await db.questionAttempt.count({ where: { question: { vestibularId: vestibular.id } } }),
    oldExamLinks: await db.provaAntigaQuestao.count({ where: { questao: { vestibularId: vestibular.id } } }),
  };
  const groups = new Map<string, PreparedQuestion[]>();
  for (const item of prepared) {
    const key = `${item.group.year}:${item.group.day}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const now = new Date();
  const result = await db.$transaction(
    async (tx) => {
      const deleted = await tx.question.deleteMany({ where: { vestibularId: vestibular.id } });

      for (const [key, items] of groups) {
        const [yearText, dayText] = key.split(":");
        const year = Number(yearText);
        const day = Number(dayText);
        const reviewRequired = items.filter((item) => item.group.reviewRequired).length;
        await tx.provaAntiga.upsert({
          where: { id: `pa-enem-${year}-dia-${day}` },
          update: {
            totalQuestoes: 90,
            questoesDetectadas: items.length,
            questoesValidas: items.length,
            questoesComErro: reviewRequired,
            imagensDetectadas: items.reduce((count, item) => count + item.group.assetCount, 0),
            importacaoStatus: "IMPORTADO_BANCO_ENEM_2018_2025",
            importacaoRelatorio: JSON.stringify({
              source: "enem-question-bank-2018-2025",
              importedAt: now.toISOString(),
              occurrences: items.length,
              reviewRequired,
            }),
          },
          create: {
            id: `pa-enem-${year}-dia-${day}`,
            slug: `enem-${year}-dia-${day}`,
            vestibular: "ENEM",
            ano: year,
            titulo: `ENEM ${year} - ${ordinalDay(day)}`,
            descricao: `Aplicacao regular do ENEM ${year}, ${ordinalDay(day)}.`,
            fase: "Aplicacao regular",
            dia: ordinalDay(day),
            tipo: "OFICIAL",
            arquivoProvaUrl: `/api/provas-antigas/pa-enem-${year}-dia-${day}/arquivo?tipo=prova`,
            arquivoGabaritoUrl: `/api/provas-antigas/pa-enem-${year}-dia-${day}/arquivo?tipo=gabarito`,
            arquivoProvaPath: `data/provas/enem/${year}/prova-${day}-dia.pdf`,
            arquivoGabaritoPath: `data/provas/enem/${year}/gabarito-${day}-dia.pdf`,
            fonteOficial: "INEP/gov.br",
            fonteUrl: sourceUrlForYear(year),
            totalQuestoes: 90,
            status: "APROVADA",
            importacaoStatus: "IMPORTADO_BANCO_ENEM_2018_2025",
            importacaoRelatorio: JSON.stringify({
              source: "enem-question-bank-2018-2025",
              importedAt: now.toISOString(),
              occurrences: items.length,
              reviewRequired,
            }),
            questoesDetectadas: items.length,
            questoesValidas: items.length,
            questoesComErro: reviewRequired,
            imagensDetectadas: items.reduce((count, item) => count + item.group.assetCount, 0),
          },
        });
      }

      const questionRows = prepared.map((item) => item.question);
      const alternativeRows = prepared.flatMap((item) => item.alternatives);
      const imageRows = prepared.flatMap((item) => item.images);
      const metadataRows = prepared.map((item) => item.metadata);
      const oldExamRows = prepared.map((item) => item.oldExamLink);

      const createdQuestions = await createManyInBatches("questions", questionRows, (data) =>
        tx.question.createMany({ data, skipDuplicates: false }),
      );
      const createdAlternatives = await createManyInBatches("alternatives", alternativeRows, (data) =>
        tx.questionAlternative.createMany({ data, skipDuplicates: false }),
        1000,
      );
      const createdImages = await createManyInBatches("images", imageRows, (data) =>
        tx.questionImage.createMany({ data, skipDuplicates: false }),
        500,
      );
      const createdMetadata = await createManyInBatches("metadata", metadataRows, (data) =>
        tx.questionPedagogicalMetadata.createMany({ data, skipDuplicates: false }),
      );
      const createdOldExamLinks = await createManyInBatches("oldExamLinks", oldExamRows, (data) =>
        tx.provaAntigaQuestao.createMany({ data, skipDuplicates: false }),
      );

      return {
        deleted: deleted.count,
        createdQuestions,
        createdAlternatives,
        createdImages,
        createdMetadata,
        createdOldExamLinks,
      };
    },
    { timeout: 120_000, maxWait: 120_000 },
  );

  const after = await db.question.count({ where: { vestibularId: vestibular.id } });
  const availableOldExamGroups = await db.provaAntiga.findMany({
    where: { id: { in: Array.from(groups.keys()).map((key) => {
      const [year, day] = key.split(":");
      return `pa-enem-${year}-dia-${day}`;
    }) } },
    select: {
      id: true,
      ano: true,
      dia: true,
      questoesDetectadas: true,
      questoesValidas: true,
      questoesComErro: true,
      _count: { select: { questoes: true } },
    },
    orderBy: [{ ano: "asc" }, { dia: "asc" }],
  });
  const summary = {
    before,
    after,
    relationCountsBefore,
    assetsCopied: copied.size,
    ...result,
    oldExams: availableOldExamGroups,
  };
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUTPUT_DIR, "import-enem-zip-bank-result.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
