import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const result = await db.questionAttempt.updateMany({
    where: {
      userId: user.id,
      questionId: id,
      correct: false,
      reviewed: false,
    },
    data: {
      reviewed: true,
      reviewedAt: new Date(),
    },
  });

  if (result.count > 0) {
    await db.activity.create({
      data: {
        userId: user.id,
        type: "CONTENT",
        message: `${user.name} revisou uma questao do caderno de erros.`,
        xp: 3,
      },
    });
  }

  return NextResponse.json({ reviewed: result.count });
}
