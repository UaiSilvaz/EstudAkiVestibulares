import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCourseDetail, getLearningUserId } from "@/lib/courses/learning";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const userId = await getLearningUserId(user);
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  const { id } = await params;
  const course = await getCourseDetail(id, userId);
  if (!course) return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
  return NextResponse.json({ course });
}
