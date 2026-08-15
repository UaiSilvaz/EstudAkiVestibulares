import {
  OfficialAnswerReviewStatus,
  OfficialResolutionStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { generateOfficialResolution } from "@/lib/openai-resolution";
import { logOfficialImport } from "@/lib/official-sources";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const file = await db.officialFile.findUnique({
    where: { id },
    include: {
      answerKeys: {
        where: {
          answerReviewStatus: OfficialAnswerReviewStatus.APPROVED,
          statement: { not: null },
          correctAlternative: { not: "ANULADA" },
          resolutionStatus: {
            in: [
              OfficialResolutionStatus.NOT_GENERATED,
              OfficialResolutionStatus.REJECTED,
            ],
          },
        },
        orderBy: { questionNumber: "asc" },
      },
    },
  });
  if (!file) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  if (!file.answerKeys.length) {
    return NextResponse.json(
      { error: "Nenhuma questão elegível. Aprove o gabarito e confira o enunciado primeiro." },
      { status: 400 },
    );
  }

  let generated = 0;
  const errors: Array<{ questionNumber: number; error: string }> = [];
  for (const answer of file.answerKeys) {
    try {
      const { resolution, model } = await generateOfficialResolution({
        vestibular: file.vestibular,
        year: file.year,
        questionNumber: answer.questionNumber,
        statement: answer.statement!,
        correctAlternative: answer.correctAlternative,
      });
      await db.officialAnswerKey.update({
        where: { id: answer.id },
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
      generated += 1;
    } catch (error) {
      errors.push({
        questionNumber: answer.questionNumber,
        error: error instanceof Error ? error.message : "Falha desconhecida.",
      });
      if (!process.env.OPENAI_API_KEY) break;
    }
  }
  await logOfficialImport({
    sourceId: file.sourceId,
    fileId: file.id,
    action: "resolution_generate_bulk",
    status: errors.length ? (generated ? "PARTIAL" : "ERROR") : "SUCCESS",
    message: `${generated} resolução(ões) gerada(s); ${errors.length} erro(s).`,
    metadata: { requestedBy: user.email, generated, errors },
  });
  if (!generated && errors.length) {
    return NextResponse.json({ error: errors[0].error, generated, errors }, { status: 400 });
  }
  return NextResponse.json({ generated, errors });
}
