import {
  OfficialResolutionStatus,
  QuestionImportJobStatus,
  QuestionReviewState,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { parseOldExamLanguage, selectOldExamLanguageLinks } from "@/lib/old-exam-language";
import { validateOldExamProofSubmission } from "@/lib/old-exam-proof";
import { questionResolutionPayload } from "@/lib/question-resolution-payload";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;

  let body: { language?: string | null; answers?: unknown; elapsedSeconds?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const requestedLanguage = body.language ? parseOldExamLanguage(body.language) : null;
  if (body.language && !requestedLanguage) {
    return NextResponse.json({ error: "Idioma inválido." }, { status: 400 });
  }

  const { jobId } = await params;
  const job = await db.questionImportJob.findFirst({
    where: {
      id: jobId,
      status: {
        in: [
          QuestionImportJobStatus.WAITING_REVIEW,
          QuestionImportJobStatus.READY_TO_PUBLISH,
        ],
      },
    },
    include: {
      extractions: {
        orderBy: [{ officialOrder: "asc" }, { officialLanguage: "asc" }],
        include: {
          question: {
            include: {
              authorialResolutions: {
                where: {
                  importJobId: jobId,
                  status: {
                    in: [
                      OfficialResolutionStatus.IN_REVIEW,
                      OfficialResolutionStatus.APPROVED,
                      OfficialResolutionStatus.PUBLISHED,
                    ],
                  },
                  reviewStatus: {
                    in: [QuestionReviewState.PENDING_REVIEW, QuestionReviewState.APPROVED],
                  },
                },
                orderBy: { version: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (!job) {
    return NextResponse.json(
      { error: "Importação não encontrada ou fora do estágio de prévia." },
      { status: 404 },
    );
  }
  if (job.extractions.length !== job.expectedQuestionCount) {
    return NextResponse.json(
      { error: "A prévia não aceita caderno parcialmente importado." },
      { status: 409 },
    );
  }

  const selection = selectOldExamLanguageLinks(
    job.extractions.map((extraction) => ({
      numeroQuestao: extraction.officialNumber,
      ordem: extraction.officialOrder,
      officialLanguage: extraction.officialLanguage,
      extraction,
    })),
    requestedLanguage,
  );
  if (requestedLanguage && selection.selectedLanguage !== requestedLanguage) {
    return NextResponse.json(
      { error: "A variante de idioma solicitada não existe neste caderno." },
      { status: 400 },
    );
  }
  if (selection.links.some(({ extraction }) => extraction.question.authorialResolutions.length !== 1)) {
    return NextResponse.json(
      { error: "A prévia de correção exige resolução autoral em todas as questões selecionadas." },
      { status: 409 },
    );
  }

  const questionIds = selection.links.map(({ extraction }) => extraction.question.id);
  const validated = validateOldExamProofSubmission(body.answers, questionIds);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const elapsedSeconds = Number.isFinite(body.elapsedSeconds)
    ? Math.min(86_400, Math.max(0, Math.floor(body.elapsedSeconds!)))
    : 0;
  const results = selection.links.map(({ numeroQuestao, extraction }) => {
    const question = extraction.question;
    const selectedAlternative = validated.answers[question.id];
    const annulled = question.answerSituation === "ANNULLED";
    const correct =
      !annulled &&
      selectedAlternative !== null &&
      selectedAlternative === question.correctAlternative;
    return {
      questionId: question.id,
      officialNumber: numeroQuestao,
      selectedAlternative,
      correct,
      annulled,
      correctAlternative: annulled ? null : question.correctAlternative,
      ...questionResolutionPayload(question),
    };
  });
  const answeredCount = results.filter((result) => result.selectedAlternative !== null).length;
  const correctCount = results.filter((result) => result.correct).length;
  const scoredCount = results.filter((result) => !result.annulled).length;

  return NextResponse.json(
    {
      submitted: true,
      preview: true,
      examId: job.provaAntigaId,
      selectedLanguage: selection.selectedLanguage,
      elapsedSeconds,
      answeredCount,
      correctCount,
      scoredCount,
      score: scoredCount > 0 ? (correctCount / scoredCount) * 100 : 0,
      gainedXp: 0,
      results,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
