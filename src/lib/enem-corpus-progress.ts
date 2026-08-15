import "server-only";

import {
  OfficialResolutionStatus,
  Prisma,
  QuestionImportJobStatus,
  QuestionReviewState,
} from "@prisma/client";
import { db } from "@/lib/db";

const FIRST_ENEM_YEAR = 2009;
const LAST_ENEM_YEAR = 2025;

const corpusJobInclude = {
  essayProposal: true,
  provaAntiga: {
    select: {
      questoes: {
        select: {
          questaoId: true,
          needsHumanReview: true,
        },
      },
    },
  },
  extractions: {
    include: {
      answerKey: {
        select: {
          answerReviewStatus: true,
          answerSituation: true,
          sourceUrl: true,
          sourceSha256: true,
          validationStatus: true,
          resolutionStatus: true,
          fullResolution: true,
          reviewedAt: true,
        },
      },
      question: {
        select: {
          id: true,
          status: true,
          reviewState: true,
          imageItems: {
            where: { relation: "ADMIN_REFERENCE" },
            select: { id: true },
            take: 1,
          },
          authorialResolutions: {
            select: {
              status: true,
              reviewStatus: true,
              shortComment: true,
              fullResolution: true,
              alternativeComments: true,
              commonError: true,
              studyTip: true,
              reviewedAt: true,
              publishedAt: true,
            },
          },
          pedagogicalMetadata: {
            select: {
              reviewStatus: true,
              knowledgeArea: true,
              disciplinaryComponent: true,
              competencyCode: true,
              abilityCode: true,
              concepts: true,
              estimatedMinutes: true,
              reviewedAt: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.QuestionImportJobInclude;

type CorpusJob = Prisma.QuestionImportJobGetPayload<{
  include: typeof corpusJobInclude;
}>;

export type EnemCorpusGateKey =
  | "structure"
  | "answerKey"
  | "pedagogy"
  | "resolution"
  | "essay"
  | "visualReview"
  | "publication";

export type EnemCorpusBookletProgress = {
  year: number;
  day: 1 | 2;
  essayRequired: boolean;
  jobId: string | null;
  pilotId: string | null;
  jobStatus: string | null;
  expectedQuestions: number;
  gates: Record<EnemCorpusGateKey, boolean>;
  passedGates: number;
  totalGates: number;
  percentage: number;
  complete: boolean;
  issues: string[];
};

export type EnemCorpusProgress = {
  firstYear: number;
  lastYear: number;
  totalBooklets: number;
  representedBooklets: number;
  trackedJobs: number;
  completeBooklets: number;
  publishedBooklets: number;
  passedGates: number;
  totalGates: number;
  percentage: number;
  gateSummary: Record<EnemCorpusGateKey, { passed: number; total: number }>;
  booklets: EnemCorpusBookletProgress[];
};

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function reportErrors(report: Record<string, unknown>) {
  return Array.isArray(report.errors) ? report.errors : [];
}

function authorialCommentsComplete(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const comments = value as Record<string, unknown>;
  return ["A", "B", "C", "D", "E"].every(
    (letter) =>
      typeof comments[letter] === "string" &&
      comments[letter].trim().length >= 25,
  );
}

function completedPercentage(passed: number, total: number) {
  if (!total) return 0;
  if (passed === total) return 100;
  return Math.min(99, Math.floor((passed / total) * 100));
}

function enemEssayDay(year: number): 1 | 2 {
  // AtÃ© 2016, a redaÃ§Ã£o integrava o segundo dia. Desde 2017, integra o primeiro.
  return year >= 2017 ? 1 : 2;
}

function evaluateJob(
  job: CorpusJob,
  essayRequired: boolean,
): EnemCorpusBookletProgress {
  const expected = job.expectedQuestionCount;
  const report = jsonObject(job.validationReport);
  const importerReport = jsonObject(report.importer as Prisma.JsonValue);
  const reportQuestionCount = Number(report.questionCount ?? Number.NaN);
  const reportAnswerCount = Number(report.answerCount ?? Number.NaN);
  const sourceHashMatches =
    typeof report.sourceJsonSha256 !== "string" ||
    report.sourceJsonSha256 === job.sourceJsonSha256;
  const extractionCountMatches = job.extractions.length === expected;
  const legacyReportValid =
    report.valid === true &&
    reportErrors(report).length === 0 &&
    reportQuestionCount === expected &&
    reportAnswerCount === expected;
  const generalizedReportValid =
    importerReport.valid === true &&
    reportErrors(importerReport).length === 0 &&
    Number(importerReport.printedOccurrences ?? Number.NaN) === expected &&
    Number(importerReport.answerAssignments ?? Number.NaN) === expected;
  const structure =
    (legacyReportValid || generalizedReportValid) &&
    sourceHashMatches &&
    job.importedQuestionCount === expected &&
    extractionCountMatches &&
    job.extractions.every(
      (extraction) => extraction.extractionStatus === "EXTRACTED",
    );

  const answerKey =
    extractionCountMatches &&
    job.extractions.every(
      (extraction) =>
        extraction.answerKey.answerReviewStatus === "APPROVED" &&
        extraction.answerKey.answerSituation !== "PENDING_OFFICIAL_KEY" &&
        Boolean(extraction.answerKey.sourceUrl) &&
        Boolean(extraction.answerKey.sourceSha256) &&
        Boolean(extraction.answerKey.validationStatus),
    );

  const resolution =
    extractionCountMatches &&
    job.extractions.every((extraction) => {
      const normalizedResolution =
        extraction.question.authorialResolutions.some(
          (item) =>
            item.status === OfficialResolutionStatus.PUBLISHED &&
            item.reviewStatus === QuestionReviewState.APPROVED &&
            Boolean(item.shortComment?.trim()) &&
            Boolean(item.fullResolution?.trim()) &&
            authorialCommentsComplete(item.alternativeComments) &&
            Boolean(item.commonError?.trim()) &&
            Boolean(item.studyTip?.trim()) &&
            Boolean(item.reviewedAt) &&
            Boolean(item.publishedAt),
        );
      const legacyResolution =
        extraction.answerKey.resolutionStatus ===
          OfficialResolutionStatus.PUBLISHED &&
        Boolean(extraction.answerKey.fullResolution?.trim()) &&
        Boolean(extraction.answerKey.reviewedAt);
      return normalizedResolution || legacyResolution;
    });

  const pedagogy =
    extractionCountMatches &&
    job.extractions.every((extraction) => {
      const metadata = extraction.question.pedagogicalMetadata;
      const concepts = Array.isArray(metadata?.concepts)
        ? metadata.concepts
        : [];
      return (
        metadata?.reviewStatus === QuestionReviewState.APPROVED &&
        Boolean(metadata.knowledgeArea?.trim()) &&
        Boolean(metadata.disciplinaryComponent?.trim()) &&
        Boolean(metadata.competencyCode?.trim()) &&
        Boolean(metadata.abilityCode?.trim()) &&
        concepts.length >= 2 &&
        Boolean(metadata.estimatedMinutes && metadata.estimatedMinutes > 0) &&
        Boolean(metadata.reviewedAt)
      );
    });

  const linkByQuestion = new Map(
    job.provaAntiga.questoes.map((link) => [link.questaoId, link]),
  );
  const visualReview =
    extractionCountMatches &&
    job.extractions.every((extraction) => {
      const link = linkByQuestion.get(extraction.questionId);
      return (
        extraction.reviewStatus === QuestionReviewState.APPROVED &&
        extraction.question.reviewState === QuestionReviewState.APPROVED &&
        link?.needsHumanReview === false &&
        extraction.question.imageItems.length > 0
      );
    });

  const essay =
    !essayRequired ||
    (job.essayProposal?.reviewStatus === QuestionReviewState.APPROVED &&
      job.essayProposal.status === "PUBLISHED" &&
      Boolean(job.essayProposal.promptText.trim()) &&
      Boolean(job.essayProposal.reviewedAt) &&
      Boolean(job.essayProposal.publishedAt));

  const publication =
    job.status === QuestionImportJobStatus.PUBLISHED &&
    job.publishedQuestionCount === expected &&
    extractionCountMatches &&
    job.extractions.every(
      (extraction) => extraction.question.status === "PUBLISHED",
    );

  const gates = {
    structure,
    answerKey,
    pedagogy,
    resolution,
    essay,
    visualReview,
    publication,
  };
  const applicableGateKeys = (Object.keys(gates) as EnemCorpusGateKey[]).filter(
    (key) => key !== "essay" || essayRequired,
  );
  const passedGates = applicableGateKeys.filter((key) => gates[key]).length;
  const issues = [
    !structure && "Estrutura pendente",
    !answerKey && "Gabarito oficial pendente",
    !pedagogy && "Classificação pedagógica revisada pendente",
    !resolution && "Resolução autoral revisada pendente",
    essayRequired && !essay && "Proposta de redação revisada pendente",
    !visualReview && "Revisão visual pendente",
    !publication && "Publicação pendente",
  ].filter((issue): issue is string => Boolean(issue));

  return {
    year: job.year,
    day: job.day as 1 | 2,
    essayRequired,
    jobId: job.id,
    pilotId: job.pilotId,
    jobStatus: job.status,
    expectedQuestions: expected,
    gates,
    passedGates,
    totalGates: applicableGateKeys.length,
    percentage: completedPercentage(passedGates, applicableGateKeys.length),
    complete: passedGates === applicableGateKeys.length,
    issues,
  };
}

function missingBooklet(year: number, day: 1 | 2): EnemCorpusBookletProgress {
  const essayRequired = day === enemEssayDay(year);
  const gates = {
    structure: false,
    answerKey: false,
    pedagogy: false,
    resolution: false,
    essay: !essayRequired,
    visualReview: false,
    publication: false,
  };
  const totalGates = essayRequired ? 7 : 6;
  return {
    year,
    day,
    essayRequired,
    jobId: null,
    pilotId: null,
    jobStatus: null,
    expectedQuestions: 0,
    gates,
    passedGates: 0,
    totalGates,
    percentage: 0,
    complete: false,
    issues: ["Caderno ainda não importado"],
  };
}

export async function getEnemCorpusProgress(): Promise<EnemCorpusProgress> {
  const jobs = await db.questionImportJob.findMany({
    where: {
      vestibular: { equals: "ENEM", mode: "insensitive" },
      year: { gte: FIRST_ENEM_YEAR, lte: LAST_ENEM_YEAR },
      day: { in: [1, 2] },
    },
    include: corpusJobInclude,
    orderBy: { updatedAt: "desc" },
  });
  const jobsBySlot = new Map<string, EnemCorpusBookletProgress[]>();
  for (const job of jobs) {
    const evaluated = evaluateJob(job, job.day === enemEssayDay(job.year));
    const slot = `${job.year}-${job.day}`;
    jobsBySlot.set(slot, [...(jobsBySlot.get(slot) ?? []), evaluated]);
  }

  const booklets: EnemCorpusBookletProgress[] = [];
  for (let year = LAST_ENEM_YEAR; year >= FIRST_ENEM_YEAR; year -= 1) {
    for (const day of [1, 2] as const) {
      const candidates = jobsBySlot.get(`${year}-${day}`) ?? [];
      const best = candidates.sort(
        (left, right) =>
          Number(right.complete) - Number(left.complete) ||
          right.passedGates - left.passedGates ||
          right.percentage - left.percentage,
      )[0];
      booklets.push(best ?? missingBooklet(year, day));
    }
  }

  const gateKeys: EnemCorpusGateKey[] = [
    "structure",
    "answerKey",
    "pedagogy",
    "resolution",
    "essay",
    "visualReview",
    "publication",
  ];
  const gateSummary = Object.fromEntries(
    gateKeys.map((key) => {
      const applicable = booklets.filter(
        (booklet) => key !== "essay" || booklet.essayRequired,
      );
      return [
        key,
        {
          passed: applicable.filter((booklet) => booklet.gates[key]).length,
          total: applicable.length,
        },
      ];
    }),
  ) as EnemCorpusProgress["gateSummary"];
  const passedGates = booklets.reduce(
    (total, booklet) => total + booklet.passedGates,
    0,
  );
  const totalGates = booklets.reduce(
    (total, booklet) => total + booklet.totalGates,
    0,
  );

  return {
    firstYear: FIRST_ENEM_YEAR,
    lastYear: LAST_ENEM_YEAR,
    totalBooklets: booklets.length,
    representedBooklets: booklets.filter((booklet) => booklet.jobId).length,
    trackedJobs: jobs.length,
    completeBooklets: booklets.filter((booklet) => booklet.complete).length,
    publishedBooklets: booklets.filter((booklet) => booklet.gates.publication)
      .length,
    passedGates,
    totalGates,
    percentage: completedPercentage(passedGates, totalGates),
    gateSummary,
    booklets,
  };
}
