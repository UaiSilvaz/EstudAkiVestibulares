import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLearningUserId, saveLessonNote } from "@/lib/courses/learning";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  try {
    const body = (await request.json()) as { content?: string; positionSeconds?: number };
    const { id } = await params;
    const note = await saveLessonNote(id, userId, {
      content: body.content ?? "",
      positionSeconds: body.positionSeconds ?? 0,
    });
    return NextResponse.json({ note });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao salvar anotacao." }, { status: 400 });
  }
}
