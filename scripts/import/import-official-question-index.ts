import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
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

type ExtractedAlternative = {
  key: string;
  text: string;
  imageUrl?: string | null;
};

type ExtractedQuestion = {
  id: string;
  provaAntigaId: string;
  vestibular: string;
  ano: number;
  fase: string;
  dia: string | null;
  numeroQuestao: number;
  pagina: number;
  disciplina: string | null;
  conteudo: string | null;
  dificuldadeSugerida: "facil" | "media" | "dificil" | null;
  enunciado: string;
  textoApoio: string | null;
  imagemPrincipal: string | null;
  imagens: string[];
  alternativas: ExtractedAlternative[];
  alternativaCorreta: string | null;
  fonteOficial: string;
  fonteUrl: string;
  status: "pendente_revisao" | "com_erro";
  observacoesImportacao: string[];
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

function difficulty(value: ExtractedQuestion["dificuldadeSugerida"]) {
  if (value === "dificil") return Difficulty.HARD;
  if (value === "facil") return Difficulty.EASY;
  return Difficulty.MEDIUM;
}

function assetUrl(question: ExtractedQuestion, storedPath: string) {
  return `/api/provas-antigas/${question.provaAntigaId}/imagem/${encodeURIComponent(path.basename(storedPath))}`;
}

async function selectedFiles() {
  const explicit = process.argv.slice(2).filter((argument) => argument.endsWith("-valid.json"));
  if (explicit.length) return explicit.map((file) => path.resolve(file));
  if (!process.argv.includes("--all")) {
    throw new Error("Informe arquivos *-valid.json ou use --all.");
  }
  const output = path.resolve("scripts/import/output");
  const files = await fs.readdir(output);
  return files
    .filter((file) => /^(enem|fuvest|unicamp|unesp|etec|fatec|provao-paulista)-\d{4}-valid\.json$/i.test(file))
    .map((file) => path.join(output, file))
    .sort();
}

async function main() {
  const confirmed = process.argv.includes("--confirm-import");
  const files = await selectedFiles();
  const questions = (
    await Promise.all(
      files.map(async (file) => JSON.parse(await fs.readFile(file, "utf8")) as ExtractedQuestion[]),
    )
  ).flat();
  const valid = questions.filter(
    (question) =>
      question.status === "pendente_revisao" &&
      /^[A-E]$/.test(question.alternativaCorreta ?? "") &&
      question.enunciado.trim().length >= 20 &&
      question.alternativas.length >= 4,
  );
  const invalid = questions.length - valid.length;

  console.log(
    JSON.stringify(
      {
        files: files.map((file) => path.relative(process.cwd(), file).replaceAll("\\", "/")),
        extracted: questions.length,
        valid,
        invalid,
        confirmed,
      },
      (_key, value) => (Array.isArray(value) && value === valid ? value.length : value),
      2,
    ),
  );
  if (!confirmed) {
    console.log("Prévia concluída. Use --confirm-import para cadastrar o índice oficial em revisão.");
    return;
  }

  const subjectIds = new Map<string, string>();
  const vestibularIds = new Map<string, string>();
  let created = 0;
  let updated = 0;
  let alternatives = 0;
  let images = 0;

  for (const item of valid) {
    let vestibularId = vestibularIds.get(item.vestibular);
    if (!vestibularId) {
      const vestibular = await db.vestibular.upsert({
        where: { slug: slugify(item.vestibular) },
        update: { name: item.vestibular },
        create: {
          name: item.vestibular,
          slug: slugify(item.vestibular),
          color: "#2563EB",
          description: `Questões oficiais referenciadas de ${item.vestibular}.`,
        },
      });
      vestibularId = vestibular.id;
      vestibularIds.set(item.vestibular, vestibular.id);
    }

    const subjectName = item.disciplina?.trim() || "A classificar";
    let subjectId = subjectIds.get(subjectName);
    if (!subjectId) {
      const subject = await db.subject.upsert({
        where: { slug: slugify(subjectName) },
        update: { name: subjectName },
        create: {
          name: subjectName,
          slug: slugify(subjectName),
          description: "Classificação inicial da importação de provas oficiais.",
        },
      });
      subjectId = subject.id;
      subjectIds.set(subjectName, subject.id);
    }

    const normalizedAlternatives = item.alternativas.map((alternative) => ({
      key: alternative.key.toUpperCase(),
      text: alternative.text,
      imageUrl: alternative.imageUrl ? assetUrl(item, alternative.imageUrl) : null,
    }));
    const normalizedImages = item.imagens.map((storedPath, index) => ({
      url: assetUrl(item, storedPath),
      description: `Elemento visual ${index + 1} da questão ${item.numeroQuestao}`,
      altText: `Elemento visual da questão ${item.numeroQuestao}`,
      order: index,
    }));
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
      select: { questaoId: true },
    });
    const questionData = {
      vestibularId,
      subjectId,
      year: item.ano,
      exam: item.provaAntigaId,
      phase: item.fase,
      day: item.dia,
      questionNumber: item.numeroQuestao,
      difficulty: difficulty(item.dificuldadeSugerida),
      statement: item.enunciado,
      supportText: item.textoApoio,
      alternatives: JSON.stringify(normalizedAlternatives),
      alternativeExplanations: "{}",
      correctAlternative: item.alternativaCorreta!,
      explanation: "Resolução EstudAki aguardando geração e revisão humana.",
      pedagogyComment: "Questão oficial em revisão; não publicar antes da conferência editorial.",
      imageUrl: normalizedImages[0]?.url ?? null,
      images: JSON.stringify(normalizedImages),
      tags: JSON.stringify(["oficial-referenciada", slugify(item.vestibular), String(item.ano)]),
      source: item.fonteOficial,
      sourceName: item.fonteOficial,
      sourceUrl: item.fonteUrl,
      sourceCitation: `${item.vestibular} ${item.ano} · questão ${item.numeroQuestao}`,
      sourceType: QuestionSourceType.OFFICIAL,
      reviewState: QuestionReviewState.PENDING_REVIEW,
      reviewNotes:
        item.observacoesImportacao.join(" ") ||
        "Texto, alternativas e gabarito extraídos de PDF oficial; revisão humana obrigatória.",
      contentHash,
      status: ContentStatus.REVIEW,
    };
    const question = existingLink
      ? await db.question.update({ where: { id: existingLink.questaoId }, data: questionData })
      : await db.question.create({ data: questionData });

    await db.$transaction(async (transaction) => {
      await transaction.questionAlternative.deleteMany({ where: { questionId: question.id } });
      await transaction.questionImage.deleteMany({ where: { questionId: question.id } });
      await transaction.questionAlternative.createMany({
        data: normalizedAlternatives.map((alternative, index) => ({
          questionId: question.id,
          key: alternative.key,
          text: alternative.text,
          imageUrl: alternative.imageUrl,
          correct: alternative.key === item.alternativaCorreta,
          order: index,
        })),
      });
      if (normalizedImages.length) {
        await transaction.questionImage.createMany({
          data: normalizedImages.map((image) => ({ questionId: question.id, ...image })),
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
          extractionConfidence: 0.9,
          pageStart: item.pagina,
          pageEnd: item.pagina,
          hasImage:
            normalizedImages.length > 0 ||
            normalizedAlternatives.some((alternative) => Boolean(alternative.imageUrl)),
          needsHumanReview: true,
        },
        create: {
          provaAntigaId: item.provaAntigaId,
          questaoId: question.id,
          numeroQuestao: item.numeroQuestao,
          ordem: item.numeroQuestao,
          paginaPdf: item.pagina,
          extractedStatement: item.enunciado,
          extractionConfidence: 0.9,
          pageStart: item.pagina,
          pageEnd: item.pagina,
          hasImage:
            normalizedImages.length > 0 ||
            normalizedAlternatives.some((alternative) => Boolean(alternative.imageUrl)),
          needsHumanReview: true,
        },
      });
    });

    if (existingLink) updated += 1;
    else created += 1;
    alternatives += normalizedAlternatives.length;
    images += normalizedImages.length;
  }

  const examIds = [...new Set(valid.map((question) => question.provaAntigaId))];
  for (const examId of examIds) {
    const rows = valid.filter((question) => question.provaAntigaId === examId);
    await db.provaAntiga.update({
      where: { id: examId },
      data: {
        importacaoStatus: "AGUARDANDO_REVISAO",
        questoesDetectadas: rows.length,
        questoesValidas: rows.length,
        questoesComErro: 0,
        imagensDetectadas: rows.reduce(
          (total, question) =>
            total +
            question.imagens.length +
            question.alternativas.filter((alternative) => Boolean(alternative.imageUrl)).length,
          0,
        ),
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        created,
        updated,
        alternatives,
        images,
        exams: examIds.length,
        published: 0,
        status: "REVIEW",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
