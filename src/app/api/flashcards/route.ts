import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureAnkiFlashcards } from "@/lib/flashcards-bootstrap";

async function currentUserId() {
  const user = await getCurrentUser();
  return user ? getPersistedUserId(user) : null;
}

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  await ensureAnkiFlashcards();
  const params = new URL(request.url).searchParams;
  const subjectId = params.get("subject") || undefined;
  const deck = params.get("deck") || undefined;
  const search = params.get("q")?.trim() || undefined;
  const scope = params.get("scope");
  const favoriteIds =
    scope === "favorites"
      ? (
          await db.flashcardFavorite.findMany({
            where: { userId },
            select: { flashcardId: true },
          })
        ).map((item) => item.flashcardId)
      : undefined;
  const cards = await db.flashcard.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ ownerId: null }, { shared: true }, { ownerId: userId }],
      ...(subjectId ? { subjectId } : {}),
      ...(deck ? { deck } : {}),
      ...(scope === "mine" ? { ownerId: userId } : {}),
      ...(favoriteIds ? { id: { in: favoriteIds } } : {}),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { front: { contains: search, mode: "insensitive" } },
                  { back: { contains: search, mode: "insensitive" } },
                ],
              },
            ],
          }
        : {}),
    },
    include: {
      subject: true,
      topic: true,
      owner: { select: { id: true, name: true } },
      favorites: { where: { userId }, select: { id: true } },
    },
    orderBy: [{ deck: "asc" }, { front: "asc" }],
    take: 90,
  });
  return NextResponse.json({
    cards: cards.map((card) => ({
      ...card,
      favorite: card.favorites.length > 0,
      favorites: undefined,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const body = (await request.json()) as {
    subjectId?: string;
    deck?: string;
    front?: string;
    back?: string;
    shared?: boolean;
  };
  if (!body.front?.trim() || !body.back?.trim()) {
    return NextResponse.json({ error: "Preencha frente e verso." }, { status: 400 });
  }
  const card = await db.flashcard.create({
    data: {
      ownerId: userId,
      subjectId: body.subjectId || null,
      deck: body.deck?.trim() || "Meus flashcards",
      source: "USER",
      shared: Boolean(body.shared),
      front: body.front.trim(),
      back: body.back.trim(),
      status: "PUBLISHED",
    },
    include: { subject: true, topic: true, owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ card: { ...card, favorite: false } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const body = (await request.json()) as { id?: string; shared?: boolean };
  const card = body.id
    ? await db.flashcard.findFirst({ where: { id: body.id, ownerId: userId } })
    : null;
  if (!card) return NextResponse.json({ error: "Flashcard não encontrado." }, { status: 404 });
  const updated = await db.flashcard.update({
    where: { id: card.id },
    data: { shared: Boolean(body.shared) },
  });
  return NextResponse.json({ card: updated });
}

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  const result = id
    ? await db.flashcard.deleteMany({ where: { id, ownerId: userId } })
    : { count: 0 };
  return NextResponse.json({ removed: result.count > 0 });
}
