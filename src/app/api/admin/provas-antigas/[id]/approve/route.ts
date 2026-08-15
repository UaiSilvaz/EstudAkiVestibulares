import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { updateOldExam } from "@/lib/old-exams";
import { logOfficialImport } from "@/lib/official-sources";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const current = await db.provaAntiga.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }
  try {
    const exam = await updateOldExam(id, { status: "APROVADA" });
    await logOfficialImport({
      fileId: current.officialExamFileId,
      action: "old_exam_approve",
      status: "SUCCESS",
      message: `Prova aprovada por ${user.email}.`,
      metadata: { examId: id },
    });
    return NextResponse.json({ exam });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prova não aprovada." },
      { status: 400 },
    );
  }
}
