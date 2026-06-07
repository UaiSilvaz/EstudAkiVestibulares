import { PageHeader } from "@/components/page-header";
import { QuestionEditor } from "@/components/admin/question-editor";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminQuestionsPage() {
  await requireManager();

  const [vestibulares, subjects, topics, recentQuestions] = await Promise.all([
    db.vestibular.findMany({ orderBy: { name: "asc" } }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.topic.findMany({ orderBy: { name: "asc" } }),
    db.question.findMany({
      include: { subject: true, vestibular: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="CMS pedagogico"
        title="Editor de questoes"
        description="Cadastre questoes com alternativas, explicacao, comentario pedagogico, tags, vestibular, dificuldade e preview em tempo real."
      />

      <QuestionEditor
        vestibulares={vestibulares.map((item) => ({ id: item.id, name: item.name }))}
        subjects={subjects.map((item) => ({ id: item.id, name: item.name }))}
        topics={topics.map((item) => ({ id: item.id, name: item.name, subjectId: item.subjectId }))}
      />

      <section className="estudaki-card mt-5 rounded-[30px] p-6">
        <h2 className="mb-4 text-2xl font-black text-slate-950">Ultimas questoes</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {recentQuestions.map((question) => (
            <div key={question.id} className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                {question.vestibular.name} · {question.subject.name}
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">
                {question.statement}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                {question.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
