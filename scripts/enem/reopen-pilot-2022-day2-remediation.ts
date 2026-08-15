import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  ContentStatus,
  OfficialAnswerReviewStatus,
  OfficialProcessingStatus,
  OfficialResolutionStatus,
  Prisma,
  PrismaClient,
  QuestionExtractionStatus,
  QuestionImportJobStatus,
  QuestionReviewState,
  QuestionRevisionAction,
} from "@prisma/client";
import {
  PILOT_ID,
  cliValue,
  hasCliFlag,
  readPilotBundle,
} from "./pilot-2022-day2";
import { writePilotSnapshot } from "./pilot-db-snapshot";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function main() {
  if (!hasCliFlag("confirm-reopen")) {
    throw new Error(
      "Use --confirm-reopen, --actor e --reason para reabrir o caderno publicado de forma rastreável.",
    );
  }
  const actor = cliValue("actor")?.trim();
  const reason = cliValue("reason")?.trim();
  if (!actor || !reason || reason.length < 40) {
    throw new Error("Ator e justificativa com pelo menos 40 caracteres são obrigatórios.");
  }

  const bundle = await readPilotBundle({ validateAssets: true });
  if (!bundle.report.valid || bundle.questions.length !== 90) {
    throw new Error("A fonte-alvo atual não comprova 90/90 questões estruturalmente válidas.");
  }
  const job = await db.questionImportJob.findUnique({
    where: { pilotId: PILOT_ID },
    include: {
      provaAntiga: true,
      extractions: {
        include: { question: true },
        orderBy: { officialNumber: "asc" },
      },
    },
  });
  if (!job || job.status !== QuestionImportJobStatus.PUBLISHED) {
    throw new Error("O job não está publicado; a reabertura controlada não se aplica.");
  }
  if (
    job.expectedQuestionCount !== 90 ||
    job.importedQuestionCount !== 90 ||
    job.publishedQuestionCount !== 90 ||
    job.extractions.length !== 90 ||
    job.extractions.some(
      (extraction) => extraction.question.status !== ContentStatus.PUBLISHED,
    )
  ) {
    throw new Error("O estado publicado atual não é integral 90/90; intervenção manual necessária.");
  }

  const backup = await writePilotSnapshot(db, "backup");
  const reopenedAt = new Date();
  const questionIds = job.extractions.map((extraction) => extraction.questionId);
  const targetSourceHash = bundle.sourceJsonSha256;

  await db.$transaction(
    async (tx) => {
      await tx.question.updateMany({
        where: { id: { in: questionIds } },
        data: {
          status: ContentStatus.REVIEW,
          reviewState: QuestionReviewState.PENDING_REVIEW,
        },
      });
      await tx.questionExtraction.updateMany({
        where: { importJobId: job.id },
        data: {
          extractionStatus: QuestionExtractionStatus.NEEDS_REVIEW,
          reviewStatus: QuestionReviewState.PENDING_REVIEW,
        },
      });
      await tx.provaAntigaQuestao.updateMany({
        where: { provaAntigaId: job.provaAntigaId, questaoId: { in: questionIds } },
        data: { needsHumanReview: true },
      });
      await tx.officialAnswerKey.updateMany({
        where: { questionId: { in: questionIds } },
        data: {
          answerReviewStatus: OfficialAnswerReviewStatus.CHECKED,
          answerReviewedBy: null,
          answerReviewedAt: null,
          resolutionStatus: OfficialResolutionStatus.NOT_GENERATED,
          publishedAt: null,
        },
      });
      await tx.questionAuthorialResolution.updateMany({
        where: { importJobId: job.id },
        data: {
          status: OfficialResolutionStatus.IN_REVIEW,
          reviewStatus: QuestionReviewState.PENDING_REVIEW,
          reviewedBy: null,
          reviewedAt: null,
          publishedAt: null,
        },
      });
      await tx.questionPedagogicalMetadata.updateMany({
        where: { importJobId: job.id },
        data: {
          reviewStatus: QuestionReviewState.PENDING_REVIEW,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
      for (const extraction of job.extractions) {
        const dedupeKey = `${PILOT_ID}:${extraction.sourceId}:REOPENED:${targetSourceHash}`;
        await tx.questionRevision.upsert({
          where: { dedupeKey },
          update: { actor, notes: reason },
          create: {
            questionId: extraction.questionId,
            importJobId: job.id,
            action: QuestionRevisionAction.REOPENED,
            actor,
            notes: `${reason}\nBackup: ${backup}. Fonte-alvo: ${targetSourceHash}.`,
            beforeSnapshot: jsonValue({
              jobStatus: job.status,
              questionStatus: extraction.question.status,
              sourceJsonSha256: job.sourceJsonSha256,
            }),
            afterSnapshot: jsonValue({
              jobStatus: QuestionImportJobStatus.WAITING_REVIEW,
              questionStatus: ContentStatus.REVIEW,
              targetSourceJsonSha256: targetSourceHash,
              reopenedAt: reopenedAt.toISOString(),
            }),
            dedupeKey,
          },
        });
      }
      await tx.questionImportJob.update({
        where: { id: job.id },
        data: {
          status: QuestionImportJobStatus.WAITING_REVIEW,
          approvedQuestionCount: 0,
          publishedQuestionCount: 0,
          approvedPedagogicalCount: 0,
          approvedResolutionCount: 0,
          publishedResolutionCount: 0,
          publishedAt: null,
          checkpoint: jsonValue({
            stage: "published_corpus_reopened_for_remediation",
            backup,
            previousSourceJsonSha256: job.sourceJsonSha256,
            targetSourceJsonSha256: targetSourceHash,
            actor,
            reason,
            reopenedAt: reopenedAt.toISOString(),
          }),
        },
      });
      await tx.provaAntiga.update({
        where: { id: job.provaAntigaId },
        data: {
          status: "PENDENTE",
          importacaoStatus: "AGUARDANDO_REVISAO",
          questoesValidas: 0,
          importacaoRelatorio: JSON.stringify({
            remediation: true,
            previousSourceJsonSha256: job.sourceJsonSha256,
            targetSourceJsonSha256: targetSourceHash,
            backup,
            actor,
            reason,
            reopenedAt: reopenedAt.toISOString(),
          }),
        },
      });
      await tx.officialFile.update({
        where: { id: job.examFileId },
        data: { processingStatus: OfficialProcessingStatus.WAITING_REVIEW },
      });
      await tx.officialFile.update({
        where: { id: job.answerKeyFileId },
        data: { processingStatus: OfficialProcessingStatus.WAITING_REVIEW },
      });
      await tx.officialImportLog.create({
        data: {
          fileId: job.examFileId,
          action: "enem_2022_day2_reopen_remediation",
          status: "SUCCESS",
          message: "Publicação 90/90 reaberta porque a fonte e os conteúdos editoriais exigem remediação.",
          metadata: JSON.stringify({
            jobId: job.id,
            backup,
            previousSourceJsonSha256: job.sourceJsonSha256,
            targetSourceJsonSha256: targetSourceHash,
            actor,
            reason,
          }),
        },
      });
    },
    { timeout: 120_000 },
  );

  const markerPath = path.join(path.dirname(bundle.structuredPath), "piloto-validado.json");
  const evidenceDirectory = path.join(path.dirname(bundle.structuredPath), "evidencias");
  await mkdir(evidenceDirectory, { recursive: true });
  try {
    await stat(markerPath);
    await copyFile(
      markerPath,
      path.join(
        evidenceDirectory,
        `piloto-validado-antes-remediacao-${reopenedAt.toISOString().replace(/[:.]/g, "-")}.json`,
      ),
    );
  } catch {
    // O histórico principal está no banco e no snapshot; marcador legado pode não existir.
  }
  await writeFile(
    markerPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        pilotId: PILOT_ID,
        published: false,
        remediation: true,
        jobId: job.id,
        previousSourceJsonSha256: job.sourceJsonSha256,
        targetSourceJsonSha256: targetSourceHash,
        backup,
        actor,
        reason,
        reopenedAt: reopenedAt.toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        pilotId: PILOT_ID,
        jobId: job.id,
        reopened: 90,
        previousSourceJsonSha256: job.sourceJsonSha256,
        targetSourceJsonSha256: targetSourceHash,
        backup,
        markerPath,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
