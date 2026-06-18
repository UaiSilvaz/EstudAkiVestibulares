import { ExamManager } from "@/components/admin/exam-manager";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { localExams, localVestibulares } from "@/lib/local-exams";

export default async function AdminExamsPage() {
  await requireManager();
  let vestibulares;
  let exams;

  try {
    [vestibulares, exams] = await Promise.all([
      db.vestibular.findMany({ orderBy: { name: "asc" } }),
      db.exam.findMany({
        include: { vestibular: true },
        orderBy: [{ year: "desc" }, { title: "asc" }],
      }),
    ]);
  } catch {
    vestibulares = localVestibulares;
    exams = localExams;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Banco de provas"
        title="Cadastro de provas antigas"
        description="Estruture o acervo por vestibular, ano, fase e caderno. Depois o aluno abre a prova com editor, marca-texto, notas e zoom."
      />
      <ExamManager vestibulares={vestibulares} exams={exams} />
    </div>
  );
}
