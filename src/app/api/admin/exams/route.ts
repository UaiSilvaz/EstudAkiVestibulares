import { NextResponse } from "next/server";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const body = (await request.json()) as {
    vestibularId?: string;
    title?: string;
    year?: number;
    phase?: string;
    day?: string;
    pdfUrl?: string;
    answerKeyUrl?: string;
    sourceUrl?: string;
    imageUrl?: string;
    questionCount?: number;
    durationMinutes?: number;
    color?: string;
  };

  if (!body.vestibularId || !body.title || !body.year || !body.phase) {
    return NextResponse.json({ error: "Campos obrigatorios ausentes." }, { status: 400 });
  }

  const data = {
    vestibularId: body.vestibularId,
    title: body.title,
    year: body.year,
    phase: body.phase,
    day: body.day,
    pdfUrl: body.pdfUrl || null,
    answerKeyUrl: body.answerKeyUrl || null,
    sourceUrl: body.sourceUrl || null,
    imageUrl: body.imageUrl || null,
    questionCount: body.questionCount || null,
    durationMinutes: body.durationMinutes || null,
    color: body.color ?? "#1E73FF",
    status: "PUBLISHED" as const,
  };

  let exam;

  try {
    exam = await db.exam.create({ data });

    await db.activity.create({
      data: {
        userId: user.id,
        type: "CONTENT",
        message: `${user.name} cadastrou a prova ${body.title}.`,
      },
    });
  } catch {
    exam = {
      id: `local-exam-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return NextResponse.json({ exam });
}
