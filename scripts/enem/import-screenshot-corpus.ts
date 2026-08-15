import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { loadEnvConfig } from "@next/env";
import {
  ContentStatus,
  Difficulty,
  OfficialAnswerReviewStatus,
  OfficialDownloadStatus,
  OfficialFileType,
  OfficialProcessingStatus,
  OfficialQuestionLanguage,
  OfficialResolutionStatus,
  OfficialSourceKind,
  OfficialSourceStatus,
  Prisma,
  PrismaClient,
  QuestionAnswerSituation,
  QuestionAssetRelation,
  QuestionAssetType,
  QuestionReviewState,
  QuestionSourceType,
} from "@prisma/client";

loadEnvConfig(process.cwd());

const db = new PrismaClient();
const letters = ["A", "B", "C", "D", "E"] as const;
const skippedCorpusIds = new Set(["enem-2023-dia-1-caderno-1-azul"]);

type CorpusQuestion = {
  id: string;
  corpusId: string;
  pilotId?: string | null;
  oldExamId?: string | null;
  year: number;
  day: number;
  application?: string | null;
  bookletColor?: string | null;
  officialNumber: number;
  officialOrder?: number | null;
  language: string;
  variantGroupId?: string | null;
  area?: string | null;
  subject?: string | null;
  content?: string | null;
  subcontent?: string | null;
  statement?: string | null;
  supportText?: string | null;
  command?: string | null;
  difficulty?: string | null;
  estimatedTimeSeconds?: number | null;
  answer?: string | null;
  answerSituation?: string | null;
  alternatives?: Array<{
    key: string;
    text?: string | null;
    imageArtifacts?: string[];
    sourceRegions?: Array<{ sourcePdfPage?: number; sourceRegion?: Region }>;
    confidence?: number;
  }>;
  assets?: Array<{
    artifactPath: string;
    type: string;
    relation: string;
    order?: number;
    alternativeKey?: string;
    altText?: string;
    width?: number;
    height?: number;
    sha256?: string;
    sourcePdfPage?: number;
    sourceRegion?: Region;
  }>;
  source?: {
    sourcePageUrl?: string;
    officialExamUrl?: string;
    officialAnswerKeyUrl?: string;
    officialAnswerKeySha256?: string;
  };
  officialAnswerKey?: {
    correctAlternative?: string;
    situation?: string;
    sourcePdfPage?: number;
    sourceSha256?: string;
    sourceUrl?: string;
    validationStatus?: string;
  };
  contentHash?: string | null;
};

type Region = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  normalized?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
};

type ImportSummary = {
  startedAt: string;
  finishedAt?: string;
  scannedCorpora: number;
  imported: number;
  updated: number;
  skipped: number;
  missingAnswer: number;
  missingFacsimile: number;
  byBooklet: Array<{
    corpusId: string;
    imported: number;
    updated: number;
    skipped: number;
    missingAnswer: number;
    missingFacsimile: number;
  }>;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "a-classificar"
  );
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function questionBody(question: CorpusQuestion) {
  return [
    question.subject,
    question.content,
    question.subcontent,
    question.supportText,
    question.command,
    question.statement,
    ...(question.alternatives ?? []).map((alternative) => alternative.text ?? ""),
  ].join("\n");
}

function hasAny(text: string, terms: string[]) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function needsVisualSupport(question: CorpusQuestion) {
  return hasAny(questionBody(question), [
    "figura",
    "grafico",
    "tabela",
    "mapa",
    "charge",
    "tirinha",
    "imagem",
    "ilustracao",
    "diagrama",
    "quadrado",
    "quadro",
    "cartaz",
    "infografico",
    "fotografia",
    "esquema",
  ]);
}

function classifySubjectAndTopic(question: CorpusQuestion) {
  const explicitSubject = question.subject?.trim();
  const explicitTopic = question.content?.trim();
  if (explicitSubject && explicitTopic) return { subject: explicitSubject, topic: explicitTopic };

  const body = questionBody(question);
  const area = normalizeText(question.area);

  if (area.includes("natureza")) {
    if (hasAny(body, ["quimica", "molecula", "reacao", "reagente", "produto", "estequiometr", "solucao", "concentracao", "acido", "base", "oxid", "reduc", "corros", "ion", "pilha", "eletrolise", "carbono", "hidrocarboneto"])) {
      return { subject: "Química", topic: explicitTopic ?? "Química no ENEM" };
    }
    if (hasAny(body, ["celula", "organismo", "especie", "ecologia", "gene", "dna", "hereditar", "metabolismo", "enzima", "respiracao", "fotossintese", "bacteria", "virus", "vacina", "membrana", "vacuolo"])) {
      return { subject: "Biologia", topic: explicitTopic ?? "Biologia no ENEM" };
    }
    if (hasAny(body, ["fisica", "forca", "energia", "velocidade", "aceleracao", "movimento", "potencia", "corrente", "tensao", "resistencia", "circuito", "onda", "frequencia", "calor", "temperatura", "pressao", "densidade", "radiacao"])) {
      return { subject: "Física", topic: explicitTopic ?? "Física no ENEM" };
    }
    return { subject: explicitSubject ?? "Ciências da Natureza", topic: explicitTopic ?? "Ciências da Natureza e suas Tecnologias" };
  }

  if (area.includes("matematica")) {
    return { subject: explicitSubject ?? "Matemática", topic: explicitTopic ?? "Matemática e suas Tecnologias" };
  }

  if (area.includes("humanas")) {
    if (hasAny(body, ["mapa", "territorio", "clima", "urban", "agricultura", "migra", "relevo", "paisagem"])) return { subject: "Geografia", topic: explicitTopic ?? "Geografia no ENEM" };
    if (hasAny(body, ["filosof", "etica", "moral", "razao", "conhecimento"])) return { subject: "Filosofia", topic: explicitTopic ?? "Filosofia no ENEM" };
    if (hasAny(body, ["sociolog", "sociedade", "cultura", "desigualdade", "trabalho", "cidadania"])) return { subject: "Sociologia", topic: explicitTopic ?? "Sociologia no ENEM" };
    return { subject: explicitSubject ?? "História", topic: explicitTopic ?? "História no ENEM" };
  }

  if (area.includes("linguagens")) {
    if (hasAny(body, ["poema", "romance", "literatura", "narrador", "verso"])) return { subject: "Literatura", topic: explicitTopic ?? "Literatura no ENEM" };
    if (hasAny(body, ["educacao fisica", "pratica corporal", "esporte", "atividade fisica"])) return { subject: "Educação Física", topic: explicitTopic ?? "Educação Física no ENEM" };
    if (question.language === "ingles") return { subject: "Inglês", topic: explicitTopic ?? "Língua estrangeira" };
    if (question.language === "espanhol") return { subject: "Espanhol", topic: explicitTopic ?? "Língua estrangeira" };
    return { subject: explicitSubject ?? "Português", topic: explicitTopic ?? "Interpretação de texto" };
  }

  return {
    subject: explicitSubject ?? "A classificar",
    topic: explicitTopic ?? question.area?.trim() ?? "Questões oficiais ENEM",
  };
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function questionRoot() {
  const dataEntries = await readdir("data", { withFileTypes: true });
  const questoes = dataEntries.find((entry) => entry.isDirectory() && entry.name.startsWith("QUEST"));
  if (!questoes) throw new Error("Diretorio data/QUESTOES nao encontrado.");
  return path.join(process.cwd(), "data", questoes.name, "processamento");
}

function subjectFor(question: CorpusQuestion) {
  return classifySubjectAndTopic(question).subject;
  const explicit = question.subject?.trim();
  if (explicit) return explicit;
  const area = `${question.area ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (area.includes("matematica")) return "Matemática";
  if (area.includes("linguagens")) return "Linguagens";
  if (area.includes("humanas")) return "Ciências Humanas";
  if (area.includes("natureza")) return "Ciências da Natureza";
  return "A classificar";
}

function topicFor(question: CorpusQuestion) {
  return classifySubjectAndTopic(question).topic;
  return question.content?.trim() || question.area?.trim() || "Questões oficiais ENEM";
}

function difficultyFor(question: CorpusQuestion) {
  const normalized = slugify(question.difficulty ?? "");
  if (normalized.includes("hard") || normalized.includes("dificil")) return Difficulty.HARD;
  if (normalized.includes("easy") || normalized.includes("facil")) return Difficulty.EASY;
  return Difficulty.MEDIUM;
}

function languageFor(language: string) {
  const normalized = slugify(language);
  if (normalized === "ingles" || normalized === "english") return OfficialQuestionLanguage.ENGLISH;
  if (normalized === "espanhol" || normalized === "spanish") return OfficialQuestionLanguage.SPANISH;
  return OfficialQuestionLanguage.NOT_APPLICABLE;
}

function dayLabel(day: number) {
  return `${day}º dia`;
}

function answerSituation(question: CorpusQuestion) {
  return question.answerSituation === "annulled" ||
    question.officialAnswerKey?.situation === "annulled" ||
    question.answer === "ANULADA"
    ? QuestionAnswerSituation.ANNULLED
    : QuestionAnswerSituation.CONFIRMED;
}

function correctAnswer(question: CorpusQuestion) {
  const answer = question.officialAnswerKey?.correctAlternative ?? question.answer ?? "";
  return letters.includes(answer as (typeof letters)[number]) ? answer : "A";
}

function officialExplanation(question: CorpusQuestion) {
  const key = answerSituation(question) === QuestionAnswerSituation.ANNULLED ? "ANULADA" : correctAnswer(question);
  return [
    "Gabarito oficial vinculado ao documento do Inep.",
    `Questão ${question.officialNumber}, ENEM ${question.year}, ${dayLabel(question.day)}, caderno ${question.bookletColor ?? "oficial"}.`,
    `Resposta oficial: ${key}.`,
    "O enunciado foi publicado como recorte oficial da prova para preservar a diagramação original.",
  ].join("\n");
}

async function ensureSubjectAndTopic(question: CorpusQuestion) {
  const subjectName = subjectFor(question) ?? "A classificar";
  const subjectSlug = slugify(subjectName);
  const subject = await db.subject.upsert({
    where: { slug: subjectSlug },
    update: { name: subjectName },
    create: {
      name: subjectName,
      slug: subjectSlug,
      color: "#2563EB",
      description: `Questões oficiais de ${subjectName} no ENEM.`,
    },
  });

  const topicName = topicFor(question) ?? "Questões oficiais ENEM";
  const topicSlug = `${subjectSlug}-${slugify(topicName)}`;
  const topic = await db.topic.upsert({
    where: { slug: topicSlug },
    update: { name: topicName, subjectId: subject.id },
    create: { name: topicName, slug: topicSlug, subjectId: subject.id },
  });

  return { subject, topic };
}

async function ensureOfficialAnswerFile(question: CorpusQuestion) {
  const url =
    question.officialAnswerKey?.sourceUrl ??
    question.source?.officialAnswerKeyUrl ??
    `${question.corpusId}:gabarito`;
  const source = await db.officialSource.upsert({
    where: { sourceUrl: url },
    update: {
      status: OfficialSourceStatus.APPROVED,
      approvedAt: new Date(),
      notes: "Gabarito oficial Inep usado na importação por print.",
    },
    create: {
      vestibular: "ENEM",
      year: question.year,
      edition: "regular",
      examDay: dayLabel(question.day),
      fileType: OfficialFileType.ANSWER_KEY,
      sourceKind: OfficialSourceKind.DIRECT_FILE,
      sourceUrl: url,
      sourceDomain: "inep.gov.br",
      status: OfficialSourceStatus.APPROVED,
      approvedAt: new Date(),
      notes: "Gabarito oficial Inep usado na importação por print.",
    },
  });

  const sourceSha = question.officialAnswerKey?.sourceSha256 ?? question.source?.officialAnswerKeySha256;
  const fileHash = sourceSha || sha256(`${question.corpusId}:answer-key`);
  return db.officialFile.upsert({
    where: { sha256Hash: fileHash },
    update: {
      sourceId: source.id,
      downloadStatus: OfficialDownloadStatus.DOWNLOADED,
      processingStatus: OfficialProcessingStatus.APPROVED,
    },
    create: {
      sourceId: source.id,
      vestibular: "ENEM",
      year: question.year,
      edition: "regular",
      examDay: dayLabel(question.day),
      fileType: OfficialFileType.ANSWER_KEY,
      originalUrl: url,
      storageUrl: url,
      fileName: `${question.corpusId}-gabarito.pdf`,
      mimeType: "application/pdf",
      fileSize: 1,
      sha256Hash: fileHash,
      downloadStatus: OfficialDownloadStatus.DOWNLOADED,
      processingStatus: OfficialProcessingStatus.APPROVED,
    },
  });
}

async function copyAsset(sourcePath: string, destinationParts: string[]) {
  const source = path.resolve(process.cwd(), sourcePath);
  const webpParts = [...destinationParts];
  webpParts[webpParts.length - 1] = webpParts[webpParts.length - 1].replace(/\.[^.]+$/, ".webp");
  const destination = path.resolve(process.cwd(), "public", "question-assets", ...webpParts);
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp(source).webp({ quality: 90, effort: 4 }).toFile(destination);
  return {
    storagePath: webpParts.join("/"),
    url: `/question-assets/${webpParts.join("/")}`,
  };
}

type CorpusAsset = NonNullable<CorpusQuestion["assets"]>[number];

function isPromptFacsimile(asset: CorpusAsset) {
  return asset.type === "official_prompt_facsimile";
}

function isPromptVisual(asset: CorpusAsset) {
  return asset.type === "official_prompt_visual";
}

function isAlternativeVisual(asset: CorpusAsset) {
  return asset.type === "official_alternative_visual";
}

function regionFields(region?: Region) {
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

function cleanAlternativeText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\uFFFC/g, "")
    .replace(/ï¿¼/g, "")
    .replace(/�/g, "")
    .trim();
}

function hasCorruptedEmbeddedText(question: CorpusQuestion) {
  const body = questionBody(question);
  if (/[\u0080-\u009F]/.test(body)) return true;

  const compact = body.replace(/\s+/g, "");
  const artifactCount = (body.match(/[~`_^&$#@<>]/g) ?? []).length;
  const letterCount = (body.match(/\p{L}/gu) ?? []).length;
  if (compact.length < 80) return artifactCount > 8 && letterCount < 25;

  return artifactCount > 40 && artifactCount > letterCount * 0.35;
}

function hasLowFidelityAlternatives(question: CorpusQuestion) {
  const alternatives = question.alternatives ?? [];
  if (alternatives.length !== letters.length) return true;
  if (alternatives.some((alternative) => /[\u0080-\u009F]/.test(alternative.text ?? ""))) {
    return true;
  }

  const fingerprints = alternatives.map((alternative) =>
    cleanAlternativeText(alternative.text)
      .normalize("NFKC")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim(),
  );
  const hasDuplicatedText = new Set(fingerprints).size !== fingerprints.length;
  const allAlternativesHaveImages = alternatives.every((alternative) => alternative.imageArtifacts?.length);
  return hasDuplicatedText && !allAlternativesHaveImages;
}

async function importQuestion(corpusDir: string, questionFile: string, vestibularId: string) {
  const question = JSON.parse(await readFile(questionFile, "utf8")) as CorpusQuestion;
  question.corpusId = question.corpusId ?? question.pilotId ?? path.basename(corpusDir);
  question.id =
    question.id ??
    `${question.corpusId}-q${String(question.officialNumber).padStart(3, "0")}-${question.language ?? "portugues"}`;
  const official = answerSituation(question);
  const answer = correctAnswer(question);
  const corruptedEmbeddedText = hasCorruptedEmbeddedText(question);
  const lowFidelityAlternatives = hasLowFidelityAlternatives(question);
  const facsimileFallbackNeeded = corruptedEmbeddedText || lowFidelityAlternatives;
  const visualSupportNeeded = needsVisualSupport(question);
  const facsimiles = (question.assets ?? [])
    .filter(isPromptFacsimile)
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
  const promptVisuals = (question.assets ?? [])
    .filter(isPromptVisual)
    .filter(() => !facsimileFallbackNeeded)
    .filter(
      (asset) =>
        visualSupportNeeded ||
        !facsimiles.some((facsimile) => facsimile.sha256 && facsimile.sha256 === asset.sha256),
    )
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
  const alternativeVisuals = (question.assets ?? [])
    .filter(isAlternativeVisual)
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));

  if (!facsimiles.length) return { status: "missingFacsimile" as const, corpusId: question.corpusId };
  if (official !== QuestionAnswerSituation.ANNULLED && !letters.includes(answer as (typeof letters)[number])) {
    return { status: "missingAnswer" as const, corpusId: question.corpusId };
  }

  const { subject, topic } = await ensureSubjectAndTopic(question);
  const contentHash = sha256(`enem-print:${question.id}`);
  const officialLanguage = languageFor(question.language);
  const day = dayLabel(question.day);
  const sourceUrl = question.source?.officialExamUrl ?? question.source?.sourcePageUrl ?? null;

  const copiedFacsimiles = await Promise.all(
    facsimiles.map((asset, index) =>
      copyAsset(asset.artifactPath, [
        "enem",
        String(question.year),
        `dia-${question.day}`,
        question.corpusId,
        question.id,
        `enunciado-facsimile-${String(index + 1).padStart(2, "0")}.png`,
      ]).then((copied) => ({ asset, ...copied })),
    ),
  );

  const copiedPromptVisuals = await Promise.all(
    promptVisuals.map((asset, index) =>
      copyAsset(asset.artifactPath, [
        "enem",
        String(question.year),
        `dia-${question.day}`,
        question.corpusId,
        question.id,
        `visual-${String(index + 1).padStart(2, "0")}.png`,
      ]).then((copied) => ({ asset, ...copied })),
    ),
  );

  const copiedAlternativeVisuals = await Promise.all(
    alternativeVisuals.map((asset, index) =>
      copyAsset(asset.artifactPath, [
        "enem",
        String(question.year),
        `dia-${question.day}`,
        question.corpusId,
        question.id,
        `alternativa-${(asset.alternativeKey ?? "x").toLowerCase()}-${String(index + 1).padStart(2, "0")}.png`,
      ]).then((copied) => ({ asset, ...copied })),
    ),
  );

  const alternatives = letters.map((key, order) => {
    const source = question.alternatives?.find((item) => item.key === key);
    const alternativeImage =
      copiedAlternativeVisuals.find((item) => item.asset.alternativeKey === key)?.url ?? null;
    const alternativeText = facsimileFallbackNeeded ? "" : cleanAlternativeText(source?.text);
    return {
      key,
      text: alternativeText || `Alternativa ${key}`,
      imageUrl: alternativeImage,
      correct: official === QuestionAnswerSituation.CONFIRMED && key === answer,
      order,
      explanation:
        official === QuestionAnswerSituation.ANNULLED
          ? "Questão anulada no gabarito oficial."
          : key === answer
            ? "Alternativa indicada pelo gabarito oficial do Inep."
            : "Alternativa diferente da resposta oficial do Inep.",
      sourcePdfPage: source?.sourceRegions?.[0]?.sourcePdfPage ?? null,
      ...regionFields(source?.sourceRegions?.[0]?.sourceRegion),
      confidence: source?.confidence ?? null,
    };
  });

  const _legacyFacsimileImages = copiedFacsimiles.map((item, index) => ({
    url: item.url,
    altText:
      item.asset.altText ??
      `Print oficial da questão ${question.officialNumber} do ENEM ${question.year}`,
    description: "Recorte oficial da questão no caderno do Inep.",
    order: index,
    width: item.asset.width ?? null,
    height: item.asset.height ?? null,
    assetType: "PROMPT_FACSIMILE",
    relation: "STATEMENT",
    storagePath: item.storagePath,
    sha256Hash: item.asset.sha256 ?? null,
    sourcePdfPage: item.asset.sourcePdfPage ?? null,
    ...regionFields(item.asset.sourceRegion),
  }));

  void _legacyFacsimileImages;

  const useFacsimileAsStudentVisual =
    facsimileFallbackNeeded || (visualSupportNeeded && copiedPromptVisuals.length === 0);

  const studentImages = [
    ...copiedPromptVisuals.map((item, index) => ({
      url: item.url,
      altText:
        item.asset.altText ??
        `Elemento visual oficial da questao ${question.officialNumber} do ENEM ${question.year}`,
      description: "Imagem de apoio recortada do caderno oficial do Inep.",
      order: index,
      width: item.asset.width ?? null,
      height: item.asset.height ?? null,
      assetType: "VISUAL" as const,
      relation: "STATEMENT" as const,
      storagePath: item.storagePath,
      sha256Hash: item.asset.sha256 ?? null,
      sourcePdfPage: item.asset.sourcePdfPage ?? null,
      ...regionFields(item.asset.sourceRegion),
    })),
    ...copiedAlternativeVisuals.map((item, index) => ({
      url: item.url,
      altText:
        item.asset.altText ??
        `Elemento visual da alternativa ${item.asset.alternativeKey ?? ""} da questao ${question.officialNumber}`,
      description: "Imagem oficial da alternativa recortada do caderno do Inep.",
      order: copiedPromptVisuals.length + index,
      width: item.asset.width ?? null,
      height: item.asset.height ?? null,
      assetType: "ALTERNATIVE_VISUAL" as const,
      relation: "ALTERNATIVE" as const,
      storagePath: item.storagePath,
      sha256Hash: item.asset.sha256 ?? null,
      sourcePdfPage: item.asset.sourcePdfPage ?? null,
      ...regionFields(item.asset.sourceRegion),
    })),
    ...copiedFacsimiles.map((item, index) => ({
      url: item.url,
      altText:
        item.asset.altText ??
        `Print oficial da questao ${question.officialNumber} do ENEM ${question.year}`,
      description: useFacsimileAsStudentVisual
        ? "Recorte oficial completo exibido como apoio visual."
        : "Recorte completo da questao preservado para auditoria.",
      order: copiedPromptVisuals.length + copiedAlternativeVisuals.length + index,
      width: item.asset.width ?? null,
      height: item.asset.height ?? null,
      assetType: useFacsimileAsStudentVisual
        ? ("PROMPT_FACSIMILE" as const)
        : ("ORIGINAL_REFERENCE" as const),
      relation: useFacsimileAsStudentVisual
        ? ("STATEMENT" as const)
        : ("ADMIN_REFERENCE" as const),
      storagePath: item.storagePath,
      sha256Hash: item.asset.sha256 ?? null,
      sourcePdfPage: item.asset.sourcePdfPage ?? null,
      ...regionFields(item.asset.sourceRegion),
    })),
  ];

  const existing = await db.question.findFirst({
    where: {
      OR: [
        { contentHash },
        {
          vestibularId,
          year: question.year,
          day,
          questionNumber: question.officialNumber,
          officialLanguage,
        },
      ],
    },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
  });

  const questionData = {
    vestibularId,
    subjectId: subject.id,
    topicId: topic.id,
    year: question.year,
    exam: `ENEM ${question.year}`,
    phase: question.application ?? "regular",
    day,
    questionNumber: question.officialNumber,
    difficulty: difficultyFor(question),
    statement:
      facsimileFallbackNeeded
        ? `Questao ${question.officialNumber} do ENEM ${question.year}.`
        : question.command?.trim() ||
          question.statement?.trim() ||
          `Questao ${question.officialNumber} do ENEM ${question.year}.`,
    supportText: facsimileFallbackNeeded ? null : question.supportText?.trim() || null,
    alternatives: JSON.stringify(
      alternatives.map(({ key, text, imageUrl }) => ({ key, text, imageUrl })),
    ),
    alternativeExplanations: JSON.stringify(
      Object.fromEntries(alternatives.map((alternative) => [alternative.key, alternative.explanation])),
    ),
    correctAlternative: answer,
    explanation: officialExplanation(question),
    pedagogyComment: "Questão oficial do ENEM publicada por print do caderno do Inep.",
    skill: question.area ?? "Questão oficial ENEM",
    imageUrl: studentImages.find((image) => image.assetType === "VISUAL")?.url ?? null,
    images: JSON.stringify(studentImages),
    tags: JSON.stringify([
      "ENEM",
      String(question.year),
      day,
      question.area ?? subject.name,
      question.bookletColor ?? "caderno oficial",
      "print oficial",
    ]),
    source: "Inep",
    sourceName: "Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira",
    sourceUrl,
    sourceCitation: `ENEM ${question.year}, ${day}, caderno ${question.bookletColor ?? "oficial"}, questão ${question.officialNumber}.`,
    sourceType: QuestionSourceType.OFFICIAL,
    answerSituation: official,
    officialLanguage,
    officialGroup: question.variantGroupId ?? null,
    officialVariant: question.language,
    reviewState: QuestionReviewState.APPROVED,
    reviewNotes: "Publicado por importação de prints oficiais com gabarito oficial Inep.",
    contentHash,
    status: ContentStatus.PUBLISHED,
  };

  const persisted = existing
    ? await db.question.update({ where: { id: existing.id }, data: questionData })
    : await db.question.create({ data: questionData });

  const answerFile = await ensureOfficialAnswerFile(question);
  const answerKeyIdentity = {
    fileId: answerFile.id,
    questionNumber: question.officialNumber,
    officialLanguage,
  };
  const answerKeyUpdateData = {
    ...answerKeyIdentity,
    officialGroup: question.variantGroupId ?? null,
    officialVariant: question.language,
    questionId: persisted.id,
    correctAlternative: official === QuestionAnswerSituation.ANNULLED ? "ANULADA" : answer,
    answerSituation: official,
    sourceUrl: question.officialAnswerKey?.sourceUrl ?? question.source?.officialAnswerKeyUrl ?? null,
    sourceSha256: question.officialAnswerKey?.sourceSha256 ?? question.source?.officialAnswerKeySha256 ?? null,
    sourcePdfPage: question.officialAnswerKey?.sourcePdfPage ?? null,
    validationStatus: question.officialAnswerKey?.validationStatus ?? "official_key_confirmed",
    importedAt: new Date(),
    statement: question.statement?.slice(0, 1500) ?? null,
    subject: subject.name,
    topic: topic.name,
    difficulty: difficultyFor(question),
    answerReviewStatus: OfficialAnswerReviewStatus.APPROVED,
    answerReviewedBy: "screenshot-corpus-importer",
    answerReviewedAt: new Date(),
    resolutionStatus: OfficialResolutionStatus.NOT_GENERATED,
  };
  const answerKeyByQuestion = await db.officialAnswerKey.findUnique({
    where: { questionId: persisted.id },
  });
  const answerKeyByFile = await db.officialAnswerKey.findUnique({
    where: { fileId_questionNumber_officialLanguage: answerKeyIdentity },
  });
  const answerKeyOperations = [];
  if (answerKeyByFile) {
    if (answerKeyByQuestion && answerKeyByQuestion.id !== answerKeyByFile.id) {
      answerKeyOperations.push(
        db.officialAnswerKey.update({
          where: { id: answerKeyByQuestion.id },
          data: { questionId: null },
        }),
      );
    }
    answerKeyOperations.push(
      db.officialAnswerKey.update({
        where: { id: answerKeyByFile.id },
        data: answerKeyUpdateData,
      }),
    );
  } else if (answerKeyByQuestion) {
    answerKeyOperations.push(
      db.officialAnswerKey.update({
        where: { id: answerKeyByQuestion.id },
        data: answerKeyUpdateData,
      }),
    );
  } else {
    answerKeyOperations.push(
      db.officialAnswerKey.create({
        data: answerKeyUpdateData,
      }),
    );
  }

  await db.$transaction([
    db.questionBlock.deleteMany({ where: { questionId: persisted.id } }),
    db.questionAlternative.deleteMany({ where: { questionId: persisted.id } }),
    db.questionImage.deleteMany({ where: { questionId: persisted.id } }),
    db.questionAlternative.createMany({
      data: alternatives.map((alternative) => ({
        questionId: persisted.id,
        key: alternative.key,
        text: alternative.text,
        imageUrl: alternative.imageUrl,
        explanation: alternative.explanation,
        correct: alternative.correct,
        order: alternative.order,
        sourcePdfPage: alternative.sourcePdfPage,
        regionX: alternative.regionX,
        regionY: alternative.regionY,
        regionWidth: alternative.regionWidth,
        regionHeight: alternative.regionHeight,
        normalizedX: alternative.normalizedX,
        normalizedY: alternative.normalizedY,
        normalizedWidth: alternative.normalizedWidth,
        normalizedHeight: alternative.normalizedHeight,
        confidence: alternative.confidence,
      })),
    }),
    db.questionImage.createMany({
      data: studentImages.map((image) => ({
        questionId: persisted.id,
        url: image.url,
        description: image.description,
        altText: image.altText,
        order: image.order,
        width: image.width,
        height: image.height,
        assetType:
          image.assetType === "VISUAL"
            ? QuestionAssetType.VISUAL
            : image.assetType === "ALTERNATIVE_VISUAL"
              ? QuestionAssetType.ALTERNATIVE_VISUAL
              : image.assetType === "PROMPT_FACSIMILE"
                ? QuestionAssetType.PROMPT_FACSIMILE
            : QuestionAssetType.ORIGINAL_REFERENCE,
        relation:
          image.relation === "STATEMENT"
            ? QuestionAssetRelation.STATEMENT
            : image.relation === "ALTERNATIVE"
              ? QuestionAssetRelation.ALTERNATIVE
            : QuestionAssetRelation.ADMIN_REFERENCE,
        storagePath: image.storagePath,
        mimeType: "image/png",
        sha256Hash: image.sha256Hash,
        sourcePdfPage: image.sourcePdfPage,
        regionX: image.regionX,
        regionY: image.regionY,
        regionWidth: image.regionWidth,
        regionHeight: image.regionHeight,
        normalizedX: image.normalizedX,
        normalizedY: image.normalizedY,
        normalizedWidth: image.normalizedWidth,
        normalizedHeight: image.normalizedHeight,
      })),
    }),
    ...answerKeyOperations,
    db.questionPedagogicalMetadata.upsert({
      where: { questionId: persisted.id },
      update: {
        knowledgeArea: question.area ?? subject.name,
        disciplinaryComponent: subject.name,
        concepts: jsonValue([topic.name]),
        keywords: jsonValue(["ENEM", String(question.year), subject.name]),
        estimatedMinutes: Math.max(1, Math.round((question.estimatedTimeSeconds ?? 180) / 60)),
        classificationSource: "screenshot-corpus-importer",
        classificationConfidence: question.subject ? 0.85 : 0.65,
        reviewStatus: QuestionReviewState.APPROVED,
        reviewedBy: "screenshot-corpus-importer",
        reviewedAt: new Date(),
        provenance: jsonValue({ corpusId: question.corpusId, sourceId: question.id }),
      },
      create: {
        questionId: persisted.id,
        knowledgeArea: question.area ?? subject.name,
        disciplinaryComponent: subject.name,
        concepts: jsonValue([topic.name]),
        keywords: jsonValue(["ENEM", String(question.year), subject.name]),
        estimatedMinutes: Math.max(1, Math.round((question.estimatedTimeSeconds ?? 180) / 60)),
        classificationSource: "screenshot-corpus-importer",
        classificationConfidence: question.subject ? 0.85 : 0.65,
        reviewStatus: QuestionReviewState.APPROVED,
        reviewedBy: "screenshot-corpus-importer",
        reviewedAt: new Date(),
        provenance: jsonValue({ corpusId: question.corpusId, sourceId: question.id }),
      },
    }),
  ]);

  return { status: existing ? ("updated" as const) : ("imported" as const), corpusId: question.corpusId };
}

async function main() {
  const root = await questionRoot();
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const dirs = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("enem-"))
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => !skippedCorpusIds.has(path.basename(dir)))
    .filter((dir) => !requested.length || requested.some((item) => dir.includes(item)))
    .sort();

  const vestibular = await db.vestibular.upsert({
    where: { slug: "enem" },
    update: { name: "ENEM" },
    create: {
      name: "ENEM",
      slug: "enem",
      color: "#1E73FF",
      description: "Exame Nacional do Ensino Médio.",
    },
  });

  const summary: ImportSummary = {
    startedAt: new Date().toISOString(),
    scannedCorpora: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    missingAnswer: 0,
    missingFacsimile: 0,
    byBooklet: [],
  };

  for (const dir of dirs) {
    const questionsDir = path.join(dir, "questoes");
    try {
      await stat(questionsDir);
    } catch {
      continue;
    }
    const corpusSummary = {
      corpusId: path.basename(dir),
      imported: 0,
      updated: 0,
      skipped: 0,
      missingAnswer: 0,
      missingFacsimile: 0,
    };
    summary.scannedCorpora += 1;

    const files = (await readdir(questionsDir))
      .filter((file) => file.endsWith(".json"))
      .map((file) => path.join(questionsDir, file))
      .sort();

    for (const file of files) {
      const result = await importQuestion(dir, file, vestibular.id);
      if (result.status === "imported") {
        summary.imported += 1;
        corpusSummary.imported += 1;
      } else if (result.status === "updated") {
        summary.updated += 1;
        corpusSummary.updated += 1;
      } else if (result.status === "missingAnswer") {
        summary.missingAnswer += 1;
        corpusSummary.missingAnswer += 1;
      } else if (result.status === "missingFacsimile") {
        summary.missingFacsimile += 1;
        corpusSummary.missingFacsimile += 1;
      } else {
        summary.skipped += 1;
        corpusSummary.skipped += 1;
      }
    }

    summary.byBooklet.push(corpusSummary);
  }

  summary.finishedAt = new Date().toISOString();
  const reportPath = path.join(root, "enem-screenshot-import-report.json");
  await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...summary, reportPath }, null, 2));
}

main()
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
