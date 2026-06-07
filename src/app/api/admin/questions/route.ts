import { ContentStatus, Difficulty } from "@prisma/client";
import { NextResponse } from "next/server";
import { canPublishDirectly, getCurrentUser, canManageContent } from "@/lib/auth";
import { db } from "@/lib/db";

type Alternative = { key: string; text: string };

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const body = (await request.json()) as {
    vestibularId?: string;
    subjectId?: string;
    topicId?: string;
    year?: number;
    difficulty?: Difficulty;
    statement?: string;
    alternatives?: Alternative[];
    correctAlternative?: string;
    explanation?: string;
    pedagogyComment?: string;
    tags?: string[];
    source?: string;
    status?: ContentStatus;
  };

  if (
    !body.vestibularId ||
    !body.subjectId ||
    !body.year ||
    !body.statement ||
    !body.alternatives?.length ||
    !body.correctAlternative ||
    !body.explanation
  ) {
    return NextResponse.json({ error: "Preencha os campos obrigatorios." }, { status: 400 });
  }

  const status = canPublishDirectly(user.role)
    ? body.status ?? ContentStatus.PUBLISHED
    : ContentStatus.REVIEW;

  const question = await db.question.create({
    data: {
      vestibularId: body.vestibularId,
      subjectId: body.subjectId,
      topicId: body.topicId || null,
      authorId: user.id,
      year: body.year,
      difficulty: body.difficulty ?? Difficulty.MEDIUM,
      statement: body.statement,
      alternatives: JSON.stringify(body.alternatives),
      correctAlternative: body.correctAlternative,
      explanation: body.explanation,
      pedagogyComment: body.pedagogyComment,
      tags: JSON.stringify(body.tags ?? []),
      source: body.source,
      status,
    },
  });

  await db.activity.create({
    data: {
      userId: user.id,
      type: "CONTENT",
      message: `${user.name} cadastrou uma nova questao.`,
      xp: 0,
    },
  });

  return NextResponse.json({ question });
}
