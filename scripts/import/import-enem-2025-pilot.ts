import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  ContentStatus,
  Difficulty,
  OfficialQuestionLanguage,
  PrismaClient,
  QuestionReviewState,
  QuestionSourceType,
} from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

type ExtractedAlternative = { key: string; text: string; imageUrl?: string | null };
type ExtractedQuestion = {
  id: string;
  provaAntigaId: string;
  vestibular: string;
  ano: number;
  fase: string;
  dia: string;
  numeroQuestao: number;
  pagina: number | null;
  disciplina: string;
  conteudo: string | null;
  dificuldadeSugerida: string;
  enunciado: string;
  textoApoio: string | null;
  imagemPrincipal: string | null;
  imagens: string[];
  alternativas: ExtractedAlternative[];
  alternativaCorreta: string;
  fonteOficial: string;
  fonteUrl: string;
  status: "pendente_revisao" | "com_erro";
  observacoesImportacao: string[];
};

const officialFiles = {
  "pa-enem-2025-dia-1": {
    examFileId: "cmr3y34o10003s9u0vgfgqpsc",
    answerFileId: "cmr3y3dsa0003s9d8pn3n3wxz",
  },
  "pa-enem-2025-dia-2": {
    examFileId: "cmr3y3f2f0009s9d8c9wj6gxq",
    answerFileId: "cmr3y3f5y000fs9d8qt5fyh02",
  },
} as const;

function difficulty(value: string) {
  if (value === "facil") return Difficulty.EASY;
  if (value === "dificil") return Difficulty.HARD;
  return Difficulty.MEDIUM;
}

function imageUrl(examId: string, storedPath: string) {
  return `/api/provas-antigas/${examId}/imagem/${path.basename(storedPath)}`;
}

function alternativesFor(question: ExtractedQuestion): ExtractedAlternative[] {
  if (question.alternativas.length >= 2) return question.alternativas;
  return ["A", "B", "C", "D", "E"].map((key) => ({
    key,
    text: `Alternativa ${key} aguardando conferência visual no caderno oficial.`,
    imageUrl: null,
  }));
}

async function main() {
  const structured = JSON.parse(
    await readFile("scripts/import/output/enem-2025-structured.json", "utf8"),
  ) as ExtractedQuestion[];
  const errorItems = JSON.parse(
    await readFile("scripts/import/output/enem-2025-errors.json", "utf8"),
  ) as ExtractedQuestion[];
  const errors = new Set(errorItems.map((item) => item.id));
  const vestibular = await db.vestibular.findUnique({ where: { slug: "enem" } });
  if (!vestibular) throw new Error("Vestibular ENEM não encontrado.");
  const subjects = await db.subject.findMany();
  const subjectByName = new Map(subjects.map((subject) => [subject.name, subject.id]));
  const fallbackSubject = subjects.find((subject) => subject.slug === "a-classificar");
  if (!fallbackSubject) throw new Error("Matéria A classificar não encontrada.");

  let created = 0;
  let updated = 0;
  let links = 0;
  let withImages = 0;
  let needsReview = 0;

  for (const item of structured) {
    const filePair = officialFiles[item.provaAntigaId as keyof typeof officialFiles];
    if (!filePair) continue;
    const itemHasError = errors.has(item.id) || item.status === "com_erro";
    const mappedImages = item.imagens.map((image, index) => ({
      url: imageUrl(item.provaAntigaId, image),
      description: `Imagem ${index + 1} da questão ${item.numeroQuestao}`,
      altText: `Elemento visual da questão ${item.numeroQuestao}`,
      order: index,
    }));
    const mappedAlternatives = alternativesFor(item).map((alternative) => ({
      key: alternative.key,
      text: alternative.text,
      imageUrl: alternative.imageUrl
        ? imageUrl(item.provaAntigaId, alternative.imageUrl)
        : null,
    }));
    const correctAlternative = item.alternativaCorreta || "A";
    const reviewNotes = [
      "Questão oficial referenciada do ENEM 2025.",
      "Texto e imagens extraídos automaticamente; revisão humana obrigatória.",
      "Resolução EstudAki ainda não gerada.",
      ...item.observacoesImportacao,
    ].join(" ");
    const contentHash = createHash("sha256")
      .update(`official-reference:${item.provaAntigaId}:${item.numeroQuestao}`)
      .digest("hex");
    const existingLink = await db.provaAntigaQuestao.findUnique({
      where: {
        provaAntigaId_numeroQuestao_officialLanguage: {
          provaAntigaId: item.provaAntigaId,
          numeroQuestao: item.numeroQuestao,
          officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
        },
      },
      include: { questao: true },
    });
    const subjectId = subjectByName.get(item.disciplina) ?? fallbackSubject.id;
    const primaryImage = mappedImages[0]?.url ?? null;

    const question = existingLink
      ? await db.question.update({
          where: { id: existingLink.questaoId },
          data: {
            subjectId,
            year: item.ano,
            exam: `ENEM 2025 · ${item.dia}`,
            phase: item.fase,
            day: item.dia,
            questionNumber: item.numeroQuestao,
            difficulty: difficulty(item.dificuldadeSugerida),
            supportText: item.textoApoio,
            statement: item.enunciado,
            alternatives: JSON.stringify(mappedAlternatives),
            correctAlternative,
            explanation: "Resolução EstudAki aguardando geração e revisão humana.",
            tags: JSON.stringify([
              "oficial-referenciada",
              "enem",
              "2025",
              "em-revisao",
              ...(item.numeroQuestao <= 5 ? ["lingua-inglesa"] : []),
            ]),
            source: item.fonteOficial,
            sourceName: item.fonteOficial,
            sourceUrl: item.fonteUrl,
            sourceCitation: `ENEM 2025 · ${item.dia} · questão ${item.numeroQuestao}`,
            sourceType: QuestionSourceType.OFFICIAL,
            imageUrl: primaryImage,
            images: JSON.stringify(mappedImages),
            reviewState: itemHasError ? QuestionReviewState.HAS_ERROR : QuestionReviewState.PENDING_REVIEW,
            reviewNotes,
            contentHash,
            status: ContentStatus.REVIEW,
          },
        })
      : await db.question.create({
          data: {
            vestibularId: vestibular.id,
            subjectId,
            year: item.ano,
            exam: `ENEM 2025 · ${item.dia}`,
            phase: item.fase,
            day: item.dia,
            questionNumber: item.numeroQuestao,
            difficulty: difficulty(item.dificuldadeSugerida),
            supportText: item.textoApoio,
            statement: item.enunciado,
            alternatives: JSON.stringify(mappedAlternatives),
            alternativeExplanations: "{}",
            correctAlternative,
            explanation: "Resolução EstudAki aguardando geração e revisão humana.",
            pedagogyComment: "Índice oficial importado; não publicar antes da revisão completa.",
            tags: JSON.stringify([
              "oficial-referenciada",
              "enem",
              "2025",
              "em-revisao",
              ...(item.numeroQuestao <= 5 ? ["lingua-inglesa"] : []),
            ]),
            source: item.fonteOficial,
            sourceName: item.fonteOficial,
            sourceUrl: item.fonteUrl,
            sourceCitation: `ENEM 2025 · ${item.dia} · questão ${item.numeroQuestao}`,
            sourceType: QuestionSourceType.OFFICIAL,
            imageUrl: primaryImage,
            images: JSON.stringify(mappedImages),
            reviewState: itemHasError ? QuestionReviewState.HAS_ERROR : QuestionReviewState.PENDING_REVIEW,
            reviewNotes,
            contentHash,
            status: ContentStatus.REVIEW,
          },
        });

    await db.$transaction(async (transaction) => {
      await transaction.questionAlternative.deleteMany({ where: { questionId: question.id } });
      await transaction.questionImage.deleteMany({ where: { questionId: question.id } });
      await transaction.questionAlternative.createMany({
        data: mappedAlternatives.map((alternative, index) => ({
          questionId: question.id,
          key: alternative.key,
          text: alternative.text,
          imageUrl: alternative.imageUrl,
          correct: alternative.key === correctAlternative,
          order: index,
        })),
      });
      if (mappedImages.length) {
        await transaction.questionImage.createMany({
          data: mappedImages.map((image) => ({
            questionId: question.id,
            url: image.url,
            description: image.description,
            altText: image.altText,
            order: image.order,
          })),
        });
      }
      await transaction.provaAntigaQuestao.upsert({
        where: {
          provaAntigaId_numeroQuestao_officialLanguage: {
            provaAntigaId: item.provaAntigaId,
            numeroQuestao: item.numeroQuestao,
            officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
          },
        },
        update: {
          questaoId: question.id,
          ordem: item.numeroQuestao,
          paginaPdf: item.pagina,
          extractedStatement: item.enunciado,
          extractionConfidence: itemHasError ? 0.45 : 0.9,
          pageStart: item.pagina,
          pageEnd: item.pagina,
          hasImage:
            mappedImages.length > 0 ||
            mappedAlternatives.some((alternative) => Boolean(alternative.imageUrl)),
          needsHumanReview: true,
        },
        create: {
          provaAntigaId: item.provaAntigaId,
          questaoId: question.id,
          numeroQuestao: item.numeroQuestao,
          ordem: item.numeroQuestao,
          paginaPdf: item.pagina,
          extractedStatement: item.enunciado,
          extractionConfidence: itemHasError ? 0.45 : 0.9,
          pageStart: item.pagina,
          pageEnd: item.pagina,
          hasImage:
            mappedImages.length > 0 ||
            mappedAlternatives.some((alternative) => Boolean(alternative.imageUrl)),
          needsHumanReview: true,
        },
      });
      await transaction.officialAnswerKey.updateMany({
        where: {
          fileId: filePair.answerFileId,
          questionNumber: item.numeroQuestao,
        },
        data: {
          statement: item.enunciado,
          subject: item.disciplina,
          topic: item.conteudo,
          difficulty: difficulty(item.dificuldadeSugerida),
          officialQuestionUrl: `/provas-antigas/${item.provaAntigaId}/editor`,
        },
      });
    });

    if (existingLink) updated += 1;
    else created += 1;
    links += 1;
    if (
      mappedImages.length ||
      mappedAlternatives.some((alternative) => Boolean(alternative.imageUrl))
    ) {
      withImages += 1;
    }
    if (itemHasError) needsReview += 1;
  }

  for (const [examId, files] of Object.entries(officialFiles)) {
    const examFile = await db.officialFile.findUniqueOrThrow({ where: { id: files.examFileId } });
    const count = structured.filter((item) => item.provaAntigaId === examId).length;
    const invalid = structured.filter((item) => item.provaAntigaId === examId && errors.has(item.id)).length;
    const currentExam = await db.provaAntiga.findUniqueOrThrow({
      where: { id: examId },
      select: { status: true },
    });
    await db.provaAntiga.update({
      where: { id: examId },
      data: {
        status:
          currentExam.status === "APROVADA" || currentExam.status === "DISPONIVEL"
            ? currentExam.status
            : "PENDENTE",
        importacaoStatus: "AGUARDANDO_REVISAO",
        questoesDetectadas: count,
        questoesValidas: count - invalid,
        questoesComErro: invalid,
        officialExamFileId: files.examFileId,
        officialKeyFileId: files.answerFileId,
        fileHash: examFile.sha256Hash,
      },
    });
    await db.officialFile.updateMany({
      where: {
        id: files.examFileId,
      },
      data: { processingStatus: "WAITING_REVIEW" },
    });
  }

  await db.officialImportLog.create({
    data: {
      action: "enem_2025_pilot_index",
      status: "SUCCESS",
      message: `${created} questões criadas, ${updated} atualizadas e ${links} vinculadas; nenhuma publicada.`,
      metadata: JSON.stringify({ created, updated, links, withImages, needsReview }),
    },
  });
  console.log(JSON.stringify({ created, updated, links, withImages, needsReview, published: 0 }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
