import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { ContentStatus, Difficulty, PrismaClient, QuestionReviewState, QuestionSourceType } from "@prisma/client";
import { slugify } from "./question-bank-core";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

type HtmlAlternative = {
  key?: string;
  letter?: string;
  letra?: string;
  text?: string;
  texto?: string;
  img?: string;
  certa?: boolean;
  isCorrect?: boolean;
};

type HtmlQuestion = {
  id?: string;
  num?: number;
  caderno?: string;
  disciplina?: string;
  vestibular?: string;
  ano?: string | number;
  source?: string;
  enunciado?: string;
  enunciado_imgs?: string[];
  imagens?: string[];
  alternativas?: HtmlAlternative[];
  correta?: string;
};

type NormalizedQuestion = {
  externalId: string;
  statement: string;
  year: number;
  questionNumber: number | null;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  alternatives: Array<{ key: string; text: string }>;
  correctAlternative: string;
  alternativeExplanations: Record<string, string>;
  explanation: string;
  pedagogyComment: string;
  sourceName: string;
  sourceUrl: string;
  source: string;
  tags: string[];
  rawImages: Array<{ base64: string; description: string; order: number }>;
  contentHash: string;
};

const DEFAULT_FILE = "C:/Users/Guilherme/Downloads/banco_enem_v3.html";
const OUTPUT_DIR = path.resolve("public/uploads/questions/enem-html");
const letters = ["A", "B", "C", "D", "E"];

function arg(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function normalizeText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function contentHash(input: Pick<NormalizedQuestion, "statement" | "alternatives">) {
  const canonical = [
    "enem",
    normalizeText(input.statement),
    ...input.alternatives.map((item) => `${item.key}:${normalizeText(item.text)}`),
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

function extractQuestions(html: string) {
  const match = html.match(/(?:const|let|var)\s+(?:QS|QUESTIONS)\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("Nao encontrei o array QS/QUESTIONS no HTML.");
  return JSON.parse(match[1]) as HtmlQuestion[];
}

function normalizeAlternative(item: HtmlAlternative, index: number) {
  const key = String(item.key ?? item.letter ?? item.letra ?? letters[index] ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 1);
  const text = cleanText(item.text ?? item.texto);
  return key && text ? { key, text } : null;
}

function hasAny(text: string, terms: string[]) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function classifyQuestion(discipline: string, statement: string) {
  const text = `${discipline} ${statement}`;
  const normalizedDiscipline = normalizeText(discipline);

  if (normalizedDiscipline.includes("matematica")) {
    if (hasAny(text, ["porcent", "percentual", "taxa"])) return { subject: "Matemática", topic: "Porcentagem" };
    if (hasAny(text, ["area", "perimetro", "triangulo", "circunferencia", "volume", "geometr"])) return { subject: "Matemática", topic: "Geometria" };
    if (hasAny(text, ["funcao", "grafico", "afim", "quadratica"])) return { subject: "Matemática", topic: "Funções" };
    if (hasAny(text, ["probabilidade", "chance", "sorteio"])) return { subject: "Matemática", topic: "Probabilidade" };
    if (hasAny(text, ["media", "mediana", "desvio", "tabela"])) return { subject: "Matemática", topic: "Estatística" };
    return { subject: "Matemática", topic: "Matemática aplicada ao ENEM" };
  }

  if (normalizedDiscipline.includes("biologia")) {
    if (hasAny(text, ["ecologia", "ambiente", "especie", "cadeia alimentar", "bioma"])) return { subject: "Biologia", topic: "Ecologia" };
    if (hasAny(text, ["gene", "dna", "hereditar", "genetic"])) return { subject: "Biologia", topic: "Genética" };
    if (hasAny(text, ["celula", "membrana", "organela"])) return { subject: "Biologia", topic: "Citologia" };
    return { subject: "Biologia", topic: "Biologia no ENEM" };
  }

  if (normalizedDiscipline.includes("quimica")) {
    if (hasAny(text, ["mol", "estequiometr", "massa molar"])) return { subject: "Química", topic: "Estequiometria" };
    if (hasAny(text, ["organica", "carbono", "hidrocarboneto"])) return { subject: "Química", topic: "Química orgânica" };
    if (hasAny(text, ["ph", "solucao", "concentracao"])) return { subject: "Química", topic: "Soluções" };
    if (hasAny(text, ["oxid", "reduc", "pilha", "eletrolise"])) return { subject: "Química", topic: "Oxirredução" };
    return { subject: "Química", topic: "Química no ENEM" };
  }

  if (normalizedDiscipline.includes("fisica")) {
    if (hasAny(text, ["velocidade", "aceleracao", "movimento", "distancia"])) return { subject: "Física", topic: "Cinemática" };
    if (hasAny(text, ["corrente", "tensao", "resistencia", "potencia eletrica"])) return { subject: "Física", topic: "Eletricidade" };
    if (hasAny(text, ["onda", "frequencia", "som", "luz"])) return { subject: "Física", topic: "Ondulatória" };
    if (hasAny(text, ["calor", "temperatura", "termica"])) return { subject: "Física", topic: "Termologia" };
    return { subject: "Física", topic: "Física no ENEM" };
  }

  if (normalizedDiscipline.includes("linguagens")) {
    if (hasAny(text, ["poema", "romance", "literatura", "narrador", "verso"])) return { subject: "Literatura", topic: "Leitura literária" };
    if (hasAny(text, ["publicidade", "campanha", "genero textual"])) return { subject: "Português", topic: "Gêneros textuais" };
    return { subject: "Português", topic: "Interpretação de texto" };
  }

  if (normalizedDiscipline.includes("humanas")) {
    if (hasAny(text, ["mapa", "territorio", "clima", "urban", "agricultura", "migra"])) return { subject: "Geografia", topic: "Geografia humana e física" };
    if (hasAny(text, ["etica", "moral", "filosof", "razao", "conhecimento"])) return { subject: "Filosofia", topic: "Ética e conhecimento" };
    if (hasAny(text, ["sociedade", "cultura", "desigualdade", "trabalho", "cidadania"])) return { subject: "Sociologia", topic: "Sociedade e cidadania" };
    return { subject: "História", topic: "História geral e do Brasil" };
  }

  return { subject: "Português", topic: "Interpretação de texto" };
}

function difficultyFor(statement: string, imageCount: number) {
  const score = statement.length + imageCount * 180;
  if (score < 520) return Difficulty.EASY;
  if (score > 1450) return Difficulty.HARD;
  return Difficulty.MEDIUM;
}

function sourceUrlForYear(year: number) {
  return `https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/${year}`;
}

function buildExplanations(source: string, correctAlternative: string, alternatives: Array<{ key: string; text: string }>) {
  const correct = alternatives.find((item) => item.key === correctAlternative);
  const alternativeExplanations = Object.fromEntries(
    alternatives.map((item) => [
      item.key,
      item.key === correctAlternative
        ? `Esta e a alternativa registrada como correta no gabarito oficial de ${source}.`
        : `Esta alternativa nao corresponde ao gabarito oficial de ${source}; compare-a com o comando do enunciado e com a alternativa ${correctAlternative}.`,
    ]),
  );
  const explanation =
    `Gabarito oficial de ${source}: alternativa ${correctAlternative}. ` +
    `A alternativa ${correctAlternative}${correct ? ` (${correct.text})` : ""} e a resposta registrada para esta questao. ` +
    "A resolucao inicial foi cadastrada de forma conservadora para preservar o gabarito e permitir uso imediato no banco; a curadoria pedagogica pode detalhar os calculos, conceitos ou trechos do texto-base no painel administrativo. " +
    `As demais alternativas foram mantidas na ordem original e marcadas como distratores por divergirem do gabarito oficial.`;

  return { explanation, alternativeExplanations };
}

function normalizeQuestion(raw: HtmlQuestion) {
  const year = Number(raw.ano);
  const statement = cleanText(raw.enunciado);
  const source = cleanText(raw.source ?? `ENEM ${year}`);
  const correctAlternative = String(raw.correta ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 1);
  const alternatives = (raw.alternativas ?? [])
    .map(normalizeAlternative)
    .filter((item): item is { key: string; text: string } => Boolean(item));
  const rawImages = [
    ...(raw.enunciado_imgs ?? []).map((base64, index) => ({
      base64,
      description: `Imagem de apoio da questao ${raw.num ?? raw.id ?? ""}`.trim(),
      order: index,
    })),
    ...(raw.imagens ?? []).map((base64, index) => ({
      base64,
      description: `Imagem de apoio da questao ${raw.num ?? raw.id ?? ""}`.trim(),
      order: index,
    })),
    ...(raw.alternativas ?? [])
      .filter((item) => item.img)
      .map((item, index) => ({
        base64: item.img!,
        description: `Imagem da alternativa ${item.key ?? item.letter ?? item.letra ?? letters[index]}`,
        order: (raw.enunciado_imgs?.length ?? raw.imagens?.length ?? 0) + index,
      })),
  ];

  if (!year || !statement || alternatives.length !== 5 || !letters.includes(correctAlternative)) return null;
  if (!alternatives.some((item) => item.key === correctAlternative)) return null;

  const classification = classifyQuestion(String(raw.disciplina ?? ""), statement);
  const explanations = buildExplanations(source, correctAlternative, alternatives);
  const normalized: NormalizedQuestion = {
    externalId: `enem-html-${raw.ano}-${raw.id ?? raw.num ?? randomUUID()}`,
    statement,
    year,
    questionNumber: typeof raw.num === "number" ? raw.num : null,
    subject: classification.subject,
    topic: classification.topic,
    difficulty: difficultyFor(statement, rawImages.length),
    alternatives,
    correctAlternative,
    alternativeExplanations: explanations.alternativeExplanations,
    explanation: explanations.explanation,
    pedagogyComment: "Questao real do ENEM importada de banco estruturado; recomenda-se revisar a resolucao comentada para aprofundar a justificativa.",
    sourceName: `INEP/gov.br - ${source}`,
    sourceUrl: sourceUrlForYear(year),
    source,
    tags: ["ENEM", String(year), classification.subject, classification.topic, "oficial"],
    rawImages,
    contentHash: "",
  };
  normalized.contentHash = contentHash(normalized);
  return normalized;
}

function imageExtension(buffer: Buffer) {
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return ".png";
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return ".jpg";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF") return ".webp";
  return ".jpg";
}

async function saveImage(question: NormalizedQuestion, image: NormalizedQuestion["rawImages"][number]) {
  const cleanBase64 = image.base64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  const extension = imageExtension(buffer);
  const dir = path.join(OUTPUT_DIR, String(question.year));
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${question.externalId}-${String(image.order + 1).padStart(2, "0")}${extension}`;
  await fs.writeFile(path.join(dir, fileName), buffer);
  return {
    url: `/uploads/questions/enem-html/${question.year}/${fileName}`,
    description: image.description,
    order: image.order,
  };
}

async function upsertClassification(questions: NormalizedQuestion[]) {
  const vestibular = await db.vestibular.upsert({
    where: { slug: "enem" },
    update: {
      name: "ENEM",
      color: "#1E73FF",
      description: "Exame Nacional do Ensino Medio com questoes oficiais e autorais organizadas por area.",
    },
    create: {
      name: "ENEM",
      slug: "enem",
      color: "#1E73FF",
      description: "Exame Nacional do Ensino Medio com questoes oficiais e autorais organizadas por area.",
    },
  });
  const subjects = new Map<string, string>();
  const topics = new Map<string, string>();

  for (const subjectName of Array.from(new Set(questions.map((item) => item.subject)))) {
    const slug = slugify(subjectName);
    const subject = await db.subject.upsert({
      where: { slug },
      update: { name: subjectName, description: `Questoes e conteudos de ${subjectName}.` },
      create: { name: subjectName, slug, description: `Questoes e conteudos de ${subjectName}.` },
    });
    subjects.set(subjectName, subject.id);
  }

  for (const item of questions) {
    const subjectId = subjects.get(item.subject);
    if (!subjectId) throw new Error(`Materia nao encontrada: ${item.subject}`);
    const key = `${item.subject}|${item.topic}`;
    if (topics.has(key)) continue;
    const slug = `${slugify(item.subject)}-${slugify(item.topic)}`;
    const topic = await db.topic.upsert({
      where: { slug },
      update: { name: item.topic, subjectId },
      create: { name: item.topic, slug, subjectId },
    });
    topics.set(key, topic.id);
  }

  return { vestibularId: vestibular.id, subjects, topics };
}

async function syncAssets(contentHashes: string[]) {
  const records = await db.question.findMany({
    where: { contentHash: { in: contentHashes } },
    select: {
      id: true,
      alternatives: true,
      alternativeExplanations: true,
      correctAlternative: true,
      imageUrl: true,
      images: true,
    },
  });
  const now = new Date();
  const questionIds = records.map((item) => item.id);

  await db.$transaction([
    db.questionAlternative.deleteMany({ where: { questionId: { in: questionIds } } }),
    db.questionImage.deleteMany({ where: { questionId: { in: questionIds } } }),
  ]);

  const alternativeRows = records.flatMap((record) => {
    const alternatives = JSON.parse(record.alternatives) as Array<{ key: string; text: string }>;
    const explanations = JSON.parse(record.alternativeExplanations || "{}") as Record<string, string>;
    return alternatives.map((item, index) => ({
      id: randomUUID(),
      questionId: record.id,
      key: item.key,
      text: item.text,
      explanation: explanations[item.key] ?? null,
      correct: item.key === record.correctAlternative,
      order: index,
      createdAt: now,
      updatedAt: now,
    }));
  });
  const imageRows = records.flatMap((record) => {
    const parsed = JSON.parse(record.images || "[]") as Array<{ url?: string; description?: string; order?: number } | string>;
    const seen = new Set<string>();
    const rows: Array<{
      id: string;
      questionId: string;
      url: string;
      description: string | null;
      altText: string | null;
      order: number;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    const add = (entry: (typeof parsed)[number], index: number) => {
      const url = typeof entry === "string" ? entry : entry.url;
      if (!url || seen.has(url)) return;
      seen.add(url);
      rows.push({
        id: randomUUID(),
        questionId: record.id,
        url,
        description: typeof entry === "string" ? null : entry.description ?? null,
        altText: typeof entry === "string" ? null : entry.description ?? null,
        order: typeof entry === "string" ? index : entry.order ?? index,
        createdAt: now,
        updatedAt: now,
      });
    };
    parsed.forEach(add);
    if (record.imageUrl) add(record.imageUrl, rows.length);
    return rows;
  });

  for (let index = 0; index < alternativeRows.length; index += 1000) {
    await db.questionAlternative.createMany({ data: alternativeRows.slice(index, index + 1000) });
  }
  for (let index = 0; index < imageRows.length; index += 500) {
    await db.questionImage.createMany({ data: imageRows.slice(index, index + 500) });
  }

  return { normalizedAlternatives: alternativeRows.length, normalizedImages: imageRows.length };
}

async function main() {
  const confirmed = process.argv.includes("--confirm-import");
  const publish = process.argv.includes("--publish");
  const file = path.resolve(arg("file") ?? DEFAULT_FILE);
  const raw = extractQuestions(await fs.readFile(file, "utf8"));
  const normalized = raw.map(normalizeQuestion).filter((item): item is NormalizedQuestion => Boolean(item));
  const unique = new Map<string, NormalizedQuestion>();
  let duplicateInFile = 0;

  for (const question of normalized) {
    if (unique.has(question.contentHash)) duplicateInFile += 1;
    else unique.set(question.contentHash, question);
  }

  const uniqueQuestions = Array.from(unique.values());
  const existing = await db.question.findMany({
    where: { contentHash: { in: uniqueQuestions.map((item) => item.contentHash) } },
    select: { contentHash: true },
  });
  const existingHashes = new Set(existing.map((item) => item.contentHash).filter(Boolean));
  const toImport = uniqueQuestions.filter((item) => !existingHashes.has(item.contentHash));
  const summary = {
    file,
    raw: raw.length,
    structurallyValid: normalized.length,
    skippedInvalid: raw.length - normalized.length,
    duplicateInFile,
    alreadyInDatabase: existingHashes.size,
    toImport: toImport.length,
    withImages: toImport.filter((item) => item.rawImages.length > 0).length,
    publish,
    confirmed,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!confirmed || !toImport.length) return;

  const classification = await upsertClassification(toImport);
  const data = [];
  const importedHashes: string[] = [];

  for (const question of toImport) {
    const images = [];
    for (const image of question.rawImages) images.push(await saveImage(question, image));
    data.push({
      vestibularId: classification.vestibularId,
      subjectId: classification.subjects.get(question.subject)!,
      topicId: classification.topics.get(`${question.subject}|${question.topic}`)!,
      year: question.year,
      exam: question.source,
      phase: "Banco ENEM estruturado",
      questionNumber: question.questionNumber,
      difficulty: question.difficulty,
      statement: question.statement,
      alternatives: JSON.stringify(question.alternatives),
      alternativeExplanations: JSON.stringify(question.alternativeExplanations),
      correctAlternative: question.correctAlternative,
      explanation: question.explanation,
      pedagogyComment: question.pedagogyComment,
      imageUrl: images[0]?.url ?? null,
      images: JSON.stringify(images),
      tags: JSON.stringify(question.tags),
      source: question.sourceUrl,
      sourceName: question.sourceName,
      sourceUrl: question.sourceUrl,
      sourceType: QuestionSourceType.OFFICIAL,
      reviewState: QuestionReviewState.PENDING_REVIEW,
      reviewNotes: "Importado de HTML estruturado com gabarito oficial; revisar a resolucao comentada antes de marcar como aprovado.",
      contentHash: question.contentHash,
      status: publish ? ContentStatus.PUBLISHED : ContentStatus.REVIEW,
    });
    importedHashes.push(question.contentHash);
  }

  const before = await db.question.count();
  for (let index = 0; index < data.length; index += 250) {
    const result = await db.question.createMany({ data: data.slice(index, index + 250), skipDuplicates: true });
    console.log(`Lote ${Math.floor(index / 250) + 1}: ${result.count}/${Math.min(250, data.length - index)} cadastradas.`);
  }
  const after = await db.question.count();
  const normalizedAssets = await syncAssets(importedHashes);
  const result = { before, after, inserted: after - before, ...normalizedAssets };
  await fs.writeFile(
    path.resolve("scripts/import/output/import-enem-html-result.json"),
    JSON.stringify({ ...summary, ...result }, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
