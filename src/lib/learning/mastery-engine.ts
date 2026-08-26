export type MasteryStatus = "mastered" | "progressing" | "attention" | "not_studied";

export type LearningSubjectSignal = {
  id: string;
  name: string;
  color?: string | null;
  slug?: string | null;
};

export type LearningTopicSignal = {
  id: string;
  name: string;
} | null;

export type LearningQuestionSignal = {
  id: string;
  difficulty?: string | null;
  subject: LearningSubjectSignal;
  topic?: LearningTopicSignal;
};

export type LearningAttemptSignal = {
  questionId: string;
  correct: boolean;
  annulled?: boolean | null;
  reviewed?: boolean | null;
  timeSpentSeconds?: number | null;
  createdAt: Date;
  difficulty?: string | null;
  subject: LearningSubjectSignal;
  topic?: LearningTopicSignal;
};

export type MasteryNode = {
  key: string;
  level: "subject" | "topic";
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  subjectSlug: string | null;
  topicId: string | null;
  topicName: string | null;
  questionCount: number;
  answeredQuestions: number;
  totalAttempts: number;
  correctAttempts: number;
  pendingErrors: number;
  reviewedErrors: number;
  averageTimeSeconds: number;
  accuracy: number;
  weightedAccuracy: number;
  coverage: number;
  recencyScore: number;
  consistencyScore: number;
  evidenceScore: number;
  masteryScore: number;
  status: MasteryStatus;
  lastTouchedAt: Date | null;
};

type InternalMasteryNode = {
  key: string;
  level: "subject" | "topic";
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  subjectSlug: string | null;
  topicId: string | null;
  topicName: string | null;
  questionIds: Set<string>;
  answeredIds: Set<string>;
  activeDays: Set<string>;
  totalAttempts: number;
  correctAttempts: number;
  pendingErrors: number;
  reviewedErrors: number;
  totalTimeSeconds: number;
  weightedTotal: number;
  weightedCorrect: number;
  lastTouchedAt: Date | null;
};

const DIFFICULTY_WEIGHT: Record<string, number> = {
  EASY: 1,
  MEDIUM: 1.35,
  HARD: 1.8,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number) {
  return Math.round(clamp(value, 0, 100));
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / dayMs));
}

function recencyScore(lastTouchedAt: Date | null, now: Date) {
  if (!lastTouchedAt) return 0;

  const days = daysBetween(lastTouchedAt, now);
  if (days <= 3) return 100;
  if (days <= 10) return 86;
  if (days <= 21) return 70;
  if (days <= 45) return 52;
  if (days <= 90) return 36;
  return 24;
}

function masteryStatus(score: number, totalAttempts: number): MasteryStatus {
  if (totalAttempts === 0) return "not_studied";
  if (score >= 78) return "mastered";
  if (score >= 55) return "progressing";
  return "attention";
}

function signalKey(input: {
  subject: LearningSubjectSignal;
  topic?: LearningTopicSignal;
}) {
  return input.topic?.id ? `topic:${input.topic.id}` : `subject:${input.subject.id}`;
}

function createInternalNode(input: {
  subject: LearningSubjectSignal;
  topic?: LearningTopicSignal;
}): InternalMasteryNode {
  return {
    key: signalKey(input),
    level: input.topic?.id ? "topic" : "subject",
    subjectId: input.subject.id,
    subjectName: input.subject.name,
    subjectColor: input.subject.color ?? "#2563EB",
    subjectSlug: input.subject.slug ?? null,
    topicId: input.topic?.id ?? null,
    topicName: input.topic?.name ?? null,
    questionIds: new Set<string>(),
    answeredIds: new Set<string>(),
    activeDays: new Set<string>(),
    totalAttempts: 0,
    correctAttempts: 0,
    pendingErrors: 0,
    reviewedErrors: 0,
    totalTimeSeconds: 0,
    weightedTotal: 0,
    weightedCorrect: 0,
    lastTouchedAt: null,
  };
}

function getOrCreateNode(
  nodes: Map<string, InternalMasteryNode>,
  input: {
    subject: LearningSubjectSignal;
    topic?: LearningTopicSignal;
  },
) {
  const key = signalKey(input);
  const existing = nodes.get(key);
  if (existing) return existing;

  const node = createInternalNode(input);
  nodes.set(key, node);
  return node;
}

export function buildMasteryMap(input: {
  attempts: LearningAttemptSignal[];
  questions: LearningQuestionSignal[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const nodes = new Map<string, InternalMasteryNode>();

  for (const question of input.questions) {
    const node = getOrCreateNode(nodes, question);
    node.questionIds.add(question.id);
  }

  for (const attempt of input.attempts) {
    if (attempt.annulled) continue;

    const node = getOrCreateNode(nodes, attempt);
    const weight = DIFFICULTY_WEIGHT[attempt.difficulty ?? "MEDIUM"] ?? 1.2;

    node.questionIds.add(attempt.questionId);
    node.answeredIds.add(attempt.questionId);
    node.activeDays.add(dayKey(attempt.createdAt));
    node.totalAttempts += 1;
    node.correctAttempts += attempt.correct ? 1 : 0;
    node.totalTimeSeconds += Math.max(0, attempt.timeSpentSeconds ?? 0);
    node.weightedTotal += weight;
    node.weightedCorrect += attempt.correct ? weight : 0;

    if (!attempt.correct) {
      if (attempt.reviewed) node.reviewedErrors += 1;
      else node.pendingErrors += 1;
    }

    if (!node.lastTouchedAt || attempt.createdAt > node.lastTouchedAt) {
      node.lastTouchedAt = attempt.createdAt;
    }
  }

  return Array.from(nodes.values())
    .map((node): MasteryNode => {
      const questionCount = node.questionIds.size;
      const answeredQuestions = node.answeredIds.size;
      const totalErrors = node.pendingErrors + node.reviewedErrors;
      const accuracy = node.totalAttempts ? (node.correctAttempts / node.totalAttempts) * 100 : 0;
      const weightedAccuracy = node.weightedTotal
        ? (node.weightedCorrect / node.weightedTotal) * 100
        : 0;
      const coverage = questionCount ? (answeredQuestions / questionCount) * 100 : 0;
      const reviewScore = totalErrors ? (node.reviewedErrors / totalErrors) * 100 : 100;
      const recency = recencyScore(node.lastTouchedAt, now);
      const consistency = Math.min(100, node.activeDays.size * 25);
      const attemptEvidence = Math.min(1, node.totalAttempts / 10);
      const coverageEvidence = Math.min(1, coverage / 70);
      const evidenceScore = (attemptEvidence * 0.7 + coverageEvidence * 0.3) * 100;

      const rawScore =
        weightedAccuracy * 0.42 +
        coverage * 0.14 +
        reviewScore * 0.15 +
        recency * 0.14 +
        consistency * 0.15;
      const confidenceBlend = 0.55 + Math.min(1, evidenceScore / 100) * 0.45;
      const masteryScore = node.totalAttempts ? rounded(rawScore * confidenceBlend) : 0;

      return {
        key: node.key,
        level: node.level,
        subjectId: node.subjectId,
        subjectName: node.subjectName,
        subjectColor: node.subjectColor,
        subjectSlug: node.subjectSlug,
        topicId: node.topicId,
        topicName: node.topicName,
        questionCount,
        answeredQuestions,
        totalAttempts: node.totalAttempts,
        correctAttempts: node.correctAttempts,
        pendingErrors: node.pendingErrors,
        reviewedErrors: node.reviewedErrors,
        averageTimeSeconds: node.totalAttempts
          ? Math.round(node.totalTimeSeconds / node.totalAttempts)
          : 0,
        accuracy: rounded(accuracy),
        weightedAccuracy: rounded(weightedAccuracy),
        coverage: rounded(coverage),
        recencyScore: rounded(recency),
        consistencyScore: rounded(consistency),
        evidenceScore: rounded(evidenceScore),
        masteryScore,
        status: masteryStatus(masteryScore, node.totalAttempts),
        lastTouchedAt: node.lastTouchedAt,
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName) || (a.topicName ?? "").localeCompare(b.topicName ?? ""));
}
