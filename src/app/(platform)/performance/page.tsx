import { BookOpenCheck, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/visual/empty-state";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDashboardInsights } from "@/lib/insights";
import { percent } from "@/lib/utils";

type DashboardInsightInput = Parameters<typeof buildDashboardInsights>[0];

const subjectAccent: Array<{ ring: string; bar: string; text: string; icon: string }> = [
  { ring: "from-[#2563EB] to-[#22D3EE]", bar: "from-[#2563EB] to-[#22D3EE]", text: "text-blue-700",   icon: "from-[#2563EB] to-[#22D3EE]" },
  { ring: "from-[#22C55E] to-[#86EFAC]", bar: "from-[#22C55E] to-[#86EFAC]", text: "text-emerald-700", icon: "from-[#22C55E] to-[#86EFAC]" },
  { ring: "from-[#F97316] to-[#FACC15]", bar: "from-[#F97316] to-[#FACC15]", text: "text-orange-700",  icon: "from-[#F97316] to-[#FACC15]" },
  { ring: "from-[#FB7185] to-[#FDA4AF]", bar: "from-[#FB7185] to-[#FDA4AF]", text: "text-pink-700",    icon: "from-[#FB7185] to-[#FDA4AF]" },
  { ring: "from-[#A78BFA] to-[#C4B5FD]", bar: "from-[#A78BFA] to-[#C4B5FD]", text: "text-violet-700",  icon: "from-[#A78BFA] to-[#C4B5FD]" },
  { ring: "from-[#22D3EE] to-[#67E8F9]", bar: "from-[#22D3EE] to-[#67E8F9]", text: "text-cyan-700",    icon: "from-[#22D3EE] to-[#67E8F9]" },
];

export default async function PerformancePage() {
  const user = await requireUser();
  let attempts: DashboardInsightInput["attempts"] = [];
  let questions: DashboardInsightInput["questions"] = [];

  try {
    [attempts, questions] = await Promise.all([
      db.questionAttempt.findMany({
        where: { userId: user.id },
        include: { question: { include: { subject: true, topic: true } } },
      }),
      db.question.findMany({
        where: { status: "PUBLISHED" },
        include: { subject: true, topic: true },
      }),
    ]);
  } catch {
    attempts = [];
    questions = [];
  }
  const insights = buildDashboardInsights({
    profile: { name: user.name, weeklyHours: user.weeklyHours ?? 0, targetExam: user.targetExam ?? "ENEM" },
    attempts,
    questions,
  });

  const trendPositive = insights.trendScore >= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Seu desempenho por dados"
        description="Acompanhe acertos, erros, assunto crítico e o tipo de erro que mais se repete."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Média geral"
          value={percent(insights.accuracyRate)}
          iconName="checkCircle"
          color="#22C55E"
          variant="green"
        />
        <MetricCard
          label="Taxa de erro"
          value={percent(insights.errorRate)}
          iconName="alertTriangle"
          color="#F43F5E"
          variant="red"
        />
        <MetricCard
          label="Score de estudo"
          value={insights.studyHealthScore.score}
          iconName="gauge"
          color="#2563EB"
          variant="blue"
          hint={`Tendência ${trendPositive ? "+" : ""}${insights.trendScore}% na semana`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="relative overflow-hidden rounded-[28px] border border-rose-200/50 bg-gradient-to-br from-[#FEF2F2] via-white to-[#FFE4E6] p-6 shadow-[0_18px_40px_-22px_rgba(244,63,94,0.20)] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FDA4AF] opacity-20 blur-3xl"
          />
          <div className="relative z-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F43F5E] to-[#FDA4AF] text-white shadow-md">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-600">
                  Assuntos críticos
                </p>
                <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
                  Onde você mais erra
                </h2>
              </div>
            </div>
            {insights.urgentTopics.length === 0 ? (
              <EmptyState
                title="Sem assuntos críticos"
                description="Continue praticando para manter a regularidade."
                accent="green"
                className="!p-6"
              />
            ) : (
              <div className="space-y-2.5">
                {insights.urgentTopics.map((topic) => {
                  return (
                    <div
                      key={topic.id}
                      className="rounded-2xl border border-rose-100 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-[#0F172A]">{topic.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-rose-600">
                            {percent(topic.errorRate)} de erro · {topic.easyErrors} erro(s) fácil(eis)
                          </p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700">
                          risco {topic.priorityScore}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-rose-50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#F43F5E] to-[#FDA4AF]"
                          style={{ width: `${Math.min(100, topic.errorRate)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/50 bg-gradient-to-br from-[#ECFDF5] via-white to-[#D1FAE5] p-6 shadow-[0_18px_40px_-22px_rgba(34,197,94,0.20)] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#86EFAC] opacity-20 blur-3xl"
          />
          <div className="relative z-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#86EFAC] text-white shadow-md">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                  Pontos fortes
                </p>
                <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
                  Onde você já brilha
                </h2>
              </div>
            </div>
            {insights.strongestSubjects.length === 0 ? (
              <EmptyState
                title="Ainda construindo seu histórico"
                description="Resolva algumas questões para descobrir seus pontos fortes."
                accent="green"
                className="!p-6"
              />
            ) : (
              <div className="space-y-2.5">
                {insights.strongestSubjects.map((subject) => {
                  return (
                    <div
                      key={subject.id}
                      className="rounded-2xl border border-emerald-100 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-[#0F172A]">{subject.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                            {percent(subject.accuracy)} de acerto · {subject.total} tentativa(s)
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          <Sparkles className="h-3 w-3" />
                          forte
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#86EFAC]"
                          style={{ width: `${Math.min(100, subject.accuracy)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {insights.strongestSubjects.length > 0 && (
        <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white shadow-md">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
                Resumo por matéria
              </p>
              <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
                Como você está em cada área
              </h2>
            </div>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {insights.strongestSubjects.concat(insights.urgentTopics).slice(0, 6).map((subject, index) => {
              const a = subjectAccent[index % subjectAccent.length];
              return (
                <div
                  key={`${subject.id}-${index}`}
                  className="rounded-2xl border border-slate-100 bg-white p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-extrabold text-[#0F172A]">{subject.name}</p>
                    <span className="text-xs font-black text-slate-500">
                      {Math.round(subject.accuracy)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${a.bar}`}
                      style={{ width: `${Math.min(100, subject.accuracy)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
