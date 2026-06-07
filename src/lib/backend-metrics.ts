import { ContentStatus } from "@prisma/client";
import { db } from "./db";
import { buildDashboardInsights } from "./insights";
import type { AppUser } from "./roles";

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

export async function getDashboardSource(user: DashboardUser) {
  const [attempts, questions, activities, videos, studySessions, challenges] = await Promise.all([
    db.questionAttempt.findMany({
      where: { userId: user.id },
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
      where: { status: ContentStatus.PUBLISHED },
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
    db.video.findMany({
      where: { status: ContentStatus.PUBLISHED },
      include: { subject: true, topic: true },
      take: 6,
      orderBy: { createdAt: "desc" },
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
    videos,
    studySessions,
    challenges,
    insights,
  };
}

export async function syncUserAchievements(user: DashboardUser) {
  const { attempts, insights } = await getDashboardSource(user);
  const achievements = await db.achievement.findMany({
    where: { status: ContentStatus.PUBLISHED },
    orderBy: [{ criteriaType: "asc" }, { criteriaValue: "asc" }],
  });

  const reviewedErrors = attempts.filter((attempt) => !attempt.correct && attempt.reviewed).length;
  const progressByType: Record<string, number> = {
    questions: attempts.length,
    reviews: reviewedErrors,
    streak: user.streak,
    accuracy: Math.round(insights.weightedAccuracyRate),
    xp: user.xp,
    daily_goal: Math.round(insights.dailyGoalCompletionRate),
  };

  const records = await Promise.all(
    achievements.map((achievement) => {
      const progress = Math.min(
        achievement.criteriaValue,
        progressByType[achievement.criteriaType] ?? 0,
      );
      const completed = progress >= achievement.criteriaValue;

      return db.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId: user.id,
            achievementId: achievement.id,
          },
        },
        update: {
          progress,
          completed,
          unlockedAt: completed ? new Date() : null,
        },
        create: {
          userId: user.id,
          achievementId: achievement.id,
          progress,
          completed,
          unlockedAt: completed ? new Date() : null,
        },
        include: { achievement: true },
      });
    }),
  );

  return records.map((record) => ({
    id: record.id,
    progress: record.progress,
    completed: record.completed,
    unlockedAt: record.unlockedAt,
    achievement: record.achievement,
    percentage: Math.min(
      100,
      Math.round((record.progress / Math.max(1, record.achievement.criteriaValue)) * 100),
    ),
  }));
}

export async function buildDashboardPayload(user: DashboardUser) {
  const [source, achievements] = await Promise.all([
    getDashboardSource(user),
    syncUserAchievements(user),
  ]);

  const totalStudySeconds = source.studySessions.reduce(
    (sum, session) => sum + session.durationSeconds,
    0,
  );

  return {
    user,
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
