import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leagueForXp } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    selectedAlternative?: string;
    errorType?: string;
    timeSpentSeconds?: number;
  };

  if (!body.selectedAlternative) {
    return NextResponse.json({ error: "Selecione uma alternativa." }, { status: 400 });
  }

  const question = await db.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Questao nao encontrada." }, { status: 404 });
  }

  const correct = question.correctAlternative === body.selectedAlternative;
  const gainedXp = correct ? 15 : 5;

  await db.questionAttempt.create({
    data: {
      userId: user.id,
      questionId: question.id,
      selectedAlternative: body.selectedAlternative,
      correct,
      errorType: correct ? null : body.errorType ?? "concept_gap",
      timeSpentSeconds: body.timeSpentSeconds ?? 0,
    },
  });

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: {
      xp: { increment: gainedXp },
    },
  });

  const newLeague = leagueForXp(updatedUser.xp);
  const leveledUp = newLeague !== updatedUser.league;
  if (leveledUp) {
    await db.user.update({ where: { id: user.id }, data: { league: newLeague } });
  }

  await db.activity.create({
    data: {
      userId: user.id,
      type: "QUESTION",
      message: `${user.name} respondeu uma questao de ${correct ? "forma correta" : "revisao"}.`,
      xp: gainedXp,
    },
  });

  return NextResponse.json({
    correct,
    correctAlternative: question.correctAlternative,
    explanation: question.explanation,
    pedagogyComment: question.pedagogyComment,
    gainedXp,
    leveledUp,
    newLeague,
  });
}
