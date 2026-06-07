import { VideoKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    subjectId?: string;
    kind?: VideoKind;
    description?: string;
    durationSeconds?: number;
    videoUrl?: string;
  };

  if (!body.title || !body.description) {
    return NextResponse.json({ error: "Campos obrigatorios ausentes." }, { status: 400 });
  }

  const video = await db.video.create({
    data: {
      title: body.title,
      subjectId: body.subjectId || null,
      authorId: user.id,
      kind: body.kind ?? VideoKind.EXPRESS,
      description: body.description,
      durationSeconds: body.durationSeconds ?? 90,
      videoUrl: body.videoUrl || null,
      status: "PUBLISHED",
    },
  });

  return NextResponse.json({ video });
}
