import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseOldExamLanguage } from "@/lib/old-exam-language";
import { loadStudentOldExam } from "@/lib/old-exam-student";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const rawLanguage = new URL(request.url).searchParams.get("idioma");
  const requestedLanguage = parseOldExamLanguage(rawLanguage);
  if (rawLanguage && !requestedLanguage) {
    return NextResponse.json(
      { error: "Idioma inválido. Use ENGLISH ou SPANISH." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await loadStudentOldExam(id, requestedLanguage);
  if (!result) {
    return NextResponse.json({ error: "Prova antiga não encontrada." }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
