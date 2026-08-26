import "server-only";

import { ContentStatus, QuestionAnswerSituation } from "@prisma/client";
import { db } from "@/lib/db";
import { buildMasteryMap } from "./mastery-engine";
import { rankLearningPriorities } from "./priority-engine";
import { buildStudyNowSession, normalizeAvailableMinutes } from "./study-session-planner";

type StudyNowProfile = {
  name: string;
  weeklyHours?: number | null;
  targetExam?: string | null;
};

function targetExamSlug(value?: string | null) {
  const normalized = (value ?? "ENEM")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (normalized.includes("enem")) return "enem";
  if (normalized.includes("fuvest")) return "fuvest";
  if (normalized.includes("unesp")) return "unesp";
  if (normalized.includes("unicamp")) return "unicamp";
  if (normalized.includes("fatec")) return "fatec";
  if (normalized.includes("etec")) return "etec";
  if (normalized.includes("provao")) return "provao-paulista";
  return normalized || "enem";
}

function daysUntil(date: Date | null | undefined, now: Date) {
  if (!date) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / dayMs));
}

export async function buildStudyNowRecommendation(input: {
  userId: string;
  profile: StudyNowProfile;
  availableMinutes?: number | "default" | null;
}) {
  const now = new Date();
  const vestibularSlug = targetExamSlug(input.profile.targetExam);
  const availableMinutes = normalizeAvailableMinutes(
    input.availableMinutes ?? "default",
    input.profile.weeklyHours,
  );

  const [attempts, targetQuestions, preference] = await Promise.all([
    db.questionAttempt.findMany({
      where: { userId: input.userId, annulled: false },
      orderBy: { createdAt: "desc" },
      take: 240,
      select: {
        questionId: true,
        correct: true,
        annulled: true,
        reviewed: true,
        timeSpentSeconds: true,
        createdAt: true,
        question: {
          select: {
            difficulty: true,
            subject: { select: { id: true, name: true, color: true, slug: true } },
            topic: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.question.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        answerSituation: { not: QuestionAnswerSituation.ANNULLED },
        vestibular: { slug: vestibularSlug },
      },
      select: {
        id: true,
        difficulty: true,
        subject: { select: { id: true, name: true, color: true, slug: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.studyPlanPreference.findUnique({
      where: { userId: input.userId },
      select: { examDate: true },
    }),
  ]);

  const questions = targetQuestions.length
    ? targetQuestions
    : await db.question.findMany({
        where: {
          status: ContentStatus.PUBLISHED,
          answerSituation: { not: QuestionAnswerSituation.ANNULLED },
        },
        select: {
          id: true,
          difficulty: true,
          subject: { select: { id: true, name: true, color: true, slug: true } },
          topic: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      });

  const mastery = buildMasteryMap({
    now,
    attempts: attempts.map((attempt) => ({
      questionId: attempt.questionId,
      correct: attempt.correct,
      annulled: attempt.annulled,
      reviewed: attempt.reviewed,
      timeSpentSeconds: attempt.timeSpentSeconds,
      createdAt: attempt.createdAt,
      difficulty: attempt.question.difficulty,
      subject: attempt.question.subject,
      topic: attempt.question.topic,
    })),
    questions,
  });
  const priorities = rankLearningPriorities({
    mastery,
    daysUntilExam: daysUntil(preference?.examDate, now),
    now,
  });

  return buildStudyNowSession({
    availableMinutes,
    priorities,
    weeklyHours: input.profile.weeklyHours,
    now,
    vestibularSlug: targetQuestions.length ? vestibularSlug : "enem",
  });
}

export async function getInitialStudyNowRecommendation(input: {
  userId: string;
  profile: StudyNowProfile;
}) {
  try {
    return await buildStudyNowRecommendation(input);
  } catch {
    return buildStudyNowSession({
      availableMinutes: normalizeAvailableMinutes("default", input.profile.weeklyHours),
      priorities: [],
      weeklyHours: input.profile.weeklyHours,
      vestibularSlug: targetExamSlug(input.profile.targetExam),
    });
  }
}
