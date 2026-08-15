import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const sessions = await db.studySession.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ sessions, studySessions: sessions });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    focus?: string;
    durationSeconds?: number;
    questionsAnswered?: number;
    correctAnswers?: number;
    notes?: string;
    startedAt?: string;
    endedAt?: string;
  };

  const durationSeconds = Math.max(0, Math.round(body.durationSeconds ?? 0));
  const questionsAnswered = Math.max(0, Math.round(body.questionsAnswered ?? 0));
  const correctAnswers = Math.max(0, Math.round(body.correctAnswers ?? 0));

  const session = await db.studySession.create({
    data: {
      userId: user.id,
      focus: body.focus?.trim() || "questions",
      durationSeconds,
      questionsAnswered,
      correctAnswers: Math.min(correctAnswers, questionsAnswered),
      notes: body.notes?.trim() || null,
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      endedAt: body.endedAt ? new Date(body.endedAt) : null,
    },
  });

  await db.activity.create({
    data: {
      userId: user.id,
      type: "CONTENT",
      message: `${user.name} registrou uma sessao de estudo.`,
      xp: Math.min(50, Math.floor(durationSeconds / 120)),
    },
  });

  return NextResponse.json({ session, studySession: session }, { status: 201 });
}
