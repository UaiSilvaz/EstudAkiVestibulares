import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardStudyXp, lockStudentProgress, syncStudyStreak } from "@/lib/study-xp";
import { readJsonRequest } from "@/server/security/request";

async function userId() { const user = await getCurrentUser(); return user ? getPersistedUserId(user) : null; }
export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const sessions = await db.studySession.findMany({ where: { userId: id }, orderBy: { startedAt: "desc" }, take: 50 });
  return NextResponse.json({ sessions, studySessions: sessions }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 4096 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body || typeof body !== "object" || body.action !== "start") return NextResponse.json({ error: "Inicie o cronômetro para registrar uma sessão real." }, { status: 400 });
  const session = await db.$transaction(async tx => {
    await lockStudentProgress(tx, id);
    const active = await tx.studySession.findFirst({ where: { userId: id, endedAt: null, focus: "timer" } });
    if (active) return active;
    return tx.studySession.create({ data: { userId: id, focus: "timer", startedAt: new Date() } });
  });
  return NextResponse.json({ session, studySession: session }, { status: 201 });
}
export async function PATCH(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const parsed = await readJsonRequest<{ id?: string }>(request, { maxBytes: 4096 });
  if (!parsed.ok) return parsed.response;
  if (!parsed.data || typeof parsed.data.id !== "string") return NextResponse.json({ error: "Sessão inválida." }, { status: 400 });
  const result = await db.$transaction(async tx => {
    await lockStudentProgress(tx, id);
    const session = await tx.studySession.findFirst({ where: { id: parsed.data.id, userId: id, focus: "timer" } });
    if (!session) return null;
    if (session.endedAt) return { session, studySession: session, gainedXp: 0 };
    const endedAt = new Date();
    const durationSeconds = Math.max(0, Math.min(7200, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)));
    const attempts = await tx.questionAttempt.findMany({ where: { userId: id, annulled: false, createdAt: { gte: session.startedAt, lte: endedAt } }, select: { correct: true } });
    const updated = await tx.studySession.update({ where: { id: session.id }, data: { endedAt, durationSeconds, questionsAnswered: attempts.length, correctAnswers: attempts.filter(row => row.correct).length } });
    const gainedXp = await awardStudyXp(tx, id, "session:" + session.id, Math.min(50, Math.floor(durationSeconds / 120)), "Sessão de estudo concluída");
    await syncStudyStreak(tx, id);
    return { session: updated, studySession: updated, gainedXp };
  });
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
}
