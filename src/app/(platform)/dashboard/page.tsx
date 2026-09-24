import { ArrowRight, ArrowUpRight, ChartNoAxesCombined, Flame, GraduationCap, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Play, Sparkles, Target } from "lucide-react";
import type { CSSProperties } from "react";
import { SilvaIllustration, subjectIllustration } from "@/components/silva-illustration";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { type LearningResumeCardProps, type ResumeTrailStep } from "@/components/learning-resume-card";
import { SmartPrefetcher } from "@/components/smart-prefetcher";
import { getPersistedUserId, requireUser } from "@/lib/auth";
import { getOrCreateStudyPlan } from "@/lib/adaptive-study-plan";
import { getCourseCatalog, getCourseDetail } from "@/lib/courses/learning";
import type { CourseCardDTO, CourseDetailDTO, LearningPathNodeDTO } from "@/lib/courses/types";
import { db } from "@/lib/db";
import { buildDashboardInsights, ERROR_NOTEBOOK_HREF } from "@/lib/insights";
import { getActivePreparationContext } from "@/lib/preparations";
import { difficultyLabel } from "@/lib/utils";


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


type AttemptWithQuestion = Prisma.QuestionAttemptGetPayload<{
  select: typeof dashboardAttemptSelect;
}>;
type QuestionWithSubject = Prisma.QuestionGetPayload<{ select: typeof dashboardQuestionPoolSelect }>;
function greetingFor(date: Date) {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(date));
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
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
  if (!href) return "/questions";
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
      progressPercent: 0,
      progressLabel: "em andamento",
      href: fallback.href,
      ctaLabel: "Continuar",
      steps: [
        { id: "question-1", label: "Questao respondida", state: "completed" },
        { id: "question-2", label: "Questao respondida", state: "completed" },
        { id: "question-current", label: fallback.title, state: "current" },
        { id: "question-next-1", label: "Proxima questao", state: "next" },
        { id: "question-next-2", label: "Proxima questao", state: "next" },
      ],
      icon: fallback.icon,
      secondaryHref: "/questions",
      secondaryLabel: "Ver questões",
    };
  }

  return {
    eyebrow: "Comece sua primeira trilha",
    title: fallbackCourse ? compactCourseTitle(fallbackCourse.title) : "Seu próximo passo começa aqui",
    subtitle: fallbackCourse ? `${fallbackCourse.lessonCount} atividades - ${fallbackCourse.teacherName}` : "Escolha uma trilha e avance aula por aula.",
    nextLabel: "Primeiro passo",
    detailLabel: "A trilha fica salva para voce continuar depois.",
    progressPercent: 0,
    progressLabel: "concluído",
    href: fallbackCourse ? `/cursos/${fallbackCourse.slug}` : "/cursos",
    ctaLabel: "Começar agora",
    steps: [
      { id: "start-1", label: "Primeira aula", state: "current" },
      { id: "start-2", label: "Proxima aula", state: "next" },
      { id: "start-3", label: "Proxima aula", state: "next" },
      { id: "start-4", label: "Modulo seguinte", state: "next" },
      { id: "start-5", label: "Conclusao", state: "locked" },
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
  const dashboardUserId = persistedUserId ?? user.id;
  const dashboardProfile = {
    name: user.name,
    weeklyHours: activePreparation
      ? Math.max(1, Math.round((activePreparation.minutesPerDay * activePreparation.studyDays.length) / 60))
      : user.weeklyHours ?? 0,
    targetExam: activePreparation?.displayName ?? user.targetExam ?? "ENEM",
  };

  let attempts: AttemptWithQuestion[] = [];
  let questions: QuestionWithSubject[] = [];
  let studyPlan: Awaited<ReturnType<typeof getOrCreateStudyPlan>> | null = null;
  let lastAttempt: AttemptWithQuestion | null = null;
  let learningCourses: Awaited<ReturnType<typeof getCourseCatalog>> = [];

  try {
    [attempts, questions, studyPlan] = await Promise.all([
      db.questionAttempt.findMany({
        where: { userId: dashboardUserId, annulled: false, ...(activePreparation?.examSlug ? { question: { vestibular: { slug: activePreparation.examSlug } } } : {}) },
        orderBy: { createdAt: "desc" },
        take: 240,
        select: dashboardAttemptSelect,
      }),
      db.question.findMany({
        where: { status: "PUBLISHED", answerSituation: { not: "ANNULLED" }, ...(activePreparation?.examSlug ? { vestibular: { slug: activePreparation.examSlug } } : {}) },
        select: dashboardQuestionPoolSelect,
        orderBy: { createdAt: "desc" },
        take: 120,
      }),
      persistedUserId
        ? getOrCreateStudyPlan(persistedUserId, activePreparation?.userPreparationId ?? null).catch(() => null)
        : Promise.resolve(null),
    ]);
    lastAttempt = attempts[0] ?? null;
  } catch { /* Show the empty state when study data is unavailable. */ }

  learningCourses = await getCourseCatalog(dashboardUserId, activePreparation?.id).catch(() => []);
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
    (learningCourses.some((course) => course.slug === resumeCourseSlug) ? resumeCourseSlug : null) ??
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
  const allPlanTasks = studyPlan?.tasks ?? [];
  const todayPlanTasks = allPlanTasks.filter((task) => isSameCalendarDay(task.scheduledFor, now));
  const planScopeTasks = todayPlanTasks.length ? todayPlanTasks : allPlanTasks.slice(0, 5);
  const completedCount = planScopeTasks.filter((task) => task.completedAt).length;
  const firstPlanTask = planScopeTasks.find((task) => !task.completedAt);
  const fallback = firstPlanTask ? {
    meta: "Seu próximo bloco", title: firstPlanTask.title,
    description: firstPlanTask.description, href: normalizeStudyHref(firstPlanTask.actionHref),
    icon: studyTaskIcon(firstPlanTask.type),
  } : lastAttempt ? {
    meta: "Retome sua prática", title: lastAttempt.question.subject?.name ?? "Questões",
    description: lastAttempt.question.topic?.name ?? difficultyLabel(lastAttempt.question.difficulty),
    href: questionHref(lastAttempt.question.id, lastAttempt.question.vestibular?.slug),
    icon: <Target />,
  } : null;
  const resume = buildLearningResumeCard({ course: resumeCourseDetail, recentLessonId, recentPositionSeconds, fallback, fallbackCourse: learningCourses[0] ?? null });
  const examDate = activePreparation?.examDate ? new Date(activePreparation.examDate) : null;
  const daysUntilExam = examDate && Number.isFinite(examDate.getTime()) ? Math.ceil((examDate.getTime() - now.getTime()) / 86400000) : null;
  const progress = Math.max(0, Math.min(100, resume.progressPercent));
  const planMinutes = planScopeTasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const target = activePreparation?.displayName ?? user.targetExam ?? "seu objetivo";

  const continuingCourses = learningCourses.filter((course) => course.progressPercent > 0 && course.progressPercent < 100).slice(0, 3);
  const weeklyTotal = insights.dailyBuckets.reduce((sum, day) => sum + day.attempts, 0);
  const weeklyMax = Math.max(1, ...insights.dailyBuckets.map((day) => day.attempts));
  const goalPercent = Math.min(100, Math.round(insights.completedToday / Math.max(1, insights.dailyGoal.questions) * 100));

  return <div className="silva-dashboard silva-workspace-home">
    <SmartPrefetcher hrefs={[resume.href, "/cronograma", "/praticar"]} />
    <header className="silva-dashboard-header">
      <div><p className="silva-eyebrow">SEU ESPAÇO DE APRENDIZADO</p><h1 className="silva-title">{greetingFor(now)}, {user.name.split(" ")[0]}.</h1><p className="silva-muted">Um novo passo na sua preparação para {target}.</p></div>
      <Link href="/cronograma" className="silva-button-secondary"><CalendarDays size={17} />Meu plano<ArrowRight size={15} /></Link>
    </header>

    <div className="silva-overview-grid">
      <section className="silva-journey">
        <div className="silva-journey-copy">
          <span className="silva-glass-label"><span />{resume.eyebrow}</span>
          <h2>{resume.title}</h2>
          <p>{resume.subtitle}</p>
          <Link href={resume.href} className="silva-button"><Play size={16} fill="currentColor" />{resume.ctaLabel}<ArrowRight size={17} /></Link>
          <div className="silva-journey-meta"><span><Clock3 size={14} />{resume.detailLabel}</span>{resumeCourseDetail && <span><CheckCircle2 size={14} />{Math.round(progress)}% concluído</span>}</div>
        </div>
        <div className="silva-route-card">
          <div className="silva-route-heading"><span><Sparkles size={17} />{todayPlanTasks.length ? "Sua rota de hoje" : "Seu próximo caminho"}</span><span className="silva-route-count">{planScopeTasks.length ? `${completedCount}/${planScopeTasks.length}` : "01"}</span></div>
          <ol>
            {planScopeTasks.length ? planScopeTasks.slice(0, 4).map((task, index) => <li key={task.id} data-done={Boolean(task.completedAt)}><span className="silva-route-marker">{task.completedAt ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><Link href={normalizeStudyHref(task.actionHref)}><strong>{task.title}</strong><small>{studyTaskTypeLabel(task.type)} · {task.durationMinutes} min</small></Link></li>) : [{ title: "Defina seu objetivo", detail: "Uma preparação com a sua cara", href: "/onboarding" }, { title: "Explore as disciplinas", detail: "Construa uma base sólida", href: "/estudar" }, { title: "Coloque em prática", detail: "Aprenda com cada resposta", href: "/questions" }].map((step, index) => <li key={step.href}><span className="silva-route-marker">0{index + 1}</span><Link href={step.href}><strong>{step.title}</strong><small>{step.detail}</small></Link></li>)}
          </ol>
          <Link href="/cronograma" className="silva-route-footer">Um passo de cada vez. Você consegue.<ArrowRight size={14} /></Link>
        </div>
      </section>

      <aside className="silva-card silva-exam-card">
        <div className="silva-card-kicker"><span className="silva-mini-icon"><GraduationCap size={19} /></span><span>SUA PRÓXIMA CONQUISTA</span></div>
        <h2>{target}</h2>
        <p>{daysUntilExam !== null && daysUntilExam >= 0 ? `Prova em ${examDate!.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" })}. Cada dia é uma oportunidade.` : "Um objetivo claro transforma pequenos passos em grandes conquistas."}</p>
        <div className="silva-exam-stats"><div><strong>{daysUntilExam !== null && daysUntilExam >= 0 ? daysUntilExam : "—"}</strong><span>dias até a prova</span></div><div><strong>{activePreparation ? formatMinutes(activePreparation.minutesPerDay) : "—"}</strong><span>por dia</span></div><div><strong>{activePreparation?.studyDays.length ?? "—"}</strong><span>dias / semana</span></div></div>
        <div className="silva-exam-target"><span><span className="silva-live-dot" />Preparação no seu ritmo</span><ArrowUpRight size={15} /></div>
        <Link href="/onboarding" className="silva-button-secondary">Ajustar minha preparação<ArrowRight size={15} /></Link>
      </aside>
    </div>

    <div className="silva-daily-grid">
      <section className="silva-card silva-focus-card">
        <div className="silva-section-heading"><h2><Flame size={20} />Seu foco de hoje</h2><span className="silva-chip">{weekdayLabel(now)}</span></div>
        <div className="silva-focus-summary"><div><span className="silva-small-label">QUESTÕES RESPONDIDAS</span><strong>{insights.completedToday}<small> / {insights.dailyGoal.questions}</small></strong><p>Passo a passo, a sua meta fica mais perto.</p></div><div className="silva-goal-ring" style={{ "--goal-progress": `${goalPercent}%` } as CSSProperties} role="img" aria-label={`${goalPercent}% da meta diária de questões`}><span><strong>{goalPercent}%</strong><small>da meta</small></span></div></div>
        <div className="silva-focus-advice"><Sparkles size={17} /><div><strong>{mainRecommendation.title}</strong><p>{mainRecommendation.reason}</p></div></div>
        <Link href={mainRecommendation.actionTarget} className="silva-focus-action">Começar meu foco<ArrowRight size={16} /></Link>
      </section>

      <section className="silva-card silva-today-card">
        <div className="silva-section-heading"><h2>{todayPlanTasks.length ? "Plano de hoje" : "Próximas atividades"}</h2><Link href="/cronograma" className="silva-link" aria-label="Ver plano completo"><ArrowUpRight size={20} /></Link></div>
        <p className="silva-muted text-xs mb-3">{planScopeTasks.length ? `${completedCount} de ${planScopeTasks.length} concluídas · ${formatMinutes(planMinutes)} de estudo` : "Seu tempo, organizado para você."}</p>
        {planScopeTasks.length ? planScopeTasks.slice(0, 3).map((task, index) => <Link key={task.id} href={normalizeStudyHref(task.actionHref)} className="silva-plan-row"><span className="silva-task-check" data-completed={Boolean(task.completedAt)}>{task.completedAt ? <Check size={13} /> : index + 1}</span><span className="min-w-0 flex-1"><strong className="block text-sm font-bold">{task.title}</strong><span className="mt-1 block text-xs silva-muted">{studyTaskTypeLabel(task.type)} · {task.durationMinutes} min</span></span><ChevronRight size={15} className="silva-muted" /></Link>) : <div className="silva-plan-empty"><SilvaIllustration name="compass" /><div><strong>Encontre sua direção</strong><p>Conte qual é sua prova e quanto tempo você tem para estudar.</p></div></div>}
        <Link href={planScopeTasks.length ? "/cronograma" : "/onboarding"} className="silva-subtle-action">{planScopeTasks.length ? "Abrir meu plano completo" : "Montar meu plano"}<ArrowRight size={14} /></Link>
      </section>

      <section className="silva-card silva-quick-card">
        <div className="silva-section-heading"><h2>Vamos praticar?</h2><Target size={20} className="silva-muted" /></div>
        <p className="silva-muted text-xs mb-4">O conhecimento cresce quando você pratica.</p>
        <div className="silva-quick-grid">{[{ href: "/questions", icon: "folder" as const, title: "Questões", label: "Treine o que aprendeu" }, { href: "/simulados", icon: "clock" as const, title: "Simulados", label: "Prepare-se para a prova" }, { href: "/redacao", icon: "pencil" as const, title: "Redação", label: "Dê voz às suas ideias" }, { href: "/flashcards", icon: "letter" as const, title: "Flashcards", label: "Revise e memorize" }].map((item) => <Link key={item.href} href={item.href} className="silva-quick-tile"><SilvaIllustration name={item.icon} /><strong>{item.title}</strong><span>{item.label}</span><ArrowUpRight size={13} /></Link>)}</div>
      </section>
    </div>

    <section className="silva-card silva-continue-section">
      <div className="silva-section-heading"><div><h2>Continue de onde parou</h2><p className="silva-muted text-xs mt-1">Seu próximo aprendizado está logo aqui.</p></div><Link href="/estudar" className="silva-link">Ver disciplinas<ArrowRight size={15} /></Link></div>
      <div className="silva-continue-grid">{continuingCourses.length ? continuingCourses.map((course) => <Link href={`/cursos/${course.slug}`} key={course.id} className="silva-continue-card"><span className="silva-continue-art"><SilvaIllustration name={subjectIllustration(course.category + " " + course.title)} /></span><div><span className="silva-small-label">{course.category}</span><h3>{course.title}</h3><p>{course.lessonCount} aulas · {Math.round(course.progressPercent)}% concluído</p><div className="silva-progress"><span style={{ width: Math.min(100, Math.max(0, course.progressPercent)) + "%" }} /></div></div><span className="silva-play-button"><Play size={14} fill="currentColor" /></span></Link>) : [{ href: "/cursos", icon: "book" as const, title: "Encontre sua próxima aula", label: "Cursos para a sua preparação" }, { href: "/estudar", icon: "calculator" as const, title: "Explore as disciplinas", label: "Aprenda no seu próprio ritmo" }, { href: "/biblioteca", icon: "folder" as const, title: "Vá além da aula", label: "Materiais para aprofundar" }].map((item) => <Link key={item.href} href={item.href} className="silva-continue-card"><span className="silva-continue-art"><SilvaIllustration name={item.icon} /></span><div><h3>{item.title}</h3><p>{item.label}</p><span className="silva-link">Explorar<ArrowRight size={13} /></span></div></Link>)}</div>
    </section>

    <div className="silva-insights-grid">
      <section className="silva-card"><div className="silva-section-heading"><h2>Seu desempenho</h2><span className="silva-mini-icon"><ChartNoAxesCombined size={18} /></span></div><p className="silva-muted text-xs">Acertos por disciplina · até 240 respostas recentes</p>
        {insights.subjectPerformance.length ? <div className="silva-subject-bars">{insights.subjectPerformance.slice(0, 4).map((subject) => <div key={subject.id}><div><strong>{subject.name}</strong><span>{subject.accuracy}%</span></div><div className="silva-progress"><span style={{ width: subject.accuracy + "%" }} /></div></div>)}</div> : <div className="silva-insight-empty"><SilvaIllustration name="calculator" /><p>Responda suas primeiras questões para descobrir seus pontos fortes.</p></div>}
        <Link href="/performance" className="silva-subtle-action">Acompanhar minha evolução<ArrowRight size={14} /></Link>
      </section>
      <section className="silva-card silva-review-card"><div className="silva-section-heading"><h2>Aprenda com os erros</h2><span className="silva-mini-icon"><BookOpen size={18} /></span></div><p className="silva-muted text-xs">Uma nova chance de entender e seguir em frente.</p>
        <div className="silva-review-total"><strong>{insights.pendingErrors}</strong><span>{insights.pendingErrors === 1 ? "questão para revisar" : "questões para revisar"}</span><SilvaIllustration name="book" /></div>
        {insights.urgentTopics.slice(0, 2).map((topic) => <Link href={ERROR_NOTEBOOK_HREF} className="silva-review-topic" key={topic.id}><span /><strong>{topic.name}</strong><ChevronRight size={14} /></Link>)}
        {!insights.pendingErrors && <p className="silva-muted text-xs leading-6">Quando uma resposta precisar de atenção, você poderá retomá-la aqui.</p>}
        <Link href={ERROR_NOTEBOOK_HREF} className="silva-subtle-action">Abrir caderno de erros<ArrowRight size={14} /></Link>
      </section>
      <section className="silva-card silva-rhythm-card"><div className="silva-section-heading"><h2>Seu ritmo na semana</h2><span className="silva-chip"><Flame size={13} />{user.streak} dias</span></div><p className="silva-muted text-xs"><strong className="text-[var(--text)]">{weeklyTotal} questões</strong> respondidas nos últimos 7 dias</p>
        <div className="silva-week-chart" role="img" aria-label={insights.dailyBuckets.map((day) => `${day.label}: ${day.attempts} questões`).join("; ")}>{insights.dailyBuckets.map((day, index) => <div className="silva-day-column" key={index} data-today={index === 6}><span>{day.attempts}</span><div><i style={{ height: `${day.attempts / weeklyMax * 100}%` }} /></div><strong>{day.label}</strong></div>)}</div>
        <div className="silva-chart-caption"><span className="silva-live-dot" />Cada sessão conta para a sua evolução.</div>
      </section>
    </div>
  </div>;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return minutes + " min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + "h" + String(rest).padStart(2, "0") : hours + "h";
}
