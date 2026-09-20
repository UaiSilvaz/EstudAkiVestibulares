import { ContentStatus, Difficulty, OfficialQuestionLanguage, PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

const prisma = new PrismaClient();

async function main() {
  loadEnvConfig(process.cwd());
  const confirmed = process.argv.includes("--confirm-import");
  const allowGenericExplanation = process.argv.includes("--allow-generic-explanation");
  const files = process.argv.slice(2).filter((argument) => argument.endsWith("-valid.json"));

  if (!files.length) throw new Error("Informe ao menos um arquivo *-valid.json.");

  const questions = (
    await Promise.all(files.map(async (file) => JSON.parse(await fs.readFile(path.resolve(file), "utf8"))))
  ).flat();
  const explanationFor = (item: Record<string, unknown>) => {
    const existing = String(item.explicacaoInicial ?? "").trim();
    if (existing.length >= 80) return existing;
    if (!allowGenericExplanation) return existing;
    const vestibular = String(item.vestibular ?? "prova oficial");
    const ano = String(item.ano ?? "");
    const numero = String(item.numeroQuestao ?? "");
    const alternativa = String(item.alternativaCorreta ?? "").trim().toUpperCase();
    return [
      `Gabarito oficial de ${vestibular} ${ano}, questao ${numero}: alternativa ${alternativa}.`,
      "Resolucao detalhada pendente de curadoria; o item permanece em revisao e deve ser conferido no fac-simile oficial antes da publicacao.",
    ].join(" ");
  };

  const summary = {
    arquivos: files.length,
    questoes: questions.length,
    comGabarito: questions.filter((question) => /^[A-E]$/.test(question.alternativaCorreta ?? "")).length,
    semGabarito: questions.filter((question) => !/^[A-E]$/.test(question.alternativaCorreta ?? "")).length,
    comExplicacaoCompleta: questions.filter((question) => explanationFor(question).length >= 80).length,
    bloqueadasSemExplicacao: questions.filter((question) => explanationFor(question).length < 80).length,
    genericExplanationEnabled: allowGenericExplanation,
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
      explanationFor(item).length < 80
    ) continue;
    const explanation = explanationFor(item);
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
        explanation,
        imageUrl: item.imagemPrincipal ? `/api/provas-antigas/${item.provaAntigaId}/imagem/${path.basename(item.imagemPrincipal)}` : null,
        tags: JSON.stringify([item.vestibular, String(item.ano), "prova-antiga"]),
        source: item.fonteUrl,
        sourceName: item.fonteOficial,
        sourceUrl: item.fonteUrl,
        sourceType: "OFFICIAL",
        reviewState: "PENDING_REVIEW",
        reviewNotes:
          [
            ...(item.observacoesImportacao ?? []),
            allowGenericExplanation && !(item.explicacaoInicial ?? "").trim()
              ? "Resolucao detalhada nao foi inferida; explicacao generica usa apenas o gabarito oficial."
              : null,
          ].filter(Boolean).join(" ") || "Revisar extração oficial antes da publicação.",
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
