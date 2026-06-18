import { CalendarCheck, CircleDot, Play, Target } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProgressRing } from "@/components/visual/progress-ring";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDashboardInsights } from "@/lib/insights";

type DashboardInsightInput = Parameters<typeof buildDashboardInsights>[0];

const dayAccent = [
  "from-[#2563EB] to-[#22D3EE]",
  "from-[#22C55E] to-[#86EFAC]",
  "from-[#FACC15] to-[#F97316]",
  "from-[#FB7185] to-[#FDA4AF]",
  "from-[#A78BFA] to-[#C4B5FD]",
  "from-[#22D3EE] to-[#67E8F9]",
  "from-[#F97316] to-[#FB7185]",
];

export default async function CronogramaPage() {
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

  const completedToday = insights.completedToday;
  const goalQuestions = insights.dailyGoal.questions;
  const goalReviews = insights.dailyGoal.reviews;
  const goalPct = Math.min(100, Math.round((completedToday / Math.max(1, goalQuestions)) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cronograma"
        title="Plano semanal adaptativo"
        description="O cronograma usa seus erros e metas para sugerir a próxima ação. Sem tela vazia, sempre com um próximo passo."
      />

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1fr]">
        <div className="relative overflow-hidden rounded-[28px] border border-blue-100/60 bg-gradient-to-br from-[#EFF6FF] via-white to-[#DBEAFE] p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#60A5FA] opacity-20 blur-3xl"
          />
          <div className="relative z-10 flex items-center gap-5">
            <ProgressRing
              value={goalPct}
              size={120}
              strokeWidth={11}
              gradientFrom="#2563EB"
              gradientTo="#22D3EE"
              label={
                <span className="font-display text-2xl font-extrabold text-[#0F172A]">
                  {completedToday}
                  <span className="text-base font-bold text-slate-400">/{goalQuestions}</span>
                </span>
              }
              caption="Questões"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
                Meta de hoje
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">
                {goalPct}% da meta diária
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {goalQuestions} questões e {goalReviews} revisões para hoje.
              </p>
            </div>
          </div>
          <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-blue-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Questões</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#0F172A]">{goalQuestions}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Revisões</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#0F172A]">{goalReviews}</p>
            </div>
          </div>
          <Link href="/questions" className="ek-button ek-button-primary mt-5 w-full">
            <Target className="h-4 w-4" />
            Começar lista automática
            <Play className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FACC15] opacity-15 blur-3xl"
          />
          <div className="relative z-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FACC15] via-[#FDE047] to-[#F97316] text-white shadow-md">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
                  Plano semanal
                </p>
                <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
                  Semana sugerida
                </h2>
              </div>
            </div>
            <div className="space-y-2.5">
              {insights.recommendations.map((item, index) => (
                <Link
                  key={item.title}
                  href={item.actionTarget}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${dayAccent[index % dayAccent.length]}`}
                  >
                    <CircleDot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Dia {index + 1}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-extrabold text-[#0F172A]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-500">
                      {item.reason}
                    </p>
                  </div>
                  <span
                    className={`hidden rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white sm:inline-block ${dayAccent[index % dayAccent.length]}`}
                  >
                    {item.priority}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
