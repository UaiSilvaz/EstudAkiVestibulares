import { notFound } from "next/navigation";
import { ExamWorkspace } from "@/components/exam-workspace";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveExamDocumentUrls } from "@/lib/exam-document-urls";
import { localExams } from "@/lib/local-exams";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  let exam;

  try {
    const databaseExam = await db.exam.findUnique({
      where: { id },
      include: { vestibular: true },
    });
    exam = databaseExam ?? localExams.find((item) => item.id === id) ?? null;
  } catch {
    exam = localExams.find((item) => item.id === id) ?? null;
  }

  if (!exam) {
    notFound();
  }

  if ("isSimulado" in exam && exam.isSimulado) {
    notFound();
  }

  return <ExamWorkspace exam={resolveExamDocumentUrls(exam)} />;
}
