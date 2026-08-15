import {
  BarChart3,
  BookOpenCheck,
  Brain,
  Clock3,
  Gauge,
  Target,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDashboardInsights } from "@/lib/insights";

type InsightInput = Parameters<typeof buildDashboardInsights>[0];

export default async function PerformancePage() {
  const user = await requirePersistedUser();
  const [attempts, questions] = await Promise.all([
    db.questionAttempt.findMany({
      where: { userId: user.id, annulled: false },
      include: { question: { include: { subject: true, topic: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.question.findMany({
      where: { status: "PUBLISHED", answerSituation: { not: "ANNULLED" } },
      include: { subject: true, topic: true },
    }),
  ]) as [InsightInput["attempts"], InsightInput["questions"]];
  const insights = buildDashboardInsights({
    profile: {
      name: user.name,
      weeklyHours: user.weeklyHours ?? 0,
      targetExam: user.targetExam ?? "ENEM",
    },
    attempts,
    questions,
  });

  const answered = new Set(attempts.map((attempt) => attempt.question.id)).size;
  const coverage = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const byDifficulty = ["EASY", "MEDIUM", "HARD"].map((difficulty) => {
    const rows = attempts.filter((attempt) => attempt.question.difficulty === difficulty);
    return {
      difficulty,
      total: rows.length,
      accuracy: rows.length
        ? Math.round((rows.filter((attempt) => attempt.correct).length / rows.length) * 100)
        : 0,
    };
  });
  const errorCounts = attempts
    .filter((attempt) => !attempt.correct)
    .reduce<Record<string, number>>((acc, attempt) => {
      const key = attempt.errorType || "Não classificado";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  const maxDaily = Math.max(1, ...insights.dailyBuckets.map((bucket) => bucket.attempts));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Desempenho real"
        title="Seu estudo em números"
        description="Tentativas, tempo, cobertura, revisões e evolução calculados diretamente do seu histórico."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Target} label="Precisão geral" value={`${Math.round(insights.accuracyRate)}%`} hint={`${attempts.length} respostas`} color="blue" />
        <Kpi icon={Clock3} label="Tempo médio" value={`${insights.averageTimeSeconds}s`} hint="por questão" color="orange" />
        <Kpi icon={BookOpenCheck} label="Revisões concluídas" value={String(insights.reviewedErrors)} hint={`${insights.pendingErrors} pendentes`} color="green" />
        <Kpi icon={Gauge} label="Cobertura do banco" value={`${coverage}%`} hint={`${answered}/${questions.length} questões`} color="violet" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.3)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Últimos 7 dias</p>
              <h2 className="mt-1 font-display text-xl font-black text-slate-950">Ritmo e acertos</h2>
            </div>
            <TrendingUp className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="mt-6 grid h-56 grid-cols-7 items-end gap-2">
            {insights.dailyBuckets.map((bucket) => (
              <div key={bucket.label} className="flex h-full flex-col justify-end">
                <div className="mb-2 text-center text-[10px] font-black text-slate-500">
                  {bucket.attempts}
                </div>
                <div className="relative flex-1 rounded-t-2xl bg-slate-50">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-gradient-to-t from-blue-600 to-cyan-400 transition-all"
                    style={{ height: `${Math.max(4, (bucket.attempts / maxDaily) * 100)}%` }}
                    title={`${bucket.accuracy}% de acerto`}
                  />
                </div>
                <p className="mt-2 text-center text-[10px] font-black uppercase text-slate-400">{bucket.label}</p>
                <p className="text-center text-[10px] font-bold text-emerald-600">{bucket.accuracy}%</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-100 bg-slate-950 p-5 text-white shadow-[0_24px_55px_-34px_rgba(15,23,42,0.65)] sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Saúde do estudo</p>
          <div className="mt-4 flex items-center gap-5">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-blue-500 bg-slate-900">
              <span className="text-3xl font-black">{insights.studyHealthScore.score}</span>
            </div>
            <div>
              <h2 className="font-display text-2xl font-black capitalize">{insights.studyHealthScore.label}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                Tendência {insights.trendScore >= 0 ? "+" : ""}{insights.trendScore}% e consistência de {Math.round(insights.consistencyScore)}%.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <ScoreBar label="Precisão ponderada" value={Math.round(insights.weightedAccuracyRate)} />
            <ScoreBar label="Revisões" value={Math.round(insights.reviewCompletionRate)} />
            <ScoreBar label="Meta diária" value={Math.round(insights.dailyGoalCompletionRate)} />
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Desempenho por matéria" icon={BarChart3}>
          <div className="space-y-3">
            {insights.subjectPerformance
              .sort((a, b) => b.total - a.total)
              .map((subject) => (
                <ProgressRow
                  key={subject.id}
                  label={subject.name}
                  value={Math.round(subject.accuracy)}
                  detail={`${subject.correct}/${subject.total} acertos`}
                />
              ))}
            {!insights.subjectPerformance.length && <EmptyText />}
          </div>
        </Panel>

        <Panel title="Precisão por dificuldade" icon={Brain}>
          <div className="space-y-4">
            {byDifficulty.map((item) => (
              <ProgressRow
                key={item.difficulty}
                label={item.difficulty === "EASY" ? "Fácil" : item.difficulty === "MEDIUM" ? "Média" : "Difícil"}
                value={item.accuracy}
                detail={`${item.total} tentativa(s)`}
              />
            ))}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tipos de erro</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(errorCounts).map(([type, count]) => (
                <span key={type} className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                  {type.replaceAll("_", " ")} · {count}
                </span>
              ))}
              {!Object.keys(errorCounts).length && <span className="text-sm text-slate-500">Nenhum erro registrado.</span>}
            </div>
          </div>
        </Panel>
      </section>

      <Panel title="Tentativas recentes" icon={Clock3}>
        <div className="divide-y divide-slate-100">
          {attempts.slice(0, 10).map((attempt) => (
            <div key={`${attempt.question.id}-${attempt.createdAt.toISOString()}`} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div>
                <p className="font-black text-slate-800">{attempt.question.subject.name}</p>
                <p className="text-xs font-semibold text-slate-500">{attempt.question.topic?.name ?? "Conteúdo geral"}</p>
              </div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${attempt.correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {attempt.correct ? "ACERTO" : "ERRO"}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {new Date(attempt.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          ))}
          {!attempts.length && <EmptyText />}
        </div>
      </Panel>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, color }: { icon: typeof Target; label: string; value: string; hint: string; color: "blue" | "orange" | "green" | "violet" }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <article className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.3)]">
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${styles[color]}`}><Icon className="h-5 w-5" /></span>
      <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-display text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p>
    </article>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Target; children: React.ReactNode }) {
  return (
    <article className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.3)] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span>
        <h2 className="font-display text-xl font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </article>
  );
}

function ProgressRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-slate-700">{label}</span>
        <span className="text-xs font-bold text-slate-500">{detail} · {value}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-slate-300"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
  );
}

function EmptyText() {
  return <p className="py-8 text-center text-sm font-semibold text-slate-500">Responda algumas questões para gerar esta análise.</p>;
}
