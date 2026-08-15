import {
  OfficialAnswerReviewStatus,
  OfficialFileType,
  OfficialProcessingStatus,
  OfficialQuestionLanguage,
} from "@prisma/client";
import { db } from "@/lib/db";
import { readOfficialFile } from "@/lib/official-file-storage";
import { logOfficialImport } from "@/lib/official-sources";

async function extractPdfText(fileName: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = await readOfficialFile(fileName);
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " "),
    );
  }
  return pages.join("\n");
}

function parseAnswerKey(text: string) {
  const answers = new Map<number, string>();
  const patterns = [
    /(?:QUEST[ÃA]O\s*)?(\d{1,3})\s*[-–—.:)]\s*(A|B|C|D|E|ANULAD[AO])\b/gi,
    /\b(\d{1,3})\s+(A|B|C|D|E|ANULAD[AO])\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const questionNumber = Number(match[1]);
      const rawAlternative = match[2].toUpperCase();
      const alternative = rawAlternative.startsWith("ANULAD") ? "ANULADA" : rawAlternative;
      if (
        Number.isInteger(questionNumber) &&
        questionNumber > 0 &&
        questionNumber <= 300 &&
        !answers.has(questionNumber)
      ) {
        answers.set(questionNumber, alternative);
      }
    }
  }
  return [...answers.entries()]
    .map(([questionNumber, correctAlternative]) => ({ questionNumber, correctAlternative }))
    .sort((a, b) => a.questionNumber - b.questionNumber);
}

export async function extractOfficialAnswerKey(fileId: string, requestedBy: string) {
  const file = await db.officialFile.findUnique({ where: { id: fileId } });
  if (!file) throw new Error("Arquivo não encontrado.");
  if (file.fileType !== OfficialFileType.ANSWER_KEY) {
    throw new Error("A extração automática está disponível para arquivos de gabarito.");
  }
  await db.officialFile.update({
    where: { id: fileId },
    data: { processingStatus: OfficialProcessingStatus.EXTRACTING },
  });
  await logOfficialImport({
    sourceId: file.sourceId,
    fileId,
    action: "answer_key_extract",
    status: "STARTED",
    message: `Extração iniciada por ${requestedBy}.`,
  });

  try {
    const text = await extractPdfText(file.fileName);
    const answers = parseAnswerKey(text);
    if (!answers.length) {
      throw new Error("Nenhuma resposta reconhecida automaticamente; use a importação JSON.");
    }
    await db.$transaction(async (transaction) => {
      for (const answer of answers) {
        await transaction.officialAnswerKey.upsert({
          where: {
            fileId_questionNumber_officialLanguage: {
              fileId,
              questionNumber: answer.questionNumber,
              officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
            },
          },
          update: {
            correctAlternative: answer.correctAlternative,
            answerReviewStatus: OfficialAnswerReviewStatus.EXTRACTED,
            answerReviewedBy: null,
            answerReviewedAt: null,
          },
          create: { fileId, ...answer },
        });
      }
      await transaction.officialFile.update({
        where: { id: fileId },
        data: {
          processingStatus: OfficialProcessingStatus.WAITING_REVIEW,
          downloadLog: `${file.downloadLog}\n${answers.length} respostas extraídas automaticamente em ${new Date().toISOString()}.`.trim(),
        },
      });
    });
    await logOfficialImport({
      sourceId: file.sourceId,
      fileId,
      action: "answer_key_extract",
      status: "SUCCESS",
      message: `${answers.length} resposta(s) extraída(s); revisão humana obrigatória.`,
    });
    return { extracted: answers.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na extração.";
    await db.officialFile.update({
      where: { id: fileId },
      data: { processingStatus: OfficialProcessingStatus.ERROR },
    });
    await logOfficialImport({
      sourceId: file.sourceId,
      fileId,
      action: "answer_key_extract",
      status: "ERROR",
      message,
    });
    throw new Error(message);
  }
}
