import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { finishSimulation, getLearningUserId } from "@/lib/courses/learning";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  try {
    const body = (await request.json()) as { responses?: Record<string, string>; timeSeconds?: number };
    const { id } = await params;
    return NextResponse.json(await finishSimulation(id, userId, {
      responses: body.responses ?? {},
      timeSeconds: body.timeSeconds ?? 0,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao finalizar simulado." }, { status: 400 });
  }
}
