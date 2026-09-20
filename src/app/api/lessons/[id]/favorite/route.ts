import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLearningUserId, toggleLessonFavorite } from "@/lib/courses/learning";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  const { id } = await params;
  const result = await toggleLessonFavorite(id, userId);
  return NextResponse.json(result);
}
