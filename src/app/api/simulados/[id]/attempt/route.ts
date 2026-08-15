import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncUserAchievements } from "@/lib/backend-metrics";
import { calculateResult, normalizeAnswers, parseAnswerKey, resultIsReleased, simulationState } from "@/lib/exam-simulations";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  const { id } = await params;
  const exam = await db.exam.findUnique({ where: { id } });
  if (!exam || !exam.isSimulado || exam.status !== "PUBLISHED") return NextResponse.json({ error: "Simulado não encontrado." }, { status: 404 });
  if (simulationState(exam) !== "OPEN") return NextResponse.json({ error: "O simulado não está aberto." }, { status: 409 });

  const now = new Date();
  const personalEnd = new Date(now.getTime() + (exam.durationMinutes ?? 180) * 60_000);
  const expiresAt = exam.endsAt && exam.endsAt < personalEnd ? exam.endsAt : personalEnd;
  try {
    const attempt = await db.examAttempt.upsert({
      where: { examId_userId: { examId: id, userId: persistedUserId } },
      create: { examId: id, userId: persistedUserId, expiresAt },
      update: {},
    });
    return NextResponse.json({ attempt: publicAttempt(attempt) });
  } catch {
    return NextResponse.json({ error: "Não foi possível iniciar. Entre novamente e tente outra vez." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  const { id } = await params;
  const body = (await request.json()) as { responses?: Record<string, unknown>; submit?: boolean };
  const responses = normalizeAnswers(body.responses ?? {});
  const [exam, attempt] = await Promise.all([
    db.exam.findUnique({ where: { id } }),
    db.examAttempt.findUnique({ where: { examId_userId: { examId: id, userId: persistedUserId } } }),
  ]);
  if (!exam || !attempt) return NextResponse.json({ error: "Tentativa não encontrada." }, { status: 404 });
  if (attempt.submittedAt) return NextResponse.json({ error: "Esta tentativa ja foi entregue." }, { status: 409 });

  const now = new Date();
  const mustSubmit = Boolean(body.submit) || now >= attempt.expiresAt || Boolean(exam.endsAt && now >= exam.endsAt);
  if (!mustSubmit) {
    const saved = await db.examAttempt.update({ where: { id: attempt.id }, data: { responses: JSON.stringify(responses) } });
    return NextResponse.json({ attempt: publicAttempt(saved), saved: true });
  }

  const result = calculateResult(parseAnswerKey(exam.answerKey), responses);
  const submitted = await db.examAttempt.update({
    where: { id: attempt.id },
    data: { responses: JSON.stringify(responses), submittedAt: now, status: "SUBMITTED", correctCount: result.correctCount, score: result.score },
  });
  const released = resultIsReleased(exam.resultsAt, now);
  const persistedUser = await db.user.findUnique({ where: { id: persistedUserId } });
  const achievements = persistedUser
    ? (await syncUserAchievements(persistedUser).catch((error) => {
        console.error("Falha ao sincronizar conquistas do simulado:", error);
        return [];
      }))
        .filter((record) => record.newlyUnlocked)
        .map((record) => record.achievement)
    : [];
  return NextResponse.json({
    attempt: publicAttempt(submitted), submitted: true, released,
    result: released ? result : null,
    answerKey: released ? parseAnswerKey(exam.answerKey) : null,
    achievements,
  });
}

function publicAttempt(attempt: { id: string; startedAt: Date; expiresAt: Date; submittedAt: Date | null; responses: string; status: string; correctCount: number | null; score: number | null }) {
  return { ...attempt, responses: parseAnswerKey(attempt.responses) };
}
