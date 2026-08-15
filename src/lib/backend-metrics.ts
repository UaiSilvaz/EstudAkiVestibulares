import { ContentStatus, Prisma, QuestionAnswerSituation } from "@prisma/client";
import { achievementCatalog, betaAchievementSlugs } from "./achievement-catalog";
import { db } from "./db";
import { buildDashboardInsights, calculateDailyGoal } from "./insights";
import type { AppUser } from "./roles";
import { leagueForXp } from "./utils";

type DashboardUser = Pick<
  AppUser,
  "id" | "name" | "email" | "role" | "avatarUrl" | "xp" | "streak" | "league" | "weeklyHours" | "targetExam"
>;

const activityUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
} as const;

async function ensureAchievementCatalog() {
  const current = await db.achievement.count({ where: { status: ContentStatus.PUBLISHED } });
  if (current > 0) return;

  await db.achievement.createMany({
    data: achievementCatalog.map((item) => ({
      slug: item.slug,
      title: item.name,
      description: item.description,
      lockedDescription: item.lockedDescription,
      category: item.category,
      rarity: item.rarity,
      metric: item.metric,
      target: item.target,
      requirement: item.requirement as Prisma.InputJsonObject,
      subjectId: item.subjectId ?? null,
      examId: item.examId ?? null,
      contentId: item.contentId ?? null,
      icon: item.icon,
      color: item.color,
      xpReward: item.xpReward,
      coinReward: item.coinReward,
      titleReward: item.titleReward ?? null,
      cosmeticReward: item.cosmeticReward ?? null,
      iconKey: item.iconKey,
      iconDescription: item.iconDescription,
      unlockedIconPath: item.unlockedIconPath,
      lockedIconPath: item.lockedIconPath,
      isHidden: item.isHidden,
      isRepeatable: item.isRepeatable,
      order: item.order,
      criteriaType: item.criteriaType,
      criteriaValue: item.criteriaValue,
      status: ContentStatus.PUBLISHED,
    })),
    skipDuplicates: true,
  });
}

export async function getDashboardSource(user: DashboardUser) {
  const [attempts, questions, activities, studySessions, challenges] = await Promise.all([
    db.questionAttempt.findMany({
      where: { userId: user.id, annulled: false },
      orderBy: { createdAt: "desc" },
      include: {
        question: {
          include: {
            subject: true,
            topic: true,
          },
        },
      },
    }),
    db.question.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        answerSituation: { not: QuestionAnswerSituation.ANNULLED },
      },
      include: {
        subject: true,
        topic: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.activity.findMany({
      where: {
        OR: [{ userId: user.id }, { userId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        user: {
          select: activityUserSelect,
        },
      },
    }),
    db.studySession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
    db.challenge.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: { endsAt: "asc" },
      take: 6,
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

  return {
    attempts,
    questions,
    activities,
    videos: [],
    studySessions,
    challenges,
    insights,
  };
}

export async function syncUserAchievements(user: DashboardUser) {
  await ensureAchievementCatalog();

  const [attempts, achievements, existingRecords, examAttempts, studySessions, essays, communityPosts] = await Promise.all([
    db.questionAttempt.findMany({
      where: { userId: user.id, annulled: false },
      select: {
        questionId: true,
        correct: true,
        reviewed: true,
        createdAt: true,
        timeSpentSeconds: true,
        question: {
          select: {
            difficulty: true,
            topicId: true,
            subject: { select: { name: true, slug: true } },
            vestibular: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.achievement.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        slug: { in: betaAchievementSlugs },
      },
      orderBy: [{ order: "asc" }, { criteriaType: "asc" }, { criteriaValue: "asc" }],
    }),
    db.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
    }),
    db.examAttempt.findMany({
      where: { userId: user.id, submittedAt: { not: null } },
      select: {
        score: true,
        correctCount: true,
        submittedAt: true,
        exam: { select: { vestibular: { select: { slug: true } } } },
      },
    }),
    db.studySession.findMany({
      where: { userId: user.id, endedAt: { not: null } },
      select: {
        durationSeconds: true,
        questionsAnswered: true,
        correctAnswers: true,
        startedAt: true,
        endedAt: true,
      },
    }),
    db.essaySubmission.findMany({
      where: { userId: user.id },
      select: { score: true, createdAt: true },
    }),
    db.communityPost.count({
      where: { userId: user.id },
    }),
  ]);

  const reviewedErrors = attempts.filter((attempt) => !attempt.correct && attempt.reviewed).length;
  const now = new Date();
  const saoPauloNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const startOfToday = new Date(
    Date.UTC(
      saoPauloNow.getUTCFullYear(),
      saoPauloNow.getUTCMonth(),
      saoPauloNow.getUTCDate(),
      3,
    ),
  );
  const dayOfWeek = saoPauloNow.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysSinceMonday);
  const attemptsToday = attempts.filter((attempt) => attempt.createdAt >= startOfToday);
  const attemptsThisWeek = attempts.filter((attempt) => attempt.createdAt >= startOfWeek);
  const uniqueAnsweredIds = new Set(attempts.map((attempt) => attempt.questionId));
  const uniqueCorrectIds = new Set(
    attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.questionId),
  );
  const uniqueToday = new Set(attemptsToday.map((attempt) => attempt.questionId)).size;
  const uniqueThisWeek = new Set(attemptsThisWeek.map((attempt) => attempt.questionId)).size;
  const accuracy = uniqueAnsweredIds.size
    ? Math.round((uniqueCorrectIds.size / uniqueAnsweredIds.size) * 100)
    : 0;
  let currentCorrectRun = 0;
  let bestCorrectRun = 0;
  const correctBySubject = new Map<string, number>();
  const answeredByExam = new Map<string, Set<string>>();
  const subjectStats = new Map<
    string,
    { answered: Set<string>; correct: Set<string>; currentRun: number; bestRun: number }
  >();

  for (const attempt of attempts) {
    const examSlug = attempt.question.vestibular.slug;
    const subjectSlug = attempt.question.subject.slug;
    if (!answeredByExam.has(examSlug)) answeredByExam.set(examSlug, new Set());
    answeredByExam.get(examSlug)?.add(attempt.questionId);
    if (!subjectStats.has(subjectSlug)) {
      subjectStats.set(subjectSlug, {
        answered: new Set(),
        correct: new Set(),
        currentRun: 0,
        bestRun: 0,
      });
    }
    const stats = subjectStats.get(subjectSlug)!;
    stats.answered.add(attempt.questionId);

    if (attempt.correct) {
      currentCorrectRun += 1;
      bestCorrectRun = Math.max(bestCorrectRun, currentCorrectRun);
      stats.currentRun += 1;
      stats.bestRun = Math.max(stats.bestRun, stats.currentRun);
      stats.correct.add(attempt.questionId);
      const subjectName = attempt.question.subject.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      correctBySubject.set(subjectName, (correctBySubject.get(subjectName) ?? 0) + 1);
    } else {
      currentCorrectRun = 0;
      stats.currentRun = 0;
    }
  }

  const totalStudyMinutes = Math.floor(
    studySessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60,
  );
  const maxSimulationScore = Math.max(0, ...examAttempts.map((attempt) => Math.round(attempt.score ?? 0)));
  const maxEssayScore = Math.max(0, ...essays.map((essay) => essay.score));

  const dailyGoal = calculateDailyGoal(user.weeklyHours ?? 0);
  const progressByType: Record<string, number> = {
    questions: uniqueAnsweredIds.size,
    correct_questions: uniqueCorrectIds.size,
    correct_streak: bestCorrectRun,
    math_correct: correctBySubject.get("matematica") ?? 0,
    portuguese_correct:
      (correctBySubject.get("lingua portuguesa") ?? 0) +
      (correctBySubject.get("portugues") ?? 0),
    nature_correct:
      (correctBySubject.get("biologia") ?? 0) +
      (correctBySubject.get("fisica") ?? 0) +
      (correctBySubject.get("quimica") ?? 0),
    humanities_correct:
      (correctBySubject.get("historia") ?? 0) +
      (correctBySubject.get("geografia") ?? 0) +
      (correctBySubject.get("filosofia") ?? 0) +
      (correctBySubject.get("sociologia") ?? 0),
    questions_today: uniqueToday,
    questions_week: uniqueThisWeek,
    reviews: reviewedErrors,
    streak: user.streak,
    accuracy,
    accuracy_10: uniqueAnsweredIds.size >= 10 ? accuracy : 0,
    xp: user.xp,
    daily_goal: Math.min(
      100,
      Math.round((uniqueToday / Math.max(1, dailyGoal.questions)) * 100),
    ),
    simulations: examAttempts.length,
  };

  function requirementObject(value: Prisma.JsonValue): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  function progressForAchievement(achievement: (typeof achievements)[number]) {
    const requirement = requirementObject(achievement.requirement);
    const metric = achievement.metric || achievement.criteriaType;
    const subject = typeof requirement.subject === "string" ? requirement.subject : achievement.subjectId;
    const exam = typeof requirement.exam === "string" ? requirement.exam : achievement.examId;
    const minQuestions = typeof requirement.minQuestions === "number" ? requirement.minQuestions : 0;
    const stats = subject ? subjectStats.get(subject) : undefined;
    const subjectAnswered = stats?.answered.size ?? 0;
    const subjectCorrect = stats?.correct.size ?? 0;
    const subjectAccuracy = subjectAnswered ? Math.round((subjectCorrect / subjectAnswered) * 100) : 0;

    if (metric === "unique_questions_answered") return uniqueAnsweredIds.size;
    if (metric === "unique_correct_answers") return uniqueCorrectIds.size;
    if (metric === "daily_unique_questions") return uniqueToday;
    if (metric === "weekly_unique_questions") return uniqueThisWeek;
    if (metric === "daily_unique_correct") {
      return new Set(attemptsToday.filter((attempt) => attempt.correct).map((attempt) => attempt.questionId)).size;
    }
    if (metric === "correct_streak") return bestCorrectRun;
    if (metric === "subject_unique_correct") return subjectCorrect;
    if (metric === "subject_correct_streak") return stats?.bestRun ?? 0;
    if (metric === "subject_accuracy") return subjectAnswered >= minQuestions ? subjectAccuracy : 0;
    if (metric === "study_streak_days") return user.streak;
    if (metric === "study_time_minutes") return totalStudyMinutes;
    if (metric === "study_session_count") return studySessions.length;
    if (metric === "focus_session_minutes") {
      return Math.max(0, ...studySessions.map((session) => Math.floor(session.durationSeconds / 60)));
    }
    if (metric === "accuracy_percent") return uniqueAnsweredIds.size >= minQuestions ? accuracy : 0;
    if (metric === "simulation_count") return examAttempts.length;
    if (metric === "simulation_score_percent") return maxSimulationScore;
    if (metric === "exam_unique_questions") return exam ? answeredByExam.get(exam)?.size ?? 0 : 0;
    if (metric === "reviewed_errors") return reviewedErrors;
    if (metric === "essay_count") return essays.length;
    if (metric === "essay_score") return maxEssayScore;
    if (metric === "community_posts") return communityPosts;
    if (metric === "profile_completed") {
      return [user.name, user.email, user.targetExam, user.weeklyHours, user.avatarUrl].filter(Boolean).length * 20;
    }
    if (metric === "profile_photo") return user.avatarUrl ? 1 : 0;
    if (metric === "profile_goal") return user.targetExam ? 1 : 0;
    if (metric === "xp" || metric === "league") return user.xp;
    if (metric === "accuracy" || metric === "accuracy_10") return uniqueAnsweredIds.size >= 10 ? accuracy : 0;
    if (metric === "simulations") return examAttempts.length;
    return progressByType[metric] ?? 0;
  }

  const existingByAchievement = new Map(
    existingRecords.map((record) => [record.achievementId, record]),
  );
  const records: Array<
    (typeof existingRecords)[number] & { newlyUnlocked: boolean }
  > = [];

  for (const achievement of achievements) {
    const existing = existingByAchievement.get(achievement.id);
    const measuredProgress = Math.min(
      achievement.criteriaValue,
      progressForAchievement(achievement),
    );
    const progress = Math.max(existing?.progress ?? 0, measuredProgress);
    const shouldComplete = progress >= achievement.criteriaValue;
    let newlyUnlocked = false;

    if (existing) {
      if (shouldComplete && !existing.completed) {
        const claimed = await db.userAchievement.updateMany({
          where: { id: existing.id, completed: false },
          data: { progress, completed: true, unlockedAt: now, rewardClaimed: true },
        });
        newlyUnlocked = claimed.count === 1;
      } else {
        await db.userAchievement.update({
          where: { id: existing.id },
          data: { progress },
        });
      }
    } else {
      await db.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: achievement.id,
          progress,
          completed: shouldComplete,
          unlockedAt: shouldComplete ? now : null,
          rewardClaimed: shouldComplete,
        },
      });
      newlyUnlocked = shouldComplete;
    }

    const record = await db.userAchievement.findUniqueOrThrow({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId: achievement.id,
        },
      },
      include: { achievement: true },
    });
    records.push({ ...record, newlyUnlocked });
  }

  const unlockedNow = records.filter((record) => record.newlyUnlocked);
  const rewardXp = unlockedNow.reduce((sum, record) => sum + record.achievement.xpReward, 0);
  if (rewardXp > 0) {
    const nextXp = user.xp + rewardXp;
    const nextLeague = leagueForXp(nextXp);
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: rewardXp },
          ...(nextLeague !== user.league ? { league: nextLeague } : {}),
        },
      }),
      ...unlockedNow.map((record) =>
        db.activity.create({
          data: {
            userId: user.id,
            type: "XP",
            message: `Conquista desbloqueada: ${record.achievement.title}.`,
            xp: record.achievement.xpReward,
          },
        }),
      ),
    ]);
  }

  return records.map((record) => ({
    id: record.id,
    progress: record.progress,
    completed: record.completed,
    unlockedAt: record.unlockedAt,
    newlyUnlocked: record.newlyUnlocked,
    achievement: record.achievement,
    percentage: Math.min(
      100,
      Math.round((record.progress / Math.max(1, record.achievement.criteriaValue)) * 100),
    ),
  }));
}

export async function unlockQuestionMastery(userId: string, questionId: string) {
  void userId;
  void questionId;
  return [];
  /*

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: {
      subjectId: true,
      topicId: true,
      subject: { select: { name: true } },
      topic: { select: { name: true } },
      vestibular: { select: { id: true, slug: true, name: true } },
    },
  });
  if (!question) return [];

  const contexts = [
    {
      kind: "subject",
      id: question.subjectId,
      name: question.subject.name,
      reward: 50,
      where: { subjectId: question.subjectId },
    },
    ...(question.topicId && question.topic
      ? [
          {
            kind: "content",
            id: question.topicId,
            name: question.topic.name,
            reward: 30,
            where: { topicId: question.topicId },
          },
        ]
      : []),
  ] as const;
  const unlocked = [];

  for (const context of contexts) {
    const questionWhere = {
      vestibularId: question.vestibular.id,
      status: ContentStatus.PUBLISHED,
      answerSituation: { not: QuestionAnswerSituation.ANNULLED },
      ...context.where,
    };
    const [available, answered] = await Promise.all([
      db.question.count({ where: questionWhere }),
      db.questionAttempt.findMany({
        where: {
          userId,
          annulled: false,
          question: questionWhere,
        },
        distinct: ["questionId"],
        select: { questionId: true },
      }),
    ]);
    if (available === 0 || answered.length < available) continue;

    const slug = `master-${context.kind}-${question.vestibular.slug}-${context.id}`;
    const achievement = await db.achievement.upsert({
      where: { slug },
      update: {
        criteriaValue: available,
        status: ContentStatus.PUBLISHED,
      },
      create: {
        slug,
        title:
          context.kind === "subject"
            ? `${context.name} dominada!`
            : `${context.name} concluído!`,
        description:
          context.kind === "subject"
            ? `Você zerou todas as questões de ${context.name} de ${question.vestibular.name} disponíveis.`
            : `Você respondeu a todas as questões de ${context.name} de ${question.vestibular.name}.`,
        icon: context.kind === "subject" ? "trophy" : "book-open-check",
        color: context.kind === "subject" ? "#2563EB" : "#F97316",
        xpReward: context.reward,
        criteriaType: `${context.kind}_mastery`,
        criteriaValue: available,
      },
    });
    const existing = await db.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
    });
    if (existing?.completed) continue;

    if (existing) {
      const claimed = await db.userAchievement.updateMany({
        where: { id: existing.id, completed: false },
        data: {
          progress: available,
          completed: true,
          unlockedAt: new Date(),
        },
      });
      if (claimed.count !== 1) continue;
    } else {
      await db.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          progress: available,
          completed: true,
          unlockedAt: new Date(),
        },
      });
    }

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { xp: { increment: achievement.xpReward } },
      }),
      db.activity.create({
        data: {
          userId,
          type: "XP",
          message: `Conquista desbloqueada: ${achievement.title}.`,
          xp: achievement.xpReward,
        },
      }),
    ]);
    unlocked.push({ ...achievement, newlyUnlocked: true });
  }

  return unlocked;
  */
}

export async function buildDashboardPayload(user: DashboardUser) {
  const persistedUser = await db.user.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email }] },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      xp: true,
      streak: true,
      league: true,
      weeklyHours: true,
      targetExam: true,
    },
  });
  const sourceUser = persistedUser ?? user;
  const [source, achievements] = await Promise.all([
    getDashboardSource(sourceUser),
    persistedUser ? syncUserAchievements(sourceUser) : Promise.resolve([]),
  ]);

  const totalStudySeconds = source.studySessions.reduce(
    (sum, session) => sum + session.durationSeconds,
    0,
  );
  const unlockedRewardXp = achievements
    .filter((record) => record.newlyUnlocked)
    .reduce((sum, record) => sum + record.achievement.xpReward, 0);
  const effectiveXp = sourceUser.xp + unlockedRewardXp;

  return {
    user: {
      ...user,
      xp: effectiveXp,
      streak: sourceUser.streak,
      league: leagueForXp(effectiveXp),
      weeklyHours: sourceUser.weeklyHours,
      targetExam: sourceUser.targetExam,
      avatarUrl: sourceUser.avatarUrl,
    },
    insights: source.insights,
    metrics: {
      attempts: source.attempts.length,
      answeredQuestions: source.attempts.length,
      correctAnswers: source.attempts.filter((attempt) => attempt.correct).length,
      pendingErrors: source.insights.pendingErrors,
      reviewedErrors: source.insights.reviewedErrors,
      studySessions: source.studySessions.length,
      totalStudySeconds,
      activeChallenges: source.challenges.length,
      completedAchievements: achievements.filter((item) => item.completed).length,
    },
    achievements,
    activities: source.activities,
    videos: source.videos,
    studySessions: source.studySessions,
    challenges: source.challenges,
  };
}
