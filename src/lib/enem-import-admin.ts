import "server-only";

import {
  type Prisma,
  OfficialQuestionLanguage,
  QuestionAnswerSituation,
  QuestionImportJobStatus,
  QuestionReviewState,
} from "@prisma/client";
import { db } from "@/lib/db";

export const ENEM_2022_DAY_2_PILOT_ID = "enem-2022-dia-2-caderno-5-amarelo";
export const ENEM_2022_DAY_2_EXPECTED_EXAM_SHA256 =
  "068a960ff3fde64d89484995f1a323676c354ad1efa27c109f09a4bb90619756";
export const ENEM_2022_DAY_2_EXPECTED_KEY_SHA256 =
  "2aca83d7cf5e990f63318a525883d2e77ba2d2baf815566efb96287dbf631b11";
export const ENEM_2022_DAY_2_EXPECTED_EXAM_URL =
  "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_PV_impresso_D2_CD5.pdf";
export const ENEM_2022_DAY_2_EXPECTED_KEY_URL =
  "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_GB_impresso_D2_CD5.pdf";

export const pilotQuestionInclude = {
  questao: {
    include: {
      subject: true,
      topic: true,
      alternativeItems: { orderBy: { order: "asc" as const } },
      imageItems: { orderBy: [{ relation: "asc" as const }, { order: "asc" as const }] },
      blocks: {
        orderBy: { order: "asc" as const },
        include: { asset: true },
      },
      structuredExtraction: true,
      officialAnswerKey: { include: { file: true } },
      revisions: { orderBy: { createdAt: "desc" as const }, take: 20 },
    },
  },
} satisfies Prisma.ProvaAntigaQuestaoInclude;

export const pilotJobInclude = {
  provaAntiga: true,
  examFile: true,
  answerKeyFile: true,
  extractions: {
    orderBy: { officialNumber: "asc" as const },
    include: {
      question: {
        select: {
          id: true,
          questionNumber: true,
          statement: true,
          status: true,
          reviewState: true,
          answerSituation: true,
        },
      },
    },
  },
} satisfies Prisma.QuestionImportJobInclude;

export type PilotQuestionRecord = Prisma.ProvaAntigaQuestaoGetPayload<{
  include: typeof pilotQuestionInclude;
}>;

export type PilotJobRecord = Prisma.QuestionImportJobGetPayload<{
  include: typeof pilotJobInclude;
}>;

type ValidationReport = {
  valid?: boolean;
  errors?: unknown[];
  warnings?: unknown[];
  questionCount?: number;
  answerCount?: number;
  originalCropCount?: number;
  sourceJsonSha256?: string;
  publicationGate?: unknown;
};

function objectValue(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function validationReportOf(value: Prisma.JsonValue): ValidationReport {
  return objectValue(value) as ValidationReport;
}

export function structuralReportPassed(job: Pick<PilotJobRecord, "validationReport" | "sourceJsonSha256">) {
  const report = validationReportOf(job.validationReport);
  return (
    report.valid === true &&
    Array.isArray(report.errors) &&
    report.errors.length === 0 &&
    report.questionCount === 90 &&
    report.answerCount === 90 &&
    report.originalCropCount === 90 &&
    report.sourceJsonSha256 === job.sourceJsonSha256
  );
}

export function isExactPilotJob(job: {
  pilotId: string;
  vestibular: string;
  year: number;
  day: number;
  bookletNumber: number;
  bookletColor: string;
  expectedQuestionCount: number;
  examFile: { sha256Hash: string; originalUrl: string };
  answerKeyFile: { sha256Hash: string; originalUrl: string };
}) {
  return (
    job.pilotId === ENEM_2022_DAY_2_PILOT_ID &&
    job.vestibular.toUpperCase() === "ENEM" &&
    job.year === 2022 &&
    job.day === 2 &&
    job.bookletNumber === 5 &&
    job.bookletColor.toLocaleLowerCase("pt-BR") === "amarelo" &&
    job.expectedQuestionCount === 90 &&
    job.examFile.sha256Hash === ENEM_2022_DAY_2_EXPECTED_EXAM_SHA256 &&
    job.examFile.originalUrl === ENEM_2022_DAY_2_EXPECTED_EXAM_URL &&
    job.answerKeyFile.sha256Hash === ENEM_2022_DAY_2_EXPECTED_KEY_SHA256 &&
    job.answerKeyFile.originalUrl === ENEM_2022_DAY_2_EXPECTED_KEY_URL
  );
}

export async function findPilotJob(jobId: string) {
  const job = await db.questionImportJob.findUnique({
    where: { id: jobId },
    include: pilotJobInclude,
  });
  if (!job || !isExactPilotJob(job)) return null;
  return job;
}

export async function findPilotQuestion(job: PilotJobRecord, officialNumber: number) {
  if (!Number.isInteger(officialNumber) || officialNumber < 91 || officialNumber > 180) return null;
  return db.provaAntigaQuestao.findUnique({
    where: {
      provaAntigaId_numeroQuestao_officialLanguage: {
        provaAntigaId: job.provaAntigaId,
        numeroQuestao: officialNumber,
        officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
      },
    },
    include: pilotQuestionInclude,
  });
}

function jsonFlags(value: Prisma.JsonValue) {
  const flags = objectValue(value);
  return {
    requiresVisualInterpretation: flags.requiresVisualInterpretation === true,
  };
}

function containsOtherQuestionMarker(text: string, currentNumber: number) {
  const matches = text.matchAll(/(?:QUEST[ÃA]O|QUESTÃO)\s+(\d{1,3})/giu);
  return [...matches].some((match) => Number(match[1]) !== currentNumber);
}

/**
 * The automatic checks deliberately stop short of claiming visual legibility.
 * APPROVED is the administrator's explicit record that the facsimile, images,
 * ordering and mobile preview were compared with the official page.
 */
export function questionReviewIssues(job: PilotJobRecord, record: PilotQuestionRecord) {
  const issues: string[] = [];
  const question = record.questao;
  const extraction = question.structuredExtraction;
  const key = question.officialAnswerKey;
  const number = record.numeroQuestao;
  const alternatives = question.alternativeItems;

  if (!isExactPilotJob(job)) issues.push("O job não corresponde ao piloto ENEM 2022, 2º dia, Caderno 5 Amarelo.");
  if (number < 91 || number > 180 || question.questionNumber !== number || record.ordem !== number - 90) {
    issues.push("Número ou ordem oficial da questão está incorreto.");
  }
  if (question.year !== 2022 || question.day !== "2º dia") {
    issues.push("Ano ou dia da questão diverge do piloto.");
  }
  if (!question.statement.trim()) issues.push("O enunciado/comando está vazio.");
  if (question.statement.length > 30_000 || (question.supportText?.length ?? 0) > 60_000) {
    issues.push("O texto excede o limite editorial seguro.");
  }
  const combinedText = [question.supportText, question.statement, ...alternatives.map((item) => item.text)]
    .filter(Boolean)
    .join("\n");
  if (containsOtherQuestionMarker(combinedText, number)) {
    issues.push("Há marcador textual de outra questão misturado ao conteúdo.");
  }
  if (alternatives.length !== 5 || alternatives.map((item) => item.key).join("") !== "ABCDE") {
    issues.push("As alternativas precisam ser exatamente A–E e estar em ordem.");
  }
  alternatives.forEach((alternative, index) => {
    if (alternative.order !== index) issues.push(`A alternativa ${alternative.key} está fora de ordem.`);
    if (!alternative.text.trim() && !alternative.imageUrl) {
      issues.push(`A alternativa ${alternative.key} não tem texto nem imagem.`);
    }
    if (alternative.confidence === null || alternative.confidence < 0 || alternative.confidence > 1) {
      issues.push(`A confiança da alternativa ${alternative.key} é inválida.`);
    }
    if (
      alternative.imageUrl &&
      !alternative.imageUrl.startsWith("/api/questions/assets/enem/2022/dia-2/")
    ) {
      issues.push(`A imagem da alternativa ${alternative.key} não usa a rota canônica do piloto.`);
    }
  });
  if (!extraction || extraction.importJobId !== job.id || extraction.officialNumber !== number) {
    issues.push("A extração estruturada não está vinculada corretamente ao job.");
  } else {
    if (
      extraction.officialOrder !== number - 90 ||
      extraction.officialPdfPageStart < 1 ||
      extraction.officialPdfPageEnd > 32 ||
      extraction.officialPdfPageStart > extraction.officialPdfPageEnd ||
      extraction.consolidatedPdfPageStart < 898 ||
      extraction.consolidatedPdfPageEnd > 929 ||
      extraction.consolidatedPdfPageStart > extraction.consolidatedPdfPageEnd
    ) {
      issues.push("Páginas, ordem ou intervalo da extração são inválidos.");
    }
    const confidences = [
      extraction.confidenceText,
      extraction.confidenceAlternatives,
      extraction.confidenceImages,
      extraction.confidenceAnswer,
      extraction.confidenceClassification,
      extraction.confidenceOverall,
    ];
    if (confidences.some((value) => value < 0 || value > 1)) {
      issues.push("Há confiança fora do intervalo 0–1.");
    }
    if (!extraction.originalPageUrl.trim()) issues.push("A página original não está disponível ao administrador.");
  }
  if (!question.blocks.length || question.blocks.some((block, index) => block.order !== index)) {
    issues.push("Os blocos do enunciado estão ausentes ou fora de ordem.");
  }
  question.blocks.forEach((block) => {
    if (!block.content.trim()) issues.push(`O bloco ${block.order + 1} está vazio.`);
    if (block.type === "IMAGE" && (!block.asset || block.asset.assetType !== "PROMPT_FACSIMILE")) {
      issues.push(`O bloco visual ${block.order + 1} não possui fac-símile relacionado.`);
    }
    if (
      block.sourcePdfPage < 1 ||
      block.sourcePdfPage > 32 ||
      block.consolidatedPdfPage < 898 ||
      block.consolidatedPdfPage > 929 ||
      block.regionWidth <= 0 ||
      block.regionHeight <= 0 ||
      block.normalizedX < 0 ||
      block.normalizedY < 0 ||
      block.normalizedWidth <= 0 ||
      block.normalizedHeight <= 0 ||
      block.normalizedX + block.normalizedWidth > 1.000_001 ||
      block.normalizedY + block.normalizedHeight > 1.000_001
    ) {
      issues.push(`As coordenadas do bloco ${block.order + 1} são inválidas.`);
    }
  });
  const originalReferences = question.imageItems.filter(
    (image) => image.relation === "ADMIN_REFERENCE" && image.assetType === "ORIGINAL_REFERENCE",
  );
  if (!originalReferences.length) issues.push("O recorte original para conferência administrativa está ausente.");
  question.imageItems.forEach((image) => {
    if (!image.url || !image.sha256Hash || !image.width || !image.height) {
      issues.push(`A mídia ${image.order + 1} não possui URL, hash ou dimensões completas.`);
    }
  });
  if (
    extraction &&
    jsonFlags(extraction.flags).requiresVisualInterpretation &&
    !question.imageItems.some((image) => image.relation === "STATEMENT" || image.relation === "ALTERNATIVE")
  ) {
    issues.push("A questão exige interpretação visual, mas não possui mídia estudantil relacionada.");
  }
  if (!key || key.questionId !== question.id || !extraction || extraction.answerKeyId !== key?.id) {
    issues.push("O gabarito oficial não está relacionado diretamente à questão.");
  } else {
    if (
      key.fileId !== job.answerKeyFileId ||
      key.sourceUrl !== ENEM_2022_DAY_2_EXPECTED_KEY_URL ||
      key.sourceSha256 !== ENEM_2022_DAY_2_EXPECTED_KEY_SHA256 ||
      key.validationStatus !== "validated_against_official_pdf"
    ) {
      issues.push("A proveniência do gabarito não corresponde ao PDF oficial do Caderno 5.");
    }
  }
  if (question.reviewState === QuestionReviewState.APPROVED) {
    const latestRevisionAction = question.revisions[0]?.action;
    const currentApprovalRevision =
      latestRevisionAction === "APPROVED" ||
      (job.status === QuestionImportJobStatus.PUBLISHED && latestRevisionAction === "PUBLISHED");
    if (
      extraction?.reviewStatus !== QuestionReviewState.APPROVED ||
      record.needsHumanReview ||
      key?.answerReviewStatus !== "APPROVED" ||
      !key.answerReviewedBy ||
      !key.answerReviewedAt ||
      !currentApprovalRevision
    ) {
      issues.push("A aprovação não possui os cinco sinais transacionais completos.");
    }
  }
  if (number === 175) {
    if (
      question.answerSituation !== QuestionAnswerSituation.ANNULLED ||
      key?.answerSituation !== QuestionAnswerSituation.ANNULLED ||
      question.correctAlternative !== "ANULADA" ||
      key?.correctAlternative !== "ANULADA" ||
      alternatives.some((alternative) => alternative.correct)
    ) {
      issues.push("A questão 175 deve estar anulada, sem alternativa correta inventada.");
    }
  } else {
    const correct = alternatives.filter((alternative) => alternative.correct);
    if (
      question.answerSituation !== QuestionAnswerSituation.CONFIRMED ||
      key?.answerSituation !== QuestionAnswerSituation.CONFIRMED ||
      !/^[A-E]$/.test(question.correctAlternative) ||
      key?.correctAlternative !== question.correctAlternative ||
      correct.length !== 1 ||
      correct[0]?.key !== question.correctAlternative
    ) {
      issues.push("A correção diverge do gabarito oficial relacionado.");
    }
  }
  return [...new Set(issues)];
}

export type PilotGate = {
  ready: boolean;
  structural: boolean;
  expected: number;
  imported: number;
  approved: number;
  published: number;
  pending: number;
  errors: number;
  issues: string[];
};

export async function calculatePilotGate(job: PilotJobRecord): Promise<PilotGate> {
  const records = await db.provaAntigaQuestao.findMany({
    where: { provaAntigaId: job.provaAntigaId },
    orderBy: { numeroQuestao: "asc" },
    include: pilotQuestionInclude,
  });
  const issues: string[] = [];
  if (!isExactPilotJob(job)) issues.push("Identidade canônica do piloto inválida.");
  if (!structuralReportPassed(job)) issues.push("Relatório estrutural não passou integralmente.");
  if (records.length !== 90) issues.push(`Foram persistidas ${records.length}/90 questões.`);
  const expectedNumbers = Array.from({ length: 90 }, (_, index) => index + 91).join(",");
  if (records.map((record) => record.numeroQuestao).join(",") !== expectedNumbers) {
    issues.push("A sequência oficial 91–180 possui lacuna ou duplicidade.");
  }
  let approved = 0;
  let published = 0;
  let errors = 0;
  for (const record of records) {
    const rowIssues = questionReviewIssues(job, record);
    if (rowIssues.length) {
      errors += 1;
      issues.push(`Questão ${record.numeroQuestao}: ${rowIssues.join(" ")}`);
    }
    if (
      record.questao.reviewState === QuestionReviewState.APPROVED &&
      record.questao.structuredExtraction?.reviewStatus === QuestionReviewState.APPROVED &&
      !record.needsHumanReview &&
      record.questao.officialAnswerKey?.answerReviewStatus === "APPROVED" &&
      Boolean(record.questao.officialAnswerKey.answerReviewedBy) &&
      Boolean(record.questao.officialAnswerKey.answerReviewedAt) &&
      (record.questao.revisions[0]?.action === "APPROVED" ||
        (job.status === QuestionImportJobStatus.PUBLISHED &&
          record.questao.revisions[0]?.action === "PUBLISHED"))
    ) {
      approved += 1;
    }
    if (record.questao.status === "PUBLISHED") published += 1;
  }
  if (job.importedQuestionCount !== 90) issues.push("O contador de importação não está em 90/90.");
  if (job.approvedQuestionCount !== approved) {
    issues.push(`O contador do job (${job.approvedQuestionCount}) diverge das ${approved} aprovações válidas.`);
  }
  if (approved !== 90) issues.push(`A revisão humana está em ${approved}/90.`);
  if (job.status !== QuestionImportJobStatus.PUBLISHED && published > 0) {
    issues.push("Há questão publicada fora do gate atômico do piloto.");
  }
  return {
    ready: issues.length === 0,
    structural: structuralReportPassed(job),
    expected: 90,
    imported: records.length,
    approved,
    published,
    pending: Math.max(0, 90 - approved),
    errors,
    issues: [...new Set(issues)],
  };
}

export async function refreshPilotJobCounters(jobId: string) {
  const job = await findPilotJob(jobId);
  if (!job) return null;
  const records = await db.provaAntigaQuestao.findMany({
    where: { provaAntigaId: job.provaAntigaId },
    select: {
      needsHumanReview: true,
      questao: {
        select: {
          status: true,
          reviewState: true,
          structuredExtraction: { select: { reviewStatus: true } },
          officialAnswerKey: {
            select: {
              answerReviewStatus: true,
              answerReviewedBy: true,
              answerReviewedAt: true,
            },
          },
          revisions: {
            orderBy: { createdAt: "desc" },
            select: { id: true, action: true },
            take: 1,
          },
        },
      },
    },
  });
  const approved = records.filter(
    (record) =>
      record.questao.reviewState === QuestionReviewState.APPROVED &&
      record.questao.structuredExtraction?.reviewStatus === QuestionReviewState.APPROVED &&
      !record.needsHumanReview &&
      record.questao.officialAnswerKey?.answerReviewStatus === "APPROVED" &&
      Boolean(record.questao.officialAnswerKey.answerReviewedBy) &&
      Boolean(record.questao.officialAnswerKey.answerReviewedAt) &&
      (record.questao.revisions[0]?.action === "APPROVED" ||
        (job.status === QuestionImportJobStatus.PUBLISHED &&
          record.questao.revisions[0]?.action === "PUBLISHED")),
  ).length;
  const published = records.filter((record) => record.questao.status === "PUBLISHED").length;
  const nextStatus =
    published === 90
      ? QuestionImportJobStatus.PUBLISHED
      : approved === 90 && structuralReportPassed(job)
        ? QuestionImportJobStatus.READY_TO_PUBLISH
        : QuestionImportJobStatus.WAITING_REVIEW;
  await db.questionImportJob.update({
    where: { id: job.id },
    data: {
      approvedQuestionCount: approved,
      publishedQuestionCount: published,
      status: nextStatus,
    },
  });
  return { approved, published, status: nextStatus };
}

export function serializePilotQuestion(job: PilotJobRecord, record: PilotQuestionRecord) {
  const question = record.questao;
  const extraction = question.structuredExtraction!;
  const answerKey = question.officialAnswerKey!;
  const sourceMetadata = objectValue(extraction.sourceMetadata);
  const issues = questionReviewIssues(job, record);
  return {
    job: {
      id: job.id,
      pilotId: job.pilotId,
      status: job.status,
      year: job.year,
      day: job.day,
      application: job.application,
      modality: job.modality,
      bookletNumber: job.bookletNumber,
      bookletColor: job.bookletColor,
      expected: job.expectedQuestionCount,
      imported: job.importedQuestionCount,
      approved: job.approvedQuestionCount,
      published: job.publishedQuestionCount,
      examUrl: job.examFile.storageUrl,
      officialExamUrl: job.examFile.originalUrl,
      answerKeyUrl: job.answerKeyFile.storageUrl,
      officialAnswerKeyUrl: job.answerKeyFile.originalUrl,
    },
    link: {
      number: record.numeroQuestao,
      order: record.ordem,
      page: record.paginaPdf,
      pageStart: record.pageStart,
      pageEnd: record.pageEnd,
      needsHumanReview: record.needsHumanReview,
    },
    question: {
      id: question.id,
      year: question.year,
      day: question.day,
      number: question.questionNumber,
      exam: question.exam,
      difficulty: question.difficulty,
      subjectId: question.subjectId,
      subject: question.subject.name,
      topicId: question.topicId,
      topic: question.topic?.name ?? null,
      statement: question.statement,
      supportText: question.supportText ?? "",
      skill: question.skill ?? "",
      reviewState: question.reviewState,
      reviewNotes: question.reviewNotes ?? "",
      status: question.status,
      answerSituation: question.answerSituation,
      correctAlternative: question.correctAlternative,
      sourceUrl: question.sourceUrl,
      sourceCitation: question.sourceCitation,
      updatedAt: question.updatedAt.toISOString(),
    },
    alternatives: question.alternativeItems.map((alternative) => ({
      id: alternative.id,
      key: alternative.key,
      order: alternative.order,
      text: alternative.text,
      imageUrl: alternative.imageUrl,
      correct: alternative.correct,
      sourcePdfPage: alternative.sourcePdfPage,
      consolidatedPdfPage: alternative.consolidatedPdfPage,
      confidence: alternative.confidence,
    })),
    blocks: question.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      order: block.order,
      content: block.content,
      assetUrl: block.asset?.url ?? null,
      sourcePdfPage: block.sourcePdfPage,
      consolidatedPdfPage: block.consolidatedPdfPage,
      confidence: block.confidence,
      normalizedRegion: {
        x: block.normalizedX,
        y: block.normalizedY,
        width: block.normalizedWidth,
        height: block.normalizedHeight,
      },
    })),
    images: question.imageItems.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      description: image.description,
      order: image.order,
      width: image.width,
      height: image.height,
      assetType: image.assetType,
      relation: image.relation,
      alternativeKey: image.alternativeKey,
      sourcePdfPage: image.sourcePdfPage,
      consolidatedPdfPage: image.consolidatedPdfPage,
    })),
    extraction: {
      id: extraction.id,
      status: extraction.extractionStatus,
      reviewStatus: extraction.reviewStatus,
      officialNumber: extraction.officialNumber,
      officialOrder: extraction.officialOrder,
      officialPdfPageStart: extraction.officialPdfPageStart,
      officialPdfPageEnd: extraction.officialPdfPageEnd,
      consolidatedPdfPageStart: extraction.consolidatedPdfPageStart,
      consolidatedPdfPageEnd: extraction.consolidatedPdfPageEnd,
      originalPageUrl: extraction.originalPageUrl,
      answerSituation: extraction.answerSituation,
      confidence: {
        text: extraction.confidenceText,
        alternatives: extraction.confidenceAlternatives,
        images: extraction.confidenceImages,
        answer: extraction.confidenceAnswer,
        classification: extraction.confidenceClassification,
        overall: extraction.confidenceOverall,
      },
      flags: objectValue(extraction.flags),
      sourceMetadata,
    },
    answerKey: {
      id: answerKey.id,
      questionNumber: answerKey.questionNumber,
      correctAlternative: answerKey.correctAlternative,
      answerSituation: answerKey.answerSituation,
      reviewStatus: answerKey.answerReviewStatus,
      reviewedBy: answerKey.answerReviewedBy,
      reviewedAt: answerKey.answerReviewedAt?.toISOString() ?? null,
      sourceUrl: answerKey.sourceUrl,
      sourceSha256: answerKey.sourceSha256,
      sourcePdfPage: answerKey.sourcePdfPage,
      validationStatus: answerKey.validationStatus,
    },
    revisions: question.revisions.map((revision) => ({
      id: revision.id,
      action: revision.action,
      actor: revision.actor,
      notes: revision.notes,
      createdAt: revision.createdAt.toISOString(),
    })),
    issues,
  };
}
