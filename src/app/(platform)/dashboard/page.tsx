import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  PlaySquare,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ChallengeChip } from "@/components/visual/challenge-chip";
import { ContinueCard } from "@/components/visual/continue-card";
import { EmptyState } from "@/components/visual/empty-state";
import { EvolutionChart } from "@/components/visual/evolution-chart";
import { FloatingWhatsApp } from "@/components/visual/floating-whatsapp";
import { ProgressRing } from "@/components/visual/progress-ring";
import { Sparkline } from "@/components/visual/sparkline";
import { StatTile } from "@/components/visual/stat-tile";
import { StreakBadge } from "@/components/visual/streak-badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDashboardInsights } from "@/lib/insights";
import { leagueForXp, percent } from "@/lib/utils";

const LEAGUE_THRESHOLDS: Array<{ name: string; min: number }> = [
  { name: "Bronze", min: 0 },
  { name: "Prata", min: 1000 },
  { name: "Ouro", min: 2500 },
  { name: "Platina", min: 4500 },
  { name: "Esmeralda", min: 7000 },
  { name: "Diamante", min: 10000 },
];

function getNextLeague(xp: number) {
  return LEAGUE_THRESHOLDS.find((l) => xp < l.min) ?? null;
}

function getLeagueProgress(xp: number) {
  const idx = LEAGUE_THRESHOLDS.findIndex((l) => l.name === leagueForXp(xp));
  const current = LEAGUE_THRESHOLDS[idx];
  const next = LEAGUE_THRESHOLDS[idx + 1] ?? null;
  if (!next) return { from: current.min, to: current.min, current: 100, nextName: null };
  const range = next.min - current.min;
  const within = Math.max(0, xp - current.min);
  return { from: current.min, to: next.min, current: (within / range) * 100, nextName: next.name };
}

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Bom estudo";
  if (h < 18) return "Boa tarde de foco";
  return "Boa noite de evolução";
}

function weekdayLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();

  const [attempts, questions, activities, videos, lastAttempt] = await Promise.all([
    db.questionAttempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        question: {
          include: {
            subject: true,
            topic: true,
            vestibular: true,
          },
        },
      },
    }),
    db.question.findMany({
      where: { status: "PUBLISHED" },
      include: {
        subject: true,
        topic: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.activity.findMany({
      where: { OR: [{ userId: user.id }, { userId: null }] },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    }),
    db.video.findMany({
      where: { status: "PUBLISHED" },
      include: { subject: true, topic: true },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    db.questionAttempt.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        question: {
          include: { subject: true, topic: true, vestibular: true },
        },
      },
    }),
  ]);

  const insights = buildDashboardInsights({
    profile: {
      name: user.name,
      weeklyHours: user.weeklyHours ?? 0,
      targetExam: user.targetExam ?? "ENEM",
    },
    attempts,
    questions,
  });

  const mainRecommendation = insights.recommendations[0];
  const leagueProgress = getLeagueProgress(user.xp);
  const nextLeague = getNextLeague(user.xp);
  const accuracySeries = insights.dailyBuckets.map((b) => b.accuracy || 0);
  const trendText = insights.trendScore > 0 ? `+${insights.trendScore}%` : `${insights.trendScore}%`;
  const trendPositive = insights.trendScore >= 0;
  const dailyProgress = Math.round(insights.dailyGoalCompletionRate);
  const errorBookDone = insights.pendingErrors + insights.reviewedErrors;
  const errorBookProgress = insights.reviewedErrors;
  const errorBookTotal = Math.max(1, errorBookDone);

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#60A5FA] opacity-20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-[#FACC15] opacity-15 blur-3xl"
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              {greetingFor(now)} · {weekdayLabel(now)}
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[#0F172A] md:text-4xl">
              {user.name.split(" ")[0]}, bora evoluir?
            </h1>
            <p className="mt-1 max-w-xl text-sm font-medium text-slate-600">
              Você está na liga <span className="font-extrabold text-[#0F172A]">{user.league}</span> com
              {" "}<span className="font-extrabold text-[#0F172A]">{user.xp.toLocaleString("pt-BR")} XP</span>.
              {nextLeague
                ? ` Faltam ${(leagueProgress.to - user.xp).toLocaleString("pt-BR")} XP para a liga ${nextLeague.name}.`
                : " Você está no topo — continue mantendo o ritmo."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StreakBadge days={user.streak} size="lg" />
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-gradient-to-r from-[#FEF3C7] to-white px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-700">
              <Trophy className="h-3.5 w-3.5" />
              {user.league}
            </span>
          </div>
        </div>
      </section>

      {/* Continue de onde parou */}
      {lastAttempt && (
        <ContinueCard
          meta="Continue de onde parou"
          title={lastAttempt.question.statement.slice(0, 80)}
          description={`${lastAttempt.question.vestibular?.name ?? "Questão"} · ${lastAttempt.question.subject?.name ?? "Geral"}`}
          href={`/questions?question=${lastAttempt.question.id}`}
          icon={
            lastAttempt.correct ? (
              <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
            ) : (
              <Sparkles className="h-5 w-5" strokeWidth={2.4} />
            )
          }
          accent={lastAttempt.correct ? "green" : "orange"}
        />
      )}

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Foco do dia */}
        <div className="relative overflow-hidden rounded-[28px] border border-orange-200/60 bg-gradient-to-br from-[#FFF7ED] via-white to-[#FFEDD5] p-6 shadow-[0_18px_40px_-22px_rgba(249,115,22,0.25)] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#FB923C] opacity-25 blur-3xl"
          />
          <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                Foco de hoje
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-[#0F172A] md:text-3xl">
                {mainRecommendation.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-700">
                {insights.message}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={mainRecommendation.actionTarget}
                  className="ek-button ek-button-energy"
                >
                  {mainRecommendation.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/cronograma" className="ek-button ek-button-ghost">
                  Ver plano da semana
                </Link>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_30px_-12px_rgba(249,115,22,0.30)] backdrop-blur">
              <ProgressRing
                value={dailyProgress}
                size={140}
                strokeWidth={12}
                gradientFrom="#F97316"
                gradientTo="#FB7185"
                label={
                  <span className="font-display text-3xl font-extrabold text-[#0F172A]">
                    {insights.completedToday}
                    <span className="text-base font-bold text-slate-400">/{insights.dailyGoal.questions}</span>
                  </span>
                }
                caption="Meta hoje"
              />
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-orange-700">
                {dailyProgress}% concluído
              </p>
            </div>
          </div>
        </div>

        {/* Liga / XP */}
        <div className="relative overflow-hidden rounded-[28px] border border-amber-200/60 bg-gradient-to-br from-[#FEFCE8] via-white to-[#FEF3C7] p-6 shadow-[0_18px_40px_-22px_rgba(234,179,8,0.30)] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#FACC15] opacity-25 blur-3xl"
          />
          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
              Sua liga
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <h2 className="font-display text-3xl font-extrabold text-[#0F172A]">
                {user.league}
              </h2>
              {nextLeague && (
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                  → {nextLeague.name}
                </p>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {user.xp.toLocaleString("pt-BR")} XP {nextLeague ? `de ${leagueProgress.to.toLocaleString("pt-BR")}` : "(máximo)"}
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FACC15] via-[#F97316] to-[#FB7185] transition-all"
                style={{ width: `${Math.min(100, leagueProgress.current)}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl border border-amber-100 bg-white px-2 py-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Streak</p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-[#0F172A]">{user.streak}d</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white px-2 py-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">XP</p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-[#0F172A]">{user.xp}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white px-2 py-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Horas</p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-[#0F172A]">{user.weeklyHours ?? 0}/sem</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip gamificado */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Meta de hoje"
          value={
            <span>
              {insights.completedToday}
              <span className="text-base font-bold text-slate-400">/{insights.dailyGoal.questions}</span>
            </span>
          }
          hint={`${dailyProgress}% concluído · ${insights.dailyGoal.reviews} revisões`}
          icon={<Target className="h-5 w-5" strokeWidth={2.4} />}
          accent="orange"
          progress={dailyProgress}
        />
        <StatTile
          label="Sequência"
          value={`${user.streak}d`}
          hint="Mantenha a constância"
          icon={<Flame className="h-5 w-5" strokeWidth={2.4} />}
          accent="yellow"
        />
        <StatTile
          label="Acerto ponderado"
          value={percent(insights.weightedAccuracyRate)}
          hint={`${insights.correctToday} acertos hoje`}
          icon={<Zap className="h-5 w-5" strokeWidth={2.4} />}
          accent="green"
          delta={{
            value: trendText,
            suffix: "7d",
            positive: trendPositive,
          }}
        />
        <StatTile
          label="Caderno de erros"
          value={String(insights.pendingErrors)}
          hint={`${insights.reviewedErrors} revisados de ${errorBookDone}`}
          icon={<BookOpen className="h-5 w-5" strokeWidth={2.4} />}
          accent="red"
          progress={errorBookDone ? (errorBookProgress / errorBookTotal) * 100 : 0}
        />
      </section>

      {/* Desafios / Próximo nível */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">
              Próximas metas
            </p>
            <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
              Desafios que te aproximam da próxima liga
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ChallengeChip
            title="Subir de liga"
            description={
              nextLeague
                ? `Acumule XP para chegar à liga ${nextLeague.name}.`
                : "Você atingiu a liga máxima. Foque em manter o ritmo."
            }
            progress={user.xp - leagueProgress.from}
            total={Math.max(1, leagueProgress.to - leagueProgress.from)}
            icon={<Trophy className="h-4 w-4" strokeWidth={2.4} />}
            accent="yellow"
            reward={nextLeague ? nextLeague.name : "Top"}
            ctaLabel="Praticar questões"
            ctaHref="/questions"
            done={!nextLeague}
          />
          <ChallengeChip
            title="Zerar o caderno de erros"
            description="Revise todos os erros abertos para destravar novos assuntos."
            progress={insights.reviewedErrors}
            total={errorBookTotal}
            icon={<CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />}
            accent="green"
            reward={`+${errorBookTotal * 10} XP`}
            ctaLabel="Revisar caderno"
            ctaHref="/questions?mode=errors"
            done={errorBookDone > 0 && insights.pendingErrors === 0}
          />
          <ChallengeChip
            title="Bater a meta diária"
            description={`Resolva ${insights.dailyGoal.questions} questões e ${insights.dailyGoal.reviews} revisões hoje.`}
            progress={insights.completedToday}
            total={insights.dailyGoal.questions}
            icon={<Target className="h-4 w-4" strokeWidth={2.4} />}
            accent="blue"
            reward={`+${insights.dailyGoal.questions * 12} XP`}
            ctaLabel="Começar lista"
            ctaHref="/questions"
            done={insights.completedToday >= insights.dailyGoal.questions}
          />
        </div>
      </section>

      {/* Evolução + atividades */}
      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-[28px] border border-blue-100/60 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#60A5FA] opacity-20 blur-3xl"
          />
          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
                  Evolução
                </p>
                <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
                  Performance dos últimos 7 dias
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-gradient-to-r from-[#ECFDF5] to-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700">
                <Zap className="h-3.5 w-3.5" />
                {trendText} na semana
              </div>
            </div>
            <EvolutionChart
              data={insights.dailyBuckets.map((b) => b.accuracy || b.completion)}
              labels={insights.dailyBuckets.map((b) => b.label)}
            />
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: "Acertos hoje", value: String(insights.correctToday), color: "#22C55E" },
                { label: "Tempo médio", value: formatSeconds(insights.averageTimeSeconds), color: "#2563EB" },
                { label: "Pendências", value: String(insights.pendingErrors), color: "#FACC15" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-3.5"
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="font-display text-xl font-extrabold text-[#0F172A]">{stat.value}</p>
                    <Sparkline data={accuracySeries} color={stat.color} width={56} height={22} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Atividades recentes */}
        <div className="relative overflow-hidden rounded-[28px] border border-yellow-200/40 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FACC15] opacity-20 blur-3xl"
          />
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FACC15] via-[#FDE047] to-[#F97316] text-white shadow-md">
                <Clock3 className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
                Atividades recentes
              </h2>
            </div>
            {activities.length === 0 ? (
              <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Nenhuma atividade ainda. Que tal começar agora?
              </p>
            ) : (
              <ul className="space-y-2.5">
                {activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="flex-1 text-sm font-semibold text-slate-700">{activity.message}</p>
                    {activity.xp > 0 && (
                      <span className="rounded-full bg-gradient-to-r from-[#FACC15] to-[#F97316] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                        +{activity.xp} XP
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Quick actions + questões recomendadas */}
      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
                Lista inteligente
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">
                Questões recomendadas
              </h2>
            </div>
            <Link
              href="/questions"
              className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 hover:border-blue-300"
            >
              Ver tudo
            </Link>
          </div>

          {insights.automaticList.length === 0 ? (
            <EmptyState
              title="Sem questões ainda"
              description="Sua lista inteligente aparece assim que você resolve as primeiras questões."
              accent="blue"
            />
          ) : (
            <div className="space-y-2.5">
              {insights.automaticList.slice(0, 5).map((question, index) => (
                <Link
                  key={question.id}
                  href={`/questions?question=${question.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white shadow-md"
                    style={{
                      background: question.subject.color
                        ? `linear-gradient(135deg, ${question.subject.color}, #22D3EE)`
                        : "linear-gradient(135deg, #2563EB, #22D3EE)",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0F172A]">
                      {question.topic?.name ?? question.subject.name}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {question.subject.name} - {question.difficulty}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              Atalhos rápidos
            </p>
            <h2 className="mt-1 font-display text-lg font-extrabold text-[#0F172A]">
              Continue com 1 clique
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link href="/questions" className="rounded-2xl border border-blue-100 bg-gradient-to-br from-[#EFF6FF] to-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white shadow-md">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm font-extrabold text-[#0F172A]">Praticar</p>
                <p className="text-[11px] font-semibold text-slate-500">Lista inteligente</p>
              </Link>
              <Link href="/questions?mode=errors" className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#ECFDF5] to-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22C55E] to-[#86EFAC] text-white shadow-md">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm font-extrabold text-[#0F172A]">Caderno</p>
                <p className="text-[11px] font-semibold text-slate-500">Revisar erros</p>
              </Link>
              <Link href="/videos" className="rounded-2xl border border-pink-100 bg-gradient-to-br from-[#FDF2F8] to-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FB7185] to-[#FDA4AF] text-white shadow-md">
                  <PlaySquare className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm font-extrabold text-[#0F172A]">Express</p>
                <p className="text-[11px] font-semibold text-slate-500">Vídeos curtos</p>
              </Link>
              <Link href="/cronograma" className="rounded-2xl border border-violet-100 bg-gradient-to-br from-[#F5F3FF] to-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#A78BFA] to-[#C4B5FD] text-white shadow-md">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm font-extrabold text-[#0F172A]">Plano</p>
                <p className="text-[11px] font-semibold text-slate-500">Semana de foco</p>
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-pink-200/40 bg-gradient-to-br from-[#FDF2F8] via-white to-[#FCE7F3] p-6 shadow-[0_18px_40px_-22px_rgba(251,113,133,0.30)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FB7185] opacity-25 blur-3xl"
            />
            <div className="relative z-10">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-pink-600">
                Express para você
              </p>
              <h2 className="font-display text-lg font-extrabold text-[#0F172A]">
                Revisão em vídeo
              </h2>
              <div className="mt-3 space-y-2">
                {videos.length === 0 ? (
                  <p className="rounded-2xl border border-pink-100 bg-white/80 p-3 text-sm text-slate-600">
                    Em breve: vídeos curtos em formato vertical, com likes, saves e comentários.
                  </p>
                ) : (
                  videos.map((video) => (
                    <Link
                      key={video.id}
                      href="/videos"
                      className="group flex items-center gap-3 rounded-2xl border border-pink-100/80 bg-white p-3 transition hover:border-pink-200 hover:shadow-md"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FACC15] via-[#F97316] to-[#FB7185] text-white shadow-md">
                        <Flame className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-[#0F172A]">{video.title}</p>
                        <p className="line-clamp-1 text-[11px] text-slate-500">{video.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <FloatingWhatsApp variant="platform" />
    </div>
  );
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
