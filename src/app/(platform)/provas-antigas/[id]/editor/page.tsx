import { notFound } from "next/navigation";
import { ExamWorkspace } from "@/components/exam-workspace";
import { canServeOldExamPdf } from "@/lib/old-exam-documents";
import { getOldExam } from "@/lib/old-exams";

export default async function OldExamEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const exam = await getOldExam((await params).id);
  if (!exam) notFound();
  const pdfUrl = canServeOldExamPdf(exam, "prova") ? `/api/provas-antigas/${exam.id}/arquivo` : null;
  const answerKeyUrl = canServeOldExamPdf(exam, "gabarito") ? `/api/provas-antigas/${exam.id}/arquivo?tipo=gabarito` : null;

  return (
    <ExamWorkspace
      backHref="/provas-antigas"
      exam={{
        id: exam.id,
        title: exam.titulo,
        year: exam.ano,
        phase: exam.fase,
        day: exam.dia,
        pdfUrl,
        answerKeyUrl,
        sourceUrl: exam.fonteUrl,
        imageUrl: null,
        questionCount: exam.totalQuestoes,
        durationMinutes: null,
        color: "#2563EB",
        official: true,
        vestibular: { name: exam.vestibular, slug: exam.vestibular.toLowerCase(), color: "#2563EB" },
      }}
    />
  );
}
