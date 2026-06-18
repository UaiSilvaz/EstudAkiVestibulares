import { notFound } from "next/navigation";
import { ExamWorkspace } from "@/components/exam-workspace";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { localExams } from "@/lib/local-exams";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  let exam;

  try {
    exam = await db.exam.findUnique({
      where: { id },
      include: { vestibular: true },
    });
  } catch {
    exam = localExams.find((item) => item.id === id) ?? null;
  }

  if (!exam) {
    notFound();
  }

  return <ExamWorkspace exam={exam} />;
}
