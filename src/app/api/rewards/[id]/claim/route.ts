import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { claimReward, getLearningUserId } from "@/lib/courses/learning";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  try {
    const { id } = await params;
    return NextResponse.json(await claimReward(id, userId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao resgatar recompensa." }, { status: 400 });
  }
}
