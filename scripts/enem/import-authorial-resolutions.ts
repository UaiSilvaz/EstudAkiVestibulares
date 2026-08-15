import { loadEnvConfig } from "@next/env";
import {
  OfficialQuestionLanguage,
  OfficialResolutionStatus,
  Prisma,
  PrismaClient,
  QuestionImportJobStatus,
  QuestionReviewState,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

const db = new PrismaClient();
const LETTERS = ["A", "B", "C", "D", "E"] as const;

type Resolution = {
  sourceId: string;
  officialNumber: number;
  language: keyof typeof OfficialQuestionLanguage;
  officialAnswer: string;
  answerVerified: boolean;
  answerVerification: string;
  shortComment: string;
  fullResolution: string;
  reasoningPath: string[];
  steps: string[];
  alternativeComments: Record<(typeof LETTERS)[number], string>;
  commonError: string;
  studyTip: string;
  keywords: string[];
  relatedContent: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  estimatedMinutes: number;
  knowledgeArea: string;
  disciplinaryComponent: string;
  content: string;
  subcontent: string;
};

type ResolutionFile = {
  complete: boolean;
  sourceByteSha256: string;
  generationMode?: "full" | "selective_merge";
  model: string;
  effort: string;
  finalResolutionSetHash?: string;
  resolutionProvenance?: Record<
    string,
    {
      mode?: string;
      model?: string;
      effort?: string;
      resolutionHash?: string;
      [key: string]: unknown;
    }
  >;
  resolutions: Resolution[];
};

type Classification = Pick<
  Resolution,
  | "sourceId"
  | "officialNumber"
  | "language"
  | "difficulty"
  | "estimatedMinutes"
  | "knowledgeArea"
  | "disciplinaryComponent"
  | "content"
  | "subcontent"
> & {
  competencyCode: string;
  abilityCode: string;
};

type ClassificationFile = {
  sourceByteSha256: string;
  complete: boolean;
  expected: number;
  classified: number;
  reviewRequired: number;
  classifications: Classification[];
};

type AuditFile = {
  sourceByteSha256?: string;
  complete: boolean;
  canApprove: boolean;
  audited: number;
  passed: number;
  failed: number;
  audits: Array<{ sourceId: string; verdict: "PASS" | "FAIL" }>;
};

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function has(name: string) {
  return process.argv.includes(name);
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function contentHash(resolution: Resolution) {
  return createHash("sha256")
    .update(JSON.stringify(resolution))
    .digest("hex");
}

function validateResolution(resolution: Resolution) {
  const errors: string[] = [];
  if (!resolution.sourceId?.trim()) errors.push("sourceId ausente");
  if (!Number.isInteger(resolution.officialNumber)) errors.push("número inválido");
  if (!(resolution.language in OfficialQuestionLanguage)) errors.push("idioma inválido");
  if (resolution.shortComment?.trim().length < 40) errors.push("comentário curto");
  if (resolution.fullResolution?.trim().length < 180) errors.push("resolução curta");
  if (resolution.reasoningPath?.length < 2) errors.push("raciocínio incompleto");
  if (!resolution.steps?.length) errors.push("etapas ausentes");
  if (
    !resolution.alternativeComments ||
    LETTERS.some((letter) => resolution.alternativeComments[letter]?.trim().length < 25)
  ) {
    errors.push("comentários A–E incompletos");
  }
  if (resolution.commonError?.trim().length < 30) errors.push("erro comum ausente");
  if (resolution.studyTip?.trim().length < 30) errors.push("dica ausente");
  if (resolution.keywords?.length < 2) errors.push("palavras-chave insuficientes");
  if (!resolution.content?.trim() || !resolution.subcontent?.trim()) {
    errors.push("classificação incompleta");
  }
  return errors;
}

async function main() {
  const pilotId = argument("--pilot-id");
  const resolutionPath = argument("--resolutions");
  const auditPath = argument("--audit");
  const classificationPath = argument("--classifications");
  const evidencePath = argument("--evidence");
  const actor = argument("--actor") ?? "estudaki-editorial-codex";
  const approve = has("--approve") || has("--publish");
  const publish = has("--publish");
  const verifyOnly = has("--verify-only");
  if (
    !pilotId ||
    !resolutionPath ||
    !auditPath ||
    !classificationPath ||
    (!has("--confirm-import") && !verifyOnly)
  ) {
    throw new Error(
      "Use --pilot-id, --resolutions, --audit, --classifications e --confirm-import (ou --verify-only). " +
        "Adicione --approve ou --publish somente após auditoria integral.",
    );
  }

  const [resolutionRaw, auditRaw, classificationRaw] = await Promise.all([
    readFile(path.resolve(resolutionPath), "utf8"),
    readFile(path.resolve(auditPath), "utf8"),
    readFile(path.resolve(classificationPath), "utf8"),
  ]);
  const resolutionFile = JSON.parse(resolutionRaw) as ResolutionFile;
  const auditFile = JSON.parse(auditRaw) as AuditFile;
  const classificationFile = JSON.parse(classificationRaw) as ClassificationFile;
  if (!resolutionFile.complete) throw new Error("A geração de resoluções está incompleta.");
  if (!auditFile.complete || !auditFile.canApprove || auditFile.failed !== 0) {
    throw new Error("A auditoria independente não aprovou integralmente o caderno.");
  }
  if (
    !classificationFile.complete ||
    classificationFile.reviewRequired !== 0 ||
    classificationFile.classifications.length !== classificationFile.expected ||
    classificationFile.classified !== classificationFile.expected
  ) {
    throw new Error("A classificação pedagógica vinculada está incompleta ou pendente.");
  }
  const auditBySource = new Map(
    auditFile.audits.map((item) => [item.sourceId, item.verdict]),
  );
  if (
    auditFile.audited !== resolutionFile.resolutions.length ||
    auditFile.passed !== resolutionFile.resolutions.length ||
    auditFile.audits.length !== resolutionFile.resolutions.length ||
    auditBySource.size !== auditFile.audits.length
  ) {
    throw new Error("Identidades ou contagens da auditoria divergem do lote final.");
  }
  const identities = new Set<string>();
  const sourceIds = new Set<string>();
  for (const resolution of resolutionFile.resolutions) {
    const issues = validateResolution(resolution);
    if (issues.length) throw new Error(`${resolution.sourceId}: ${issues.join(", ")}`);
    if (!resolution.answerVerified || resolution.answerVerification?.trim().length < 60) {
      throw new Error(`${resolution.sourceId}: vínculo narrativo com o gabarito oficial é insuficiente.`);
    }
    if (auditBySource.get(resolution.sourceId) !== "PASS") {
      throw new Error(`${resolution.sourceId}: sem PASS rastreável na auditoria.`);
    }
    if (sourceIds.has(resolution.sourceId)) {
      throw new Error(`sourceId duplicado: ${resolution.sourceId}`);
    }
    sourceIds.add(resolution.sourceId);
    const identity = `${resolution.officialNumber}:${resolution.language}`;
    if (identities.has(identity)) throw new Error(`Identidade duplicada: ${identity}`);
    identities.add(identity);
    if (
      resolutionFile.generationMode === "selective_merge" &&
      !resolutionFile.resolutionProvenance?.[resolution.sourceId]
    ) {
      throw new Error(`${resolution.sourceId}: proveniência da mesclagem ausente.`);
    }
  }

  const job = await db.questionImportJob.findUnique({
    where: { pilotId },
    include: {
      extractions: {
        select: {
          questionId: true,
          answerKeyId: true,
          sourceId: true,
          officialNumber: true,
          officialLanguage: true,
          answerKey: {
            select: {
              correctAlternative: true,
              answerSituation: true,
              sourceSha256: true,
              sourceUrl: true,
            },
          },
          question: {
            select: {
              pedagogicalMetadata: {
                select: {
                  knowledgeArea: true,
                  disciplinaryComponent: true,
                  competencyCode: true,
                  abilityCode: true,
                  cognitiveDemand: true,
                  concepts: true,
                  estimatedMinutes: true,
                  reviewStatus: true,
                  provenance: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!job) throw new Error(`Job não encontrado: ${pilotId}`);
  if (
    !resolutionFile.sourceByteSha256 ||
    resolutionFile.sourceByteSha256 !== job.sourceJsonSha256 ||
    classificationFile.sourceByteSha256 !== job.sourceJsonSha256 ||
    (auditFile.sourceByteSha256 && auditFile.sourceByteSha256 !== job.sourceJsonSha256)
  ) {
    throw new Error("Resoluções, classificação ou auditoria não correspondem à fonte congelada do job.");
  }
  if (job.extractions.length !== job.expectedQuestionCount) {
    throw new Error(
      `Extrações incompletas no banco: ${job.extractions.length}/${job.expectedQuestionCount}.`,
    );
  }
  if (resolutionFile.resolutions.length !== job.expectedQuestionCount) {
    throw new Error(
      `Resoluções incompletas: ${resolutionFile.resolutions.length}/${job.expectedQuestionCount}.`,
    );
  }
  if (classificationFile.classifications.length !== job.expectedQuestionCount) {
    throw new Error(
      `Classificações incompletas: ${classificationFile.classifications.length}/${job.expectedQuestionCount}.`,
    );
  }

  const extractionByIdentity = new Map(
    job.extractions.map((item) => [
      `${item.officialNumber}:${item.officialLanguage}`,
      item,
    ]),
  );
  const classificationBySource = new Map(
    classificationFile.classifications.map((item) => [item.sourceId, item]),
  );
  if (classificationBySource.size !== job.expectedQuestionCount) {
    throw new Error("A classificação contém sourceId duplicado.");
  }

  for (const resolution of resolutionFile.resolutions) {
    const extraction = extractionByIdentity.get(
      `${resolution.officialNumber}:${resolution.language}`,
    );
    const classification = classificationBySource.get(resolution.sourceId);
    if (!extraction || extraction.sourceId !== resolution.sourceId) {
      throw new Error(`${resolution.sourceId}: resolução e extração não têm identidade 1:1.`);
    }
    if (
      !classification ||
      classification.officialNumber !== resolution.officialNumber ||
      classification.language !== resolution.language
    ) {
      throw new Error(`${resolution.sourceId}: resolução e classificação não têm identidade 1:1.`);
    }
    const expectedAnswer =
      extraction.answerKey.answerSituation === "ANNULLED"
        ? "ANULADA"
        : extraction.answerKey.correctAlternative;
    if (
      resolution.officialAnswer !== expectedAnswer ||
      !extraction.answerKey.sourceSha256 ||
      !extraction.answerKey.sourceUrl
    ) {
      throw new Error(`${resolution.sourceId}: gabarito autoral não coincide com o vínculo oficial.`);
    }
    const classificationFields = [
      "difficulty",
      "estimatedMinutes",
      "knowledgeArea",
      "disciplinaryComponent",
      "content",
      "subcontent",
    ] as const;
    if (classificationFields.some((field) => resolution[field] !== classification[field])) {
      throw new Error(`${resolution.sourceId}: a resolução diverge da classificação final.`);
    }
    const metadata = extraction.question.pedagogicalMetadata;
    const concepts = Array.isArray(metadata?.concepts) ? metadata.concepts.map(String) : [];
    if (
      !metadata ||
      metadata.knowledgeArea !== classification.knowledgeArea ||
      metadata.disciplinaryComponent !== classification.disciplinaryComponent ||
      metadata.competencyCode !== classification.competencyCode ||
      metadata.abilityCode !== classification.abilityCode ||
      metadata.cognitiveDemand !== classification.difficulty ||
      metadata.estimatedMinutes !== classification.estimatedMinutes ||
      concepts[0] !== classification.content ||
      concepts[1] !== classification.subcontent ||
      (approve
        ? metadata.reviewStatus !== QuestionReviewState.PENDING_REVIEW &&
          metadata.reviewStatus !== QuestionReviewState.APPROVED
        : metadata.reviewStatus !== QuestionReviewState.PENDING_REVIEW)
    ) {
      throw new Error(`${resolution.sourceId}: classificação persistida diverge do artefato auditado.`);
    }
  }

  const resolutionSha256 = createHash("sha256").update(resolutionRaw).digest("hex");
  const auditSha256 = createHash("sha256").update(auditRaw).digest("hex");
  const classificationSha256 = createHash("sha256").update(classificationRaw).digest("hex");
  if (verifyOnly) {
    console.log(
      JSON.stringify(
        {
          pilotId,
          verified: true,
          sourceByteSha256: job.sourceJsonSha256,
          resolutions: resolutionFile.resolutions.length,
          classifications: classificationFile.classifications.length,
          audited: auditFile.audited,
          resolutionSha256,
          auditSha256,
          classificationSha256,
          databaseWrites: 0,
        },
        null,
        2,
      ),
    );
    return;
  }
  const now = new Date();
  const resolutionStatus = publish
    ? OfficialResolutionStatus.PUBLISHED
    : approve
      ? OfficialResolutionStatus.APPROVED
      : OfficialResolutionStatus.IN_REVIEW;
  const reviewStatus = approve
    ? QuestionReviewState.APPROVED
    : QuestionReviewState.PENDING_REVIEW;

  await db.$transaction(
    async (tx) => {
      if (!publish && job.status === QuestionImportJobStatus.PUBLISHED) {
        await tx.questionImportJob.update({
          where: { id: job.id },
          data: { status: QuestionImportJobStatus.WAITING_REVIEW },
        });
      }

      for (const resolution of resolutionFile.resolutions) {
        const itemProvenance = resolutionFile.resolutionProvenance?.[
          resolution.sourceId
        ];
        const generatedByModel = itemProvenance?.model ?? resolutionFile.model;
        const generationEffort = itemProvenance?.effort ?? resolutionFile.effort;
        const generationMetadata = {
          ...itemProvenance,
          effort: generationEffort,
          auditPath,
          auditSha256,
          resolutionPath,
          resolutionSha256,
          classificationPath,
          classificationSha256,
          sourceByteSha256: job.sourceJsonSha256,
          finalResolutionSetHash: resolutionFile.finalResolutionSetHash,
        };
        const extraction = extractionByIdentity.get(
          `${resolution.officialNumber}:${resolution.language}`,
        );
        if (!extraction) {
          throw new Error(
            `${resolution.sourceId}: extração não localizada por número+idioma.`,
          );
        }
        // A classificação pedagógica já passou por auditoria própria. A
        // importação da resolução apenas verificou a equivalência 1:1 acima e
        // não regrava competência, habilidade ou sua proveniência.
        if (approve) {
          await tx.questionPedagogicalMetadata.update({
            where: { questionId: extraction.questionId },
            data: {
              reviewStatus: QuestionReviewState.APPROVED,
              reviewNotes: "Classificação preservada e aprovada após equivalência 1:1 com a resolução autoral auditada.",
              reviewedBy: actor,
              reviewedAt: now,
            },
          });
        }
        await tx.questionAuthorialResolution.upsert({
          where: {
            questionId_version: { questionId: extraction.questionId, version: 1 },
          },
          create: {
            questionId: extraction.questionId,
            importJobId: job.id,
            answerKeyId: extraction.answerKeyId,
            version: 1,
            status: resolutionStatus,
            reviewStatus,
            shortComment: resolution.shortComment,
            fullResolution: resolution.fullResolution,
            reasoningPath: jsonValue(resolution.reasoningPath),
            steps: jsonValue(resolution.steps),
            alternativeComments: jsonValue(resolution.alternativeComments),
            commonError: resolution.commonError,
            studyTip: resolution.studyTip,
            keywords: jsonValue(resolution.keywords),
            relatedContent: jsonValue(resolution.relatedContent),
            contentHash: contentHash(resolution),
            generatedByModel,
            generationMetadata: jsonValue(generationMetadata),
            generatedAt: now,
            authoredBy: actor,
            submittedAt: now,
            reviewedBy: approve ? actor : null,
            reviewedAt: approve ? now : null,
            publishedAt: publish ? now : null,
          },
          update: {
            answerKeyId: extraction.answerKeyId,
            status: resolutionStatus,
            reviewStatus,
            shortComment: resolution.shortComment,
            fullResolution: resolution.fullResolution,
            reasoningPath: jsonValue(resolution.reasoningPath),
            steps: jsonValue(resolution.steps),
            alternativeComments: jsonValue(resolution.alternativeComments),
            commonError: resolution.commonError,
            studyTip: resolution.studyTip,
            keywords: jsonValue(resolution.keywords),
            relatedContent: jsonValue(resolution.relatedContent),
            contentHash: contentHash(resolution),
            generatedByModel,
            generationMetadata: jsonValue(generationMetadata),
            generatedAt: now,
            authoredBy: actor,
            submittedAt: now,
            reviewedBy: approve ? actor : null,
            reviewedAt: approve ? now : null,
            publishedAt: publish ? now : null,
          },
        });
        await tx.officialAnswerKey.update({
          where: { id: extraction.answerKeyId },
          data: {
            resolutionStatus,
            generatedByModel,
            generatedAt: now,
            reviewedBy: approve ? actor : null,
            reviewedAt: approve ? now : null,
            publishedAt: publish ? now : null,
          },
        });

        if (publish) {
          await tx.question.update({
            where: { id: extraction.questionId },
            data: {
              explanation: resolution.fullResolution,
              pedagogyComment: resolution.shortComment,
              alternativeExplanations: JSON.stringify(
                resolution.alternativeComments,
              ),
            },
          });
          for (const letter of LETTERS) {
            await tx.questionAlternative.updateMany({
              where: { questionId: extraction.questionId, key: letter },
              data: { explanation: resolution.alternativeComments[letter] },
            });
          }
        }
      }

      const count = resolutionFile.resolutions.length;
      await tx.questionImportJob.update({
        where: { id: job.id },
        data: {
          requirePedagogicalReview: true,
          requireAuthorialResolution: true,
          approvedPedagogicalCount: approve ? count : 0,
          approvedResolutionCount: approve ? count : 0,
          publishedResolutionCount: publish ? count : 0,
          status: publish
            ? QuestionImportJobStatus.PUBLISHED
            : approve
              ? QuestionImportJobStatus.READY_TO_PUBLISH
              : QuestionImportJobStatus.WAITING_REVIEW,
          checkpoint: jsonValue({
            stage: publish
              ? "resolutions_published"
              : approve
                ? "resolutions_approved"
                : "resolutions_imported",
            resolutionPath,
            resolutionSha256,
            auditPath,
            auditSha256,
            classificationPath,
            classificationSha256,
            sourceByteSha256: job.sourceJsonSha256,
            actor,
            updatedAt: now.toISOString(),
          }),
        },
      });
    },
    { timeout: 120_000 },
  );

  const persisted = await db.questionAuthorialResolution.findMany({
    where: { importJobId: job.id },
    orderBy: { questionId: "asc" },
    select: {
      id: true,
      questionId: true,
      answerKeyId: true,
      version: true,
      status: true,
      reviewStatus: true,
      contentHash: true,
      generationMetadata: true,
    },
  });
  const persistedKeyStatusCount = await db.officialAnswerKey.count({
    where: {
      id: { in: job.extractions.map((item) => item.answerKeyId) },
      resolutionStatus,
    },
  });
  if (
    persisted.length !== job.expectedQuestionCount ||
    persistedKeyStatusCount !== job.expectedQuestionCount ||
    persisted.some(
      (item) =>
        !item.answerKeyId ||
        !item.contentHash ||
        item.status !== resolutionStatus ||
        item.reviewStatus !== reviewStatus,
    )
  ) {
    throw new Error("Verificação pós-importação das resoluções falhou.");
  }

  if (evidencePath) {
    const evidence = {
      schemaVersion: 1,
      pilotId,
      jobId: job.id,
      capturedAt: new Date().toISOString(),
      sourceByteSha256: job.sourceJsonSha256,
      resolutionPath,
      resolutionSha256,
      auditPath,
      auditSha256,
      classificationPath,
      classificationSha256,
      imported: persisted.length,
      status: resolutionStatus,
      reviewStatus,
      published: publish ? persisted.length : 0,
      officialAnswerKeysWithResolutionStatus: persistedKeyStatusCount,
      rows: persisted.map((item) => ({
        id: item.id,
        questionId: item.questionId,
        answerKeyId: item.answerKeyId,
        version: item.version,
        status: item.status,
        reviewStatus: item.reviewStatus,
        contentHash: item.contentHash,
        generationMetadataSha256: createHash("sha256")
          .update(JSON.stringify(item.generationMetadata))
          .digest("hex"),
      })),
    };
    const absolute = path.resolve(evidencePath);
    const payload = `${JSON.stringify(evidence, null, 2)}\n`;
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, payload, "utf8");
    await writeFile(
      `${absolute}.sha256`,
      `${createHash("sha256").update(payload).digest("hex")}  ${path.basename(absolute)}\n`,
      "utf8",
    );
  }

  console.log(
    JSON.stringify(
      {
        pilotId,
        resolutions: resolutionFile.resolutions.length,
        status: resolutionStatus,
        reviewStatus,
        published: publish,
        sourceByteSha256: job.sourceJsonSha256,
        resolutionSha256,
        auditSha256,
        classificationSha256,
        evidencePath: evidencePath ?? null,
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
  .finally(async () => {
    await db.$disconnect();
  });
