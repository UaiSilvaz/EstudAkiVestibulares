import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  const { id } = await params;
  const body = (await request.json()) as { reason?: string; details?: string };
  if (!body.reason?.trim()) return NextResponse.json({ error: "Informe o motivo." }, { status: 400 });
  const question = await db.question.findFirst({ where: { id, status: "PUBLISHED" }, select: { id: true } });
  if (!question) return NextResponse.json({ error: "Questão indisponível." }, { status: 404 });
  const report = await db.questionReport.create({
    data: { userId: persistedUserId, questionId: id, reason: body.reason.trim(), details: body.details?.trim() || null },
  });
  return NextResponse.json({ report }, { status: 201 });
}
