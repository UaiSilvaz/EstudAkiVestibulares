import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createLessonDoubt, getLearningUserId } from "@/lib/courses/learning";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  try {
    const body = (await request.json()) as { body?: string; positionSeconds?: number };
    const { id } = await params;
    const question = await createLessonDoubt(id, userId, {
      body: body.body ?? "",
      positionSeconds: body.positionSeconds ?? null,
    });
    return NextResponse.json({ question });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao enviar duvida." }, { status: 400 });
  }
}
