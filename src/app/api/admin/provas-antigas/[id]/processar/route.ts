import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { runOldExamExtraction } from "@/lib/old-exam-extraction";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  try { return NextResponse.json({ summary: await runOldExamExtraction({ examId: (await params).id }) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao processar prova." }, { status: 500 }); }
}
