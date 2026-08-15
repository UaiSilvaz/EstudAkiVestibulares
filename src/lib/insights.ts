type InsightAttempt = {
  correct: boolean;
  annulled?: boolean;
  errorType: string | null;
  reviewed: boolean;
  createdAt: Date;
  timeSpentSeconds?: number;
  question: {
    id: string;
    difficulty: string;
    subject: { id: string; name: string; color: string };
    topic: { id: string; name: string } | null;
  };
};

type InsightQuestion = {
  id: string;
  difficulty: string;
  subject: { id: string; name: string; color: string };
  topic: { id: string; name: string } | null;
  vestibular?: { slug: string } | null;
};

type StudyProfile = {
  name: string;
  weeklyHours: number;
  targetExam: string;
};

export function calculateAccuracyRate(attempts: Array<{ correct: boolean; annulled?: boolean }>) {
  const validAttempts = attempts.filter((attempt) => !attempt.annulled);
  if (validAttempts.length === 0) return 0;
  return (
    validAttempts.filter((attempt) => attempt.correct).length / validAttempts.length
  ) * 100;
}

const difficultyWeight: Record<string, number> = {
  EASY: 1,
  MEDIUM: 1.35,
  HARD: 1.8,
};

const DEFAULT_QUESTION_VESTIBULAR = "enem";
export const ERROR_NOTEBOOK_HREF = `/questions?vestibular=${DEFAULT_QUESTION_VESTIBULAR}&mode=errors`;

function focusedQuestionHref(input: {
  amount: number;
  subjectId?: string;
  topicId?: string;
}) {
  const params = new URLSearchParams({
    vestibular: DEFAULT_QUESTION_VESTIBULAR,
    session: "1",
    count: String(Math.max(1, input.amount)),
  });

  if (input.subjectId) params.set("subject", input.subjectId);
  if (input.topicId) params.set("topic", input.topicId);

  return `/questions?${params.toString()}`;
}

export function calculateWeightedAccuracyRate(attempts: InsightAttempt[]) {
  const validAttempts = attempts.filter((attempt) => !attempt.annulled);
  if (validAttempts.length === 0) return 0;
  const totals = validAttempts.reduce(
    (acc, attempt) => {
      const weight = difficultyWeight[attempt.question.difficulty] ?? 1.2;
      acc.total += weight;
      acc.correct += attempt.correct ? weight : 0;
      return acc;
    },
    { total: 0, correct: 0 },
  );
  return totals.total ? (totals.correct / totals.total) * 100 : 0;
}

export function calculateConsistencyScore(studyDaysInLast7Days: number) {
  return Math.min(100, (studyDaysInLast7Days / 7) * 100);
}

export function calculateReviewCompletionRate(reviewedErrors: number, pendingErrors: number) {
  const total = reviewedErrors + pendingErrors;
  if (total === 0) return 100;
  return (reviewedErrors / total) * 100;
}

export function calculateDailyGoalCompletionRate(completedToday: number, goalToday: number) {
  if (goalToday <= 0) return 100;
  return Math.min(100, (completedToday / goalToday) * 100);
}

export function calculateStudyHealthScore(input: {
  accuracyRate: number;
  weightedAccuracyRate?: number;
  consistencyScore: number;
  reviewCompletionRate: number;
  dailyGoalCompletionRate: number;
}) {
  const score =
    (input.weightedAccuracyRate ?? input.accuracyRate) * 0.40 +
    input.consistencyScore * 0.25 +
    input.reviewCompletionRate * 0.25 +
    input.dailyGoalCompletionRate * 0.10;

  const rounded = Math.round(score);

  if (rounded < 40) return { score: rounded, label: "risco alto" };
  if (rounded < 60) return { score: rounded, label: "precisa ajustar" };
  if (rounded < 75) return { score: rounded, label: "bom caminho" };
  if (rounded < 90) return { score: rounded, label: "ritmo forte" };
  return { score: rounded, label: "alto desempenho" };
}

function buildDailyBuckets(attempts: InsightAttempt[], dailyGoal: number) {
  const now = new Date();
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const dayMs = 24 * 60 * 60 * 1000;

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    date.setTime(date.getTime() - (6 - index) * dayMs);
    const nextDate = new Date(date.getTime() + dayMs);
    const inDay = attempts.filter((attempt) => {
      const t = new Date(attempt.createdAt).getTime();
      return t >= date.getTime() && t < nextDate.getTime();
    });
    const correct = inDay.filter((attempt) => attempt.correct).length;
    const accuracy = inDay.length ? Math.round((correct / inDay.length) * 100) : 0;
    const completion = Math.min(100, Math.round((inDay.length / Math.max(1, dailyGoal)) * 100));
    return {
      label: labels[date.getDay()],
      attempts: inDay.length,
      correct,
      accuracy,
      completion,
    };
  });
}

function calculateTrendScore(buckets: Array<{ accuracy: number; attempts: number }>) {
  const active = buckets.filter((bucket) => bucket.attempts > 0);
  if (active.length < 2) return 0;
  const midpoint = Math.ceil(active.length / 2);
  const first = active.slice(0, midpoint);
  const second = active.slice(midpoint);
  const avg = (items: typeof active) =>
    items.reduce((sum, item) => sum + item.accuracy, 0) / Math.max(1, items.length);
  return Math.round(avg(second) - avg(first));
}

export function calculateDailyGoal(weeklyHours: number, daysUntilExam = 120) {
  let questions = 5;
  let reviews = 2;

  if (weeklyHours > 20) {
    questions = 30;
    reviews = 15;
  } else if (weeklyHours > 10) {
    questions = 20;
    reviews = 10;
  } else if (weeklyHours > 5) {
    questions = 10;
    reviews = 5;
  }

  const multiplier = daysUntilExam < 15 ? 2 : daysUntilExam < 30 ? 1.5 : 1;

  return {
    questions: Math.ceil(questions * multiplier),
    reviews: Math.ceil(reviews * multiplier),
  };
}

function groupPerformance(attempts: InsightAttempt[], key: "subject" | "topic") {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      color: string;
      subjectId: string;
      total: number;
      correct: number;
      easyErrors: number;
    }
  >();

  attempts.forEach((attempt) => {
    const source = key === "subject" ? attempt.question.subject : attempt.question.topic;
    if (!source) return;

    const existing = map.get(source.id) ?? {
      id: source.id,
      name: source.name,
      color: key === "subject" ? attempt.question.subject.color : attempt.question.subject.color,
      subjectId: attempt.question.subject.id,
      total: 0,
      correct: 0,
      easyErrors: 0,
    };

    existing.total += 1;
    existing.correct += attempt.correct ? 1 : 0;
    existing.easyErrors += !attempt.correct && attempt.question.difficulty === "EASY" ? 1 : 0;
    map.set(source.id, existing);
  });

  return Array.from(map.values()).map((item) => ({
    ...item,
    accuracy: item.total ? (item.correct / item.total) * 100 : 0,
    errorRate: item.total ? ((item.total - item.correct) / item.total) * 100 : 0,
  }));
}

function mainErrorType(attempts: InsightAttempt[]) {
  const errors = attempts.filter((attempt) => !attempt.correct && attempt.errorType);
  const counts = new Map<string, number>();

  errors.forEach((attempt) => {
    counts.set(attempt.errorType!, (counts.get(attempt.errorType!) ?? 0) + 1);
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "sem padrao";
}

export function generateAutomaticQuestionList(
  questions: InsightQuestion[],
  attempts: InsightAttempt[],
  amount: number,
) {
  const validAttempts = attempts.filter((attempt) => !attempt.annulled);
  const wrongQuestionIds = new Set(
    validAttempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.question.id),
  );
  const solvedCorrectly = new Set(
    validAttempts.filter((attempt) => attempt.correct).map((attempt) => attempt.question.id),
  );
  const weakTopicIds = new Set(
    groupPerformance(validAttempts, "topic")
      .filter((topic) => topic.errorRate >= 50)
      .map((topic) => topic.id),
  );

  const weak = questions.filter((question) => question.topic && weakTopicIds.has(question.topic.id));
  const review = questions.filter((question) => wrongQuestionIds.has(question.id));
  const maintenance = questions.filter((question) => !solvedCorrectly.has(question.id));

  const ordered = [...weak, ...review, ...maintenance, ...questions];
  const seen = new Set<string>();

  return ordered.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  }).slice(0, amount);
}

export function buildDashboardInsights(input: {
  profile: StudyProfile;
  attempts: InsightAttempt[];
  questions: InsightQuestion[];
}) {
  const { profile, questions } = input;
  const attempts = input.attempts.filter((attempt) => !attempt.annulled);
  const accuracyRate = calculateAccuracyRate(attempts);
  const weightedAccuracyRate = calculateWeightedAccuracyRate(attempts);
  const errors = attempts.filter((attempt) => !attempt.correct);
  const reviewedErrors = errors.filter((attempt) => attempt.reviewed).length;
  const pendingErrors = errors.length - reviewedErrors;
  const dailyGoal = calculateDailyGoal(profile.weeklyHours);
  const today = new Date().toDateString();
  const completedToday = attempts.filter((attempt) => attempt.createdAt.toDateString() === today).length;
  const correctToday = attempts.filter((attempt) => attempt.createdAt.toDateString() === today && attempt.correct).length;
  const studyDays = new Set(attempts.map((attempt) => attempt.createdAt.toDateString())).size;
  const dailyBuckets = buildDailyBuckets(attempts, dailyGoal.questions);
  const subjectPerformance = groupPerformance(attempts, "subject");
  const topicPerformance = groupPerformance(attempts, "topic");
  const weakestTopic = [...topicPerformance].sort((a, b) => b.errorRate - a.errorRate)[0];
  const weakestSubject = [...subjectPerformance].sort((a, b) => b.errorRate - a.errorRate)[0];
  const strongestSubjects = [...subjectPerformance].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
  const averageTimeSeconds = Math.round(
    attempts.reduce((sum, attempt) => sum + (attempt.timeSpentSeconds ?? 0), 0) / Math.max(1, attempts.length),
  );
  const trendScore = calculateTrendScore(dailyBuckets);
  const reviewCompletionRate = calculateReviewCompletionRate(reviewedErrors, pendingErrors);
  const dailyGoalCompletionRate = calculateDailyGoalCompletionRate(completedToday, dailyGoal.questions);
  const consistencyScore = calculateConsistencyScore(Math.min(7, studyDays || 1));

  const studyHealthScore = calculateStudyHealthScore({
    accuracyRate,
    weightedAccuracyRate,
    consistencyScore,
    reviewCompletionRate,
    dailyGoalCompletionRate,
  });

  const fallbackQuestion = questions[0] ?? null;
  const targetName =
    weakestTopic?.name ??
    weakestSubject?.name ??
    fallbackQuestion?.topic?.name ??
    fallbackQuestion?.subject.name ??
    "questões diagnósticas";
  const targetSubject =
    weakestSubject?.name ??
    fallbackQuestion?.subject.name ??
    profile.targetExam ??
    "ENEM";
  const targetSubjectId = weakestTopic?.subjectId ?? weakestSubject?.id ?? fallbackQuestion?.subject.id;
  const targetTopicId = weakestTopic?.id ?? fallbackQuestion?.topic?.id;
  const errorType = mainErrorType(attempts);
  const automaticList = generateAutomaticQuestionList(questions, attempts, dailyGoal.questions);
  const questionActionTarget = focusedQuestionHref({
    amount: automaticList.length || dailyGoal.questions,
    subjectId: targetSubjectId,
    topicId: targetTopicId,
  });

  const recommendations = [
    {
      type: "focus_topic",
      priority: "alta",
      title: `Estude ${targetName} hoje`,
      reason: weakestTopic
        ? `Você tem ${Math.round(weakestTopic.errorRate)}% de erro nesse assunto.`
        : "Ainda faltam dados suficientes, então comece por uma lista diagnóstica.",
      actionLabel: `Resolver ${automaticList.length || dailyGoal.questions} questões`,
      actionTarget: questionActionTarget,
    },
    {
      type: "review_errors",
      priority: pendingErrors > 0 ? "alta" : "media",
      title: "Revisar caderno de erros",
      reason:
        pendingErrors > 0
          ? `${pendingErrors} erro(s) ainda não foram revisados.`
          : "Seu caderno está em dia. Mantenha o ritmo.",
      actionLabel: "Abrir questões erradas",
      actionTarget: ERROR_NOTEBOOK_HREF,
    },
    {
      type: "review_materials",
      priority: "media",
      title: `Revisar material de ${targetSubject}`,
      reason: "Um PDF bem marcado ajuda a fixar o conceito depois da questão.",
      actionLabel: "Abrir biblioteca",
      actionTarget: "/biblioteca",
    },
  ];

  return {
    accuracyRate,
    weightedAccuracyRate,
    errorRate: 100 - accuracyRate,
    studyHealthScore,
    weakestSubjects: weakestSubject ? [weakestSubject] : [],
    subjectPerformance,
    topicPerformance,
    strongestSubjects,
    urgentTopics: [...topicPerformance]
      .map((topic) => ({
        ...topic,
        priorityScore: Math.round(topic.errorRate * 0.55 + topic.easyErrors * 12 + Math.max(0, 5 - topic.total) * 3),
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 4),
    mainErrorType: errorType,
    dailyGoal,
    pendingErrors,
    reviewedErrors,
    reviewCompletionRate,
    dailyGoalCompletionRate,
    consistencyScore,
    completedToday,
    correctToday,
    averageTimeSeconds,
    trendScore,
    dailyBuckets,
    readinessLabel:
      studyHealthScore.score >= 80
        ? "pronto para subir nível"
        : studyHealthScore.score >= 60
          ? "em evolução"
          : "precisa de revisão guiada",
    recommendations,
    automaticList,
    message:
      `${profile.name}, seu foco hoje é ${targetSubject}. ` +
      (weakestTopic
        ? `O assunto que mais trava sua evolução agora é ${weakestTopic.name}.`
        : "Comece por uma lista diagnóstica para o EstudAki entender seus pontos fracos."),
  };
}
