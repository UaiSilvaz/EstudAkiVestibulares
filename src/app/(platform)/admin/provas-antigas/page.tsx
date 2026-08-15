import { OldExamManager } from "@/components/admin/old-exam-manager";
import { Enem2025PilotReview } from "@/components/admin/enem-2025-pilot-review";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { listOldExams } from "@/lib/old-exams";
import { getEnem2025PilotDashboard } from "@/lib/enem-2025-pilot";

export default async function AdminOldExamsPage() {
  await requireManager();
  const [exams, pilotDashboard] = await Promise.all([
    listOldExams(),
    getEnem2025PilotDashboard(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Provas antigas"
        title="Acervo oficial e esteira de revisão"
        description="Cadastre PDFs, acompanhe a extração e só libere a resolução online depois que as questões forem revisadas."
      />
      <Enem2025PilotReview
        dashboard={pilotDashboard}
        showRows={false}
        testModeAvailable={process.env.NODE_ENV !== "production"}
      />
      <OldExamManager exams={exams} />
    </div>
  );
}
