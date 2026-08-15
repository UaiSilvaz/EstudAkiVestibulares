import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

async function main() {
  const corpusId = argument("--corpus-id");
  const oldExamId = argument("--old-exam-id");
  const userId = argument("--user-id");
  const output = argument("--output");
  if (!corpusId || !oldExamId) {
    throw new Error("Use --corpus-id e --old-exam-id; --output é opcional.");
  }
  const [job, oldExam, links] = await Promise.all([
    db.questionImportJob.findUnique({
      where: { pilotId: corpusId },
      include: {
        examFile: true,
        answerKeyFile: true,
        essayProposal: true,
        extractions: {
          orderBy: [{ officialOrder: "asc" }, { officialLanguage: "asc" }],
          include: {
            answerKey: true,
            question: {
              include: {
                alternativeItems: { orderBy: { order: "asc" } },
                imageItems: { orderBy: { order: "asc" } },
                blocks: { orderBy: { order: "asc" } },
                pedagogicalMetadata: true,
                authorialResolutions: { orderBy: { version: "desc" } },
              },
            },
          },
        },
      },
    }),
    db.provaAntiga.findUnique({
      where: { id: oldExamId },
      include: { officialExamFile: true, officialKeyFile: true },
    }),
    db.provaAntigaQuestao.findMany({
      where: { provaAntigaId: oldExamId },
      orderBy: [{ ordem: "asc" }, { officialLanguage: "asc" }],
      select: {
        id: true,
        questaoId: true,
        numeroQuestao: true,
        officialLanguage: true,
        officialGroup: true,
        officialVariant: true,
        ordem: true,
        paginaPdf: true,
        needsHumanReview: true,
      },
    }),
  ]);

  const questions = (job?.extractions ?? []).map((extraction) => {
    const question = extraction.question;
    const resolution = question.authorialResolutions[0] ?? null;
    return {
      sourceId: extraction.sourceId,
      officialNumber: extraction.officialNumber,
      officialLanguage: extraction.officialLanguage,
      officialOrder: extraction.officialOrder,
      questionId: question.id,
      sourceContentHash: extraction.sourceContentHash,
      rawPayloadHash: extraction.rawPayloadHash,
      extractionStatus: extraction.extractionStatus,
      extractionReviewStatus: extraction.reviewStatus,
      questionStatus: question.status,
      questionReviewState: question.reviewState,
      statementSha256: sha256(question.statement),
      supportTextSha256: sha256(question.supportText ?? ""),
      alternativesSha256: sha256(question.alternatives),
      alternativeExplanationsSha256: sha256(question.alternativeExplanations),
      explanationSha256: sha256(question.explanation),
      correctAlternative: question.correctAlternative,
      alternatives: question.alternativeItems.map((item) => ({
        key: item.key,
        order: item.order,
        textSha256: sha256(item.text),
        correct: item.correct,
        imageUrl: item.imageUrl,
      })),
      blocks: question.blocks.map((item) => ({
        type: item.type,
        order: item.order,
        contentSha256: sha256(item.content),
        assetId: item.assetId,
      })),
      images: question.imageItems.map((item) => ({
        order: item.order,
        assetType: item.assetType,
        relation: item.relation,
        alternativeKey: item.alternativeKey,
        storagePath: item.storagePath,
        sha256: item.sha256Hash,
      })),
      answerKey: {
        id: extraction.answerKey.id,
        answer: extraction.answerKey.correctAlternative,
        situation: extraction.answerKey.answerSituation,
        sourceSha256: extraction.answerKey.sourceSha256,
        sourceUrl: extraction.answerKey.sourceUrl,
        reviewStatus: extraction.answerKey.answerReviewStatus,
        resolutionStatus: extraction.answerKey.resolutionStatus,
      },
      pedagogy: question.pedagogicalMetadata
        ? {
            knowledgeArea: question.pedagogicalMetadata.knowledgeArea,
            disciplinaryComponent: question.pedagogicalMetadata.disciplinaryComponent,
            competencyCode: question.pedagogicalMetadata.competencyCode,
            abilityCode: question.pedagogicalMetadata.abilityCode,
            estimatedMinutes: question.pedagogicalMetadata.estimatedMinutes,
            confidence: question.pedagogicalMetadata.classificationConfidence,
            reviewStatus: question.pedagogicalMetadata.reviewStatus,
            provenanceSha256: sha256(stableJson(question.pedagogicalMetadata.provenance)),
          }
        : null,
      resolution: resolution
        ? {
            version: resolution.version,
            status: resolution.status,
            reviewStatus: resolution.reviewStatus,
            contentHash: resolution.contentHash,
            shortCommentSha256: sha256(resolution.shortComment ?? ""),
            fullResolutionSha256: sha256(resolution.fullResolution ?? ""),
            reasoningPathSha256: sha256(stableJson(resolution.reasoningPath)),
            stepsSha256: sha256(stableJson(resolution.steps)),
            alternativeCommentsSha256: sha256(stableJson(resolution.alternativeComments)),
            commonErrorSha256: sha256(resolution.commonError ?? ""),
            studyTipSha256: sha256(resolution.studyTip ?? ""),
            generatedByModel: resolution.generatedByModel,
            generationMetadataSha256: sha256(stableJson(resolution.generationMetadata)),
          }
        : null,
    };
  });
  const sourceIds = new Set(questions.map((item) => item.sourceId));
  const questionIds = new Set(questions.map((item) => item.questionId));
  const identityKeys = new Set(
    questions.map((item) => `${item.officialNumber}:${item.officialLanguage}`),
  );
  const userSideEffects = userId
    ? await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, xp: true, updatedAt: true },
        }),
        db.questionAttempt.count({ where: { userId } }),
        db.examAttempt.count({ where: { userId } }),
        db.activity.count({ where: { userId } }),
      ]).then(([user, questionAttempts, examAttempts, activities]) => ({
        user,
        questionAttempts,
        examAttempts,
        activities,
      }))
    : null;
  const snapshot = {
    schemaVersion: 1,
    corpusId,
    oldExamId,
    capturedAt: new Date().toISOString(),
    job: job
      ? {
          id: job.id,
          status: job.status,
          expectedQuestionCount: job.expectedQuestionCount,
          importedQuestionCount: job.importedQuestionCount,
          approvedQuestionCount: job.approvedQuestionCount,
          publishedQuestionCount: job.publishedQuestionCount,
          approvedPedagogicalCount: job.approvedPedagogicalCount,
          approvedResolutionCount: job.approvedResolutionCount,
          publishedResolutionCount: job.publishedResolutionCount,
          approvedEssayProposalCount: job.approvedEssayProposalCount,
          sourceJsonPath: job.sourceJsonPath,
          sourceJsonSha256: job.sourceJsonSha256,
          examFileSha256: job.examFile.sha256Hash,
          answerKeyFileSha256: job.answerKeyFile.sha256Hash,
          requirePedagogicalReview: job.requirePedagogicalReview,
          requireAuthorialResolution: job.requireAuthorialResolution,
          requireEssayProposal: job.requireEssayProposal,
          checkpoint: job.checkpoint,
          essay: job.essayProposal
            ? {
                id: job.essayProposal.id,
                status: job.essayProposal.status,
                reviewStatus: job.essayProposal.reviewStatus,
                theme: job.essayProposal.theme,
                sourceContentHash: job.essayProposal.sourceContentHash,
              }
            : null,
        }
      : null,
    oldExam: oldExam
      ? {
          id: oldExam.id,
          status: oldExam.status,
          importacaoStatus: oldExam.importacaoStatus,
          officialExamFileSha256: oldExam.officialExamFile?.sha256Hash,
          officialKeyFileSha256: oldExam.officialKeyFile?.sha256Hash,
        }
      : null,
    counts: {
      links: links.length,
      extractions: questions.length,
      uniqueSourceIds: sourceIds.size,
      uniqueQuestionIds: questionIds.size,
      uniqueIdentityKeys: identityKeys.size,
      alternatives: questions.reduce((sum, item) => sum + item.alternatives.length, 0),
      blocks: questions.reduce((sum, item) => sum + item.blocks.length, 0),
      images: questions.reduce((sum, item) => sum + item.images.length, 0),
      answerKeys: questions.filter((item) => item.answerKey.id).length,
      pedagogy: questions.filter((item) => item.pedagogy).length,
      resolutions: questions.filter((item) => item.resolution).length,
      reviewQuestions: questions.filter((item) => item.questionStatus === "REVIEW").length,
      publishedQuestions: questions.filter((item) => item.questionStatus === "PUBLISHED").length,
      approvedQuestionReviews: questions.filter(
        (item) => item.questionReviewState === "APPROVED",
      ).length,
      approvedExtractions: questions.filter(
        (item) => item.extractionReviewStatus === "APPROVED",
      ).length,
      approvedAnswerKeys: questions.filter(
        (item) => item.answerKey.reviewStatus === "APPROVED",
      ).length,
      approvedPedagogy: questions.filter(
        (item) => item.pedagogy?.reviewStatus === "APPROVED",
      ).length,
      approvedResolutions: questions.filter(
        (item) => item.resolution?.reviewStatus === "APPROVED",
      ).length,
    },
    duplicateChecks: {
      sourceIdsUnique: sourceIds.size === questions.length,
      questionIdsUnique: questionIds.size === questions.length,
      officialNumberLanguageUnique: identityKeys.size === questions.length,
    },
    userSideEffects,
    links,
    questions,
  };
  const payload = `${JSON.stringify(snapshot, null, 2)}\n`;
  const result = {
    corpusId,
    job: snapshot.job,
    counts: snapshot.counts,
    duplicateChecks: snapshot.duplicateChecks,
    userSideEffects: snapshot.userSideEffects,
    snapshotSha256: sha256(payload),
  };
  if (output) {
    const absolute = path.resolve(output);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, payload, "utf8");
    await writeFile(`${absolute}.sha256`, `${result.snapshotSha256}  ${path.basename(absolute)}\n`, "utf8");
    Object.assign(result, {
      output: path.relative(process.cwd(), absolute).replaceAll("\\", "/"),
    });
  }
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
