import { PageHeader } from "@/components/page-header";
import { QuestionEditor } from "@/components/admin/question-editor";
import { QuestionReviewQueue } from "@/components/admin/question-review-queue";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminQuestionsPage() {
  await requireManager();

  const [vestibulares, subjects, topics, questionYears] = await Promise.all([
    db.vestibular.findMany({ orderBy: { name: "asc" } }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.topic.findMany({ orderBy: { name: "asc" } }),
    db.question.groupBy({
      by: ["vestibularId", "year"],
      _count: { _all: true },
      orderBy: [{ year: "desc" }],
    }),
  ]);

  const yearsByVestibular = questionYears.reduce<
    Record<string, Array<{ year: number; count: number }>>
  >((acc, item) => {
    acc[item.vestibularId] ??= [];
    acc[item.vestibularId].push({ year: item.year, count: item._count._all });
    return acc;
  }, {});

  const vestibularOptions = vestibulares.map((item) => ({
    id: item.id,
    name: item.name,
    logo: item.logo,
    color: item.color,
  }));
  const subjectOptions = subjects.map((item) => ({ id: item.id, name: item.name }));
  const topicOptions = topics.map((item) => ({
    id: item.id,
    name: item.name,
    subjectId: item.subjectId,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Banco administravel"
        title="Questoes cadastradas"
        description="Escolha o vestibular, selecione o ano e revise enunciado, imagens, gabarito e resolucoes em texto ou video."
      />

      <QuestionReviewQueue
        vestibulares={vestibularOptions}
        subjects={subjectOptions}
        topics={topicOptions}
        yearsByVestibular={yearsByVestibular}
      />

      <details className="mt-5 rounded-[8px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.14)]">
        <summary className="cursor-pointer text-sm font-black text-slate-800">
          Cadastrar nova questao manualmente
        </summary>
        <div className="mt-5">
          <QuestionEditor
            vestibulares={vestibularOptions}
            subjects={subjectOptions}
            topics={topicOptions}
          />
        </div>
      </details>
    </div>
  );
}
