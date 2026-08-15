import { createHash } from "node:crypto";
import {
  Difficulty,
  OfficialAnswerReviewStatus,
  Prisma,
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
  refreshPilotJobCounters,
  serializePilotQuestion,
} from "@/lib/enem-import-admin";

type RouteParameters = { params: Promise<{ jobId: string; numero: string }> };

type AlternativeInput = {
  key?: unknown;
  text?: unknown;
  imageUrl?: unknown;
};

type EditInput = {
  requestId?: unknown;
  expectedUpdatedAt?: unknown;
  statement?: unknown;
  supportText?: unknown;
  alternatives?: unknown;
  subjectId?: unknown;
  topicId?: unknown;
  difficulty?: unknown;
  skill?: unknown;
  reviewNotes?: unknown;
};

function inputString(value: unknown, field: string, maximum: number, options?: { empty?: boolean }) {
  if (typeof value !== "string") throw new Error(`${field} deve ser texto.`);
  const normalized = value.replaceAll("\u0000", "").trim();
  if (!options?.empty && !normalized) throw new Error(`${field} é obrigatório.`);
  if (normalized.length > maximum) throw new Error(`${field} excede ${maximum} caracteres.`);
  return normalized;
}

function mutationId(value: unknown) {
  const result = inputString(value, "requestId", 100);
  if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(result)) throw new Error("requestId inválido.");
  return result;
}

function normalizedImageUrl(value: unknown, key: string) {
  if (value === null || value === undefined || value === "") return null;
  const url = inputString(value, `Imagem da alternativa ${key}`, 1_000);
  if (!url.startsWith("/api/questions/assets/enem/2022/dia-2/")) {
    throw new Error(`A imagem da alternativa ${key} precisa usar a rota canônica do piloto.`);
  }
  return url;
}

function canonicalHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(_request: Request, context: RouteParameters) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { jobId, numero } = await context.params;
  const questionNumber = Number(numero);
  const job = await findPilotJob(jobId);
  if (!job) return NextResponse.json({ error: "Job do piloto não encontrado." }, { status: 404 });
  const record = await findPilotQuestion(job, questionNumber);
  if (!record) return NextResponse.json({ error: "Questão do piloto não encontrada." }, { status: 404 });
  return NextResponse.json(serializePilotQuestion(job, record), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PATCH(request: Request, context: RouteParameters) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { jobId, numero } = await context.params;
  const questionNumber = Number(numero);
  const job = await findPilotJob(jobId);
  if (!job) return NextResponse.json({ error: "Job do piloto não encontrado." }, { status: 404 });
  if (job.status === QuestionImportJobStatus.PUBLISHED) {
    return NextResponse.json({ error: "O piloto publicado não pode ser editado por esta fila." }, { status: 409 });
  }
  const record = await findPilotQuestion(job, questionNumber);
  if (!record) return NextResponse.json({ error: "Questão do piloto não encontrada." }, { status: 404 });

  let body: EditInput;
  try {
    body = (await request.json()) as EditInput;
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  try {
    const requestId = mutationId(body.requestId);
    const dedupeKey = `${job.id}:${record.questao.id}:UPDATED:${requestId}`;
    const previousMutation = await db.questionRevision.findUnique({ where: { dedupeKey } });
    if (previousMutation) {
      const currentJob = await findPilotJob(job.id);
      const currentRecord = currentJob ? await findPilotQuestion(currentJob, questionNumber) : null;
      return NextResponse.json({
        ok: true,
        changed: false,
        deduplicated: true,
        ...(currentJob && currentRecord ? serializePilotQuestion(currentJob, currentRecord) : {}),
      });
    }
    const expectedUpdatedAt = inputString(body.expectedUpdatedAt, "expectedUpdatedAt", 100);
    if (new Date(expectedUpdatedAt).toISOString() !== record.questao.updatedAt.toISOString()) {
      return NextResponse.json(
        { error: "A questão foi alterada em outra sessão. Recarregue antes de salvar." },
        { status: 409 },
      );
    }
    const statement = inputString(body.statement, "Enunciado", 30_000);
    const supportText = inputString(body.supportText ?? "", "Texto de apoio", 60_000, { empty: true });
    const subjectId = inputString(body.subjectId, "Disciplina", 100);
    const topicId = inputString(body.topicId ?? "", "Conteúdo", 100, { empty: true }) || null;
    const difficulty = inputString(body.difficulty, "Dificuldade", 20) as Difficulty;
    if (!Object.values(Difficulty).includes(difficulty)) throw new Error("Dificuldade inválida.");
    const skill = inputString(body.skill ?? "", "Habilidade", 2_000, { empty: true });
    const reviewNotes = inputString(body.reviewNotes ?? "", "Observação", 4_000, { empty: true });
    if (!Array.isArray(body.alternatives) || body.alternatives.length !== 5) {
      throw new Error("A questão precisa manter exatamente cinco alternativas.");
    }
    const alternatives = (body.alternatives as AlternativeInput[]).map((alternative, index) => {
      const key = String.fromCharCode(65 + index);
      if (alternative.key !== key) throw new Error("As alternativas precisam permanecer em ordem A–E.");
      return {
        key,
        order: index,
        text: inputString(alternative.text ?? "", `Alternativa ${key}`, 10_000, {
          empty: Boolean(alternative.imageUrl),
        }),
        imageUrl: normalizedImageUrl(alternative.imageUrl, key),
      };
    });
    if (alternatives.some((alternative) => !alternative.text && !alternative.imageUrl)) {
      throw new Error("Toda alternativa precisa ter texto ou imagem.");
    }
    const [subject, topic] = await Promise.all([
      db.subject.findUnique({ where: { id: subjectId }, select: { id: true } }),
      topicId
        ? db.topic.findUnique({ where: { id: topicId }, select: { id: true, subjectId: true } })
        : Promise.resolve(null),
    ]);
    if (!subject) throw new Error("Disciplina não encontrada.");
    if (topic && topic.subjectId !== subject.id) throw new Error("O conteúdo não pertence à disciplina escolhida.");

    const beforeSnapshot = {
      statement: record.questao.statement,
      supportText: record.questao.supportText,
      subjectId: record.questao.subjectId,
      topicId: record.questao.topicId,
      difficulty: record.questao.difficulty,
      skill: record.questao.skill,
      reviewNotes: record.questao.reviewNotes,
      alternatives: record.questao.alternativeItems.map((item) => ({
        key: item.key,
        text: item.text,
        imageUrl: item.imageUrl,
      })),
      reviewState: record.questao.reviewState,
    };
    const afterSnapshot = {
      statement,
      supportText: supportText || null,
      subjectId,
      topicId,
      difficulty,
      skill: skill || null,
      reviewNotes: reviewNotes || null,
      alternatives,
      reviewState: QuestionReviewState.PENDING_REVIEW,
    };
    const contentHash = canonicalHash({
      pilotId: job.pilotId,
      questionNumber,
      statement,
      supportText,
      alternatives,
    });

    await db.$transaction(async (transaction) => {
      const duplicate = await transaction.questionRevision.findUnique({ where: { dedupeKey } });
      if (duplicate) return;
      const questionUpdate = await transaction.question.updateMany({
        where: { id: record.questao.id, updatedAt: new Date(expectedUpdatedAt) },
        data: {
          statement,
          supportText: supportText || null,
          subjectId,
          topicId,
          difficulty,
          skill: skill || null,
          reviewNotes: reviewNotes || null,
          alternatives: JSON.stringify(alternatives),
          contentHash,
          reviewState: QuestionReviewState.PENDING_REVIEW,
          status: "REVIEW",
        },
      });
      if (questionUpdate.count !== 1) {
        throw new Error("A questão foi alterada em outra sessão. Recarregue antes de salvar.");
      }
      for (const alternative of alternatives) {
        await transaction.questionAlternative.update({
          where: {
            questionId_key: { questionId: record.questao.id, key: alternative.key },
          },
          data: { text: alternative.text, imageUrl: alternative.imageUrl, order: alternative.order },
        });
      }
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
          action: QuestionRevisionAction.UPDATED,
          actor: authorization.user.id,
          notes: reviewNotes || "Correção editorial pela revisão lado a lado; aprovação reaberta.",
          beforeSnapshot: jsonValue(beforeSnapshot),
          afterSnapshot: jsonValue(afterSnapshot),
          dedupeKey,
        },
      });
      await transaction.questionImportJob.update({
        where: { id: job.id },
        data: { status: QuestionImportJobStatus.WAITING_REVIEW },
      });
    });
    await refreshPilotJobCounters(job.id);
    const currentJob = await findPilotJob(job.id);
    const currentRecord = currentJob ? await findPilotQuestion(currentJob, questionNumber) : null;
    return NextResponse.json({
      ok: true,
      changed: true,
      ...(currentJob && currentRecord ? serializePilotQuestion(currentJob, currentRecord) : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar a questão.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("outra sessão") ? 409 : 422 },
    );
  }
}
