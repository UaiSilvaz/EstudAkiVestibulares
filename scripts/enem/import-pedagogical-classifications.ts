import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  Prisma,
  PrismaClient,
  QuestionImportJobStatus,
  QuestionReviewState,
} from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

type Classification = {
  sourceId: string;
  officialNumber: number;
  language: string;
  knowledgeArea: string;
  disciplinaryComponent: string;
  content: string;
  subcontent: string;
  competencyCode: string;
  abilityCode: string;
  cognitiveAxes: string[];
  difficulty: string;
  estimatedMinutes: number;
  interdisciplinary: boolean;
  interdisciplinaryAreas: string[];
  reasoningTypes: string[];
  requiresCalculation: boolean;
  requiresVisualInterpretation: boolean;
  confidence: number;
  reviewRequired: boolean;
  rationale: string;
  competencyDescription: string;
  abilityDescription: string;
};

type ClassificationFile = {
  sourceByteSha256: string;
  sourceHash: string;
  matrixPath: string;
  matrixPdfSha256: string;
  expected: number;
  classified: number;
  complete: boolean;
  reviewRequired: number;
  classifications: Classification[];
};

type AuditFile = {
  expected: number;
  audited: number;
  passed: number;
  failed: number;
  complete: boolean;
  canApprove: boolean;
  audits: Array<{ sourceId: string; verdict: "PASS" | "FAIL" }>;
};

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function has(name: string) {
  return process.argv.includes(name);
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function main() {
  const pilotId = argument("--pilot-id");
  const classificationPath = argument("--classifications");
  const auditPath = argument("--audit");
  const evidencePath = argument("--evidence");
  const actor = argument("--actor") ?? "estudaki-editorial-codex";
  if (!pilotId || !classificationPath || !auditPath || !has("--confirm-import")) {
    throw new Error(
      "Use --pilot-id, --classifications, --audit e --confirm-import. A importação permanece em REVIEW.",
    );
  }
  const classificationAbsolute = path.resolve(classificationPath);
  const auditAbsolute = path.resolve(auditPath);
  const [classificationRaw, auditRaw] = await Promise.all([
    readFile(classificationAbsolute, "utf8"),
    readFile(auditAbsolute, "utf8"),
  ]);
  const file = JSON.parse(classificationRaw) as ClassificationFile;
  const audit = JSON.parse(auditRaw) as AuditFile;
  const expected = file.expected;
  if (
    !Number.isInteger(expected) ||
    expected <= 0 ||
    !/^[a-f0-9]{64}$/i.test(file.sourceByteSha256 ?? "") ||
    !file.complete ||
    file.classified !== expected ||
    file.reviewRequired !== 0 ||
    file.classifications.length !== expected
  ) {
    throw new Error(
      `A classificação final não comprova cobertura integral ${expected}/${expected} sem pendências e com hash da fonte.`,
    );
  }
  if (
    !audit.complete ||
    !audit.canApprove ||
    audit.expected !== expected ||
    audit.audited !== expected ||
    audit.passed !== expected ||
    audit.failed !== 0 ||
    audit.audits.length !== expected
  ) {
    throw new Error(
      `A auditoria pedagógica não aprovou ${expected}/${expected} classificações.`,
    );
  }
  const auditById = new Map(audit.audits.map((item) => [item.sourceId, item.verdict]));
  const sourceIds = new Set<string>();
  for (const item of file.classifications) {
    if (
      !item.sourceId ||
      sourceIds.has(item.sourceId) ||
      auditById.get(item.sourceId) !== "PASS" ||
      item.reviewRequired ||
      item.confidence < 0.85 ||
      !item.competencyCode ||
      !item.abilityCode ||
      !item.content ||
      !item.subcontent ||
      item.estimatedMinutes < 1
    ) {
      throw new Error(`${item.sourceId}: classificação inválida ou sem PASS rastreável.`);
    }
    sourceIds.add(item.sourceId);
  }
  const job = await db.questionImportJob.findUnique({
    where: { pilotId },
    include: {
      extractions: {
        select: {
          questionId: true,
          sourceId: true,
          officialNumber: true,
          officialLanguage: true,
        },
      },
    },
  });
  if (!job || job.status === QuestionImportJobStatus.PUBLISHED) {
    throw new Error("Job ausente ou já publicado.");
  }
  if (
    job.extractions.length !== expected ||
    job.expectedQuestionCount !== expected ||
    job.sourceJsonSha256 !== file.sourceByteSha256
  ) {
    throw new Error("O job não corresponde à fonte congelada 95/95.");
  }
  const extractionBySourceId = new Map(
    job.extractions.map((item) => [item.sourceId, item]),
  );
  const classificationSha256 = sha256(classificationRaw);
  const auditSha256 = sha256(auditRaw);
  await db.$transaction(
    async (tx) => {
      for (const item of file.classifications) {
        const extraction = extractionBySourceId.get(item.sourceId);
        if (
          !extraction ||
          extraction.officialNumber !== item.officialNumber ||
          extraction.officialLanguage !== item.language
        ) {
          throw new Error(`${item.sourceId}: identidade não corresponde à extração.`);
        }
        const provenance = {
          sourceId: item.sourceId,
          sourceByteSha256: file.sourceByteSha256,
          classificationSourceHash: file.sourceHash,
          classificationPath,
          classificationSha256,
          auditPath,
          auditSha256,
          matrixPath: file.matrixPath,
          matrixPdfSha256: file.matrixPdfSha256,
          requiresVisualInterpretation: item.requiresVisualInterpretation,
          reasoningTypes: item.reasoningTypes,
          requiresCalculation: item.requiresCalculation,
          interdisciplinary: item.interdisciplinary,
          interdisciplinaryAreas: item.interdisciplinaryAreas,
          rationale: item.rationale,
          importedBy: actor,
        };
        await tx.questionPedagogicalMetadata.upsert({
          where: { questionId: extraction.questionId },
          create: {
            questionId: extraction.questionId,
            importJobId: job.id,
            knowledgeArea: item.knowledgeArea,
            disciplinaryComponent: item.disciplinaryComponent,
            competencyCode: item.competencyCode,
            competencyDescription: item.competencyDescription,
            abilityCode: item.abilityCode,
            abilityDescription: item.abilityDescription,
            cognitiveDemand: item.difficulty,
            learningObjectives: jsonValue([item.rationale]),
            concepts: jsonValue([item.content, item.subcontent]),
            curriculumCodes: jsonValue([
              item.competencyCode,
              item.abilityCode,
              ...item.cognitiveAxes,
            ]),
            keywords: jsonValue([
              item.content,
              item.subcontent,
              ...item.reasoningTypes,
            ]),
            estimatedMinutes: item.estimatedMinutes,
            classificationSource: "Matriz de Referência ENEM + revisão editorial EstudAki",
            classificationConfidence: item.confidence,
            reviewStatus: QuestionReviewState.PENDING_REVIEW,
            reviewNotes: `Classificação auditada no artefato ${expected}/${expected}; permanece em REVIEW até validação do fluxo real.`,
            reviewedBy: null,
            reviewedAt: null,
            provenance: jsonValue(provenance),
          },
          update: {
            importJobId: job.id,
            knowledgeArea: item.knowledgeArea,
            disciplinaryComponent: item.disciplinaryComponent,
            competencyCode: item.competencyCode,
            competencyDescription: item.competencyDescription,
            abilityCode: item.abilityCode,
            abilityDescription: item.abilityDescription,
            cognitiveDemand: item.difficulty,
            learningObjectives: jsonValue([item.rationale]),
            concepts: jsonValue([item.content, item.subcontent]),
            curriculumCodes: jsonValue([
              item.competencyCode,
              item.abilityCode,
              ...item.cognitiveAxes,
            ]),
            keywords: jsonValue([
              item.content,
              item.subcontent,
              ...item.reasoningTypes,
            ]),
            estimatedMinutes: item.estimatedMinutes,
            classificationSource: "Matriz de Referência ENEM + revisão editorial EstudAki",
            classificationConfidence: item.confidence,
            reviewStatus: QuestionReviewState.PENDING_REVIEW,
            reviewNotes: `Classificação auditada no artefato ${expected}/${expected}; permanece em REVIEW até validação do fluxo real.`,
            reviewedBy: null,
            reviewedAt: null,
            provenance: jsonValue(provenance),
          },
        });
      }
      await tx.questionImportJob.update({
        where: { id: job.id },
        data: {
          requirePedagogicalReview: true,
          approvedPedagogicalCount: 0,
          status: QuestionImportJobStatus.WAITING_REVIEW,
          checkpoint: jsonValue({
            stage: "pedagogical_classifications_imported_review",
            sourceByteSha256: file.sourceByteSha256,
            classificationPath,
            classificationSha256,
            auditPath,
            auditSha256,
            imported: expected,
            actor,
          }),
        },
      });
    },
    { timeout: 120_000 },
  );
  const persisted = await db.questionPedagogicalMetadata.findMany({
    where: { importJobId: job.id },
    orderBy: { questionId: "asc" },
  });
  if (
    persisted.length !== expected ||
    persisted.some(
      (item) =>
        item.reviewStatus !== QuestionReviewState.PENDING_REVIEW ||
        !item.competencyCode ||
        !item.abilityCode,
    )
  ) {
    throw new Error("Verificação pós-importação da classificação falhou.");
  }
  const evidence = {
    schemaVersion: 1,
    pilotId,
    jobId: job.id,
    capturedAt: new Date().toISOString(),
    status: "REVIEW",
    sourceByteSha256: file.sourceByteSha256,
    classificationPath,
    classificationSha256,
    auditPath,
    auditSha256,
    imported: persisted.length,
    pendingReview: persisted.filter(
      (item) => item.reviewStatus === QuestionReviewState.PENDING_REVIEW,
    ).length,
    approved: 0,
    rows: persisted.map((item) => ({
      id: item.id,
      questionId: item.questionId,
      knowledgeArea: item.knowledgeArea,
      disciplinaryComponent: item.disciplinaryComponent,
      competencyCode: item.competencyCode,
      abilityCode: item.abilityCode,
      estimatedMinutes: item.estimatedMinutes,
      confidence: item.classificationConfidence,
      reviewStatus: item.reviewStatus,
      provenanceSha256: sha256(JSON.stringify(item.provenance)),
    })),
  };
  if (evidencePath) {
    const absolute = path.resolve(evidencePath);
    const payload = `${JSON.stringify(evidence, null, 2)}\n`;
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, payload, "utf8");
    await writeFile(
      `${absolute}.sha256`,
      `${sha256(payload)}  ${path.basename(absolute)}\n`,
      "utf8",
    );
  }
  console.log(
    JSON.stringify(
      {
        pilotId,
        imported: persisted.length,
        status: "REVIEW",
        approved: 0,
        classificationSha256,
        auditSha256,
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
  .finally(async () => db.$disconnect());
