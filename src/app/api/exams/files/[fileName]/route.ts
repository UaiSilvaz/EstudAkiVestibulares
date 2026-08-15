import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resultIsReleased, simulationState } from "@/lib/exam-simulations";
import { readExamPdf } from "@/lib/exam-file-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { fileName } = await params;
  if (!/^[a-z0-9-]+\.pdf$/i.test(fileName)) {
    return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 });
  }

  const url = `/api/exams/files/${fileName}`;
  const exam = await db.exam.findFirst({
    where: { OR: [{ pdfUrl: url }, { answerKeyUrl: url }] },
    select: { pdfUrl: true, answerKeyUrl: true, isSimulado: true, startsAt: true, endsAt: true, resultsAt: true },
  });
  if (!exam) return NextResponse.json({ error: "Arquivo não vinculado." }, { status: 404 });

  if (exam.isSimulado && exam.pdfUrl === url && simulationState(exam) === "SCHEDULED") {
    return NextResponse.json({ error: "O simulado ainda não foi aberto." }, { status: 403 });
  }
  if (exam.isSimulado && exam.answerKeyUrl === url && !resultIsReleased(exam.resultsAt)) {
    return NextResponse.json({ error: "Gabarito ainda não liberado." }, { status: 403 });
  }

  try {
    const bytes = await readExamPdf(fileName);
    return new NextResponse(bytes, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
