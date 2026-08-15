import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const userId = user ? await getPersistedUserId(user) : null;
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const { id } = await params;
  const card = await db.flashcard.findFirst({
    where: { id, status: "PUBLISHED", OR: [{ ownerId: null }, { shared: true }, { ownerId: userId }] },
  });
  if (!card) return NextResponse.json({ error: "Flashcard indisponível." }, { status: 404 });
  const existing = await db.flashcardFavorite.findUnique({
    where: { userId_flashcardId: { userId, flashcardId: id } },
  });
  if (existing) {
    await db.flashcardFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorite: false });
  }
  await db.flashcardFavorite.create({ data: { userId, flashcardId: id } });
  return NextResponse.json({ favorite: true });
}
