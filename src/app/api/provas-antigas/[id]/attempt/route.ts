import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseOldExamLanguage, selectOldExamLanguageLinks } from "@/lib/old-exam-language";
import { validateOldExamProofSubmission } from "@/lib/old-exam-proof";
import { questionResolutionPayload } from "@/lib/question-resolution-payload";
import { leagueForXp } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) {
    return NextResponse.json(
      { error: "Não foi possível identificar o usuário no banco de dados." },
      { status: 409 },
    );
  }

  let body: {
    language?: string | null;
    answers?: unknown;
    elapsedSeconds?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const requestedLanguage = body.language ? parseOldExamLanguage(body.language) : null;
  if (body.language && !requestedLanguage) {
    return NextResponse.json({ error: "Idioma inválido." }, { status: 400 });
  }

  const { id } = await params;
  const exam = await db.provaAntiga.findUnique({
    where: { id },
    include: {
      questoes: {
        where: {
          questao: { status: "PUBLISHED", reviewState: "APPROVED" },
        },
        include: {
          questao: {
            include: {
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
          },
        },
        orderBy: [{ ordem: "asc" }, { numeroQuestao: "asc" }, { officialLanguage: "asc" }],
      },
    },
  });
  if (!exam) {
    return NextResponse.json({ error: "Prova antiga não encontrada." }, { status: 404 });
  }

  const selection = selectOldExamLanguageLinks(exam.questoes, requestedLanguage);
  if (requestedLanguage && selection.selectedLanguage !== requestedLanguage) {
    return NextResponse.json(
      { error: "A variante de idioma solicitada não existe neste caderno." },
      { status: 400 },
    );
  }
  const questionIds = selection.links.map((link) => link.questao.id);
  if (questionIds.length === 0) {
    return NextResponse.json(
      { error: "Esta prova ainda não possui questões publicadas e revisadas." },
      { status: 409 },
    );
  }
  const validated = validateOldExamProofSubmission(body.answers, questionIds);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const elapsedSeconds = Number.isFinite(body.elapsedSeconds)
    ? Math.min(86_400, Math.max(0, Math.floor(body.elapsedSeconds!)))
    : 0;
  const answeredLinks = selection.links.filter(
    (link) => validated.answers[link.questao.id] !== null,
  );
  const results = selection.links.map((link) => {
    const question = link.questao;
    const selectedAlternative = validated.answers[question.id];
    const annulled = question.answerSituation === "ANNULLED";
    const correct =
      !annulled &&
      selectedAlternative !== null &&
      selectedAlternative === question.correctAlternative;
    return {
      questionId: question.id,
      officialNumber: link.numeroQuestao,
      selectedAlternative,
      correct,
      annulled,
      correctAlternative: annulled ? null : question.correctAlternative,
      ...questionResolutionPayload(question),
    };
  });
  const gainedXp = results.reduce(
    (total, result) => total + (result.annulled || !result.selectedAlternative ? 0 : result.correct ? 15 : 5),
    0,
  );
  const userBeforeReward =
    gainedXp > 0
      ? await db.user.findUnique({
          where: { id: persistedUserId },
          select: { xp: true, league: true },
        })
      : null;
  const newLeague = userBeforeReward ? leagueForXp(userBeforeReward.xp + gainedXp) : null;

  await db.$transaction(async (transaction) => {
    if (answeredLinks.length > 0) {
      await transaction.questionAttempt.createMany({
        data: answeredLinks.map((link) => {
          const selectedAlternative = validated.answers[link.questao.id]!;
          const annulled = link.questao.answerSituation === "ANNULLED";
          const correct = !annulled && selectedAlternative === link.questao.correctAlternative;
          return {
            userId: persistedUserId,
            questionId: link.questao.id,
            selectedAlternative,
            correct,
            annulled,
            errorType: correct || annulled ? null : "exam_attempt",
            timeSpentSeconds: Math.round(elapsedSeconds / answeredLinks.length),
          };
        }),
      });
    }
    if (gainedXp > 0) {
      await transaction.user.update({
        where: { id: persistedUserId },
        data: {
          xp: { increment: gainedXp },
          ...(newLeague && newLeague !== userBeforeReward?.league ? { league: newLeague } : {}),
        },
      });
    }
    await transaction.activity.create({
      data: {
        userId: persistedUserId,
        type: "QUESTION",
        message: `${user.name} finalizou ${exam.titulo} no modo prova.`,
        xp: gainedXp,
      },
    });
  });

  const correctCount = results.filter((result) => result.correct).length;
  const scoredCount = results.filter((result) => !result.annulled).length;
  return NextResponse.json(
    {
      submitted: true,
      examId: exam.id,
      selectedLanguage: selection.selectedLanguage,
      elapsedSeconds,
      answeredCount: answeredLinks.length,
      correctCount,
      scoredCount,
      score: scoredCount > 0 ? (correctCount / scoredCount) * 100 : 0,
      gainedXp,
      results,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
