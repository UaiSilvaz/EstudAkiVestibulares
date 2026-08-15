import { ContentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import {
  ENEM_2025_TEST_CONFIRMATION,
  ENEM_2025_UNDO_CONFIRMATION,
  getEnem2025PilotRecords,
  testPublicationReasons,
} from "@/lib/enem-2025-pilot";
import { logOfficialImport } from "@/lib/official-sources";

const PRODUCTION_CONFIRMATION = "CONFIRMO PUBLICAÇÃO TEMPORÁRIA EM PRODUÇÃO";

function testModeAllowed(request: Request, productionConfirmation?: string) {
  const hostname = new URL(request.url).hostname.toLowerCase();
  const local =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]";
  if (process.env.NODE_ENV !== "production" && local) return true;
  return (
    process.env.ALLOW_ENEM_2025_PILOT_TEST === "true" &&
    productionConfirmation === PRODUCTION_CONFIRMATION
  );
}

export async function POST(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const body = (await request.json().catch(() => null)) as {
    confirmation?: string;
    productionConfirmation?: string;
  } | null;
  if (body?.confirmation !== ENEM_2025_TEST_CONFIRMATION) {
    return NextResponse.json({ error: "Confirmação de teste inválida." }, { status: 400 });
  }
  if (!testModeAllowed(request, body.productionConfirmation)) {
    return NextResponse.json(
      {
        error:
          "A publicação de teste só funciona em localhost/desenvolvimento. Em produção, exige ALLOW_ENEM_2025_PILOT_TEST=true e confirmação explícita adicional.",
      },
      { status: 403 },
    );
  }

  const exams = await getEnem2025PilotRecords();
  const eligible: string[] = [];
  const blocked = new Map<string, number>();
  for (const exam of exams) {
    const answers = new Map(
      exam.officialKeyFile?.answerKeys.map((answer) => [answer.questionNumber, answer]),
    );
    for (const link of exam.questoes) {
      if (link.questao.status === ContentStatus.PUBLISHED) continue;
      const reasons = testPublicationReasons(
        exam,
        link,
        answers.get(link.numeroQuestao),
      );
      if (reasons.length) {
        for (const reason of reasons) {
          blocked.set(reason, (blocked.get(reason) ?? 0) + 1);
        }
      } else {
        eligible.push(link.questao.id);
      }
    }
  }
  const questionIds = [...new Set(eligible)];
  const now = new Date();
  await db.$transaction(async (transaction) => {
    if (questionIds.length) {
      await transaction.question.updateMany({
        where: {
          id: { in: questionIds },
          status: ContentStatus.REVIEW,
        },
        data: {
          status: ContentStatus.PUBLISHED,
          pilotTestPublishedAt: now,
          pilotTestPublishedBy: user.email,
        },
      });
    }
    for (const exam of exams) {
      const hasPublishedQuestion = exam.questoes.some((link) =>
        questionIds.includes(link.questao.id),
      );
      if (!hasPublishedQuestion || exam.pilotTestAvailableAt) continue;
      await transaction.provaAntiga.update({
        where: { id: exam.id },
        data: {
          pilotTestPreviousStatus: exam.status,
          pilotTestAvailableAt: now,
          status: "DISPONIVEL",
        },
      });
    }
  });
  await logOfficialImport({
    action: "enem_2025_pilot_test_publish",
    status: "SUCCESS",
    message: `${questionIds.length} questão(ões) publicadas temporariamente por ${user.email}.`,
    metadata: { questionIds, blocked: Object.fromEntries(blocked) },
  });
  return NextResponse.json({
    published: questionIds.length,
    temporary: true,
    blocked: Object.fromEntries(blocked),
  });
}

export async function DELETE(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const body = (await request.json().catch(() => null)) as {
    confirmation?: string;
    productionConfirmation?: string;
  } | null;
  if (body?.confirmation !== ENEM_2025_UNDO_CONFIRMATION) {
    return NextResponse.json({ error: "Confirmação de reversão inválida." }, { status: 400 });
  }
  if (!testModeAllowed(request, body.productionConfirmation)) {
    return NextResponse.json({ error: "Reversão de teste não autorizada neste ambiente." }, { status: 403 });
  }
  const questions = await db.question.findMany({
    where: { pilotTestPublishedAt: { not: null } },
    select: { id: true },
  });
  const exams = await db.provaAntiga.findMany({
    where: { pilotTestAvailableAt: { not: null } },
    select: { id: true, pilotTestPreviousStatus: true },
  });
  await db.$transaction(async (transaction) => {
    await transaction.question.updateMany({
      where: { id: { in: questions.map((question) => question.id) } },
      data: {
        status: ContentStatus.REVIEW,
        pilotTestPublishedAt: null,
        pilotTestPublishedBy: null,
      },
    });
    for (const exam of exams) {
      await transaction.provaAntiga.update({
        where: { id: exam.id },
        data: {
          status: exam.pilotTestPreviousStatus ?? "PENDENTE",
          pilotTestAvailableAt: null,
          pilotTestPreviousStatus: null,
        },
      });
    }
  });
  await logOfficialImport({
    action: "enem_2025_pilot_test_undo",
    status: "SUCCESS",
    message: `${questions.length} questão(ões) de teste retornaram para REVIEW por ${user.email}.`,
    metadata: { questionIds: questions.map((question) => question.id) },
  });
  return NextResponse.json({ reverted: questions.length });
}
