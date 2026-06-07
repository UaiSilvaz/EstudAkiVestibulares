import { notFound } from "next/navigation";
import { ExamWorkspace } from "@/components/exam-workspace";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    include: { vestibular: true },
  });

  if (!exam) {
    notFound();
  }

  return <ExamWorkspace exam={exam} />;
}
