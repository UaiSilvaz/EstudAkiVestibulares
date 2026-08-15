import { Enem2025PilotReview } from "@/components/admin/enem-2025-pilot-review";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { getEnem2025PilotDashboard } from "@/lib/enem-2025-pilot";

export default async function Enem2025PilotReviewPage() {
  await requireManager();
  const dashboard = await getEnem2025PilotDashboard();
  return (
    <div>
      <PageHeader
        eyebrow="Admin · Piloto ENEM 2025"
        title="Revisar e publicar questões importadas"
        description="Acompanhe cada bloqueio editorial, aprove individualmente e publique apenas o subconjunto que cumprir todas as regras."
      />
      <Enem2025PilotReview
        dashboard={dashboard}
        testModeAvailable={process.env.NODE_ENV !== "production"}
      />
    </div>
  );
}
