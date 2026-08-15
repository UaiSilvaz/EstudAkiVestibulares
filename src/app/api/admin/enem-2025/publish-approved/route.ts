import {
  ContentStatus,
  OfficialResolutionStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import {
  ENEM_2025_PUBLISH_CONFIRMATION,
  getEnem2025PilotRecords,
  publicationReasons,
} from "@/lib/enem-2025-pilot";
import { logOfficialImport } from "@/lib/official-sources";

export async function POST(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const body = (await request.json().catch(() => null)) as { confirmation?: string } | null;
  if (body?.confirmation !== ENEM_2025_PUBLISH_CONFIRMATION) {
    return NextResponse.json(
      { error: "Confirmação de publicação inválida." },
      { status: 400 },
    );
  }

  const exams = await getEnem2025PilotRecords();
  const eligible: Array<{
    questionId: string;
    answerId: string;
    examId: string;
  }> = [];
  const blocked = new Map<string, number>();
  for (const exam of exams) {
    const answers = new Map(
      exam.officialKeyFile?.answerKeys.map((answer) => [answer.questionNumber, answer]),
    );
    for (const link of exam.questoes) {
      if (link.questao.status === ContentStatus.PUBLISHED) continue;
      const answer = answers.get(link.numeroQuestao);
      const reasons = publicationReasons(exam, link, answer);
      if (reasons.length || !answer) {
        for (const reason of reasons.length ? reasons : ["Sem gabarito associado"]) {
          blocked.set(reason, (blocked.get(reason) ?? 0) + 1);
        }
        continue;
      }
      eligible.push({
        questionId: link.questao.id,
        answerId: answer.id,
        examId: exam.id,
      });
    }
  }
  const questionIds = [...new Set(eligible.map((item) => item.questionId))];
  const answerIds = [...new Set(eligible.map((item) => item.answerId))];
  const examIds = [...new Set(eligible.map((item) => item.examId))];
  if (questionIds.length) {
    await db.$transaction([
      db.question.updateMany({
        where: {
          id: { in: questionIds },
          status: ContentStatus.REVIEW,
        },
        data: {
          status: ContentStatus.PUBLISHED,
          pilotTestPublishedAt: null,
          pilotTestPublishedBy: null,
        },
      }),
      db.officialAnswerKey.updateMany({
        where: { id: { in: answerIds } },
        data: {
          resolutionStatus: OfficialResolutionStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      }),
      db.provaAntiga.updateMany({
        where: { id: { in: examIds } },
        data: { status: "DISPONIVEL" },
      }),
    ]);
  }
  await logOfficialImport({
    action: "enem_2025_publish_approved",
    status: "SUCCESS",
    message: `${questionIds.length} questão(ões) aprovadas publicadas por ${user.email}.`,
    metadata: {
      questionIds,
      blocked: Object.fromEntries(blocked),
    },
  });
  return NextResponse.json({
    published: questionIds.length,
    blocked: Object.fromEntries(blocked),
  });
}
