import { Plus } from "lucide-react";
import Link from "next/link";
import { OldExamLibrary } from "@/components/old-exam-library";
import { PageHeader } from "@/components/page-header";
import { canManageContent, requireUser } from "@/lib/auth";
import { listOldExams } from "@/lib/old-exams";

export default async function OldExamsPage() {
  const user = await requireUser();
  const exams = await listOldExams();

  return (
    <div>
      <PageHeader
        eyebrow="Provas antigas oficiais"
        title="Acervo completo para estudar de verdade"
        description="Abra a prova e o gabarito oficiais agora. A resolução online será liberada prova a prova, depois da revisão das questões extraídas."
        action={
          canManageContent(user.role) ? (
            <Link href="/admin/provas-antigas" className="estudaki-button estudaki-button-primary">
              <Plus className="h-4 w-4" />
              Gerenciar acervo
            </Link>
          ) : null
        }
      />
      <OldExamLibrary exams={exams} />
    </div>
  );
}
