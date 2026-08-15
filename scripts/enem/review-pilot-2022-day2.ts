import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  OfficialAnswerReviewStatus,
  OfficialQuestionLanguage,
  Prisma,
  PrismaClient,
  QuestionAnswerSituation,
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

loadEnvConfig(process.cwd());
const db = new PrismaClient();

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type VisualAuditRow = {
  sourceId: string;
  officialNumber: number;
  verdict: "PASS" | "FAIL";
  statementFidelity: "PASS" | "FAIL";
  elementOrder: "PASS" | "FAIL";
  alternativeFidelity: "PASS" | "FAIL";
  imageLegibility: "PASS" | "FAIL";
  questionIsolation: "PASS" | "FAIL";
  inspectedFiles: string[];
  inspectedFileHashes: Record<string, string>;
  issueCodes: string[];
  evidence: string;
};

type VisualAudit = {
  questionsSha256: string;
  expected: number;
  audited: number;
  passed: number;
  failed: number;
  complete: boolean;
  canApprove: boolean;
  audits: VisualAuditRow[];
};

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

async function readVisualAudit(
  auditInput: string,
  sourceJsonSha256: string,
  sourceId: string,
  officialNumber: number,
) {
  const absolute = path.resolve(auditInput);
  const raw = await readFile(absolute);
  const audit = JSON.parse(raw.toString("utf8")) as VisualAudit;
  if (
    audit.questionsSha256 !== sourceJsonSha256 ||
    audit.expected !== 90 ||
    audit.audited !== 90 ||
    audit.passed !== 90 ||
    audit.failed !== 0 ||
    audit.complete !== true ||
    audit.canApprove !== true ||
    audit.audits?.length !== 90
  ) {
    throw new Error("A auditoria visual não corresponde integralmente à fonte atual 90/90.");
  }
  const uniqueIds = new Set(audit.audits.map((row) => row.sourceId));
  if (uniqueIds.size !== 90) throw new Error("A auditoria visual possui identidades duplicadas.");
  const row = audit.audits.find((item) => item.sourceId === sourceId);
  if (
    !row ||
    row.officialNumber !== officialNumber ||
    row.verdict !== "PASS" ||
    row.statementFidelity !== "PASS" ||
    row.elementOrder !== "PASS" ||
    row.alternativeFidelity !== "PASS" ||
    row.imageLegibility !== "PASS" ||
    row.questionIsolation !== "PASS" ||
    row.issueCodes?.length ||
    !row.evidence?.trim() ||
    !row.inspectedFiles?.length
  ) {
    throw new Error(`Questão ${officialNumber}: PASS visual individual e completo ausente.`);
  }
  for (const inspectedFile of row.inspectedFiles) {
    const expectedHash = row.inspectedFileHashes?.[inspectedFile];
    if (!/^[a-f0-9]{64}$/i.test(expectedHash ?? "")) {
      throw new Error(`Questão ${officialNumber}: hash de evidência visual ausente.`);
    }
    const bytes = await readFile(path.resolve(inspectedFile));
    if (sha256(bytes) !== expectedHash) {
      throw new Error(`Questão ${officialNumber}: evidência visual mudou: ${inspectedFile}.`);
    }
  }
  return { absolute, fileSha256: sha256(raw), row };
}

async function main() {
  if (hasCliFlag("all")) {
    throw new Error("Aprovação em lote é proibida: revise e aprove uma questão por vez.");
  }
  const questionNumber = Number(cliValue("question"));
  const actor = cliValue("actor") || "codex-cli";
  const notes = cliValue("notes") || null;
  const visualAuditInput = cliValue("visual-audit");
  const approve = hasCliFlag("approve");
  const reopen = hasCliFlag("reopen");
  if (!Number.isInteger(questionNumber) || questionNumber < 91 || questionNumber > 180) {
    throw new Error("Informe --question 91..180.");
  }
  if (approve === reopen) throw new Error("Escolha exatamente uma ação: --approve ou --reopen.");
  if (approve && !visualAuditInput) {
    throw new Error("A aprovação exige --visual-audit ligado à fonte estruturada atual.");
  }

  const bundle = await readPilotBundle({ validateAssets: true });
  if (!bundle.report.valid) {
    throw new Error(`Manifesto bloqueado por ${bundle.report.errors.length} erro(s).`);
  }
  const source = bundle.questions.find((question) => question.officialNumber === questionNumber)!;
  const visualAudit = approve
    ? await readVisualAudit(
        visualAuditInput!,
        bundle.sourceJsonSha256,
        source.id,
        source.officialNumber,
      )
    : null;
  const job = await db.questionImportJob.findUnique({ where: { pilotId: PILOT_ID } });
  if (!job) throw new Error("Importe o piloto antes da revisão.");
  if (job.status === QuestionImportJobStatus.PUBLISHED) {
    throw new Error("Piloto já publicado; revisão via CLI está bloqueada.");
  }
  const link = await db.provaAntigaQuestao.findUnique({
    where: {
      provaAntigaId_numeroQuestao_officialLanguage: {
        provaAntigaId: job.provaAntigaId,
        numeroQuestao: questionNumber,
        officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
      },
    },
    include: {
      questao: {
        include: {
          alternativeItems: { orderBy: { order: "asc" } },
          imageItems: { orderBy: { order: "asc" } },
          blocks: { orderBy: { order: "asc" }, include: { asset: true } },
          structuredExtraction: true,
          officialAnswerKey: true,
          revisions: {
            where: { action: QuestionRevisionAction.APPROVED },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });
  if (!link) {
    throw new Error(`Questão ${questionNumber} não possui persistência estruturada completa.`);
  }
  const question = link.questao;
  const extraction = question.structuredExtraction;
  const officialAnswerKey = question.officialAnswerKey;
  if (!extraction || !officialAnswerKey) {
    throw new Error(`Questão ${questionNumber} não possui persistência estruturada completa.`);
  }
  const issues: string[] = [];
  if (question.status !== "REVIEW") issues.push("status deve permanecer REVIEW");
  if (question.statement.trim() !== source.command.trim()) issues.push("comando diverge do manifesto");
  if (
    question.sourceUrl !== source.source.originalPageUrl ||
    !question.sourceCitation?.includes(source.source.sourcePageUrl)
  ) {
    issues.push("link direto à página original ou citação institucional ausente");
  }
  if ((question.supportText ?? "").trim() !== (source.supportText ?? "").trim()) {
    issues.push("texto de apoio diverge do manifesto");
  }
  if (question.alternativeItems.map((item) => item.key).join("") !== "ABCDE") {
    issues.push("alternativas A–E ausentes ou fora de ordem");
  }
  const promptFacsimiles = source.assets.filter((asset) => asset.type === "prompt_facsimile");
  const imageBlocks = question.blocks.filter((block) => block.type === "IMAGE");
  if (question.blocks.length !== source.blocks.length + promptFacsimiles.length) {
    issues.push("quantidade de blocos texto/imagem divergente");
  }
  source.blocks.forEach((block, index) => {
    const persisted = question.blocks[index];
    const expectedType =
      block.type === "image"
        ? "IMAGE"
        : block.type === "command"
          ? "COMMAND"
          : block.type === "credit"
            ? "CREDIT"
            : "SUPPORT_TEXT";
    if (
      !persisted ||
      persisted.type !== expectedType ||
      persisted.content !== block.content ||
      persisted.sourcePdfPage !== block.sourcePdfPage ||
      persisted.consolidatedPdfPage !== block.consolidatedPdfPage ||
      (block.type === "image" && persisted.asset?.sha256Hash !== block.assetSha256)
    ) {
      issues.push(`bloco estruturado ${index} diverge do manifesto`);
    }
  });
  const imageBlockHashes = new Set(imageBlocks.map((block) => block.asset?.sha256Hash));
  if (promptFacsimiles.some((asset) => !imageBlockHashes.has(asset.sha256))) {
    issues.push("PROMPT_FACSIMILE sem bloco IMAGE relacionado");
  }
  if (question.imageItems.length !== source.assets.length + source.originalCrops.length) {
    issues.push("quantidade de mídias/recortes divergente");
  }
  if (!question.imageItems.some((image) => image.relation === "ADMIN_REFERENCE")) {
    issues.push("recorte original do administrador ausente");
  }
  const expectedSituation = source.answerSituation === "annulled" ? "ANNULLED" : "CONFIRMED";
  if (question.answerSituation !== expectedSituation) issues.push("situação do gabarito divergente");
  if (officialAnswerKey.answerSituation !== expectedSituation) {
    issues.push("situação no OfficialAnswerKey divergente");
  }
  if (officialAnswerKey.validationStatus !== "validated_against_official_pdf") {
    issues.push("gabarito não validado contra o PDF oficial");
  }
  if (questionNumber === 175) {
    if (question.correctAlternative !== "ANULADA") issues.push("questão 175 não está anulada");
    if (question.alternativeItems.some((alternative) => alternative.correct)) {
      issues.push("questão 175 possui alternativa marcada como correta");
    }
  } else {
    const correct = question.alternativeItems.filter((alternative) => alternative.correct);
    if (
      correct.length !== 1 ||
      correct[0]?.key !== source.answer ||
      question.correctAlternative !== source.answer ||
      officialAnswerKey.correctAlternative !== source.answer
    ) {
      issues.push("correção não corresponde ao gabarito oficial");
    }
  }
  if (
    extraction.consolidatedPdfPageStart < 898 ||
    extraction.consolidatedPdfPageEnd > 929
  ) {
    issues.push("página consolidada fora do segmento 898–929");
  }
  if (approve && issues.length) {
    throw new Error(`Questão ${questionNumber} bloqueada: ${issues.join("; ")}.`);
  }

  const targetReviewState = approve
    ? QuestionReviewState.APPROVED
    : QuestionReviewState.PENDING_REVIEW;
  if (
    question.reviewState === targetReviewState &&
    extraction.reviewStatus === targetReviewState &&
    link.needsHumanReview === !approve &&
    (!approve ||
      (officialAnswerKey.answerReviewStatus === OfficialAnswerReviewStatus.APPROVED &&
        Boolean(officialAnswerKey.answerReviewedBy) &&
        Boolean(officialAnswerKey.answerReviewedAt) &&
        question.revisions.some((revision) =>
          revision.notes?.includes(visualAudit?.fileSha256 ?? ""),
        )))
  ) {
    console.log(JSON.stringify({ questionNumber, unchanged: true, state: targetReviewState }, null, 2));
    return;
  }
  const now = new Date();
  const action = approve ? QuestionRevisionAction.APPROVED : QuestionRevisionAction.REOPENED;
  const auditNotes = visualAudit
    ? [
        `Auditoria visual: ${path.relative(process.cwd(), visualAudit.absolute).replaceAll("\\", "/")} (${visualAudit.fileSha256}).`,
        visualAudit.row.evidence,
        `Arquivos inspecionados: ${visualAudit.row.inspectedFiles.join(", ")}.`,
      ].join("\n")
    : null;
  await db.$transaction([
    db.question.update({
      where: { id: question.id },
      data: {
        reviewState: targetReviewState,
        status: "REVIEW",
        reviewNotes: [question.reviewNotes, notes, auditNotes, `${action} por ${actor} em ${now.toISOString()}.`]
          .filter(Boolean)
          .join("\n"),
      },
    }),
    db.questionExtraction.update({
      where: { id: extraction.id },
      data: {
        reviewStatus: targetReviewState,
        flags: jsonValue({
          ...(extraction.flags as Record<string, unknown>),
          visualAudit: visualAudit
            ? {
                path: path.relative(process.cwd(), visualAudit.absolute).replaceAll("\\", "/"),
                sha256: visualAudit.fileSha256,
                evidence: visualAudit.row.evidence,
                inspectedFiles: visualAudit.row.inspectedFiles,
              }
            : null,
        }),
      },
    }),
    db.provaAntigaQuestao.update({
      where: { id: link.id },
      data: { needsHumanReview: !approve },
    }),
    db.officialAnswerKey.update({
      where: { id: officialAnswerKey.id },
      data: approve
        ? {
            answerReviewStatus: OfficialAnswerReviewStatus.APPROVED,
            answerReviewedBy: actor,
            answerReviewedAt: now,
          }
        : {},
    }),
    db.questionRevision.create({
      data: {
        questionId: question.id,
        importJobId: job.id,
        action,
        actor,
        notes: [notes, auditNotes].filter(Boolean).join("\n"),
        beforeSnapshot: jsonValue({
          reviewState: question.reviewState,
          extractionReviewStatus: extraction.reviewStatus,
          needsHumanReview: link.needsHumanReview,
        }),
        afterSnapshot: jsonValue({
          reviewState: targetReviewState,
          extractionReviewStatus: targetReviewState,
          needsHumanReview: !approve,
          visualAuditSha256: visualAudit?.fileSha256 ?? null,
        }),
        dedupeKey: `${PILOT_ID}:${questionNumber}:${action}:${now.toISOString()}`,
      },
    }),
    db.officialImportLog.create({
      data: {
        fileId: job.examFileId,
        action: approve ? "enem_2022_day2_question_approve" : "enem_2022_day2_question_reopen",
        status: "SUCCESS",
        message: `Questão ${questionNumber} ${approve ? "aprovada" : "reaberta"} por ${actor}.`,
        metadata: JSON.stringify({ questionId: question.id, jobId: job.id, notes }),
      },
    }),
  ]);
  const approvedCount = await db.questionExtraction.count({
    where: { importJobId: job.id, reviewStatus: QuestionReviewState.APPROVED },
  });
  await db.questionImportJob.update({
    where: { id: job.id },
    data: {
      approvedQuestionCount: approvedCount,
      status:
        approvedCount === 90
          ? QuestionImportJobStatus.READY_TO_PUBLISH
          : QuestionImportJobStatus.WAITING_REVIEW,
    },
  });
  console.log(
    JSON.stringify(
      {
        questionNumber,
        action,
        approvedCount,
        answerSituation:
          questionNumber === 175
            ? QuestionAnswerSituation.ANNULLED
            : QuestionAnswerSituation.CONFIRMED,
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
