import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { accessibleCourseWhere } from "./freemium";
import { availableQuestionWhere } from "./freemium-access";

type PlanSettings = {
  availableDays?: number[];
  minutesPerDay?: number;
  examDate?: Date | null;
  userPreparationId?: string | null;
};

export const studyPlanTaskSelect = {
  id: true,
  userId: true,
  scheduledFor: true,
  type: true,
  title: true,
  description: true,
  durationMinutes: true,
  subjectId: true,
  topicId: true,
  actionHref: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudyPlanTaskSelect;

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
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { weeklyHours: true, role: true },
  });
  const existingPreference = await db.studyPlanPreference.findUnique({ where: { userId } });
  const learningProfile = await db.studentLearningProfile.findUnique({ where: { userId } });
  const availableDays = normalizedDays(
    settings.availableDays ?? (learningProfile?.studyDays as number[] | undefined) ??
      (existingPreference ? JSON.parse(existingPreference.availableDays) as number[] : undefined),
  );
  const defaultMinutes = Math.round(((user.weeklyHours || 8) * 60) / availableDays.length);
  const minutesPerDay = clamp(
    settings.minutesPerDay ?? learningProfile?.minutesPerDay ?? existingPreference?.minutesPerDay ?? defaultMinutes,
    30,
    300,
  );
  const preference = await db.studyPlanPreference.upsert({
    where: { userId },
    update: {
      availableDays: JSON.stringify(availableDays),
      minutesPerDay,
      examDate: settings.examDate === undefined ? learningProfile?.examDate ?? existingPreference?.examDate : settings.examDate,
    },
    create: {
      userId,
      availableDays: JSON.stringify(availableDays),
      minutesPerDay,
      examDate: settings.examDate ?? learningProfile?.examDate ?? null,
    },
  });

  const exams = await db.vestibular.findMany({ select: { slug: true, name: true } });
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const chosen = Array.isArray(learningProfile?.exams) ? learningProfile.exams as string[] : [];
  const selectedExams = exams.filter(exam => chosen.some(value => normalize(value) === normalize(exam.name) || normalize(value) === exam.slug));
  const examSlugs = learningProfile ? selectedExams.map(exam => exam.slug) : ["enem"];
  const examSlug = examSlugs[0] ?? "";
  const questionCount = learningProfile?.level === "ADVANCED" ? 15 : learningProfile?.level === "BEGINNER" ? 5 : 10;
  const preferences = (learningProfile?.learningPreferences as string[] | undefined) ?? ["questions"];
  const difficulties = (learningProfile?.difficultSubjects as string[] | undefined) ?? [];
  const preferredSubjects = await db.subject.findMany({ where: { slug: { in: difficulties } }, select: { id: true } });
  const preferredSubjectIds = new Set(preferredSubjects.map(subject => subject.id));
  const availableQuestions = await availableQuestionWhere(userId, user.role);
  const [attempts, questions, courses, materials] = await Promise.all([
    db.questionAttempt.findMany({
      where: { userId, annulled: false, question: { vestibular: { slug: { in: examSlugs } } } },
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
      where: { status: "PUBLISHED", reviewState: "APPROVED", answerSituation: { not: "ANNULLED" }, vestibular: { slug: { in: examSlugs } }, AND: [availableQuestions] },
      select: {
        id: true,
        subjectId: true,
        topicId: true,
        subject: { select: { name: true } },
        topic: { select: { name: true } },
      },
    }),
    db.course.findMany({ where: { status: "PUBLISHED", AND: [accessibleCourseWhere(userId)] }, select: { slug: true, subjectId: true } }),
    db.material.findMany({ where: { status: "PUBLISHED", fileUrl: { not: null }, OR: [{ priceCents: 0 }, { product: { licenses: { some: { userId, revokedAt: null } } } }] }, select: { fileUrl: true, subjectId: true, product: { select: { slug: true } } } }),
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
    (a, b) => Number(preferredSubjectIds.has(b.id)) - Number(preferredSubjectIds.has(a.id)) || a.answered / Math.max(1, a.total) - b.answered / Math.max(1, b.total),
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
    userPreparationId?: string;
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
          ...(settings.userPreparationId ? { userPreparationId: settings.userPreparationId } : {}),
          scheduledFor,
          type: "REVIEW",
          title: "Revisar o Caderno de Erros",
          description: `${pendingErrors.length} questão(ões) pendente(s) em ${Array.from(errorSubjects).slice(0, 2).join(" e ")}.`,
          durationMinutes: blockDuration,
          actionHref: "/questions?vestibular=" + encodeURIComponent(examSlug) + "&mode=errors",
        });
        continue;
      }

      const weak = weakTopics[weakIndex % Math.max(1, weakTopics.length)];
      if (weak && block % 2 === 0) {
        weakIndex += 1;
        tasks.push({
          userId,
          ...(settings.userPreparationId ? { userPreparationId: settings.userPreparationId } : {}),
          scheduledFor,
          type: "QUESTIONS",
          title: `Praticar ${weak.name}`,
          description: `${Math.round(weak.errorRate * 100)}% de erro no histórico recente. Faça uma lista focada.`,
          durationMinutes: blockDuration,
          subjectId: weak.subjectId,
          topicId: weak.id,
          actionHref: `/questions?vestibular=${encodeURIComponent(examSlug)}&subject=${encodeURIComponent(weak.subjectId)}&topic=${encodeURIComponent(weak.id)}&session=1&count=${questionCount}`,
        });
        continue;
      }

      const gap = coverageGaps[gapIndex % Math.max(1, coverageGaps.length)];
      if (gap) {
        gapIndex += 1;
        const coverage = Math.round((gap.answered / Math.max(1, gap.total)) * 100);
        const course = preferences.includes("video") ? courses.find(item => item.subjectId === gap.id) : undefined;
        const material = preferences.includes("reading") ? materials.find(item => item.subjectId === gap.id) : undefined;
        if (course || material) {
          tasks.push({ userId, ...(settings.userPreparationId ? { userPreparationId: settings.userPreparationId } : {}), scheduledFor,
            type: "THEORY", title: course ? "Estudar uma aula de " + gap.name : "Ler e anotar: " + gap.name,
            description: "Bloco escolhido para sua preferência de estudo e seu objetivo: " + (learningProfile?.course ?? "avançar na preparação") + (learningProfile?.targetScore ? " · meta " + learningProfile.targetScore : ""),
            durationMinutes: blockDuration, subjectId: gap.id, actionHref: course ? "/cursos/" + course.slug : material?.product ? "/biblioteca/" + material.product.slug : material!.fileUrl! });
          continue;
        }
        tasks.push({
          userId,
          ...(settings.userPreparationId ? { userPreparationId: settings.userPreparationId } : {}),
          scheduledFor,
          type: "QUESTIONS",
          title: `Praticar ${gap.name}`,
          description:
            block % 2 === 0
              ? `Você percorreu ${coverage}% das questões disponíveis desta matéria.`
              : "Faça uma revisão ativa antes do próximo bloco de questões.",
          durationMinutes: blockDuration,
          subjectId: gap.id,
          actionHref: `/questions?vestibular=${encodeURIComponent(examSlug)}&subject=${encodeURIComponent(gap.id)}&session=1&scope=unanswered&count=${questionCount}`,
        });
      }
    }
  }

  await db.$transaction([
    db.studyPlanTask.deleteMany({
      where: {
        userId,
        completedAt: null,
        scheduledFor: { gte: today },
        ...(settings.userPreparationId
          ? { userPreparationId: settings.userPreparationId }
          : {}),
      },
    }),
    ...(tasks.length ? [db.studyPlanTask.createMany({ data: tasks })] : []),
  ]);

  const savedTasks = await db.studyPlanTask.findMany({
    select: studyPlanTaskSelect,
    where: {
      userId,
      scheduledFor: { gte: today },
      ...(settings.userPreparationId
        ? { userPreparationId: settings.userPreparationId }
        : {}),
    },
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
      learningProfile: learningProfile ? { goal: learningProfile.course, target: learningProfile.targetScore, level: learningProfile.level, preferences, difficulties, examDate: learningProfile.examDate } : null,
      availableQuestionCount: questions.length,
    },
  };
}

export async function getOrCreateStudyPlan(userId: string, userPreparationId?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [preference, tasks] = await Promise.all([
    db.studyPlanPreference.findUnique({ where: { userId } }),
    db.studyPlanTask.findMany({
      select: studyPlanTaskSelect,
      where: {
        userId,
        scheduledFor: { gte: today },
        ...(userPreparationId ? { userPreparationId } : {}),
      },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  if (!preference || tasks.length === 0) return regenerateStudyPlan(userId, { userPreparationId });

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
