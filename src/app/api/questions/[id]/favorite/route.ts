import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  const { id } = await params;
  const question = await db.question.findFirst({ where: { id, status: "PUBLISHED" }, select: { id: true } });
  if (!question) return NextResponse.json({ error: "Questão indisponível." }, { status: 404 });
  const existing = await db.questionFavorite.findUnique({ where: { userId_questionId: { userId: persistedUserId, questionId: id } } });
  if (existing) {
    await db.questionFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorite: false });
  }
  await db.questionFavorite.create({ data: { userId: persistedUserId, questionId: id } });
  return NextResponse.json({ favorite: true });
}
