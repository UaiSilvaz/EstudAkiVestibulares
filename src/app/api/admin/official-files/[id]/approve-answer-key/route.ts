import {
  OfficialAnswerReviewStatus,
  OfficialFileType,
  OfficialProcessingStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { logOfficialImport } from "@/lib/official-sources";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    confirmation?: string;
  } | null;
  if (body?.confirmation !== "APROVAR GABARITO OFICIAL") {
    return NextResponse.json({ error: "Confirmação de gabarito inválida." }, { status: 400 });
  }
  const file = await db.officialFile.findUnique({
    where: { id },
    include: {
      answerKeys: true,
      keyRecords: {
        include: {
          questoes: {
            include: { questao: { select: { correctAlternative: true } } },
          },
        },
      },
    },
  });
  if (!file || file.fileType !== OfficialFileType.ANSWER_KEY) {
    return NextResponse.json({ error: "Arquivo de gabarito não encontrado." }, { status: 404 });
  }
  if (!file.answerKeys.length) {
    return NextResponse.json({ error: "O gabarito ainda não foi extraído." }, { status: 400 });
  }
  const answerMap = new Map(
    file.answerKeys.map((answer) => [answer.questionNumber, answer.correctAlternative]),
  );
  const linkedQuestions = file.keyRecords.flatMap((exam) => exam.questoes);
  const mismatches = linkedQuestions.filter(
    (link) => answerMap.get(link.numeroQuestao) !== link.questao.correctAlternative,
  );
  if (mismatches.length) {
    return NextResponse.json(
      { error: `${mismatches.length} resposta(s) divergem das questões vinculadas.` },
      { status: 400 },
    );
  }
  await db.$transaction([
    db.officialAnswerKey.updateMany({
      where: { fileId: id },
      data: {
        answerReviewStatus: OfficialAnswerReviewStatus.APPROVED,
        answerReviewedBy: user.email,
        answerReviewedAt: new Date(),
      },
    }),
    db.officialFile.update({
      where: { id },
      data: { processingStatus: OfficialProcessingStatus.APPROVED },
    }),
  ]);
  await logOfficialImport({
    sourceId: file.sourceId,
    fileId: id,
    action: "answer_key_approve_all",
    status: "SUCCESS",
    message: `${file.answerKeys.length} resposta(s) aprovadas por ${user.email}.`,
    metadata: { answerCount: file.answerKeys.length },
  });
  return NextResponse.json({ approved: file.answerKeys.length });
}
