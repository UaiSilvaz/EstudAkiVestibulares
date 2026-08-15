import { Plus } from "lucide-react";
import Link from "next/link";
import { ExamLibrary } from "@/components/exam-library";
import { PageHeader } from "@/components/page-header";
import { canManageContent, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mergeExamCatalog } from "@/lib/exam-document-urls";
import { localExams } from "@/lib/local-exams";

export default async function ExamsPage() {
  const user = await requireUser();
  let exams;

  try {
    const databaseExams = await db.exam.findMany({
      where: { status: "PUBLISHED", isSimulado: false },
      include: { vestibular: true },
      orderBy: [{ year: "asc" }, { title: "asc" }],
    });
    exams = mergeExamCatalog(databaseExams, localExams);
  } catch {
    exams = mergeExamCatalog([], localExams);
  }

  const canManage = canManageContent(user.role);

  return (
    <div>
      <PageHeader
        eyebrow="Provas antigas"
        title="Acervo de vestibulares"
        description="ENEM, ETEC, FATEC, FUVEST, UNICAMP e UNESP com PDFs, gabaritos, respostas esperadas e editor de anotacoes."
        action={
          canManage ? (
            <Link href="/admin/exams" className="estudaki-button estudaki-button-primary">
              <Plus className="h-4 w-4" />
              Cadastrar prova
            </Link>
          ) : null
        }
      />

      <ExamLibrary exams={exams} />
    </div>
  );
}
