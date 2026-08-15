import { ResolutionReviewManager } from "@/components/admin/resolution-review-manager";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ResolutionReviewPage() {
  await requireManager();
  const answers = await db.officialAnswerKey.findMany({
    include: {
      file: {
        select: {
          id: true,
          vestibular: true,
          year: true,
          edition: true,
          storageUrl: true,
        },
      },
    },
    orderBy: [{ resolutionStatus: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Revisão editorial"
        title="Revisar resoluções"
        description="Gere, edite, aprove ou reprove resoluções. A publicação só é liberada após aprovação da prova, do gabarito e da revisão humana."
      />
      <ResolutionReviewManager initialAnswers={answers} />
    </div>
  );
}
