import { db } from "./db";

type PlanSettings = {
  availableDays?: number[];
  minutesPerDay?: number;
  examDate?: Date | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizedDays(days: number[] | undefined) {
  const result = Array.from(
    new Set((days ?? [1, 2, 3, 4, 5]).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
  ).sort();
  return result.length ? result : [1, 2, 3, 4, 5];
}

export async function regenerateStudyPlan(userId: string, settings: PlanSettings = {}) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const existingPreference = await db.studyPlanPreference.findUnique({ where: { userId } });
  const availableDays = normalizedDays(
    settings.availableDays ??
      (existingPreference ? JSON.parse(existingPreference.availableDays) as number[] : undefined),
  );
  const defaultMinutes = Math.round(((user.weeklyHours || 8) * 60) / availableDays.length);
  const minutesPerDay = clamp(
    settings.minutesPerDay ?? existingPreference?.minutesPerDay ?? defaultMinutes,
    30,
    300,
  );
  const preference = await db.studyPlanPreference.upsert({
    where: { userId },
    update: {
      availableDays: JSON.stringify(availableDays),
      minutesPerDay,
      examDate: settings.examDate === undefined ? existingPreference?.examDate : settings.examDate,
    },
    create: {
      userId,
      availableDays: JSON.stringify(availableDays),
      minutesPerDay,
      examDate: settings.examDate ?? null,
    },
  });

  const [attempts, questions] = await Promise.all([
    db.questionAttempt.findMany({
      where: { userId, annulled: false },
      orderBy: { createdAt: "desc" },
      include: {
        question: {
          select: {
            id: true,
            subjectId: true,
            topicId: true,
            subject: { select: { name: true } },
            topic: { select: { name: true } },
          },
        },
      },
    }),
    db.question.findMany({
      where: { status: "PUBLISHED", answerSituation: { not: "ANNULLED" } },
      select: {
        id: true,
        subjectId: true,
        topicId: true,
        subject: { select: { name: true } },
        topic: { select: { name: true } },
      },
    }),
  ]);

  const answeredIds = new Set(attempts.map((attempt) => attempt.questionId));
  const pendingErrors = attempts.filter((attempt) => !attempt.correct && !attempt.reviewed);
  const topicStats = new Map<
    string,
    { id: string; name: string; subjectId: string; total: number; errors: number }
  >();
  for (const attempt of attempts) {
    if (!attempt.question.topicId || !attempt.question.topic) continue;
    const current = topicStats.get(attempt.question.topicId) ?? {
      id: attempt.question.topicId,
      name: attempt.question.topic.name,
      subjectId: attempt.question.subjectId,
      total: 0,
      errors: 0,
    };
    current.total += 1;
    current.errors += attempt.correct ? 0 : 1;
    topicStats.set(current.id, current);
  }
  const weakTopics = Array.from(topicStats.values())
    .map((topic) => ({ ...topic, errorRate: topic.errors / Math.max(1, topic.total) }))
    .filter((topic) => topic.errors > 0)
    .sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors);

  const subjectCoverage = new Map<
    string,
    { id: string; name: string; total: number; answered: number }
  >();
  for (const question of questions) {
    const current = subjectCoverage.get(question.subjectId) ?? {
      id: question.subjectId,
      name: question.subject.name,
      total: 0,
      answered: 0,
    };
    current.total += 1;
    current.answered += answeredIds.has(question.id) ? 1 : 0;
    subjectCoverage.set(current.id, current);
  }
  const coverageGaps = Array.from(subjectCoverage.values()).sort(
    (a, b) => a.answered / Math.max(1, a.total) - b.answered / Math.max(1, b.total),
  );

  const today = new Date();
  today.setHours(8, 0, 0, 0);
  const studyDates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  })
    .filter((date) => availableDays.includes(date.getDay()))
    .slice(0, availableDays.length);
  const blocksPerDay = clamp(Math.floor(minutesPerDay / 30), 1, 4);
  const blockDuration = Math.max(25, Math.floor(minutesPerDay / blocksPerDay));
  const tasks: Array<{
    userId: string;
    scheduledFor: Date;
    type: string;
    title: string;
    description: string;
    durationMinutes: number;
    subjectId?: string;
    topicId?: string;
    actionHref: string;
  }> = [];

  let weakIndex = 0;
  let gapIndex = 0;
  for (const date of studyDates) {
    for (let block = 0; block < blocksPerDay; block += 1) {
      const scheduledFor = new Date(date);
      scheduledFor.setHours(8 + block, 0, 0, 0);

      if (pendingErrors.length && block === 0) {
        const errorSubjects = new Set(pendingErrors.map((attempt) => attempt.question.subject.name));
        tasks.push({
          userId,
          scheduledFor,
          type: "REVIEW",
          title: "Revisar o Caderno de Erros",
          description: `${pendingErrors.length} questão(ões) pendente(s) em ${Array.from(errorSubjects).slice(0, 2).join(" e ")}.`,
          durationMinutes: blockDuration,
          actionHref: "/questions?vestibular=enem&mode=errors",
        });
        continue;
      }

      const weak = weakTopics[weakIndex % Math.max(1, weakTopics.length)];
      if (weak && block % 2 === 0) {
        weakIndex += 1;
        tasks.push({
          userId,
          scheduledFor,
          type: "QUESTIONS",
          title: `Praticar ${weak.name}`,
          description: `${Math.round(weak.errorRate * 100)}% de erro no histórico recente. Faça uma lista focada.`,
          durationMinutes: blockDuration,
          subjectId: weak.subjectId,
          topicId: weak.id,
          actionHref: `/questions?vestibular=enem&subject=${encodeURIComponent(weak.subjectId)}&topic=${encodeURIComponent(weak.id)}&session=1&count=10`,
        });
        continue;
      }

      const gap = coverageGaps[gapIndex % Math.max(1, coverageGaps.length)];
      if (gap) {
        gapIndex += 1;
        const coverage = Math.round((gap.answered / Math.max(1, gap.total)) * 100);
        tasks.push({
          userId,
          scheduledFor,
          type: block % 2 === 0 ? "THEORY" : "FLASHCARDS",
          title: block % 2 === 0 ? `Avançar em ${gap.name}` : `Flashcards de ${gap.name}`,
          description:
            block % 2 === 0
              ? `Você percorreu ${coverage}% das questões disponíveis desta matéria.`
              : "Faça uma revisão ativa antes do próximo bloco de questões.",
          durationMinutes: blockDuration,
          subjectId: gap.id,
          actionHref:
            block % 2 === 0
              ? `/questions?vestibular=enem&subject=${encodeURIComponent(gap.id)}&session=1&scope=unanswered&count=10`
              : `/flashcards?subject=${encodeURIComponent(gap.id)}`,
        });
      }
    }
  }

  await db.$transaction([
    db.studyPlanTask.deleteMany({
      where: { userId, completedAt: null, scheduledFor: { gte: today } },
    }),
    ...(tasks.length ? [db.studyPlanTask.createMany({ data: tasks })] : []),
  ]);

  const savedTasks = await db.studyPlanTask.findMany({
    where: { userId, scheduledFor: { gte: today } },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
  });
  return {
    preference,
    tasks: savedTasks,
    diagnostics: {
      pendingErrors: pendingErrors.length,
      weakTopics: weakTopics.slice(0, 4),
      coverageGaps: coverageGaps.slice(0, 4),
      weeklyMinutes: minutesPerDay * availableDays.length,
    },
  };
}

export async function getOrCreateStudyPlan(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [preference, tasks] = await Promise.all([
    db.studyPlanPreference.findUnique({ where: { userId } }),
    db.studyPlanTask.findMany({
      where: { userId, scheduledFor: { gte: today } },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  if (!preference || tasks.length === 0) return regenerateStudyPlan(userId);

  const pendingErrors = await db.questionAttempt.count({
    where: { userId, correct: false, annulled: false, reviewed: false },
  });
  return {
    preference,
    tasks,
    diagnostics: {
      pendingErrors,
      weakTopics: [],
      coverageGaps: [],
      weeklyMinutes:
        preference.minutesPerDay *
        normalizedDays(JSON.parse(preference.availableDays) as number[]).length,
    },
  };
}
