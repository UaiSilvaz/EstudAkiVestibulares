import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { purchaseCourseDemo } from "@/lib/courses/learning";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  try {
    const { id } = await params;
    const result = await purchaseCourseDemo(id, user);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na compra demo." }, { status: 400 });
  }
}
