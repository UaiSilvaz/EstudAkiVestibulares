import { ContentStatus, Difficulty, OfficialQuestionLanguage, PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

const prisma = new PrismaClient();

async function main() {
  loadEnvConfig(process.cwd());
  const confirmed = process.argv.includes("--confirm-import");
  const files = process.argv.slice(2).filter((argument) => argument.endsWith("-valid.json"));

  if (!files.length) throw new Error("Informe ao menos um arquivo *-valid.json.");

  const questions = (
    await Promise.all(files.map(async (file) => JSON.parse(await fs.readFile(path.resolve(file), "utf8"))))
  ).flat();
  const summary = {
    arquivos: files.length,
    questoes: questions.length,
    comGabarito: questions.filter((question) => /^[A-E]$/.test(question.alternativaCorreta ?? "")).length,
    semGabarito: questions.filter((question) => !/^[A-E]$/.test(question.alternativaCorreta ?? "")).length,
    comExplicacaoCompleta: questions.filter((question) => (question.explicacaoInicial ?? "").trim().length >= 80).length,
    bloqueadasSemExplicacao: questions.filter((question) => (question.explicacaoInicial ?? "").trim().length < 80).length,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!confirmed) {
    console.log("Prévia concluída. Nenhuma questão foi importada. Use --confirm-import somente após aprovação humana dos JSONs.");
    return;
  }

  for (const item of questions) {
    if (
      item.status !== "pendente_revisao" ||
      !/^[A-E]$/.test(item.alternativaCorreta ?? "") ||
      (item.explicacaoInicial ?? "").trim().length < 80
    ) continue;
    const vestibularSlug = item.vestibular.toLowerCase();
    const vestibular = await prisma.vestibular.upsert({
      where: { slug: vestibularSlug },
      update: {},
      create: {
        name: item.vestibular,
        slug: vestibularSlug,
        color: item.vestibular === "UNICAMP" ? "#7C3AED" : item.vestibular === "FUVEST" ? "#0057B8" : "#1E73FF",
        description: `Questões oficiais de ${item.vestibular}.`,
      },
    });
    const subjectName = item.disciplina || "A classificar";
    const subjectSlug = subjectName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase();
    const subject = await prisma.subject.upsert({
      where: { slug: subjectSlug },
      update: {},
      create: { name: subjectName, slug: subjectSlug, description: "Classificação inicial da importação de provas antigas." },
    });
    const duplicate = await prisma.provaAntigaQuestao.findUnique({
      where: {
        provaAntigaId_numeroQuestao_officialLanguage: {
          provaAntigaId: item.provaAntigaId,
          numeroQuestao: item.numeroQuestao,
          officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
        },
      },
    });
    if (duplicate) continue;
    await prisma.$transaction(async (transaction) => {
      const question = await transaction.question.create({ data: {
        vestibularId: vestibular.id,
        subjectId: subject.id,
        year: item.ano,
        exam: item.provaAntigaId,
        phase: item.fase,
        day: item.dia,
        questionNumber: item.numeroQuestao,
        difficulty:
          item.dificuldadeSugerida === "dificil"
            ? Difficulty.HARD
            : item.dificuldadeSugerida === "facil"
              ? Difficulty.EASY
              : Difficulty.MEDIUM,
        statement: item.enunciado,
        supportText: item.textoApoio,
        alternatives: JSON.stringify(item.alternativas),
        alternativeExplanations: "{}",
        correctAlternative: item.alternativaCorreta,
        explanation: item.explicacaoInicial,
        imageUrl: item.imagemPrincipal ? `/api/provas-antigas/${item.provaAntigaId}/imagem/${path.basename(item.imagemPrincipal)}` : null,
        tags: JSON.stringify([item.vestibular, String(item.ano), "prova-antiga"]),
        source: item.fonteUrl,
        sourceName: item.fonteOficial,
        sourceUrl: item.fonteUrl,
        sourceType: "OFFICIAL",
        reviewState: "PENDING_REVIEW",
        reviewNotes: (item.observacoesImportacao ?? []).join(" ") || "Revisar extração oficial antes da publicação.",
        status: ContentStatus.REVIEW,
      } });
      await transaction.provaAntigaQuestao.create({ data: {
        provaAntigaId: item.provaAntigaId,
        questaoId: question.id,
        numeroQuestao: item.numeroQuestao,
        ordem: item.numeroQuestao,
        paginaPdf: item.pagina,
      } });
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
