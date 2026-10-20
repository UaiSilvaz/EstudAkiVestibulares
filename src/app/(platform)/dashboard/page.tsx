import { LeagueBadge } from "@/components/visual/league-badge";
import { StudyFocusPanel } from "@/components/dashboard/study-focus-panel";
import { BookOpen, Clock3, Target, Trophy } from "@/components/visual/aicon-icons";
import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { ChallengeChip } from "@/components/visual/challenge-chip";
import { EmptyState } from "@/components/visual/empty-state";
import { EvolutionChart } from "@/components/visual/evolution-chart";
import { nextRankForXp, rankForXp, rankProgressForXp } from "@/lib/progression";
import { FloatingWhatsApp } from "@/components/visual/floating-whatsapp";
import { LearningResumeCard, type LearningResumeCardProps, type ResumeTrailStep } from "@/components/learning-resume-card";
import { SmartPrefetcher } from "@/components/smart-prefetcher";
import { Sparkline } from "@/components/visual/sparkline";
import { StatTile } from "@/components/visual/stat-tile";
import { StudyIcon, studyIconColors, studyIconNameForSubject } from "@/components/visual/study-icon";
import { getPersistedUserId, requireUser } from "@/lib/auth";
import { getOrCreateStudyPlan } from "@/lib/adaptive-study-plan";
import { getVerticalTheme } from "@/config/vertical-themes";
import { getCourseCatalog, getCourseDetail } from "@/lib/courses/learning";
import type { CourseCardDTO, CourseDetailDTO, LearningPathNodeDTO } from "@/lib/courses/types";
import { db } from "@/lib/db";
import { buildDashboardInsights, ERROR_NOTEBOOK_HREF } from "@/lib/insights";
import { getActivePreparationContext } from "@/lib/preparations";
import { difficultyLabel, percent } from "@/lib/utils";


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
function getNextLeague(xp: number, objective?: string | null) {
  return nextRankForXp(xp, objective);
}

function getLeagueProgress(xp: number, objective?: string | null) {
  const progress = rankProgressForXp(xp, objective);
  return {
    from: progress.current.min,
    to: progress.next?.min ?? progress.current.min,
    current: progress.value,
    nextName: progress.next?.name ?? null,
  };
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
  if (/^\/(trilhas|aula|atividade)(\/|$)/.test(href)) return "/cursos";
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
  if (normalized.includes("theory") || normalized.includes("lesson")) return "Cursos";
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

type DashboardContinueFallback = {
  meta: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

function clampIndex(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function flattenCourseNodes(course: CourseDetailDTO) {
  return course.modules.flatMap((module) =>
    module.nodes.map((node) => ({
      ...node,
      moduleTitle: module.title,
    })),
  );
}

function trailWindow(
  nodes: Array<LearningPathNodeDTO & { moduleTitle: string }>,
  currentIndex: number,
  completed: boolean,
): ResumeTrailStep[] {
  if (nodes.length === 0) {
    return ["start", "middle-a", "middle-b", "middle-c", "finish"].map((id, index) => ({
      id,
      label: "Etapa da trilha",
      state: index === 0 ? "current" : "next",
    }));
  }

  const visibleCount = Math.min(5, nodes.length);
  const start = clampIndex(currentIndex - 2, 0, Math.max(0, nodes.length - visibleCount));
  const visible = nodes.slice(start, start + visibleCount);

  return visible.map((node, index) => {
    const isCurrent = start + index === currentIndex;
    const isLastVisible = index === visible.length - 1;
    const done = node.state === "completed" || node.state === "perfect";
    const state: ResumeTrailStep["state"] = completed && isLastVisible
      ? "final"
      : done || (completed && !isLastVisible)
        ? "completed"
        : isCurrent
          ? "current"
          : node.state === "locked"
            ? "locked"
            : "next";

    return {
      id: node.id,
      label: node.title,
      state,
    };
  });
}

function formatClockPosition(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function compactCourseTitle(title: string) {
  return title
    .replace(/\s+-\s+Do Zero\s+a\s+Aprovacao/i, "")
    .replace(/\s+Do Zero\s+a\s+Aprovacao/i, "")
    .trim();
}

function buildLearningResumeCard({
  course,
  recentLessonId,
  recentPositionSeconds,
  fallback,
  fallbackCourse,
}: {
  course: CourseDetailDTO | null;
  recentLessonId: string | null;
  recentPositionSeconds: number;
  fallback: DashboardContinueFallback | null;
  fallbackCourse: CourseCardDTO | null;
}): LearningResumeCardProps {
  if (course) {
    const nodes = flattenCourseNodes(course);
    const completed = course.progressPercent >= 100 || (nodes.length > 0 && nodes.every((node) => node.state === "completed" || node.state === "perfect"));
    const recentNode = recentLessonId ? nodes.find((node) => node.id === recentLessonId) ?? null : null;
    const nextNode = course.nextNode ? nodes.find((node) => node.id === course.nextNode?.id) ?? course.nextNode : null;
    const resumeNode = completed
      ? nodes[nodes.length - 1] ?? null
      : recentNode && recentNode.state !== "locked"
        ? recentNode
        : nextNode ?? nodes.find((node) => node.state === "current" || node.state === "available") ?? nodes[0] ?? null;
    const currentIndex = resumeNode ? Math.max(0, nodes.findIndex((node) => node.id === resumeNode.id)) : 0;
    const moduleTitle = resumeNode && "moduleTitle" in resumeNode ? resumeNode.moduleTitle : course.modules[0]?.title ?? "Módulo inicial";
    const title = compactCourseTitle(course.title) || course.title;
    const currentTitle = resumeNode?.title ?? "Primeira aula";
    const timeLabel = recentPositionSeconds > 0 && recentLessonId === resumeNode?.id
      ? `Você parou em ${formatClockPosition(recentPositionSeconds)}`
      : `${formatMinutes(Math.max(1, Math.round(course.totalDurationSeconds / 60)))} de conteúdo`;

    return {
      eyebrow: completed ? "Trilha concluída" : course.progressPercent > 0 ? "Continue de onde parou" : "Comece sua primeira trilha",
      title,
      subtitle: `${moduleTitle} - ${currentTitle}`,
      nextLabel: completed ? "Curso finalizado" : "Aula atual",
      detailLabel: completed ? "Todas as etapas foram concluídas." : timeLabel,
      progressPercent: completed ? 100 : course.progressPercent,
      progressLabel: completed ? "concluído" : "da trilha",
      href: completed ? "/cursos" : resumeNode?.href ?? `/cursos/${course.slug}`,
      ctaLabel: completed ? "Ver próxima trilha" : course.progressPercent > 0 ? "Continuar" : "Começar agora",
      steps: trailWindow(nodes, currentIndex, completed),
      icon: <BookOpen className="h-5 w-5" strokeWidth={2.35} />,
    };
  }

  if (fallback) {
    return {
      eyebrow: fallback.meta,
      title: fallback.title,
      subtitle: fallback.description,
      nextLabel: "Lista atual",
      detailLabel: "Continue exatamente do ponto recomendado para hoje.",
      progressPercent: 38,
      progressLabel: "em andamento",
      href: fallback.href,
      ctaLabel: "Continuar",
      steps: [
        { id: "question-1", label: "Questão respondida", state: "completed" },
        { id: "question-2", label: "Questão respondida", state: "completed" },
        { id: "question-current", label: fallback.title, state: "current" },
        { id: "question-next-1", label: "Próxima questão", state: "next" },
        { id: "question-next-2", label: "Próxima questão", state: "next" },
      ],
      icon: fallback.icon,
      secondaryHref: "/questions",
      secondaryLabel: "Ver questões",
    };
  }

  return {
    eyebrow: "Comece sua primeira trilha",
    title: fallbackCourse ? compactCourseTitle(fallbackCourse.title) : "Seu plano já está pronto",
    subtitle: fallbackCourse ? `${fallbackCourse.lessonCount} atividades - ${fallbackCourse.teacherName}` : "Escolha uma trilha e avance aula por aula.",
    nextLabel: "Primeiro passo",
    detailLabel: "A trilha fica salva para você continuar depois.",
    progressPercent: 0,
    progressLabel: "concluído",
    href: fallbackCourse ? `/cursos/${fallbackCourse.slug}` : "/cursos",
    ctaLabel: "Começar agora",
    steps: [
      { id: "start-1", label: "Primeira aula", state: "current" },
      { id: "start-2", label: "Próxima aula", state: "next" },
      { id: "start-3", label: "Próxima aula", state: "next" },
      { id: "start-4", label: "Módulo seguinte", state: "next" },
      { id: "start-5", label: "Conclusão", state: "locked" },
    ],
    icon: <BookOpen className="h-5 w-5" strokeWidth={2.35} />,
  };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const persistedUserId = await getPersistedUserId(user);
  const preparationContext = persistedUserId ? await getActivePreparationContext(persistedUserId) : null;
  const activePreparation = preparationContext?.active ?? null;
  const activeTheme = getVerticalTheme(activePreparation?.vertical.slug);
  const dashboardUserId = persistedUserId ?? user.id;
  const learningProfile = persistedUserId ? await db.studentLearningProfile.findUnique({ where: { userId: persistedUserId } }) : null;
  const dashboardProfile = {
    name: user.name,
    weeklyHours: activePreparation
      ? Math.max(1, Math.round((activePreparation.minutesPerDay * activePreparation.studyDays.length) / 60))
      : user.weeklyHours ?? 0,
    targetExam: activePreparation?.displayName ?? user.targetExam ?? "ENEM",
    examDate: learningProfile?.examDate,
    studyDays: learningProfile?.studyDays as number[] | undefined,
  };

  let attempts: AttemptWithQuestion[] = [];
  let questions: QuestionWithSubject[] = [];
  let activities: ActivityWithUser[] = [];
  let studyPlan: Awaited<ReturnType<typeof getOrCreateStudyPlan>> | null = null;
  let lastAttempt: AttemptWithQuestion | null = null;
  let learningCourses: Awaited<ReturnType<typeof getCourseCatalog>> = [];

  try {
    [attempts, questions, activities, studyPlan] = await Promise.all([
      db.questionAttempt.findMany({
        where: { userId: dashboardUserId, annulled: false },
        orderBy: { createdAt: "desc" },
        select: dashboardAttemptSelect,
      }),
      db.question.findMany({
        where: { status: "PUBLISHED", answerSituation: { not: "ANNULLED" } },
        select: dashboardQuestionPoolSelect,
        orderBy: { createdAt: "desc" },
      }),
      db.activity.findMany({
        where: { userId: dashboardUserId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: dashboardActivitySelect,
      }),
      persistedUserId
        ? getOrCreateStudyPlan(persistedUserId, activePreparation?.userPreparationId ?? null).catch(() => null)
        : Promise.resolve(null),
    ]);
    lastAttempt = attempts[0] ?? null;
  } catch {
    activities = [
      {
        id: "local-welcome",
        message: "Ambiente local iniciado com acesso liberado.",
        xp: 0,
        createdAt: now,
      },
    ];
  }

  learningCourses = await getCourseCatalog(dashboardUserId).catch(() => []);
  const [latestCourseEvent, latestLessonProgress] = await Promise.all([
    db.learningEvent.findFirst({
      where: { userId: dashboardUserId, courseId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        lessonId: true,
        course: { select: { slug: true } },
      },
    }),
    db.lessonProgress.findFirst({
      where: { userId: dashboardUserId },
      orderBy: { updatedAt: "desc" },
      select: {
        lessonId: true,
        positionSeconds: true,
        updatedAt: true,
        lesson: {
          select: {
            modules: {
              take: 1,
              include: {
                module: {
                  include: {
                    courses: {
                      take: 1,
                      include: { course: { select: { slug: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]).catch(() => [null, null] as const);
  const progressIsNewest = Boolean(
    latestLessonProgress &&
      (!latestCourseEvent || latestLessonProgress.updatedAt.getTime() >= latestCourseEvent.createdAt.getTime()),
  );
  const latestProgressCourseSlug = latestLessonProgress?.lesson.modules[0]?.module.courses[0]?.course.slug ?? null;
  const resumeCourseSlug = progressIsNewest
    ? latestProgressCourseSlug ?? latestCourseEvent?.course?.slug ?? null
    : latestCourseEvent?.course?.slug ?? latestProgressCourseSlug ?? null;
  const fallbackCourseSlug =
    resumeCourseSlug ??
    learningCourses.find((course) => course.progressPercent > 0 && course.progressPercent < 100)?.slug ??
    learningCourses.find((course) => course.progressPercent < 100)?.slug ??
    learningCourses[0]?.slug ??
    null;
  const recentLessonId = progressIsNewest
    ? latestLessonProgress?.lessonId ?? latestCourseEvent?.lessonId ?? null
    : latestCourseEvent?.lessonId ?? latestLessonProgress?.lessonId ?? null;
  const recentPositionSeconds = progressIsNewest ? latestLessonProgress?.positionSeconds ?? 0 : 0;
  const resumeCourseDetail = fallbackCourseSlug
    ? await getCourseDetail(fallbackCourseSlug, dashboardUserId).catch(() => null)
    : null;

  const insights = buildDashboardInsights({
    profile: dashboardProfile,
    attempts,
    questions,
  });

  const mainRecommendation = insights.recommendations[0];
  const currentLeague = rankForXp(user.xp);
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
  const learningResumeCard = buildLearningResumeCard({
    course: resumeCourseDetail,
    recentLessonId,
    recentPositionSeconds,
    fallback: continueCard,
    fallbackCourse: learningCourses[0] ?? null,
  });
  const prefetchTargets = [
    learningResumeCard.href,
    mainRecommendation.actionTarget,
    "/questions?vestibular=enem",
    ERROR_NOTEBOOK_HREF,
    ...activePlanTasks.map((task) => normalizeStudyHref(task.actionHref)),
    "/cursos",
    "/cronograma",
    "/diagnostico",
    "/onboarding",
  ];

  return (
    <div className="dashboard-page mx-auto w-full min-w-0 space-y-3 overflow-x-clip sm:space-y-6">
      <SmartPrefetcher hrefs={prefetchTargets} />

      <header className="professional-page-header border-b border-[color:var(--theme-border)] pb-5">
        <p className="mb-2 text-xs text-[color:var(--theme-muted)]">{weekdayLabel(now)}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--theme-text)] sm:text-3xl">
          {greetingFor(now)}, {user.name.split(" ")[0]}.
        </h1>
        <p className="professional-preparation-marker mt-3 text-sm text-[color:var(--theme-muted)]">{activePreparation?.displayName ?? activeTheme.name}</p>
      </header>

      <section className="dashboard-rank-summary" aria-label="Seu nível de XP">
        <LeagueBadge league={currentLeague} xp={user.xp} size="lg" />
        <div className="dashboard-rank-summary__progress">
          <p className="text-sm font-semibold">{user.xp.toLocaleString("pt-BR")} XP acumulados</p>
          <p className="mt-1 text-xs text-[color:var(--theme-muted)]">
            {nextLeague ? `${Math.max(0, nextLeague.min - user.xp).toLocaleString("pt-BR")} XP para chegar a ${nextLeague.name}` : "Você chegou ao nível máximo da trilha."}
          </p>
          <div className="dashboard-rank-summary__track" role="progressbar" aria-label="Progresso para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(leagueProgress.current)}>
            <span style={{ width: `${leagueProgress.current}%` }} />
          </div>
        </div>
        <Link href="/perfil#ligas" className="text-xs font-semibold text-[color:var(--theme-primary)]">Ver emblemas <span aria-hidden="true">→</span></Link>
      </section>

      <StudyFocusPanel eyebrow={activeTheme.copy.dashboardKicker} title={mainRecommendation.title} description={focusMessage} actionLabel={activeTheme.copy.primaryCta} actionHref={mainRecommendation.actionTarget} completed={insights.completedToday} goal={insights.dailyGoal.questions} />
      <nav className="dashboard-shortcuts" aria-label="Atalhos de estudo">
        <Link href="/cronograma"><Clock3 />Meu plano</Link><Link href="/questions"><BookOpen />Praticar questões</Link><Link href="/simulados"><Target />Simulados</Link><Link href="/performance"><Trophy />Meu progresso</Link>
      </nav>

      {/* Plano de hoje, seguido das métricas reais. */}


      <section className="grid min-w-0 gap-4 xl:grid-cols-1">
        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                {planCompletedCount} de {planScopeTasks.length} atividades concluídas · {formatMinutes(planTotalMinutes)} previstos
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-[#0F172A]">
                Plano de hoje
              </h2>
            </div>
            <Link href="/cronograma" className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700 sm:inline-flex">
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
                    : "Complete o onboarding ou gere o cronograma para o Norte Preparatórios criar blocos com base nos seus dados."
                }
                accent="green"
              />
            ) : (
              activePlanTasks.map((task, index) => {
                const isReview = task.type.toLowerCase().includes("review") || task.type.toLowerCase().includes("error");
                const isQuestion = task.type.toLowerCase().includes("question");
                const tone = isReview
                  ? "border-emerald-100    text-emerald-700 professional-neutral"
                  : isQuestion
                    ? "border-orange-100    text-orange-700 professional-neutral"
                    : "border-blue-100    text-blue-700 professional-neutral";

                return (
                  <Link
                    key={task.id}
                    href={normalizeStudyHref(task.actionHref)}
                    className={`group relative flex items-center gap-4 overflow-hidden rounded-[20px] border p-3.5 transition duration-200 hover:-translate-y-0.5 shadow-sm ${tone}`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/82 shadow-sm ring-1 ring-white">
                      {studyTaskIcon(task.type)}
                    </span>
                    <div className="relative z-10 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider">
                          Passo {index + 1} · {studyTaskTypeLabel(task.type)}
                        </p>
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {formatMinutes(task.durationMinutes)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-bold text-[#0F172A]">{task.title}</p>
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

      <section className="grid min-w-0 gap-4 sm:grid-cols-3">
        <StatTile
          label="Questões hoje"
          value={
            <span>
              {insights.completedToday}
              <span className="text-base font-normal text-[color:var(--theme-muted)]">/{insights.dailyGoal.questions}</span>
            </span>
          }
          hint={`${dailyProgress}% concluído · ${insights.dailyGoal.reviews} revisões`}
          icon={<Target className="h-5 w-5" strokeWidth={2.4} />}
          ghostIcon={<Target className="h-24 w-24" strokeWidth={2.05} />}
          accent="cyan"
          progress={dailyProgress}
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

      <section className="dashboard-chart-card" aria-label="Evolução do desempenho">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-xs text-[color:var(--theme-primary)]">Seu aprendizado em perspectiva</p><h2>Desempenho dos últimos 7 dias</h2></div><Link href="/performance" className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--theme-primary)]">Ver meu progresso<ArrowRight className="h-4 w-4" /></Link></div>
        <EvolutionChart data={insights.dailyBuckets.map(bucket => bucket.attempts ? bucket.accuracy : null)} labels={insights.dailyBuckets.map(bucket => bucket.label)} height={160} />
      </section>

      <details className="professional-details">
        <summary>Continuar minhas aulas</summary>
        <LearningResumeCard {...learningResumeCard} />
      </details>
      <details className="professional-details">
        <summary>Constância e conquistas</summary>
        <div className="space-y-5">

      <section aria-label="Constância e conquistas">
        {/* Liga / XP */}
        <div className="theme-league-panel group relative hidden min-w-0 overflow-hidden rounded-[18px]     p-6 text-[color:var(--theme-text)] shadow-sm sm:block md:min-h-[266px] md:p-7 professional-neutral">
          <div
            aria-hidden
            className="theme-league-sheen pointer-events-none absolute -inset-px rounded-[18px]  professional-neutral"
          />
          <div
            aria-hidden
            className="theme-league-ghost pointer-events-none absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-white/18 blur-sm"
          />
          <Trophy
            aria-hidden
            className="theme-league-ghost pointer-events-none absolute -right-7 bottom-3 h-40 w-40 rotate-[-9deg] text-white/26 transition duration-300 "
            strokeWidth={1.8}
          />
          <div className="relative z-10">
            <p className="theme-league-kicker text-[11px] font-semibold uppercase tracking-wide text-white/82">
              Sua liga
            </p>
            <div className="theme-league-rule mt-2 h-0.5 w-6 rounded-full bg-white/35" />
            <div className="mt-1 flex items-end justify-between gap-3">
              <h2 className="mt-3 font-display text-3xl font-bold text-white drop-shadow-sm">
                {currentLeague}
              </h2>
              {nextLeague && (
                <p className="theme-league-next rounded-full border border-white/30 bg-white/18 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                  Prox. {nextLeague.name}
                </p>
              )}
            </div>
            <p className="mt-2 max-w-[70%] text-sm font-semibold text-white/84">
              {user.xp.toLocaleString("pt-BR")} XP {nextLeague ? `de ${leagueProgress.to.toLocaleString("pt-BR")}` : "(máximo)"}
            </p>
            <div className="theme-league-progress mt-5 h-2.5 max-w-[75%] overflow-hidden rounded-full bg-white/24">
              <div
                className="theme-league-progress-fill h-full rounded-full bg-white/88 transition-all"
                style={{ width: `${Math.min(100, leagueProgress.current)}%` }}
              />
            </div>
            <div className="mt-5 grid max-w-full grid-cols-3 gap-2 text-center text-xs xl:max-w-[88%]">
              <div className="theme-league-metric rounded-2xl border border-white/20 bg-white/16 px-2 py-3 backdrop-blur">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">Sequência</p>
                <p className="mt-0.5 font-display text-lg font-bold text-white">{user.streak}d</p>
              </div>
              <div className="theme-league-metric rounded-2xl border border-white/20 bg-white/16 px-2 py-3 backdrop-blur">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">XP</p>
                <p className="mt-0.5 font-display text-lg font-bold text-white">{user.xp}</p>
              </div>
              <div className="theme-league-metric rounded-2xl border border-white/20 bg-white/16 px-2 py-3 backdrop-blur">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">Horas</p>
                <p className="mt-0.5 font-display text-lg font-bold text-white">{user.weeklyHours ?? 0}/sem</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desafios / Próximo nível */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Próximas metas
            </p>
            <h2 className="font-display text-xl font-bold text-[#0F172A]">
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

        </div>
      </details>

      <details className="professional-details">
        <summary>Histórico e evolução</summary>
      {/* Evolução + atividades */}
      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
        <div className="relative overflow-hidden rounded-[18px] border border-blue-100/60 bg-white p-6 shadow-sm md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#60A5FA] opacity-20 blur-3xl"
          />
          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Evolução
                </p>
                <h2 className="font-display text-xl font-bold text-[#0F172A]">
                  Desempenho dos últimos 7 dias
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-100    px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 professional-neutral">
                <Zap className="h-3.5 w-3.5" />
                {trendText} na semana
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: "Acertos hoje", value: String(insights.correctToday), color: "#22C55E" },
                { label: "Tempo médio", value: formatSeconds(insights.averageTimeSeconds), color: "#2563EB" },
                { label: "Pendências", value: String(insights.pendingErrors), color: "#FACC15" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-100    p-3.5 professional-neutral"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="font-display text-xl font-bold text-[#0F172A]">{stat.value}</p>
                    <Sparkline data={accuracySeries} color={stat.color} width={56} height={22} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Atividades recentes */}
        <div className="theme-activity-panel relative overflow-hidden rounded-[18px] border border-yellow-200/40 bg-white p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FACC15] opacity-20 blur-3xl"
          />
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="theme-activity-icon flex h-10 w-10 items-center justify-center rounded-xl     text-[color:var(--theme-text)] professional-neutral">
                <Clock3 className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                Atividades recentes
              </h2>
            </div>
            {activities.length === 0 ? (
              <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Nenhuma atividade ainda. Que tal começar agora?
              </p>
            ) : (
              <ul className="space-y-2.5">
                {activities.slice(0, 3).map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="flex-1 text-sm font-semibold text-slate-700">{activity.message}</p>
                    {activity.xp > 0 && (
                      <span className="theme-xp-pill rounded-full    px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--theme-text)] professional-neutral">
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

      </details>
      <details className="professional-details">
        <summary>Questões recomendadas e atalhos</summary>
      {/* Ações rápidas + questões recomendadas */}
      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
        <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-sm md:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                Lista inteligente
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-[#0F172A]">
                Questões recomendadas
              </h2>
            </div>
            <Link
              href="/questions?vestibular=enem"
              className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700 hover:border-blue-300"
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
              {insights.automaticList.slice(0, 3).map((question, index) => {
                const iconName = studyIconNameForSubject(question.subject.name);
                const colors = studyIconColors(iconName);

                return (
                  <Link
                    key={question.id}
                    href={questionHref(question.id, question.vestibular?.slug)}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderColor: "var(--theme-border)" }}
                  >
                    <div className="relative shrink-0">
                      <StudyIcon name={iconName} size="sm" />
                      <span
                        className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white ring-2 ring-white"
                        style={{ background: colors.primary }}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#0F172A]">
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
          <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
              Atalhos rápidos
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-[#0F172A]">
              Continue com 1 clique
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link href={mainRecommendation.actionTarget} data-accent="blue" className="theme-quick-action group relative overflow-hidden rounded-2xl border border-blue-100    p-3 transition hover:-translate-y-0.5 hover:shadow-md professional-neutral">
                <span aria-hidden className="absolute -bottom-5 -right-4 rotate-[-12deg] opacity-25 transition  group-hover:opacity-35">
                  <StudyIcon name="matematica" variant="ghost" size="lg" />
                </span>
                <StudyIcon name="matematica" size="xs" />
                <p className="mt-2 text-sm font-bold text-[#0F172A]">Praticar</p>
                <p className="text-[11px] font-semibold text-slate-500">Lista inteligente</p>
              </Link>
              <Link href={ERROR_NOTEBOOK_HREF} data-accent="green" className="theme-quick-action group relative overflow-hidden rounded-2xl border border-emerald-100    p-3 transition hover:-translate-y-0.5 hover:shadow-md professional-neutral">
                <span aria-hidden className="absolute -bottom-5 -right-4 rotate-[-12deg] opacity-25 transition  group-hover:opacity-35">
                  <StudyIcon name="redacao" variant="ghost" size="lg" />
                </span>
                <StudyIcon name="redacao" size="xs" />
                <p className="mt-2 text-sm font-bold text-[#0F172A]">Caderno</p>
                <p className="text-[11px] font-semibold text-slate-500">Revisar erros</p>
              </Link>
              <Link href="/biblioteca" data-accent="pink" className="theme-quick-action group relative overflow-hidden rounded-2xl border border-pink-100    p-3 transition hover:-translate-y-0.5 hover:shadow-md professional-neutral">
                <span aria-hidden className="absolute -bottom-5 -right-4 rotate-[-12deg] opacity-25 transition  group-hover:opacity-35">
                  <StudyIcon name="linguagens" variant="ghost" size="lg" />
                </span>
                <StudyIcon name="linguagens" size="xs" />
                <p className="mt-2 text-sm font-bold text-[#0F172A]">Biblioteca</p>
                <p className="text-[11px] font-semibold text-slate-500">Materiais liberados</p>
              </Link>
              <Link href="/cronograma" data-accent="purple" className="theme-quick-action group relative overflow-hidden rounded-2xl border border-violet-100    p-3 transition hover:-translate-y-0.5 hover:shadow-md professional-neutral">
                <span aria-hidden className="absolute -bottom-5 -right-4 rotate-[-12deg] opacity-25 transition  group-hover:opacity-35">
                  <StudyIcon name="ciencias-humanas" variant="ghost" size="lg" />
                </span>
                <StudyIcon name="ciencias-humanas" size="xs" />
                <p className="mt-2 text-sm font-bold text-[#0F172A]">Plano</p>
                <p className="text-[11px] font-semibold text-slate-500">Semana de foco</p>
              </Link>
            </div>
          </div>

          <div className="theme-library-panel relative overflow-hidden rounded-[18px] border border-pink-200/40     p-6 professional-neutral">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FB7185] opacity-25 blur-3xl"
            />
            <div className="relative z-10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-600">
                Biblioteca para você
              </p>
              <h2 className="font-display text-lg font-bold text-[#0F172A]">
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
                    <p className="truncate text-sm font-bold text-[#0F172A]">Abrir biblioteca</p>
                    <p className="line-clamp-1 text-[11px] text-slate-500">Capas, progresso e leitura salva</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FloatingWhatsApp variant="platform" />      </details>

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
