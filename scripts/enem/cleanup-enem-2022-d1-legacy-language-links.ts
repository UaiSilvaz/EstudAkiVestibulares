import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { OfficialQuestionLanguage, PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();
const CORPUS_ID = "enem-2022-dia-1-caderno-1-azul";
const OLD_EXAM_ID = "pa-enem-2022-dia-1";

function has(name: string) {
  return process.argv.includes(name);
}

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const legacyLinks = await db.provaAntigaQuestao.findMany({
    where: {
      provaAntigaId: OLD_EXAM_ID,
      numeroQuestao: { in: [1, 2, 3, 4, 5] },
      officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
    },
    orderBy: { numeroQuestao: "asc" },
    include: {
      questao: {
        include: {
          alternativeItems: { orderBy: { order: "asc" } },
          imageItems: { orderBy: { order: "asc" } },
          blocks: { orderBy: { order: "asc" } },
          structuredExtraction: true,
          pedagogicalMetadata: true,
          authorialResolutions: true,
          officialAnswerKey: true,
          revisions: true,
          _count: {
            select: {
              provasAntigas: true,
              attempts: true,
              favorites: true,
              reports: true,
            },
          },
        },
      },
    },
  });
  if (legacyLinks.length !== 5) {
    throw new Error(`Esperados exatamente cinco vínculos legados; encontrados ${legacyLinks.length}.`);
  }
  if (legacyLinks.some((link, index) => link.numeroQuestao !== index + 1)) {
    throw new Error("Os vínculos legados não correspondem exatamente às questões 1–5.");
  }
  const job = await db.questionImportJob.findUnique({
    where: { pilotId: CORPUS_ID },
    include: { extractions: { select: { questionId: true } } },
  });
  if (!job || job.status === "PUBLISHED" || job.extractions.length !== 95) {
    throw new Error("O job D1 atual não está em REVIEW com 95 extrações.");
  }
  const activeQuestionIds = new Set(job.extractions.map((item) => item.questionId));
  for (const link of legacyLinks) {
    const question = link.questao;
    if (
      activeQuestionIds.has(question.id) ||
      question.structuredExtraction ||
      question.officialAnswerKey ||
      question.pedagogicalMetadata ||
      question.authorialResolutions.length ||
      question.status === "PUBLISHED" ||
      question.pilotTestPublishedAt ||
      question._count.provasAntigas !== 1 ||
      question._count.attempts ||
      question._count.favorites ||
      question._count.reports
    ) {
      throw new Error(`${link.id}: questão legada possui relação ou estado que impede remoção segura.`);
    }
  }
  const backupPath = path.resolve(
    argument("--backup") ??
      "data/QUESTÕES/processamento/enem-2022-dia-1-caderno-1-azul/evidencias/backup-cinco-questoes-legadas-sem-idioma.json",
  );
  const backupPayload = `${JSON.stringify(
    {
      schemaVersion: 1,
      corpusId: CORPUS_ID,
      oldExamId: OLD_EXAM_ID,
      capturedAt: new Date().toISOString(),
      reason: "Questões 1–5 legadas como NOT_APPLICABLE coexistiam com as dez variantes oficiais ENGLISH/SPANISH.",
      links: legacyLinks,
    },
    null,
    2,
  )}\n`;
  const backupSha256 = sha256(backupPayload);
  const result = {
    mode: has("--confirm-cleanup") ? "CLEANUP" : "DRY_RUN",
    legacyLinks: legacyLinks.map((link) => ({
      linkId: link.id,
      questionId: link.questaoId,
      officialNumber: link.numeroQuestao,
      officialLanguage: link.officialLanguage,
      questionStatus: link.questao.status,
      relatedOldExams: link.questao._count.provasAntigas,
    })),
    backupPath: path.relative(process.cwd(), backupPath).replaceAll("\\", "/"),
    backupSha256,
  };
  if (!has("--confirm-cleanup")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  await mkdir(path.dirname(backupPath), { recursive: true });
  await writeFile(backupPath, backupPayload, { encoding: "utf8", flag: "wx" });
  await writeFile(
    `${backupPath}.sha256`,
    `${backupSha256}  ${path.basename(backupPath)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  const linkIds = legacyLinks.map((link) => link.id);
  const questionIds = legacyLinks.map((link) => link.questaoId);
  const deleted = await db.$transaction(async (tx) => {
    const links = await tx.provaAntigaQuestao.deleteMany({ where: { id: { in: linkIds } } });
    const questions = await tx.question.deleteMany({ where: { id: { in: questionIds } } });
    if (links.count !== 5 || questions.count !== 5) {
      throw new Error(`Remoção atômica incompleta: links=${links.count}, questões=${questions.count}.`);
    }
    return { links: links.count, questions: questions.count };
  });
  const [remainingLinks, remainingLegacy, remainingExtractions] = await Promise.all([
    db.provaAntigaQuestao.count({ where: { provaAntigaId: OLD_EXAM_ID } }),
    db.provaAntigaQuestao.count({
      where: {
        provaAntigaId: OLD_EXAM_ID,
        numeroQuestao: { in: [1, 2, 3, 4, 5] },
        officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
      },
    }),
    db.questionExtraction.count({ where: { importJobId: job.id } }),
  ]);
  if (remainingLinks !== 95 || remainingLegacy !== 0 || remainingExtractions !== 95) {
    throw new Error(
      `Estado pós-limpeza inválido: links=${remainingLinks}, legados=${remainingLegacy}, extrações=${remainingExtractions}.`,
    );
  }
  console.log(JSON.stringify({ ...result, deleted, remainingLinks, remainingExtractions }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
