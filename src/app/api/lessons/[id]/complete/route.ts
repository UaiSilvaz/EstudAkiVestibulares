import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeLesson, getLearningUserId } from "@/lib/courses/learning";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  try {
    const { id } = await params;
    const progress = await completeLesson(id, userId);
    return NextResponse.json({ progress });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao concluir aula." }, { status: 400 });
  }
}
