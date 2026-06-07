import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const { body } = (await request.json()) as { body?: string };
  const text = body?.trim();

  if (!text) {
    return NextResponse.json({ error: "Comentario vazio." }, { status: 400 });
  }

  const comment = await db.videoComment.create({
    data: {
      userId: user.id,
      videoId: id,
      body: text,
    },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json({
    comment: {
      id: comment.id,
      body: comment.body,
      userName: comment.user.name,
      createdAt: comment.createdAt.toISOString(),
    },
  });
}
