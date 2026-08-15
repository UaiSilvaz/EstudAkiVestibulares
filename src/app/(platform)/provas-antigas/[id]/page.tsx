import { notFound } from "next/navigation";
import { ExamWorkspace } from "@/components/exam-workspace";
import { canServeOldExamPdf } from "@/lib/old-exam-documents";
import { getOldExam } from "@/lib/old-exams";

export default async function OldExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ documento?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const exam = await getOldExam(id);
  if (!exam) notFound();

  const pdfUrl = canServeOldExamPdf(exam, "prova") ? `/api/provas-antigas/${exam.id}/arquivo` : null;
  const answerKeyUrl = canServeOldExamPdf(exam, "gabarito")
    ? `/api/provas-antigas/${exam.id}/arquivo?tipo=gabarito`
    : null;
  const initialDocumentKind = query.documento === "gabarito" && answerKeyUrl ? "answer" : "exam";

  return (
    <ExamWorkspace
      backHref="/provas-antigas"
      initialDocumentKind={initialDocumentKind}
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
        availableQuestionCount: exam.questoesDisponiveis ?? 0,
        vestibular: { name: exam.vestibular, slug: exam.vestibular.toLowerCase(), color: "#2563EB" },
      }}
    />
  );
}
