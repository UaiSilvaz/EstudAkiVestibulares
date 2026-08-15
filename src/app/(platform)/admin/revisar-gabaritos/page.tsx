import { AnswerKeyReviewManager } from "@/components/admin/answer-key-review-manager";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AnswerKeyReviewPage() {
  await requireManager();
  const answers = await db.officialAnswerKey.findMany({
    include: {
      file: {
        select: {
          vestibular: true,
          year: true,
          edition: true,
          examDay: true,
          storageUrl: true,
        },
      },
    },
    orderBy: [
      { file: { year: "desc" } },
      { fileId: "asc" },
      { questionNumber: "asc" },
    ],
    take: 500,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Conferência oficial"
        title="Revisar gabaritos"
        description="Confira cada resposta extraída, corrija quando necessário e aprove explicitamente. Gabaritos extraídos nunca são usados para publicação sem esta etapa."
      />
      <AnswerKeyReviewManager initialAnswers={answers} />
    </div>
  );
}
