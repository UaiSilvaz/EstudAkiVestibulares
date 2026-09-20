import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLearningUserId, saveLessonProgress } from "@/lib/courses/learning";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  try {
    const body = (await request.json()) as { positionSeconds?: number; watchedSeconds?: number; percentage?: number };
    const { id } = await params;
    const progress = await saveLessonProgress(id, userId, {
      positionSeconds: body.positionSeconds ?? 0,
      watchedSeconds: body.watchedSeconds ?? 0,
      percentage: body.percentage ?? 0,
    });
    return NextResponse.json({ progress });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao salvar progresso." }, { status: 400 });
  }
}
