import { loadEnvConfig } from "@next/env";
import { PrismaClient, type Prisma } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { slugify, type BankQuestion, validateQuestion } from "./question-bank-core";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

function batches<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function main() {
  const confirmed = process.argv.includes("--confirm-import");
  const fileArgument = process.argv.find((argument) => argument.startsWith("--file="));
  const file = path.resolve(fileArgument?.slice("--file=".length) || "scripts/import/output/banco-extenso-questoes-validas.json");
  const questions = JSON.parse(await fs.readFile(file, "utf8")) as BankQuestion[];
  const invalid = questions.flatMap((question) => {
    const reasons = validateQuestion(question);
    return reasons.length ? [{ externalId: question.externalId, reasons }] : [];
  });
  const duplicateHashes = questions.length - new Set(questions.map((question) => question.contentHash)).size;

  console.log(JSON.stringify({ file, questions: questions.length, invalid: invalid.length, duplicateHashes, confirmed }, null, 2));
  if (invalid.length || duplicateHashes) throw new Error("O arquivo não passou na validação pré-importação.");
  if (!confirmed) {
    console.log("Dry-run concluído. Use --confirm-import para cadastrar o lote validado.");
    return;
  }

  const vestibularMap = new Map<string, string>();
  const subjectMap = new Map<string, string>();
  const topicMap = new Map<string, string>();

  for (const name of Array.from(new Set(questions.map((question) => question.vestibular)))) {
    const slug = slugify(name);
    const record = await db.vestibular.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        color: name === "Provão Paulista" ? "#7C3AED" : name === "ETEC" ? "#F97316" : "#2563EB",
        description: `Banco de questões de ${name}, com itens oficiais e autorais separados por fonte.`,
      },
    });
    vestibularMap.set(name, record.id);
  }

  for (const name of Array.from(new Set(questions.map((question) => question.subject)))) {
    const slug = slugify(name);
    const record = await db.subject.upsert({
      where: { slug },
      update: {},
      create: { name, slug, description: `Questões e conteúdos de ${name}.` },
    });
    subjectMap.set(name, record.id);
  }

  for (const question of questions) {
    const key = `${question.subject}|${question.topic}`;
    if (topicMap.has(key)) continue;
    const subjectId = subjectMap.get(question.subject);
    if (!subjectId) throw new Error(`Matéria não encontrada: ${question.subject}`);
    const slug = `${slugify(question.subject)}-${slugify(question.topic)}`;
    const record = await db.topic.upsert({
      where: { slug },
      update: { subjectId },
      create: { subjectId, name: question.topic, slug },
    });
    topicMap.set(key, record.id);
  }

  const data = questions.map((question): Prisma.QuestionCreateManyInput => ({
    vestibularId: vestibularMap.get(question.vestibular)!,
    subjectId: subjectMap.get(question.subject)!,
    topicId: topicMap.get(`${question.subject}|${question.topic}`),
    year: question.year,
    exam: question.exam,
    phase: question.phase,
    day: question.day,
    questionNumber: question.questionNumber,
    difficulty: question.difficulty,
    statement: question.statement,
    supportText: question.supportText,
    alternatives: JSON.stringify(question.alternatives.map(({ key, text }) => ({ key, text }))),
    alternativeExplanations: JSON.stringify(Object.fromEntries(question.alternatives.map((item) => [item.key, item.explanation]))),
    correctAlternative: question.correctAlternative,
    explanation: question.explanation,
    pedagogyComment: question.pedagogyComment,
    skill: question.skill,
    imageUrl: question.images[0]?.url,
    images: JSON.stringify(question.images),
    tags: JSON.stringify(question.tags),
    source: question.sourceName,
    sourceName: question.sourceName,
    sourceUrl: question.sourceUrl,
    sourceType: question.sourceType,
    reviewState: question.reviewState,
    reviewNotes: question.reviewNotes,
    contentHash: question.contentHash,
    status: "REVIEW",
  }));

  const before = await db.question.count();
  for (const [index, batch] of batches(data, 250).entries()) {
    const result = await db.question.createMany({ data: batch, skipDuplicates: true });
    console.log(`Lote ${index + 1}: ${result.count}/${batch.length} cadastradas.`);
  }
  const after = await db.question.count();
  const byVestibular = await db.vestibular.findMany({
    select: { name: true, _count: { select: { questions: { where: { sourceType: "AUTHORIAL" } } } } },
    orderBy: { name: "asc" },
  });
  const summary = { before, after, inserted: after - before, authorialByVestibular: Object.fromEntries(byVestibular.map((item) => [item.name, item._count.questions])) };
  await fs.writeFile(path.resolve("scripts/import/output/import-question-bank-result.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
