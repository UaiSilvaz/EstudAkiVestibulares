import { after, NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncUserAchievements, unlockQuestionMastery } from "@/lib/backend-metrics";
import { leagueForXp, parseJson } from "@/lib/utils";

function saoPauloDayKey(date: Date) {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function publishedResolutionPayload(question: {
  explanation: string;
  alternativeExplanations: string;
  pedagogyComment: string | null;
  authorialResolutions: Array<{
    shortComment: string | null;
    fullResolution: string | null;
    reasoningPath: unknown;
    steps: unknown;
    alternativeComments: unknown;
    commonError: string | null;
    studyTip: string | null;
    keywords: unknown;
    relatedContent: unknown;
  }>;
}) {
  const resolution = question.authorialResolutions[0];
  return {
    explanation: resolution?.fullResolution?.trim() || question.explanation,
    alternativeExplanations: resolution
      ? (resolution.alternativeComments as Record<string, string>)
      : parseJson<Record<string, string>>(question.alternativeExplanations, {}),
    pedagogyComment: resolution?.shortComment?.trim() || question.pedagogyComment,
    authorialResolution: resolution
      ? {
          reasoningPath: resolution.reasoningPath,
          steps: resolution.steps,
          commonError: resolution.commonError,
          studyTip: resolution.studyTip,
          keywords: resolution.keywords,
          relatedContent: resolution.relatedContent,
        }
      : null,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) {
    return NextResponse.json(
      { error: "Nao foi possivel identificar o usuario no banco de dados." },
      { status: 409 },
    );
  }

  const { id } = await params;
  let body: {
    selectedAlternative?: string;
    errorType?: string;
    timeSpentSeconds?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  if (!body.selectedAlternative) {
    return NextResponse.json({ error: "Selecione uma alternativa." }, { status: 400 });
  }

  if (!/^[A-E]$/.test(body.selectedAlternative)) {
    return NextResponse.json({ error: "Alternativa invalida." }, { status: 400 });
  }

  const question = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      reviewState: true,
      correctAlternative: true,
      answerSituation: true,
      explanation: true,
      alternativeExplanations: true,
      pedagogyComment: true,
      authorialResolutions: {
        where: { status: "PUBLISHED", reviewStatus: "APPROVED" },
        orderBy: { version: "desc" },
        take: 1,
        select: {
          shortComment: true,
          fullResolution: true,
          reasoningPath: true,
          steps: true,
          alternativeComments: true,
          commonError: true,
          studyTip: true,
          keywords: true,
          relatedContent: true,
        },
      },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Questao nao encontrada." }, { status: 404 });
  }
  if (question.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Esta questao ainda nao esta publicada." },
      { status: 403 },
    );
  }
  if (question.reviewState !== "APPROVED") {
    return NextResponse.json(
      { error: "Esta questao ainda nao concluiu a revisao editorial." },
      { status: 403 },
    );
  }

  const resolutionPayload = publishedResolutionPayload(question);

  if (question.answerSituation === "ANNULLED") {
    await db.questionAttempt.create({
      data: {
        userId: persistedUserId,
        questionId: question.id,
        selectedAlternative: body.selectedAlternative,
        correct: false,
        annulled: true,
        errorType: null,
        timeSpentSeconds: body.timeSpentSeconds ?? 0,
      },
    });

    return NextResponse.json({
      correct: false,
      annulled: true,
      correctAlternative: null,
      ...resolutionPayload,
      gainedXp: 0,
      answerXp: 0,
      leveledUp: false,
      streakUpdated: false,
      achievements: [],
    });
  }

  const correct = question.correctAlternative === body.selectedAlternative;
  const [persistedUser, previousAttempt, previousQuestionAttempt] = await Promise.all([
    db.user.findUnique({ where: { id: persistedUserId } }),
    db.questionAttempt.findFirst({
      where: { userId: persistedUserId, annulled: false },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.questionAttempt.findFirst({
      where: { userId: persistedUserId, questionId: question.id, annulled: false },
      select: { id: true },
    }),
  ]);

  if (!persistedUser) {
    return NextResponse.json(
      { error: "Nao foi possivel identificar o usuario no banco de dados." },
      { status: 409 },
    );
  }

  const repeatedQuestion = Boolean(previousQuestionAttempt);
  const answerXp = repeatedQuestion ? 0 : correct ? 15 : 5;
  const now = new Date();
  const todayKey = saoPauloDayKey(now);
  const yesterdayKey = saoPauloDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const previousDayKey = previousAttempt ? saoPauloDayKey(previousAttempt.createdAt) : null;
  const streakUpdated = !repeatedQuestion && previousDayKey !== todayKey;
  const nextStreak = streakUpdated
    ? previousDayKey === yesterdayKey
      ? persistedUser.streak + 1
      : 1
    : persistedUser.streak;
  const newLeague = leagueForXp(persistedUser.xp + answerXp);
  const leveledUp = newLeague !== persistedUser.league;

  await db.$transaction([
    db.questionAttempt.create({
      data: {
        userId: persistedUserId,
        questionId: question.id,
        selectedAlternative: body.selectedAlternative,
        correct,
        annulled: false,
        errorType: correct ? null : body.errorType ?? "concept_gap",
        timeSpentSeconds: body.timeSpentSeconds ?? 0,
      },
    }),
    db.user.update({
      where: { id: persistedUserId },
      data: {
        xp: { increment: answerXp },
        ...(streakUpdated ? { streak: nextStreak } : {}),
        ...(leveledUp ? { league: newLeague } : {}),
      },
    }),
  ]);

  const updatedUser = await db.user.findUnique({ where: { id: persistedUserId } });
  const achievementRecords = updatedUser
    ? await syncUserAchievements(updatedUser).catch((error) => {
        console.error("Falha ao sincronizar conquistas da resposta:", error);
        return [];
      })
    : [];
  const achievements = achievementRecords
    .filter((record) => record.newlyUnlocked)
    .map((record) => record.achievement);
  const refreshedUser =
    achievementRecords.length > 0
      ? await db.user.findUnique({ where: { id: persistedUserId }, select: { league: true } })
      : null;
  const finalLeague = refreshedUser?.league ?? newLeague;
  const finalLeveledUp = finalLeague !== persistedUser.league;

  after(async () => {
    try {
      await db.activity.create({
        data: {
          userId: persistedUserId,
          type: "QUESTION",
          message: `${user.name} respondeu uma questao ${correct ? "corretamente" : "para revisao"}.`,
          xp: answerXp,
        },
      });

      await unlockQuestionMastery(persistedUserId, question.id);
    } catch (error) {
      console.error("Falha ao sincronizar efeitos pos-resposta:", error);
    }
  });

  return NextResponse.json({
    correct,
    annulled: false,
    correctAlternative: question.correctAlternative,
    ...resolutionPayload,
    gainedXp: answerXp,
    answerXp,
    repeatedQuestion,
    leveledUp: finalLeveledUp,
    newLeague: finalLeague,
    streak: nextStreak,
    streakUpdated,
    achievements,
  });
}
