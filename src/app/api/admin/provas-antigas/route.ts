import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { createOldExam, listOldExams, type OldExamInput } from "@/lib/old-exams";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  return NextResponse.json({ exams: await listOldExams() });
}

export async function POST(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const body = await request.json() as OldExamInput;
  if (!body.vestibular || !body.ano || !body.slug || !body.titulo || !body.fase || !body.arquivoProvaUrl || !body.fonteOficial || !body.fonteUrl) {
    return NextResponse.json({ error: "Preencha vestibular, ano, identificador, título, fase, PDF e fonte oficial." }, { status: 400 });
  }
  try { return NextResponse.json({ exam: await createOldExam(body) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no cadastro." }, { status: 400 }); }
}
