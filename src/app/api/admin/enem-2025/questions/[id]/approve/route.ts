import { QuestionReviewState } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import {
  getEnem2025PilotRecords,
  testPublicationReasons,
} from "@/lib/enem-2025-pilot";
import { logOfficialImport } from "@/lib/official-sources";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const exams = await getEnem2025PilotRecords();
  const match = exams
    .flatMap((exam) => {
      const answers = new Map(
        exam.officialKeyFile?.answerKeys.map((answer) => [answer.questionNumber, answer]),
      );
      return exam.questoes.map((link) => ({
        exam,
        link,
        answer: answers.get(link.numeroQuestao),
      }));
    })
    .find((item) => item.link.questao.id === id);
  if (!match) {
    return NextResponse.json({ error: "Questão do piloto não encontrada." }, { status: 404 });
  }
  if (match.link.questao.reviewState === QuestionReviewState.HAS_ERROR) {
    return NextResponse.json(
      { error: "Corrija o erro de extração antes de aprovar esta questão." },
      { status: 400 },
    );
  }
  const structuralIssues = testPublicationReasons(match.exam, match.link, match.answer);
  if (structuralIssues.length) {
    return NextResponse.json(
      { error: `Questão bloqueada: ${structuralIssues.join("; ")}.` },
      { status: 400 },
    );
  }

  await db.$transaction([
    db.question.update({
      where: { id },
      data: {
        reviewState: QuestionReviewState.APPROVED,
        status: "REVIEW",
        reviewNotes: `${match.link.questao.reviewNotes ?? ""}\nAprovada editorialmente por ${user.email} em ${new Date().toISOString()}.`.trim(),
      },
    }),
    db.provaAntigaQuestao.update({
      where: { id: match.link.id },
      data: { needsHumanReview: false },
    }),
  ]);
  await logOfficialImport({
    fileId: match.exam.officialExamFileId,
    action: "enem_2025_question_approve",
    status: "SUCCESS",
    message: `Questão ${match.link.numeroQuestao} aprovada por ${user.email}.`,
    metadata: { questionId: id, examId: match.exam.id },
  });
  return NextResponse.json({ approved: true, questionId: id });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const link = await db.provaAntigaQuestao.findFirst({
    where: {
      questaoId: id,
      provaAntigaId: { in: ["pa-enem-2025-dia-1", "pa-enem-2025-dia-2"] },
    },
    include: { questao: true, provaAntiga: true },
  });
  if (!link) {
    return NextResponse.json({ error: "Questão do piloto não encontrada." }, { status: 404 });
  }
  if (link.questao.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Despublique a questão antes de devolvê-la para revisão." },
      { status: 400 },
    );
  }
  await db.$transaction([
    db.question.update({
      where: { id },
      data: {
        reviewState: QuestionReviewState.PENDING_REVIEW,
        status: "REVIEW",
      },
    }),
    db.provaAntigaQuestao.update({
      where: { id: link.id },
      data: { needsHumanReview: true },
    }),
  ]);
  await logOfficialImport({
    fileId: link.provaAntiga.officialExamFileId,
    action: "enem_2025_question_reopen",
    status: "SUCCESS",
    message: `Questão ${link.numeroQuestao} devolvida para revisão por ${user.email}.`,
    metadata: { questionId: id, examId: link.provaAntigaId },
  });
  return NextResponse.json({ reopened: true, questionId: id });
}
