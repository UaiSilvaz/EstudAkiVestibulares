import {
  OfficialAnswerReviewStatus,
  QuestionImportJobStatus,
  QuestionReviewState,
  QuestionRevisionAction,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import {
  findPilotJob,
  findPilotQuestion,
  questionReviewIssues,
  refreshPilotJobCounters,
  serializePilotQuestion,
} from "@/lib/enem-import-admin";

type RouteParameters = { params: Promise<{ jobId: string; numero: string }> };

const checklistKeys = [
  "statementComplete",
  "elementOrderCorrect",
  "alternativesComplete",
  "imagesLegible",
  "officialAnswerVerified",
  "numberYearDayVerified",
  "studentAnswerFlowVerified",
  "mobileVerified",
  "originalPageVerified",
  "noMixedContent",
] as const;

type ReviewActionInput = {
  action?: unknown;
  requestId?: unknown;
  notes?: unknown;
  checklist?: unknown;
};

function safeMutationId(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9:_-]{8,100}$/.test(value)) {
    throw new Error("requestId inválido.");
  }
  return value;
}

function notesValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("A observação deve ser texto.");
  const notes = value.replaceAll("\u0000", "").trim();
  if (notes.length > 4_000) throw new Error("A observação excede 4.000 caracteres.");
  return notes || null;
}

function approvedChecklist(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const checklist = value as Record<string, unknown>;
  return checklistKeys.every((key) => checklist[key] === true);
}

export async function POST(request: Request, context: RouteParameters) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { jobId, numero } = await context.params;
  const questionNumber = Number(numero);
  const job = await findPilotJob(jobId);
  if (!job) return NextResponse.json({ error: "Job do piloto não encontrado." }, { status: 404 });
  if (job.status === QuestionImportJobStatus.PUBLISHED) {
    return NextResponse.json({ error: "O piloto já foi publicado e a revisão está bloqueada." }, { status: 409 });
  }
  const record = await findPilotQuestion(job, questionNumber);
  if (!record) return NextResponse.json({ error: "Questão do piloto não encontrada." }, { status: 404 });

  let body: ReviewActionInput;
  try {
    body = (await request.json()) as ReviewActionInput;
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  try {
    const action = body.action === "APPROVE" || body.action === "REOPEN" ? body.action : null;
    if (!action) throw new Error("Ação de revisão inválida.");
    const requestId = safeMutationId(body.requestId);
    const notes = notesValue(body.notes);
    const revisionAction =
      action === "APPROVE" ? QuestionRevisionAction.APPROVED : QuestionRevisionAction.REOPENED;
    const dedupeKey = `${job.id}:${record.questao.id}:${revisionAction}:${requestId}`;
    const duplicate = await db.questionRevision.findUnique({ where: { dedupeKey } });
    if (duplicate) {
      const currentJob = await findPilotJob(job.id);
      const currentRecord = currentJob ? await findPilotQuestion(currentJob, questionNumber) : null;
      return NextResponse.json({
        ok: true,
        changed: false,
        deduplicated: true,
        ...(currentJob && currentRecord ? serializePilotQuestion(currentJob, currentRecord) : {}),
      });
    }
    if (action === "APPROVE") {
      if (!approvedChecklist(body.checklist)) {
        throw new Error("Confirme os dez itens de qualidade antes de aprovar.");
      }
      const issues = questionReviewIssues(job, record);
      if (issues.length) {
        return NextResponse.json(
          { error: "A aprovação está bloqueada por pendências estruturais.", issues },
          { status: 422 },
        );
      }
      const alreadyApproved =
        record.questao.reviewState === QuestionReviewState.APPROVED &&
        record.questao.structuredExtraction?.reviewStatus === QuestionReviewState.APPROVED &&
        !record.needsHumanReview &&
        record.questao.officialAnswerKey?.answerReviewStatus === OfficialAnswerReviewStatus.APPROVED &&
        record.questao.revisions[0]?.action === QuestionRevisionAction.APPROVED;
      if (alreadyApproved) {
        return NextResponse.json({ ok: true, changed: false, ...serializePilotQuestion(job, record) });
      }
      const reviewedAt = new Date();
      await db.$transaction(async (transaction) => {
        await transaction.question.update({
          where: { id: record.questao.id },
          data: { reviewState: QuestionReviewState.APPROVED, reviewNotes: notes },
        });
        await transaction.questionExtraction.update({
          where: { questionId: record.questao.id },
          data: { reviewStatus: QuestionReviewState.APPROVED },
        });
        await transaction.provaAntigaQuestao.update({
          where: { id: record.id },
          data: { needsHumanReview: false },
        });
        await transaction.officialAnswerKey.update({
          where: { questionId: record.questao.id },
          data: {
            answerReviewStatus: OfficialAnswerReviewStatus.APPROVED,
            answerReviewedBy: authorization.user.id,
            answerReviewedAt: reviewedAt,
          },
        });
        await transaction.questionRevision.create({
          data: {
            questionId: record.questao.id,
            importJobId: job.id,
            action: QuestionRevisionAction.APPROVED,
            actor: authorization.user.id,
            notes: notes || "Questão comparada integralmente com a página oficial e aprovada.",
            beforeSnapshot: {
              reviewState: record.questao.reviewState,
              extractionReviewStatus: record.questao.structuredExtraction?.reviewStatus,
              needsHumanReview: record.needsHumanReview,
              answerReviewStatus: record.questao.officialAnswerKey?.answerReviewStatus,
            },
            afterSnapshot: {
              reviewState: "APPROVED",
              extractionReviewStatus: "APPROVED",
              needsHumanReview: false,
              answerReviewStatus: "APPROVED",
              reviewedAt: reviewedAt.toISOString(),
              checklist: body.checklist as Record<string, boolean>,
            },
            dedupeKey,
          },
        });
      });
    } else {
      const alreadyOpen =
        record.questao.reviewState === QuestionReviewState.PENDING_REVIEW &&
        record.questao.structuredExtraction?.reviewStatus === QuestionReviewState.PENDING_REVIEW &&
        record.needsHumanReview;
      if (alreadyOpen) {
        return NextResponse.json({ ok: true, changed: false, ...serializePilotQuestion(job, record) });
      }
      await db.$transaction(async (transaction) => {
        await transaction.question.update({
          where: { id: record.questao.id },
          data: {
            reviewState: QuestionReviewState.PENDING_REVIEW,
            reviewNotes: notes,
            status: "REVIEW",
          },
        });
        await transaction.questionExtraction.update({
          where: { questionId: record.questao.id },
          data: { reviewStatus: QuestionReviewState.PENDING_REVIEW },
        });
        await transaction.provaAntigaQuestao.update({
          where: { id: record.id },
          data: { needsHumanReview: true },
        });
        await transaction.officialAnswerKey.update({
          where: { questionId: record.questao.id },
          data: {
            answerReviewStatus: OfficialAnswerReviewStatus.CHECKED,
            answerReviewedBy: null,
            answerReviewedAt: null,
          },
        });
        await transaction.questionRevision.create({
          data: {
            questionId: record.questao.id,
            importJobId: job.id,
            action: QuestionRevisionAction.REOPENED,
            actor: authorization.user.id,
            notes: notes || "Questão reaberta para nova conferência.",
            beforeSnapshot: {
              reviewState: record.questao.reviewState,
              extractionReviewStatus: record.questao.structuredExtraction?.reviewStatus,
              needsHumanReview: record.needsHumanReview,
              answerReviewStatus: record.questao.officialAnswerKey?.answerReviewStatus,
            },
            afterSnapshot: {
              reviewState: "PENDING_REVIEW",
              extractionReviewStatus: "PENDING_REVIEW",
              needsHumanReview: true,
              answerReviewStatus: "CHECKED",
            },
            dedupeKey,
          },
        });
        await transaction.questionImportJob.update({
          where: { id: job.id },
          data: { status: QuestionImportJobStatus.WAITING_REVIEW },
        });
      });
    }
    const counters = await refreshPilotJobCounters(job.id);
    const currentJob = await findPilotJob(job.id);
    const currentRecord = currentJob ? await findPilotQuestion(currentJob, questionNumber) : null;
    return NextResponse.json({
      ok: true,
      changed: true,
      counters,
      ...(currentJob && currentRecord ? serializePilotQuestion(currentJob, currentRecord) : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "A revisão não foi concluída." },
      { status: 422 },
    );
  }
}
