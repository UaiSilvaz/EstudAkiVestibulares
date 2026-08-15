import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  }

  const { id } = await params;
  const wrongAttempt = await db.questionAttempt.findFirst({
    where: {
      userId: persistedUserId,
      questionId: id,
      correct: false,
      annulled: false,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!wrongAttempt) {
    return NextResponse.json(
      { error: "Responda à questão antes de adicioná-la ao caderno." },
      { status: 409 },
    );
  }

  const alreadyAdded = !wrongAttempt.reviewed;
  if (!alreadyAdded) {
    await db.questionAttempt.update({
      where: { id: wrongAttempt.id },
      data: { reviewed: false, reviewedAt: null },
    });
  }
  await db.activity.create({
    data: {
      userId: persistedUserId,
      type: "CONTENT",
      message: `${user.name} adicionou uma questão ao caderno de revisões.`,
      xp: 0,
    },
  });

  return NextResponse.json({ added: true, alreadyAdded });
}
