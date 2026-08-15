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
    take: 200,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Revisão editorial"
        title="Resoluções oficiais assistidas por IA"
        description="Edite, aprove ou reprove cada resolução. Nenhum texto gerado por IA é publicado sem aprovação humana explícita."
      />
      <ResolutionReviewManager initialAnswers={answers} />
    </div>
  );
}
