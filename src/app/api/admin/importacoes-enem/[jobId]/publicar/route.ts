import {
  OfficialProcessingStatus,
  Prisma,
  QuestionImportJobStatus,
  QuestionRevisionAction,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import {
  calculatePilotGate,
  ENEM_2022_DAY_2_PILOT_ID,
  findPilotJob,
  pilotQuestionInclude,
  validationReportOf,
} from "@/lib/enem-import-admin";

type RouteParameters = { params: Promise<{ jobId: string }> };

const CONFIRMATION = "PUBLICAR ENEM 2022 DIA 2 CADERNO 5 AMARELO 90/90";

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: Request, context: RouteParameters) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { jobId } = await context.params;
  const job = await findPilotJob(jobId);
  if (!job) return NextResponse.json({ error: "Job do piloto não encontrado." }, { status: 404 });

  let body: { requestId?: unknown; confirmation?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }
  if (body.confirmation !== CONFIRMATION) {
    return NextResponse.json({ error: "Confirmação explícita inválida." }, { status: 400 });
  }
  if (typeof body.requestId !== "string" || !/^[a-zA-Z0-9:_-]{8,100}$/.test(body.requestId)) {
    return NextResponse.json({ error: "requestId inválido." }, { status: 400 });
  }
  if (job.status === QuestionImportJobStatus.PUBLISHED) {
    return NextResponse.json({ ok: true, published: 90, alreadyPublished: true });
  }
  if (job.status !== QuestionImportJobStatus.READY_TO_PUBLISH) {
    return NextResponse.json(
      { error: `Job em ${job.status}; esperado READY_TO_PUBLISH.` },
      { status: 409 },
    );
  }

  const gate = await calculatePilotGate(job);
  if (!gate.ready || gate.imported !== 90 || gate.approved !== 90 || gate.published !== 0) {
    return NextResponse.json(
      { error: "Publicação bloqueada: o gate 90/90 não passou.", gate, issues: gate.issues },
      { status: 422 },
    );
  }
  const records = await db.provaAntigaQuestao.findMany({
    where: { provaAntigaId: job.provaAntigaId },
    orderBy: { numeroQuestao: "asc" },
    include: pilotQuestionInclude,
  });
  if (
    records.length !== 90 ||
    records.some((record, index) => record.numeroQuestao !== index + 91) ||
    job.pilotId !== ENEM_2022_DAY_2_PILOT_ID ||
    job.year !== 2022 ||
    job.day !== 2
  ) {
    return NextResponse.json({ error: "Identidade ou sequência do piloto divergiu após o gate." }, { status: 409 });
  }
  const questionIds = records.map((record) => record.questaoId);
  const publishedAt = new Date();
  const previousReport = validationReportOf(job.validationReport);

  try {
    await db.$transaction(
      async (transaction) => {
      const claim = await transaction.questionImportJob.updateMany({
        where: {
          id: job.id,
          status: QuestionImportJobStatus.READY_TO_PUBLISH,
          approvedQuestionCount: 90,
          importedQuestionCount: 90,
          publishedQuestionCount: 0,
        },
        data: { status: QuestionImportJobStatus.IMPORTING },
      });
      if (claim.count !== 1) {
        throw new Error("O gate mudou durante a publicação; nenhuma questão foi publicada.");
      }
      const questionUpdate = await transaction.question.updateMany({
        where: { id: { in: questionIds }, status: "REVIEW" },
        data: {
          status: "PUBLISHED",
          pilotTestPublishedAt: publishedAt,
          pilotTestPublishedBy: authorization.user.id,
        },
      });
      if (questionUpdate.count !== 90) {
        throw new Error(`A publicação encontrou ${questionUpdate.count}/90 questões em REVIEW.`);
      }
      await transaction.officialAnswerKey.updateMany({
        where: { questionId: { in: questionIds } },
        data: { publishedAt },
      });
      await transaction.questionRevision.createMany({
        data: records.map((record) => ({
          questionId: record.questaoId,
          importJobId: job.id,
          action: QuestionRevisionAction.PUBLISHED,
          actor: authorization.user.id,
          notes: "Publicação atômica do piloto ENEM 2022/2 após gate 90/90.",
          beforeSnapshot: { status: record.questao.status },
          afterSnapshot: { status: "PUBLISHED", publishedAt: publishedAt.toISOString() },
          dedupeKey: `${job.pilotId}:${record.numeroQuestao}:PUBLISHED:${body.requestId}`,
        })),
        skipDuplicates: true,
      });
      await transaction.provaAntiga.update({
        where: { id: job.provaAntigaId },
        data: {
          status: "DISPONIVEL",
          importacaoStatus: "PUBLICADO",
          importacaoRelatorio: JSON.stringify({
            ...previousReport,
            publicationGate: { passed: true, approved: 90, publishedAt: publishedAt.toISOString() },
          }),
          questoesDetectadas: 90,
          questoesValidas: 90,
          questoesComErro: 0,
          pilotTestPreviousStatus: job.provaAntiga.status,
          pilotTestAvailableAt: publishedAt,
        },
      });
      await transaction.questionImportJob.update({
        where: { id: job.id },
        data: {
          status: QuestionImportJobStatus.PUBLISHED,
          importedQuestionCount: 90,
          approvedQuestionCount: 90,
          publishedQuestionCount: 90,
          validationReport: jsonValue({
            ...previousReport,
            publicationGate: {
              passed: true,
              approved: 90,
              actor: authorization.user.id,
              requestId: body.requestId,
              publishedAt: publishedAt.toISOString(),
            },
          }),
          checkpoint: jsonValue({
            publication: {
              previousStatus: job.status,
              requestId: body.requestId,
              publishedAt: publishedAt.toISOString(),
            },
          }),
          publishedAt,
        },
      });
      await transaction.officialFile.updateMany({
        where: { id: { in: [job.examFileId, job.answerKeyFileId] } },
        data: { processingStatus: OfficialProcessingStatus.PUBLISHED },
      });
      await transaction.officialImportLog.create({
        data: {
          fileId: job.examFileId,
          action: "enem_2022_day2_admin_publish",
          status: "SUCCESS",
          message: `Piloto ENEM 2022/2 publicado 90/90 por ${authorization.user.id}.`,
          metadata: JSON.stringify({ jobId: job.id, requestId: body.requestId, publishedAt }),
        },
      });
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    const current = await db.questionImportJob.findUnique({
      where: { id: job.id },
      select: { status: true, publishedQuestionCount: true },
    });
    if (
      current?.status === QuestionImportJobStatus.PUBLISHED &&
      current.publishedQuestionCount === 90
    ) {
      return NextResponse.json({ ok: true, published: 90, alreadyPublished: true });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "A publicação concorrente foi recusada; nenhuma escrita parcial foi mantida.",
      },
      { status: 409 },
    );
  }

  const [publishedQuestions, publishedJob] = await Promise.all([
    db.question.count({ where: { id: { in: questionIds }, status: "PUBLISHED" } }),
    db.questionImportJob.findUnique({ where: { id: job.id }, select: { status: true, publishedQuestionCount: true } }),
  ]);
  if (
    publishedQuestions !== 90 ||
    publishedJob?.status !== QuestionImportJobStatus.PUBLISHED ||
    publishedJob.publishedQuestionCount !== 90
  ) {
    return NextResponse.json(
      { error: "A verificação pós-publicação não confirmou 90/90; audite a transação." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    published: 90,
    jobStatus: publishedJob.status,
    publishedAt: publishedAt.toISOString(),
  });
}
