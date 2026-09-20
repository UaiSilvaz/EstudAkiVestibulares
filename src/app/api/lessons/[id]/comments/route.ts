import { LessonCommentKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createLessonComment,
  deleteLessonComment,
  getLearningUserId,
  getLessonComments,
  reportLessonComment,
  toggleLessonCommentLike,
  updateLessonComment,
} from "@/lib/courses/learning";

function commentKind(value: string | null) {
  if (value === "QUESTION") return LessonCommentKind.QUESTION;
  if (value === "ANSWER") return LessonCommentKind.ANSWER;
  return value === "DISCUSSION" ? LessonCommentKind.DISCUSSION : undefined;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  const { id } = await params;
  const kind = commentKind(new URL(request.url).searchParams.get("kind"));
  const comments = await getLessonComments(id, userId, kind);
  return NextResponse.json({ comments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  try {
    const body = (await request.json()) as { body?: string; kind?: string; positionSeconds?: number; parentId?: string };
    const { id } = await params;
    const comment = await createLessonComment(id, userId, {
      body: body.body ?? "",
      kind: commentKind(body.kind ?? null),
      positionSeconds: body.positionSeconds ?? null,
      parentId: body.parentId ?? null,
    });
    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao comentar." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  const body = (await request.json()) as { commentId?: string; body?: string; action?: "like" | "report" | "delete" };
  if (!body.commentId) return NextResponse.json({ error: "Comentario nao informado." }, { status: 400 });
  if (body.action === "like") return NextResponse.json(await toggleLessonCommentLike(body.commentId, userId));
  if (body.action === "report") return NextResponse.json(await reportLessonComment(body.commentId, userId));
  if (body.action === "delete") return NextResponse.json(await deleteLessonComment(body.commentId, userId));
  return NextResponse.json(await updateLessonComment(body.commentId, userId, body.body ?? ""));
}
