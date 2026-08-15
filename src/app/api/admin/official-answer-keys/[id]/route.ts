import {
  OfficialAnswerReviewStatus,
  OfficialResolutionStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { logOfficialImport } from "@/lib/official-sources";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const current = await db.officialAnswerKey.findUnique({
    where: { id },
    include: { file: true },
  });
  if (!current) return NextResponse.json({ error: "Questão não encontrada." }, { status: 404 });

  try {
    const body = (await request.json()) as Record<string, unknown> & {
      action?: "approve" | "reject" | "publish";
      answerAction?: "check" | "approve" | "reject";
    };
    let status = current.resolutionStatus;
    let answerStatus = current.answerReviewStatus;
    if (body.action === "approve") {
      if (current.resolutionStatus !== OfficialResolutionStatus.IN_REVIEW) {
        return NextResponse.json(
          { error: "A resolução precisa estar em revisão antes da aprovação." },
          { status: 400 },
        );
      }
      const resolutionText =
        typeof body.fullResolution === "string"
          ? body.fullResolution.trim()
          : current.fullResolution?.trim();
      if (!resolutionText) {
        return NextResponse.json(
          { error: "Preencha a resolução antes de aprová-la." },
          { status: 400 },
        );
      }
      status = OfficialResolutionStatus.APPROVED;
    }
    if (body.action === "reject") status = OfficialResolutionStatus.REJECTED;
    if (body.answerAction === "check") answerStatus = OfficialAnswerReviewStatus.CHECKED;
    if (body.answerAction === "approve") answerStatus = OfficialAnswerReviewStatus.APPROVED;
    if (body.answerAction === "reject") answerStatus = OfficialAnswerReviewStatus.REJECTED;
    if (body.action === "publish") {
      if (current.resolutionStatus !== OfficialResolutionStatus.APPROVED) {
        return NextResponse.json(
          { error: "A resolução precisa ser aprovada antes da publicação." },
          { status: 400 },
        );
      }
      if (current.answerReviewStatus !== OfficialAnswerReviewStatus.APPROVED) {
        return NextResponse.json(
          { error: "O gabarito precisa ser aprovado antes da publicação." },
          { status: 400 },
        );
      }
      status = OfficialResolutionStatus.PUBLISHED;
    }
    const normalizedAlternative =
      typeof body.correctAlternative === "string"
        ? body.correctAlternative.trim().toUpperCase()
        : current.correctAlternative;
    if (!/^(A|B|C|D|E|ANULADA)$/.test(normalizedAlternative)) {
      return NextResponse.json(
        { error: "Gabarito deve ser A-E ou ANULADA." },
        { status: 400 },
      );
    }
    const linkedExams = await db.provaAntiga.findMany({
      where: { officialKeyFileId: current.fileId },
      include: {
        questoes: {
          where: { numeroQuestao: current.questionNumber },
          select: { questaoId: true },
        },
      },
    });
    if (body.action === "publish") {
      const approvedExam = linkedExams.find(
        (exam) => exam.status === "APROVADA" || exam.status === "DISPONIVEL",
      );
      if (!approvedExam) {
        return NextResponse.json(
          { error: "A prova precisa estar aprovada antes da publicação." },
          { status: 400 },
        );
      }
      if (!approvedExam.questoes.length) {
        return NextResponse.json(
          { error: "A questão não está vinculada à prova anterior." },
          { status: 400 },
        );
      }
    }
    const answer = await db.officialAnswerKey.update({
      where: { id },
      data: {
        ...(typeof body.statement === "string" ? { statement: body.statement.trim() || null } : {}),
        ...(typeof body.subject === "string" ? { subject: body.subject.trim() || null } : {}),
        ...(typeof body.topic === "string" ? { topic: body.topic.trim() || null } : {}),
        correctAlternative: normalizedAlternative,
        ...(typeof body.shortComment === "string" ? { shortComment: body.shortComment } : {}),
        ...(typeof body.fullResolution === "string" ? { fullResolution: body.fullResolution } : {}),
        ...(Array.isArray(body.steps) ? { steps: JSON.stringify(body.steps) } : {}),
        ...(body.alternativeComments && typeof body.alternativeComments === "object"
          ? { alternativeComments: JSON.stringify(body.alternativeComments) }
          : {}),
        ...(typeof body.commonError === "string" ? { commonError: body.commonError } : {}),
        ...(typeof body.studyTip === "string" ? { studyTip: body.studyTip } : {}),
        ...(typeof body.relatedContent === "string" ? { relatedContent: body.relatedContent } : {}),
        answerReviewStatus: answerStatus,
        ...(body.answerAction
          ? { answerReviewedBy: user.email, answerReviewedAt: new Date() }
          : {}),
        resolutionStatus: status,
        ...(body.action
          ? { reviewedBy: user.email, reviewedAt: new Date() }
          : {}),
        ...(body.action === "publish" ? { publishedAt: new Date() } : {}),
      },
    });
    const linkedQuestionIds = linkedExams.flatMap((exam) =>
      exam.questoes.map((link) => link.questaoId),
    );
    if ((body.answerAction === "approve" || body.action === "publish") && linkedQuestionIds.length) {
      await db.$transaction([
        db.question.updateMany({
          where: { id: { in: linkedQuestionIds } },
          data: {
            correctAlternative: normalizedAlternative,
            ...(body.action === "publish"
              ? { status: "PUBLISHED", reviewState: "APPROVED" }
              : {}),
          },
        }),
        db.questionAlternative.updateMany({
          where: { questionId: { in: linkedQuestionIds } },
          data: { correct: false },
        }),
        ...(normalizedAlternative === "ANULADA"
          ? []
          : [
              db.questionAlternative.updateMany({
                where: {
                  questionId: { in: linkedQuestionIds },
                  key: normalizedAlternative,
                },
                data: { correct: true },
              }),
            ]),
        ...(body.action === "publish"
          ? linkedExams.map((exam) =>
              db.provaAntiga.update({
                where: { id: exam.id },
                data: { status: "DISPONIVEL" },
              }),
            )
          : []),
      ]);
    }
    await logOfficialImport({
      sourceId: current.file.sourceId,
      fileId: current.fileId,
      action: body.answerAction
        ? `answer_key_${body.answerAction}`
        : body.action
          ? `resolution_${body.action}`
          : "resolution_edit",
      status: "SUCCESS",
      message: `Resolução atualizada por ${user.email}.`,
      metadata: { answerKeyId: id, answerStatus, resolutionStatus: status },
    });
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Alteração não salva." },
      { status: 400 },
    );
  }
}
