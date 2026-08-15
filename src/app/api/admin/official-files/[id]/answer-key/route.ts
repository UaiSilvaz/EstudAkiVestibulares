import {
  OfficialAnswerReviewStatus,
  OfficialFileType,
  OfficialProcessingStatus,
  OfficialQuestionLanguage,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { logOfficialImport } from "@/lib/official-sources";

type AnswerItem = {
  question_number?: number;
  questionNumber?: number;
  correct_alternative?: string;
  correctAlternative?: string;
  statement?: string;
  subject?: string;
  topic?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const file = await db.officialFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  if (file.fileType !== OfficialFileType.ANSWER_KEY) {
    return NextResponse.json({ error: "Selecione um arquivo de gabarito." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { items?: AnswerItem[]; confirm?: boolean };
    if (!Array.isArray(body.items) || !body.items.length) {
      return NextResponse.json({ error: "Envie as respostas em JSON." }, { status: 400 });
    }
    const normalized: Array<{
      questionNumber: number;
      correctAlternative: string;
      statement: string | null;
      subject: string | null;
      topic: string | null;
      difficulty: "EASY" | "MEDIUM" | "HARD" | null;
    }> = [];
    const invalid: Array<{ index: number; error: string }> = [];
    body.items.forEach((item, index) => {
      const questionNumber = Number(item.question_number ?? item.questionNumber);
      const correctAlternative = String(
        item.correct_alternative ?? item.correctAlternative ?? "",
      ).trim().toUpperCase();
      if (!Number.isInteger(questionNumber) || questionNumber <= 0) {
        invalid.push({ index, error: "Número de questão inválido." });
        return;
      }
      if (!/^(A|B|C|D|E|ANULADA)$/.test(correctAlternative)) {
        invalid.push({ index, error: "Gabarito deve ser A-E ou ANULADA." });
        return;
      }
      normalized.push({
        questionNumber,
        correctAlternative,
        statement: item.statement?.trim() || null,
        subject: item.subject?.trim() || null,
        topic: item.topic?.trim() || null,
        difficulty: item.difficulty ?? null,
      });
    });
    const duplicateNumbers = normalized
      .map((item) => item.questionNumber)
      .filter((number, index, all) => all.indexOf(number) !== index);
    if (duplicateNumbers.length) {
      invalid.push({ index: -1, error: `Questões duplicadas: ${[...new Set(duplicateNumbers)].join(", ")}.` });
    }
    if (!body.confirm) {
      return NextResponse.json({
        preview: true,
        received: body.items.length,
        valid: normalized.length,
        invalid,
      });
    }
    if (invalid.length) {
      return NextResponse.json({ error: "Corrija o gabarito.", invalid }, { status: 400 });
    }

    await db.$transaction(async (transaction) => {
      for (const item of normalized) {
        await transaction.officialAnswerKey.upsert({
          where: {
            fileId_questionNumber_officialLanguage: {
              fileId: id,
              questionNumber: item.questionNumber,
              officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
            },
          },
          update: {
            ...item,
            answerReviewStatus: OfficialAnswerReviewStatus.EXTRACTED,
            answerReviewedBy: null,
            answerReviewedAt: null,
          },
          create: { fileId: id, ...item },
        });
      }
      await transaction.officialFile.update({
        where: { id },
        data: { processingStatus: OfficialProcessingStatus.WAITING_REVIEW },
      });
    });
    await logOfficialImport({
      sourceId: file.sourceId,
      fileId: id,
      action: "answer_key_import",
      status: "SUCCESS",
      message: `${normalized.length} resposta(s) importada(s) por ${user.email}.`,
    });
    return NextResponse.json({ imported: normalized.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gabarito inválido." },
      { status: 400 },
    );
  }
}
