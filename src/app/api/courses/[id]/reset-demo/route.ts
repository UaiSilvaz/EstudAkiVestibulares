import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resetCourseDemo } from "@/lib/courses/learning";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  try {
    const { id } = await params;
    const result = await resetCourseDemo(id, user);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = process.env.NODE_ENV === "production" ? 404 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no reset demo." }, { status });
  }
}
