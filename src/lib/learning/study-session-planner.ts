import { questionPracticeHref, type LearningPriority } from "./priority-engine";

export type StudyNowBlockType = "REVIEW" | "THEORY" | "QUESTIONS" | "FLASHCARDS";

export type StudyNowBlock = {
  type: StudyNowBlockType;
  title: string;
  description: string;
  durationMinutes: number;
  href: string;
  xpEstimate: number;
};

export type StudyNowSession = {
  availableMinutes: number;
  totalMinutes: number;
  summary: string;
  confidenceLabel: string;
  startHref: string;
  priority: LearningPriority | null;
  rationale: string[];
  blocks: StudyNowBlock[];
  generatedAt: string;
};

const ALLOWED_MINUTES = [15, 30, 60, 120] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nearestAllowedMinutes(value: number) {
  return ALLOWED_MINUTES.reduce((closest, option) =>
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest,
  );
}

function defaultMinutesFromWeeklyHours(weeklyHours?: number | null) {
  const weeklyMinutes = Math.max(0, weeklyHours ?? 0) * 60;
  if (weeklyMinutes >= 900) return 120;
  if (weeklyMinutes >= 360) return 60;
  if (weeklyMinutes >= 150) return 30;
  return 15;
}

export function normalizeAvailableMinutes(
  value?: number | "default" | null,
  weeklyHours?: number | null,
) {
  if (value === "default" || value == null) return defaultMinutesFromWeeklyHours(weeklyHours);
  return nearestAllowedMinutes(clamp(Math.round(value), 15, 120));
}

function lessonHref(priority: LearningPriority | null) {
  return priority?.subjectSlug ? `/trilhas/${priority.subjectSlug}` : "/trilhas";
}

function flashcardHref(priority: LearningPriority | null) {
  if (!priority?.subjectId) return "/flashcards";
  const params = new URLSearchParams({ subject: priority.subjectId });
  return `/flashcards?${params.toString()}`;
}

function topicLabel(priority: LearningPriority | null) {
  if (!priority) return "diagnostico inicial";
  return priority.topicName ?? priority.subjectName;
}

function questionCount(durationMinutes: number) {
  return clamp(Math.round(durationMinutes / 2), 3, 40);
}

function fitDurations(input: {
  availableMinutes: number;
  hasReview: boolean;
  needsTheory: boolean;
}) {
  const review = input.hasReview
    ? input.availableMinutes >= 60
      ? 12
      : input.availableMinutes >= 30
        ? 7
        : 5
    : 0;
  const theory = input.needsTheory && input.availableMinutes >= 30
    ? input.availableMinutes >= 60
      ? 12
      : 8
    : 0;
  const flashcards = input.availableMinutes >= 30 ? (input.availableMinutes >= 60 ? 8 : 5) : 0;
  const questions = Math.max(5, input.availableMinutes - review - theory - flashcards);

  return { review, theory, flashcards, questions };
}

export function buildStudyNowSession(input: {
  availableMinutes: number;
  priorities: LearningPriority[];
  weeklyHours?: number | null;
  now?: Date;
  vestibularSlug?: string;
}) {
  const availableMinutes = normalizeAvailableMinutes(input.availableMinutes, input.weeklyHours);
  const priority = input.priorities[0] ?? null;
  const label = topicLabel(priority);
  const hasReview = Boolean(priority && priority.pendingErrors > 0);
  const needsTheory = !priority || priority.masteryStatus === "not_studied" || priority.masteryScore < 55;
  const durations = fitDurations({ availableMinutes, hasReview, needsTheory });
  const blocks: StudyNowBlock[] = [];
  const vestibularSlug = input.vestibularSlug ?? "enem";

  if (durations.review > 0) {
    blocks.push({
      type: "REVIEW",
      title: `Revisar erros de ${label}`,
      description: "Comece limpando pendencias que ainda atrapalham esse assunto.",
      durationMinutes: durations.review,
      href: questionPracticeHref({
        mode: "errors",
        subjectId: priority?.subjectId,
        topicId: priority?.topicId,
        vestibularSlug,
      }),
      xpEstimate: Math.min(30, (priority?.pendingErrors ?? 1) * 3),
    });
  }

  if (durations.theory > 0) {
    blocks.push({
      type: "THEORY",
      title: `Aquecimento em ${label}`,
      description: "Revise a base antes de praticar para evitar tentativa no escuro.",
      durationMinutes: durations.theory,
      href: lessonHref(priority),
      xpEstimate: 0,
    });
  }

  blocks.push({
    type: "QUESTIONS",
    title: `Praticar ${label}`,
    description: "Resolva uma lista focada e deixe o sistema recalcular seu dominio depois.",
    durationMinutes: durations.questions,
    href: questionPracticeHref({
      subjectId: priority?.subjectId,
      topicId: priority?.topicId,
      count: questionCount(durations.questions),
      scope: priority?.masteryStatus === "not_studied" ? "unanswered" : undefined,
      vestibularSlug,
    }),
    xpEstimate: questionCount(durations.questions) * 12,
  });

  if (durations.flashcards > 0) {
    blocks.push({
      type: "FLASHCARDS",
      title: `Fixar ${priority?.subjectName ?? "pontos-chave"}`,
      description: "Feche a sessao com revisao ativa para segurar melhor o conteudo.",
      durationMinutes: durations.flashcards,
      href: flashcardHref(priority),
      xpEstimate: 0,
    });
  }

  const totalMinutes = blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  const score = priority?.priorityScore ?? 0;
  const confidenceLabel = score >= 72 ? "alta prioridade" : score >= 52 ? "boa prioridade" : "ponto de partida";
  const fallbackRationale = [
    "Ainda faltam dados suficientes, entao a sessao comeca com pratica diagnostica.",
    "Depois das primeiras respostas, o plano passa a priorizar pontos fracos com mais seguranca.",
  ];

  return {
    availableMinutes,
    totalMinutes,
    summary: priority
      ? `Prioridade agora: ${label}.`
      : "Prioridade agora: iniciar uma lista diagnostica.",
    confidenceLabel,
    startHref: blocks[0]?.href ?? "/questions?vestibular=enem",
    priority,
    rationale: priority?.reasons.length ? priority.reasons : fallbackRationale,
    blocks,
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
}
