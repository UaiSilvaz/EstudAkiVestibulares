import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { availableQuestionWhere } from "@/lib/freemium-access";
import { awardStudyXp, lockStudentProgress, reconcileStudyXp, syncStudyStreak } from "@/lib/study-xp";
import { syncUserAchievements, unlockQuestionMastery } from "@/lib/backend-metrics";
import { parseJson } from "@/lib/utils";

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
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) {
    return NextResponse.json(
      { error: "Não foi possível identificar o usuário no banco de dados." },
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
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || typeof body.selectedAlternative !== "string") {
    return NextResponse.json({ error: "Selecione uma alternativa." }, { status: 400 });
  }

  if (!/^[A-E]$/.test(body.selectedAlternative)) {
    return NextResponse.json({ error: "Alternativa invalida." }, { status: 400 });
  }
  if (body.timeSpentSeconds !== undefined && (typeof body.timeSpentSeconds !== "number" || !Number.isFinite(body.timeSpentSeconds) || body.timeSpentSeconds < 0 || body.timeSpentSeconds > 3600)) return NextResponse.json({ error: "Tempo inválido." }, { status: 400 });
  if (body.errorType !== undefined && (typeof body.errorType !== "string" || body.errorType.length > 80)) return NextResponse.json({ error: "Tipo de erro inválido." }, { status: 400 });

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
    return NextResponse.json({ error: "Questão não encontrada." }, { status: 404 });
  }
  if (question.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Esta questão ainda não está publicada." },
      { status: 403 },
    );
  }
  if (question.reviewState !== "APPROVED") {
    return NextResponse.json(
      { error: "Esta questão ainda não concluiu a revisão editorial." },
      { status: 403 },
    );
  }

  const resolutionPayload = publishedResolutionPayload(question);
  const accessible = await db.question.findFirst({ where: { AND: [{ id }, await availableQuestionWhere(persistedUserId, user.role)] }, select: { id: true } });
  if (!accessible) return NextResponse.json({ error: "Questão exclusiva de um curso. A conta gratuita inclui a seleção demonstrativa.", code: "COURSE_REQUIRED" }, { status: 403 });

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
  const result = await db.$transaction(async tx => {
    await lockStudentProgress(tx, persistedUserId);
    await reconcileStudyXp(tx, persistedUserId);
    const persistedUser = await tx.user.findUniqueOrThrow({ where: { id: persistedUserId } });
    const previous = await tx.questionAttempt.findFirst({ where: { userId: persistedUserId, questionId: question.id, annulled: false } });
    const repeatedQuestion = Boolean(previous);
    const attempt = await tx.questionAttempt.create({ data: {
      userId: persistedUserId, questionId: question.id, selectedAlternative: body.selectedAlternative!,
      correct, annulled: false, errorType: correct ? null : body.errorType ?? "concept_gap",
      timeSpentSeconds: Math.max(0, Math.min(3600, Math.round(body.timeSpentSeconds ?? 0))),
    } });
    const answerXp = repeatedQuestion ? 0 : await awardStudyXp(tx, persistedUserId, "question:" + question.id, correct ? 15 : 5, "Resposta registrada: " + (correct ? "acerto" : "revisar"));
    const nextStreak = await syncStudyStreak(tx, persistedUserId);
    return { repeatedQuestion, answerXp, nextStreak, streakUpdated: nextStreak !== persistedUser.streak, persistedUser, attempt };
  });
  const { repeatedQuestion, answerXp, nextStreak, streakUpdated, persistedUser } = result;
  const newLeague = (await db.user.findUniqueOrThrow({ where: { id: persistedUserId } })).league;

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

  await unlockQuestionMastery(persistedUserId, question.id);

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
