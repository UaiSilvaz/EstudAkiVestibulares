import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { answerLessonQuestion, getLearningUserId } from "@/lib/courses/learning";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  try {
    const body = (await request.json()) as { questionId?: string; selectedAlternative?: string };
    const { id } = await params;
    const result = await answerLessonQuestion(id, userId, {
      questionId: body.questionId ?? "",
      selectedAlternative: body.selectedAlternative ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao responder." }, { status: 400 });
  }
}
