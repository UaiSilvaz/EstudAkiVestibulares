import { ExamManager } from "@/components/admin/exam-manager";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminExamsPage() {
  await requireManager();
  const [vestibulares, exams] = await Promise.all([
    db.vestibular.findMany({ orderBy: { name: "asc" } }),
    db.exam.findMany({
      include: { vestibular: true },
      orderBy: [{ year: "desc" }, { title: "asc" }],
    }),
  ]);

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
