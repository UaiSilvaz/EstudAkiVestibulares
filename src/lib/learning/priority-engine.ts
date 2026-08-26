import type { MasteryNode, MasteryStatus } from "./mastery-engine";

export type LearningPriority = {
  key: string;
  level: "subject" | "topic";
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  subjectSlug: string | null;
  topicId: string | null;
  topicName: string | null;
  masteryScore: number;
  masteryStatus: MasteryStatus;
  masteryStatusLabel: string;
  priorityScore: number;
  pendingErrors: number;
  reviewedErrors: number;
  questionCount: number;
  answeredQuestions: number;
  lastTouchedAt: string | null;
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number) {
  return Math.round(clamp(value, 0, 100));
}

function daysBetween(a: Date, b: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / dayMs));
}

function urgencyScore(daysUntilExam?: number | null) {
  if (daysUntilExam == null) return 45;
  if (daysUntilExam <= 7) return 100;
  if (daysUntilExam <= 21) return 88;
  if (daysUntilExam <= 45) return 72;
  if (daysUntilExam <= 90) return 58;
  if (daysUntilExam <= 180) return 45;
  return 32;
}

function retentionScore(node: MasteryNode, now: Date) {
  if (!node.lastTouchedAt) return 76;

  const days = daysBetween(node.lastTouchedAt, now);
  if (days >= 45) return 94;
  if (days >= 21) return 78;
  if (days >= 7) return 58;
  if (days >= 3) return 36;
  return 18;
}

function importanceScore(node: MasteryNode) {
  const questionWeight = Math.min(38, node.questionCount * 2);
  const gapWeight = node.questionCount
    ? Math.max(0, 22 - Math.round((node.answeredQuestions / node.questionCount) * 22))
    : 12;
  return rounded(36 + questionWeight + gapWeight);
}

function statusLabel(status: MasteryStatus) {
  const labels: Record<MasteryStatus, string> = {
    mastered: "Dominado",
    progressing: "Em evolucao",
    attention: "Precisa de atencao",
    not_studied: "Nao estudado",
  };

  return labels[status];
}

function reasonsFor(node: MasteryNode, now: Date) {
  const reasons: string[] = [];

  if (node.pendingErrors > 0) {
    reasons.push(`${node.pendingErrors} erro(s) pendente(s) de revisao.`);
  }

  if (node.status === "not_studied") {
    reasons.push("Ainda nao ha contato suficiente com esse assunto.");
  } else if (node.masteryScore < 50) {
    reasons.push(`Dominio pedagogico estimado em ${node.masteryScore}%.`);
  }

  if (node.lastTouchedAt) {
    const days = daysBetween(node.lastTouchedAt, now);
    if (days >= 7) reasons.push(`Ultimo contato ha ${days} dia(s).`);
  }

  if (node.questionCount > 0 && node.coverage < 40) {
    reasons.push(`Cobertura baixa: ${node.answeredQuestions}/${node.questionCount} questoes vistas.`);
  }

  if (reasons.length === 0) {
    reasons.push("Bom ponto para manter ritmo e consolidar o que ja apareceu no plano.");
  }

  return reasons.slice(0, 3);
}

export function rankLearningPriorities(input: {
  mastery: MasteryNode[];
  daysUntilExam?: number | null;
  now?: Date;
  limit?: number;
}) {
  const now = input.now ?? new Date();
  const urgency = urgencyScore(input.daysUntilExam);

  return input.mastery
    .map((node): LearningPriority => {
      const weakness = node.status === "not_studied" ? 72 : 100 - node.masteryScore;
      const review = node.pendingErrors > 0 ? Math.min(100, 48 + node.pendingErrors * 12) : 0;
      const retention = retentionScore(node, now);
      const importance = importanceScore(node);
      const priorityScore = rounded(
        weakness * 0.35 +
          review * 0.24 +
          retention * 0.18 +
          importance * 0.13 +
          urgency * 0.1,
      );

      return {
        key: node.key,
        level: node.level,
        subjectId: node.subjectId,
        subjectName: node.subjectName,
        subjectColor: node.subjectColor,
        subjectSlug: node.subjectSlug,
        topicId: node.topicId,
        topicName: node.topicName,
        masteryScore: node.masteryScore,
        masteryStatus: node.status,
        masteryStatusLabel: statusLabel(node.status),
        priorityScore,
        pendingErrors: node.pendingErrors,
        reviewedErrors: node.reviewedErrors,
        questionCount: node.questionCount,
        answeredQuestions: node.answeredQuestions,
        lastTouchedAt: node.lastTouchedAt?.toISOString() ?? null,
        reasons: reasonsFor(node, now),
      };
    })
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      if (b.pendingErrors !== a.pendingErrors) return b.pendingErrors - a.pendingErrors;
      return a.subjectName.localeCompare(b.subjectName);
    })
    .slice(0, input.limit ?? 8);
}

export function questionPracticeHref(input: {
  subjectId?: string | null;
  topicId?: string | null;
  count?: number;
  mode?: "errors";
  scope?: "unanswered";
  vestibularSlug?: string;
}) {
  const params = new URLSearchParams({
    vestibular: input.vestibularSlug ?? "enem",
  });

  if (input.mode) params.set("mode", input.mode);
  if (input.scope) params.set("scope", input.scope);
  if (input.count) {
    params.set("session", "1");
    params.set("count", String(Math.max(1, Math.round(input.count))));
  }
  if (input.subjectId) params.set("subject", input.subjectId);
  if (input.topicId) params.set("topic", input.topicId);

  return `/questions?${params.toString()}`;
}
