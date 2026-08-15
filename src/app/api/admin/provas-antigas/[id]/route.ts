import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { updateOldExam, type OldExamInput } from "@/lib/old-exams";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  try { return NextResponse.json({ exam: await updateOldExam(id, await request.json() as Partial<OldExamInput>) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na edição." }, { status: 400 }); }
}
