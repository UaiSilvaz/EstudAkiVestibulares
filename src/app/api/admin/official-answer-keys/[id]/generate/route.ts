import {
  OfficialAnswerReviewStatus,
  OfficialResolutionStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { generateOfficialResolution } from "@/lib/openai-resolution";
import { logOfficialImport } from "@/lib/official-sources";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const answer = await db.officialAnswerKey.findUnique({
    where: { id },
    include: { file: true },
  });
  if (!answer) return NextResponse.json({ error: "Questão não encontrada." }, { status: 404 });
  if (answer.answerReviewStatus !== OfficialAnswerReviewStatus.APPROVED) {
    return NextResponse.json(
      { error: "Aprove o gabarito antes de gerar a resolução." },
      { status: 400 },
    );
  }
  if (!answer.statement?.trim()) {
    return NextResponse.json(
      { error: "Preencha o enunciado antes de gerar a resolução." },
      { status: 400 },
    );
  }
  if (answer.correctAlternative === "ANULADA") {
    return NextResponse.json(
      { error: "Questões anuladas exigem tratamento editorial manual." },
      { status: 400 },
    );
  }

  try {
    const { resolution, model } = await generateOfficialResolution({
      vestibular: answer.file.vestibular,
      year: answer.file.year,
      questionNumber: answer.questionNumber,
      statement: answer.statement,
      correctAlternative: answer.correctAlternative,
    });
    const updated = await db.officialAnswerKey.update({
      where: { id },
      data: {
        shortComment: resolution.shortComment,
        fullResolution: resolution.fullResolution,
        steps: JSON.stringify(resolution.steps),
        alternativeComments: JSON.stringify(resolution.alternativeComments),
        commonError: resolution.commonError,
        studyTip: resolution.studyTip,
        relatedContent: resolution.relatedContent,
        resolutionStatus: OfficialResolutionStatus.IN_REVIEW,
        generatedByModel: model,
        generatedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        publishedAt: null,
      },
    });
    await logOfficialImport({
      sourceId: answer.file.sourceId,
      fileId: answer.fileId,
      action: "resolution_generate",
      status: "SUCCESS",
      message: `Resolução gerada com ${model} e enviada para revisão.`,
      metadata: { answerKeyId: id, requestedBy: user.email },
    });
    return NextResponse.json({ answer: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gerar.";
    await logOfficialImport({
      sourceId: answer.file.sourceId,
      fileId: answer.fileId,
      action: "resolution_generate",
      status: "ERROR",
      message,
      metadata: { answerKeyId: id, requestedBy: user.email },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
