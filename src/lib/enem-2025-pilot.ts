import "server-only";

import {
  ContentStatus,
  OfficialAnswerReviewStatus,
  OfficialResolutionStatus,
  ProvaAntigaStatus,
  QuestionReviewState,
} from "@prisma/client";
import { db } from "@/lib/db";

export const ENEM_2025_PILOT_EXAM_IDS = [
  "pa-enem-2025-dia-1",
  "pa-enem-2025-dia-2",
] as const;

export const ENEM_2025_PUBLISH_CONFIRMATION =
  "PUBLICAR QUESTÕES APROVADAS DO ENEM 2025";
export const ENEM_2025_TEST_CONFIRMATION =
  "PUBLICAR PILOTO ENEM 2025 PARA TESTE";
export const ENEM_2025_UNDO_CONFIRMATION =
  "DESFAZER PUBLICAÇÃO DE TESTE ENEM 2025";

export async function getEnem2025PilotRecords() {
  return db.provaAntiga.findMany({
    where: { id: { in: [...ENEM_2025_PILOT_EXAM_IDS] } },
    include: {
      officialKeyFile: {
        include: {
          answerKeys: { orderBy: { questionNumber: "asc" } },
        },
      },
      questoes: {
        include: {
          questao: {
            include: {
              vestibular: true,
              subject: true,
              topic: true,
              imageItems: { orderBy: { order: "asc" } },
              alternativeItems: { orderBy: { order: "asc" } },
            },
          },
        },
        orderBy: { numeroQuestao: "asc" },
      },
    },
    orderBy: { dia: "asc" },
  });
}

type PilotExam = Awaited<ReturnType<typeof getEnem2025PilotRecords>>[number];
type PilotLink = PilotExam["questoes"][number];
type PilotAnswer = NonNullable<PilotExam["officialKeyFile"]>["answerKeys"][number];

function structuralReasons(exam: PilotExam, link: PilotLink, answer: PilotAnswer | undefined) {
  const question = link.questao;
  const reasons: string[] = [];
  if (question.reviewState === QuestionReviewState.HAS_ERROR) {
    reasons.push(
      question.correctAlternative === "ANULADA"
        ? "Questão anulada no gabarito oficial"
        : "Possui erro de extração",
    );
  }
  if (question.vestibular.slug !== "enem" || question.year !== 2025) {
    reasons.push("Vestibular ou ano incorreto");
  }
  if (question.questionNumber !== link.numeroQuestao) {
    reasons.push("Número divergente do vínculo com a prova");
  }
  if (question.day !== exam.dia) {
    reasons.push("Dia divergente da prova");
  }
  if (!question.statement.trim()) {
    reasons.push("Enunciado vazio");
  }
  if (question.alternativeItems.length < 2) {
    reasons.push("Alternativas incompletas");
  }
  if (!answer) {
    reasons.push("Sem gabarito associado");
  } else if (answer.correctAlternative !== question.correctAlternative) {
    reasons.push("Gabarito divergente da questão");
  }
  return reasons;
}

export function publicationReasons(
  exam: PilotExam,
  link: PilotLink,
  answer: PilotAnswer | undefined,
) {
  const reasons = structuralReasons(exam, link, answer);
  if (link.questao.reviewState !== QuestionReviewState.APPROVED) {
    reasons.push("Questão ainda não aprovada");
  }
  if (link.needsHumanReview) {
    reasons.push("Questão ainda requer revisão humana");
  }
  if (
    exam.status !== ProvaAntigaStatus.APROVADA &&
    exam.status !== ProvaAntigaStatus.DISPONIVEL
  ) {
    reasons.push("Prova ainda não aprovada");
  }
  if (answer?.answerReviewStatus !== OfficialAnswerReviewStatus.APPROVED) {
    reasons.push("Gabarito ainda não aprovado");
  }
  if (
    answer?.resolutionStatus !== OfficialResolutionStatus.APPROVED &&
    answer?.resolutionStatus !== OfficialResolutionStatus.PUBLISHED
  ) {
    reasons.push("Resolução ainda não revisada");
  } else if (!answer.fullResolution?.trim()) {
    reasons.push("Resolução aprovada sem conteúdo");
  }
  return [...new Set(reasons)];
}

export function testPublicationReasons(
  exam: PilotExam,
  link: PilotLink,
  answer: PilotAnswer | undefined,
) {
  return [...new Set(structuralReasons(exam, link, answer))];
}

export async function getEnem2025PilotDashboard() {
  const exams = await getEnem2025PilotRecords();
  const rows = exams.flatMap((exam) => {
    const answerMap = new Map(
      exam.officialKeyFile?.answerKeys.map((answer) => [answer.questionNumber, answer]),
    );
    return exam.questoes.map((link) => {
      const answer = answerMap.get(link.numeroQuestao);
      const reasons = publicationReasons(exam, link, answer);
      const testReasons = testPublicationReasons(exam, link, answer);
      return {
        id: link.questao.id,
        examId: exam.id,
        examTitle: exam.titulo,
        examStatus: exam.status,
        number: link.numeroQuestao,
        day: exam.dia,
        subject: link.questao.subject.name,
        topic: link.questao.topic?.name ?? null,
        statement: link.questao.statement,
        status: link.questao.status,
        reviewState: link.questao.reviewState,
        reviewNotes: link.questao.reviewNotes,
        needsHumanReview: link.needsHumanReview,
        correctAlternative: link.questao.correctAlternative,
        answerStatus: answer?.answerReviewStatus ?? null,
        resolutionStatus: answer?.resolutionStatus ?? null,
        imageCount: link.questao.imageItems.length,
        alternativeImageCount: link.questao.alternativeItems.filter(
          (alternative) => Boolean(alternative.imageUrl),
        ).length,
        pilotTestPublished: Boolean(link.questao.pilotTestPublishedAt),
        reasons,
        testReasons,
      };
    });
  });

  return {
    rows,
    counters: {
      total: rows.length,
      pending: rows.filter(
        (row) =>
          row.status === ContentStatus.REVIEW &&
          row.reviewState === QuestionReviewState.PENDING_REVIEW,
      ).length,
      approved: rows.filter(
        (row) =>
          row.status === ContentStatus.REVIEW &&
          row.reviewState === QuestionReviewState.APPROVED,
      ).length,
      errors: rows.filter((row) => row.reviewState === QuestionReviewState.HAS_ERROR).length,
      published: rows.filter((row) => row.status === ContentStatus.PUBLISHED).length,
      testPublished: rows.filter((row) => row.pilotTestPublished).length,
      publishable: rows.filter(
        (row) => row.status !== ContentStatus.PUBLISHED && row.reasons.length === 0,
      ).length,
      testPublishable: rows.filter(
        (row) => row.status !== ContentStatus.PUBLISHED && row.testReasons.length === 0,
      ).length,
    },
    exams: exams.map((exam) => ({
      id: exam.id,
      title: exam.titulo,
      day: exam.dia,
      status: exam.status,
      total: exam.questoes.length,
      errors: exam.questoes.filter(
        (link) => link.questao.reviewState === QuestionReviewState.HAS_ERROR,
      ).length,
      published: exam.questoes.filter(
        (link) => link.questao.status === ContentStatus.PUBLISHED,
      ).length,
      answerFileId: exam.officialKeyFileId,
      answers: exam.officialKeyFile?.answerKeys.length ?? 0,
      approvedAnswers:
        exam.officialKeyFile?.answerKeys.filter(
          (answer) => answer.answerReviewStatus === OfficialAnswerReviewStatus.APPROVED,
        ).length ?? 0,
    })),
  };
}
