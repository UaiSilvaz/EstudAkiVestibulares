import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { ChallengeChip } from "@/components/visual/challenge-chip";
import { ContinueCard } from "@/components/visual/continue-card";
import { EmptyState } from "@/components/visual/empty-state";
import { EvolutionChart } from "@/components/visual/evolution-chart";
import { FloatingWhatsApp } from "@/components/visual/floating-whatsapp";
import { ProgressRing } from "@/components/visual/progress-ring";
import { StudyNowCard } from "@/components/study-now-card";
import { SmartPrefetcher } from "@/components/smart-prefetcher";
import { LeagueBadge } from "@/components/visual/league-badge";
import { Sparkline } from "@/components/visual/sparkline";
import { StatTile } from "@/components/visual/stat-tile";
import { StreakBadge } from "@/components/visual/streak-badge";
import { StudyIcon, studyIconColors, studyIconNameForSubject } from "@/components/visual/study-icon";
import { getPersistedUserId, requireUser } from "@/lib/auth";
import { getOrCreateStudyPlan } from "@/lib/adaptive-study-plan";
import { db } from "@/lib/db";
import { buildDashboardInsights, ERROR_NOTEBOOK_HREF } from "@/lib/insights";
import { getInitialStudyNowRecommendation } from "@/lib/learning/study-now";
import { difficultyLabel, leagueForXp, percent } from "@/lib/utils";

const LEAGUE_THRESHOLDS: Array<{ name: string; min: number }> = [
  { name: "Bronze", min: 0 },
  { name: "Prata", min: 1000 },
  { name: "Ouro", min: 2500 },
  { name: "Platina", min: 4500 },
  { name: "Esmeralda", min: 7000 },
  { name: "Diamante", min: 10000 },
];

const dashboardSubjectSelect = {
  id: true,
  name: true,
  color: true,
} satisfies Prisma.SubjectSelect;

const dashboardTopicSelect = {
  id: true,
  name: true,
} satisfies Prisma.TopicSelect;

const dashboardAttemptQuestionSelect = {
  id: true,
  statement: true,
  difficulty: true,
  subject: { select: dashboardSubjectSelect },
  topic: { select: dashboardTopicSelect },
  vestibular: { select: { name: true, slug: true } },
} satisfies Prisma.QuestionSelect;

const dashboardAttemptSelect = {
  correct: true,
  annulled: true,
  errorType: true,
  reviewed: true,
  createdAt: true,
  timeSpentSeconds: true,
  question: { select: dashboardAttemptQuestionSelect },
} satisfies Prisma.QuestionAttemptSelect;

const dashboardQuestionPoolSelect = {
  id: true,
  difficulty: true,
  subject: { select: dashboardSubjectSelect },
  topic: { select: dashboardTopicSelect },
  vestibular: { select: { slug: true } },
} satisfies Prisma.QuestionSelect;

const dashboardActivitySelect = {
  id: true,
  message: true,
  xp: true,
  createdAt: true,
} satisfies Prisma.ActivitySelect;

type AttemptWithQuestion = Prisma.QuestionAttemptGetPayload<{
  select: typeof dashboardAttemptSelect;
}>;
type QuestionWithSubject = Prisma.QuestionGetPayload<{ select: typeof dashboardQuestionPoolSelect }>;
type ActivityWithUser = Prisma.ActivityGetPayload<{
  select: typeof dashboardActivitySelect;
}>;
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

function isSameCalendarDay(value: Date, date: Date) {
  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  );
}

function normalizeStudyHref(href: string) {
  if (!href || href === "/questions") return "/questions?vestibular=enem";
  if (href === "/questions?mode=errors") return ERROR_NOTEBOOK_HREF;
  return href;
}

function questionHref(questionId: string, vestibularSlug: string | null | undefined) {
  const params = new URLSearchParams({
    vestibular: vestibularSlug || "enem",
    question: questionId,
  });
  return `/questions?${params.toString()}`;
}

function studyTaskTypeLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("review") || normalized.includes("error")) return "Revisão";
  if (normalized.includes("question")) return "Questões";
  if (normalized.includes("flashcard")) return "Flashcards";
  if (normalized.includes("theory") || normalized.includes("lesson")) return "Jornada";
  if (normalized.includes("essay")) return "Redação";
  return "Plano";
}

function studyTaskIcon(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("review") || normalized.includes("error")) {
    return <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />;
  }
  if (normalized.includes("flashcard") || normalized.includes("theory") || normalized.includes("lesson")) {
    return <BookOpen className="h-5 w-5" strokeWidth={2.4} />;
  }
  return <Target className="h-5 w-5" strokeWidth={2.4} />;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const persistedUserId = await getPersistedUserId(user);
  const dashboardUserId = persistedUserId ?? user.id;
  const dashboardProfile = {
    name: user.name,
    weeklyHours: user.weeklyHours ?? 0,
    targetExam: user.targetExam ?? "ENEM",
  };

  let attempts: AttemptWithQuestion[] = [];
  let questions: QuestionWithSubject[] = [];
  let activities: ActivityWithUser[] = [];
  let studyPlan: Awaited<ReturnType<typeof getOrCreateStudyPlan>> | null = null;
  let studyNowSession: Awaited<ReturnType<typeof getInitialStudyNowRecommendation>> | null = null;
  let lastAttempt: AttemptWithQuestion | null = null;

  try {
    [attempts, questions, activities, studyPlan] = await Promise.all([
      db.questionAttempt.findMany({
        where: { userId: dashboardUserId, annulled: false },
        orderBy: { createdAt: "desc" },
        take: 240,
        select: dashboardAttemptSelect,
      }),
      db.question.findMany({
        where: { status: "PUBLISHED", answerSituation: { not: "ANNULLED" } },
        select: dashboardQuestionPoolSelect,
        orderBy: { createdAt: "desc" },
        take: 120,
      }),
      db.activity.findMany({
        where: { OR: [{ userId: dashboardUserId }, { userId: null }] },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: dashboardActivitySelect,
      }),
      persistedUserId ? getOrCreateStudyPlan(persistedUserId).catch(() => null) : Promise.resolve(null),
    ]);
    lastAttempt = attempts[0] ?? null;
  } catch {
    activities = [
      {
        id: "local-welcome",
        message: "Ambiente local iniciado com acesso liberado.",
        xp: 120,
        createdAt: now,
      },
    ];
  }

  studyNowSession = await getInitialStudyNowRecommendation({
    userId: dashboardUserId,
    profile: dashboardProfile,
  });

  const insights = buildDashboardInsights({
    profile: dashboardProfile,
    attempts,
    questions,
  });

  const mainRecommendation = insights.recommendations[0];
  const currentLeague = leagueForXp(user.xp);
  const leagueProgress = getLeagueProgress(user.xp);
  const nextLeague = getNextLeague(user.xp);
  const accuracySeries = insights.dailyBuckets.map((b) => b.accuracy || 0);
  const trendText = insights.trendScore > 0 ? `+${insights.trendScore}%` : `${insights.trendScore}%`;
  const trendPositive = insights.trendScore >= 0;
  const dailyProgress = Math.round(insights.dailyGoalCompletionRate);
  const errorBookDone = insights.pendingErrors + insights.reviewedErrors;
  const errorBookProgress = insights.reviewedErrors;
  const errorBookTotal = Math.max(1, errorBookDone);
  const allPlanTasks = studyPlan?.tasks ?? [];
  const todayPlanTasks = allPlanTasks.filter((task) => isSameCalendarDay(task.scheduledFor, now));
  const planScopeTasks = todayPlanTasks.length ? todayPlanTasks : allPlanTasks.slice(0, 4);
  const activePlanTasks = planScopeTasks.filter((task) => !task.completedAt).slice(0, 4);
  const firstPlanTask = activePlanTasks[0] ?? null;
  const planTotalMinutes = planScopeTasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const planCompletedCount = planScopeTasks.filter((task) => task.completedAt).length;
  const planProgress = planScopeTasks.length
    ? Math.round((planCompletedCount / planScopeTasks.length) * 100)
    : dailyProgress;
  const errorBookHint = errorBookDone
    ? `${insights.reviewedErrors} revisados de ${errorBookDone}`
    : "Nenhum erro pendente";
  const focusMessage = firstPlanTask
    ? `${insights.message} Primeiro bloco salvo: ${firstPlanTask.title}.`
    : insights.message;
  const recommendedQuestion = insights.automaticList[0] ?? null;
  const continueCard = firstPlanTask
    ? {
        meta: "Continue de onde parou",
        title: firstPlanTask.title,
        description: `${studyTaskTypeLabel(firstPlanTask.type)} · ${formatMinutes(firstPlanTask.durationMinutes)} · ${firstPlanTask.description}`,
        href: normalizeStudyHref(firstPlanTask.actionHref),
        icon: studyTaskIcon(firstPlanTask.type),
        accent: "green" as const,
      }
    : lastAttempt
      ? {
          meta: "Continue de onde parou",
          title: lastAttempt.question.statement.replace(/\s+/g, " ").slice(0, 110),
          description: `${lastAttempt.question.vestibular?.name ?? "Questão"} · ${lastAttempt.question.subject?.name ?? "Geral"}`,
          href: questionHref(lastAttempt.question.id, lastAttempt.question.vestibular?.slug),
          icon: lastAttempt.correct ? (
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
          ) : (
            <Sparkles className="h-5 w-5" strokeWidth={2.4} />
          ),
          accent: lastAttempt.correct ? ("green" as const) : ("orange" as const),
        }
      : recommendedQuestion
        ? {
            meta: "Plano inicial",
            title: recommendedQuestion.topic?.name
              ? `Resolver ${recommendedQuestion.topic.name}`
              : `Resolver ${recommendedQuestion.subject.name}`,
            description: `${recommendedQuestion.subject.name} · ${difficultyLabel(recommendedQuestion.difficulty)}`,
            href: questionHref(recommendedQuestion.id, recommendedQuestion.vestibular?.slug),
            icon: <Target className="h-5 w-5" strokeWidth={2.4} />,
            accent: "green" as const,
          }
        : null;
  const prefetchTargets = [
    studyNowSession.startHref,
    mainRecommendation.actionTarget,
    "/questions?vestibular=enem",
    ERROR_NOTEBOOK_HREF,
    ...studyNowSession.blocks.map((block) => block.href),
    ...activePlanTasks.map((task) => normalizeStudyHref(task.actionHref)),
    "/trilhas",
    "/cronograma",
    "/diagnostico",
    "/onboarding",
  ];

  return (
    <div className="mx-auto w-full min-w-0 space-y-3 overflow-x-clip sm:space-y-6">
      <SmartPrefetcher hrefs={prefetchTargets} />

      {/* Header compacto */}
      <section className="relative overflow-hidden rounded-[24px] border border-white/70 bg-gradient-to-br from-white via-[#EFF6FF] to-[#ECFEFF] p-4 shadow-[0_22px_52px_-34px_rgba(14,165,233,0.35)] sm:rounded-[32px] sm:p-6 md:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 hidden h-56 w-56 rounded-full bg-[#22D3EE] opacity-[0.24] blur-3xl sm:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -left-12 hidden h-44 w-44 rounded-full bg-[#A78BFA] opacity-[0.18] blur-3xl sm:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_18px_30px_-22px_rgba(14,165,233,0.65)] ring-1 ring-blue-100 sm:h-16 sm:w-16 sm:rounded-[24px]">
              <Image
                src="/brand/estudaki-logo.png"
                alt="EstudAki"
                width={132}
                height={132}
                className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                priority
              />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#FACC15] to-[#F97316] text-white shadow-md ring-2 ring-white sm:h-6 sm:w-6">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </span>
            </div>
            <div className="min-w-0">
            <p className="text-[9px] font-black uppercase leading-4 tracking-[0.18em] text-blue-700 sm:text-[11px] sm:tracking-[0.22em]">
              {greetingFor(now)} · {weekdayLabel(now)}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-extrabold leading-[1.05] tracking-tight text-[#0F172A] sm:mt-1 sm:text-3xl md:text-4xl">
              {user.name.split(" ")[0]}, bora evoluir?
            </h1>
            <p className="mt-1 max-w-xl text-xs font-medium leading-5 text-slate-600 sm:text-sm">
              Você está na liga <span className="font-extrabold text-[#0F172A]">{currentLeague}</span> com
              {" "}<span className="font-extrabold text-[#0F172A]">{user.xp.toLocaleString("pt-BR")} XP</span>.
              {nextLeague
                ? ` Faltam ${(leagueProgress.to - user.xp).toLocaleString("pt-BR")} XP para a liga ${nextLeague.name}.`
                : " Você está no topo; continue mantendo o ritmo."}
            </p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 border-t border-blue-100/70 pt-3 sm:w-auto sm:flex-wrap sm:justify-start sm:border-0 sm:pt-0">
            <div className="flex items-center gap-2 sm:hidden">
              <StreakBadge days={user.streak} size="sm" />
              <LeagueBadge league={currentLeague} size="md" />
            </div>
            <div className="hidden items-center gap-3 sm:flex">
            <StreakBadge days={user.streak} size="lg" />
            <LeagueBadge league={currentLeague} size="lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Continue de onde parou */}
      {continueCard && (
        <ContinueCard
          meta={continueCard.meta}
          title={continueCard.title}
          description={continueCard.description}
          href={continueCard.href}
          icon={continueCard.icon}
          accent={continueCard.accent}
        />
      )}

      {studyNowSession && <StudyNowCard initialSession={studyNowSession} />}

      <section className="grid min-w-0 gap-3 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
        {/* Foco do dia */}
        <div className="group relative min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#FF8A18] via-[#FFA51F] to-[#FFE01B] p-4 text-white shadow-[0_22px_46px_-28px_rgba(249,115,22,0.55)] sm:rounded-[28px] sm:p-6 md:min-h-[266px] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[28px] bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.28),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_46%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-white/20 blur-sm"
          />
          <Target
            aria-hidden
            className="pointer-events-none absolute -right-7 bottom-3 h-28 w-28 rotate-[-9deg] text-white/18 transition duration-300 group-hover:scale-105 sm:h-44 sm:w-44 sm:text-white/22"
            strokeWidth={1.8}
          />
          <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/88 sm:text-[11px] sm:tracking-[0.22em]">
                Foco de hoje
              </p>
              <div className="mt-2 h-0.5 w-6 rounded-full bg-white/35" />
              <h2 className="mt-3 max-w-[760px] font-display text-xl font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.14)] sm:mt-4 sm:text-2xl md:text-3xl">
                {mainRecommendation.title}
              </h2>
              <p className="mt-2 hidden max-w-xl text-sm font-semibold leading-6 text-white/84 sm:block">
                {focusMessage}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 sm:mt-5">
                <Link
                  href={mainRecommendation.actionTarget}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-orange-600 shadow-[0_18px_32px_-22px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:bg-white/92 sm:py-3"
                >
                  {mainRecommendation.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/cronograma" className="hidden items-center justify-center rounded-full border border-white/30 bg-white/14 px-5 py-3 text-sm font-black text-white shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 sm:inline-flex">
                  Ver plano do dia
                </Link>
              </div>
            </div>
            <div className="hidden flex-col items-center justify-center rounded-[24px] border border-white/24 bg-white/16 p-5 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.35)] backdrop-blur md:flex">
              <ProgressRing
                value={dailyProgress}
                size={140}
                strokeWidth={12}
                gradientFrom="#FFFFFF"
                gradientTo="#FDE68A"
                label={
                  <span className="font-display text-3xl font-extrabold text-white">
                    {insights.completedToday}
                    <span className="text-base font-black text-white">/{insights.dailyGoal.questions}</span>
                  </span>
                }
                caption={<span className="text-white">Meta hoje</span>}
              />
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/82">
                {dailyProgress}% concluído
              </p>
            </div>
          </div>
        </div>

        {/* Liga / XP */}
        <div className="group relative hidden min-w-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6B2CF5] via-[#8A42FF] to-[#A569FF] p-6 text-white shadow-[0_26px_52px_-28px_rgba(124,58,237,0.55)] sm:block md:min-h-[266px] md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[28px] bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.30),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.14),transparent_46%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-white/18 blur-sm"
          />
          <Trophy
            aria-hidden
            className="pointer-events-none absolute -right-7 bottom-3 h-40 w-40 rotate-[-9deg] text-white/26 transition duration-300 group-hover:scale-105"
            strokeWidth={1.8}
          />
          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/82">
              Sua liga
            </p>
            <div className="mt-2 h-0.5 w-6 rounded-full bg-white/35" />
            <div className="mt-1 flex items-end justify-between gap-3">
              <h2 className="mt-3 font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.14)]">
                {currentLeague}
              </h2>
              {nextLeague && (
                <p className="rounded-full border border-white/30 bg-white/18 px-3 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur">
                  Prox. {nextLeague.name}
                </p>
              )}
            </div>
            <p className="mt-2 max-w-[70%] text-sm font-semibold text-white/84">
              {user.xp.toLocaleString("pt-BR")} XP {nextLeague ? `de ${leagueProgress.to.toLocaleString("pt-BR")}` : "(máximo)"}
            </p>
            <div className="mt-5 h-2.5 max-w-[75%] overflow-hidden rounded-full bg-white/24">
              <div
                className="h-full rounded-full bg-white/88 transition-all"
                style={{ width: `${Math.min(100, leagueProgress.current)}%` }}
              />
            </div>
            <div className="mt-5 grid max-w-full grid-cols-3 gap-2 text-center text-xs xl:max-w-[88%]">
              <div className="rounded-2xl border border-white/20 bg-white/16 px-2 py-3 backdrop-blur">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/70">Sequência</p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-white">{user.streak}d</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/16 px-2 py-3 backdrop-blur">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/70">XP</p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-white">{user.xp}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/16 px-2 py-3 backdrop-blur">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/70">Horas</p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-white">{user.weeklyHours ?? 0}/sem</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip gamificado */}
      <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Meta de hoje"
          value={
            <span>
              {insights.completedToday}
              <span className="text-base font-black text-white">/{insights.dailyGoal.questions}</span>
            </span>
          }
          hint={`${dailyProgress}% concluído · ${insights.dailyGoal.reviews} revisões`}
          icon={<Target className="h-5 w-5" strokeWidth={2.4} />}
          ghostIcon={<Target className="h-24 w-24" strokeWidth={2.05} />}
          accent="cyan"
          progress={dailyProgress}
        />
        <StatTile
          label="Sequência"
          value={`${user.streak}d`}
          hint="Mantenha a constância"
          icon={<Flame className="h-5 w-5" strokeWidth={2.4} />}
          ghostIcon={<Flame className="h-24 w-24" strokeWidth={2.05} />}
          accent="purple"
        />
        <StatTile
          label="Acerto ponderado"
          value={percent(insights.weightedAccuracyRate)}
          hint={`${insights.correctToday} acertos hoje`}
          icon={<Zap className="h-5 w-5" strokeWidth={2.4} />}
          ghostIcon={<Zap className="h-24 w-24" strokeWidth={2.05} />}
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
          hint={errorBookHint}
          icon={<BookOpen className="h-5 w-5" strokeWidth={2.4} />}
          ghostIcon={<BookOpen className="h-24 w-24" strokeWidth={2.05} />}
          accent="pink"
          progress={errorBookDone ? (errorBookProgress / errorBookTotal) * 100 : 100}
        />
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
        <div className="relative overflow-hidden rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.16)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#22C55E] opacity-[0.12] blur-3xl"
          />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                Plano do dia
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-[#0F172A]">
                Blocos calculados
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                O cronograma cruza seus erros, cobertura e tempo disponível para decidir o próximo passo.
              </p>
            </div>
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#22C55E] to-[#22D3EE] text-white shadow-[0_16px_30px_-20px_rgba(34,197,94,0.72)]">
                <Target className="h-8 w-8" strokeWidth={2.35} />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF8A18] to-[#FACC15] text-white shadow-[0_10px_20px_-12px_rgba(249,115,22,0.8)] ring-2 ring-white">
                <Flame className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </div>
          </div>
          <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-50 px-2 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Blocos</p>
              <p className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">{planScopeTasks.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-2 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tempo</p>
              <p className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">
                {planTotalMinutes ? formatMinutes(planTotalMinutes) : "0min"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-2 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Erros</p>
              <p className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">{insights.pendingErrors}</p>
            </div>
          </div>
          <div className="relative z-10 mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#22D3EE] transition-all"
              style={{ width: `${Math.max(0, Math.min(100, planProgress))}%` }}
            />
          </div>
          <p className="relative z-10 mt-2 text-xs font-bold text-slate-500">
            {planCompletedCount} de {planScopeTasks.length || 0} bloco(s) concluído(s)
          </p>
          <Link
            href="/cronograma"
            className="relative z-10 mt-4 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#22C55E] to-[#22D3EE] px-4 text-sm font-black text-white shadow-[0_14px_28px_-18px_rgba(34,197,94,0.7)] transition hover:-translate-y-0.5"
          >
            Abrir cronograma
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.16)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
                Plano adaptativo
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">
                O que fazer agora
              </h2>
            </div>
            <Link href="/cronograma" className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 sm:inline-flex">
              Ver plano
            </Link>
          </div>
          <div className="grid gap-2">
            {activePlanTasks.length === 0 ? (
              <EmptyState
                title={planScopeTasks.length ? "Plano de hoje concluído" : "Cronograma pronto para montar"}
                description={
                  planScopeTasks.length
                    ? "Você já concluiu os blocos previstos. Revise o caderno ou gere uma nova semana."
                    : "Complete o onboarding ou gere o cronograma para o EstudAki criar blocos com base nos seus dados."
                }
                accent="green"
              />
            ) : (
              activePlanTasks.map((task, index) => {
                const isReview = task.type.toLowerCase().includes("review") || task.type.toLowerCase().includes("error");
                const isQuestion = task.type.toLowerCase().includes("question");
                const tone = isReview
                  ? "border-emerald-100 bg-gradient-to-br from-[#ECFDF5] to-white text-emerald-700"
                  : isQuestion
                    ? "border-orange-100 bg-gradient-to-br from-[#FFF7ED] to-white text-orange-700"
                    : "border-blue-100 bg-gradient-to-br from-[#EFF6FF] to-white text-blue-700";

                return (
                  <Link
                    key={task.id}
                    href={normalizeStudyHref(task.actionHref)}
                    className={`group relative flex items-center gap-4 overflow-hidden rounded-[20px] border p-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)] ${tone}`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/82 shadow-sm ring-1 ring-white">
                      {studyTaskIcon(task.type)}
                    </span>
                    <div className="relative z-10 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-wider">
                          Passo {index + 1} · {studyTaskTypeLabel(task.type)}
                        </p>
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-slate-500">
                          {formatMinutes(task.durationMinutes)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-extrabold text-[#0F172A]">{task.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
                        {task.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Desafios / Próximo nível */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">
              Próximas metas
            </p>
            <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
              Desafios que aproximam você da próxima liga
            </h2>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          <ChallengeChip
            title="Subir de liga"
            description={
              nextLeague
                ? `Acumule XP para chegar à liga ${nextLeague.name}.`
                : "Você atingiu a liga máxima. Mantenha o ritmo."
            }
            progress={user.xp - leagueProgress.from}
            total={Math.max(1, leagueProgress.to - leagueProgress.from)}
            icon={<Trophy className="h-4 w-4" strokeWidth={2.4} />}
            accent="yellow"
            reward={nextLeague ? nextLeague.name : "Top"}
            ctaLabel="Praticar questões"
            ctaHref="/questions?vestibular=enem"
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
            ctaHref={ERROR_NOTEBOOK_HREF}
            done={insights.pendingErrors === 0}
          />
          <ChallengeChip
            title="Cumprir a meta diária"
            description={`Resolva ${insights.dailyGoal.questions} questões e faça ${insights.dailyGoal.reviews} revisões hoje.`}
            progress={insights.completedToday}
            total={insights.dailyGoal.questions}
            icon={<Target className="h-4 w-4" strokeWidth={2.4} />}
            accent="blue"
            reward={`+${insights.dailyGoal.questions * 12} XP`}
            ctaLabel="Começar lista"
            ctaHref={mainRecommendation.actionTarget}
            done={insights.completedToday >= insights.dailyGoal.questions}
          />
        </div>
      </section>

      {/* Evolução + atividades */}
      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
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
                  Desempenho dos últimos 7 dias
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

      {/* Ações rápidas + questões recomendadas */}
      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
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
              href="/questions?vestibular=enem"
              className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 hover:border-blue-300"
            >
              Ver tudo
            </Link>
          </div>

          {insights.automaticList.length === 0 ? (
            <EmptyState
              title="Nenhuma questão disponível"
              description="Sua lista inteligente aparecerá após você resolver as primeiras questões."
              accent="blue"
            />
          ) : (
            <div className="space-y-2.5">
              {insights.automaticList.slice(0, 5).map((question, index) => {
                const iconName = studyIconNameForSubject(question.subject.name);
                const colors = studyIconColors(iconName);

                return (
                  <Link
                    key={question.id}
                    href={questionHref(question.id, question.vestibular?.slug)}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderColor: `${colors.primary}18` }}
                  >
                    <div className="relative shrink-0">
                      <StudyIcon name={iconName} size="sm" />
                      <span
                        className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-black text-white ring-2 ring-white"
                        style={{ background: colors.primary }}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#0F172A]">
                        {question.topic?.name ?? question.subject.name}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {question.subject.name} - {difficultyLabel(question.difficulty)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                  </Link>
                );
              })}
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
              <Link href={mainRecommendation.actionTarget} className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-[#EFF6FF] to-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <span aria-hidden className="absolute -bottom-5 -right-4 rotate-[-12deg] opacity-25 transition group-hover:scale-105 group-hover:opacity-35">
                  <StudyIcon name="matematica" variant="ghost" size="lg" />
                </span>
                <StudyIcon name="matematica" size="xs" />
                <p className="mt-2 text-sm font-extrabold text-[#0F172A]">Praticar</p>
                <p className="text-[11px] font-semibold text-slate-500">Lista inteligente</p>
              </Link>
              <Link href={ERROR_NOTEBOOK_HREF} className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#ECFDF5] to-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <span aria-hidden className="absolute -bottom-5 -right-4 rotate-[-12deg] opacity-25 transition group-hover:scale-105 group-hover:opacity-35">
                  <StudyIcon name="redacao" variant="ghost" size="lg" />
                </span>
                <StudyIcon name="redacao" size="xs" />
                <p className="mt-2 text-sm font-extrabold text-[#0F172A]">Caderno</p>
                <p className="text-[11px] font-semibold text-slate-500">Revisar erros</p>
              </Link>
              <Link href="/biblioteca" className="group relative overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-br from-[#FDF2F8] to-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <span aria-hidden className="absolute -bottom-5 -right-4 rotate-[-12deg] opacity-25 transition group-hover:scale-105 group-hover:opacity-35">
                  <StudyIcon name="linguagens" variant="ghost" size="lg" />
                </span>
                <StudyIcon name="linguagens" size="xs" />
                <p className="mt-2 text-sm font-extrabold text-[#0F172A]">Biblioteca</p>
                <p className="text-[11px] font-semibold text-slate-500">Materiais liberados</p>
              </Link>
              <Link href="/cronograma" className="group relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-[#F5F3FF] to-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <span aria-hidden className="absolute -bottom-5 -right-4 rotate-[-12deg] opacity-25 transition group-hover:scale-105 group-hover:opacity-35">
                  <StudyIcon name="ciencias-humanas" variant="ghost" size="lg" />
                </span>
                <StudyIcon name="ciencias-humanas" size="xs" />
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
                Biblioteca para você
              </p>
              <h2 className="font-display text-lg font-extrabold text-[#0F172A]">
                Materiais e PDFs liberados
              </h2>
              <div className="mt-3 space-y-2">
                <p className="rounded-2xl border border-pink-100 bg-white/80 p-3 text-sm text-slate-600">
                  Acesse a biblioteca, continue a leitura e baixe seus materiais aprovados com o acesso liberado.
                </p>
                <Link
                  href="/biblioteca"
                  className="group flex items-center gap-3 rounded-2xl border border-pink-100/80 bg-white p-3 transition hover:border-pink-200 hover:shadow-md"
                >
                  <StudyIcon name="linguagens" size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0F172A]">Abrir biblioteca</p>
                    <p className="line-clamp-1 text-[11px] text-slate-500">Capas, progresso e leitura salva</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
                </Link>
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

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours <= 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}
