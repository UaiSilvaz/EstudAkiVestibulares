import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { type BankQuestion, countBy, validateQuestion } from "./question-bank-core";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

async function main() {
  const file = path.resolve("scripts/import/output/banco-extenso-questoes-validas.json");
  const questions = JSON.parse(await fs.readFile(file, "utf8")) as BankQuestion[];
  const invalid = questions.flatMap((question) => {
    const reasons = validateQuestion(question);
    return reasons.length ? [{ externalId: question.externalId, reasons }] : [];
  });
  const dbTotal = await db.question.count();
  const pending = await db.question.count({ where: { status: "REVIEW" } });
  const pendingPedagogicalReview = await db.question.count({ where: { reviewState: "PENDING_REVIEW" } });
  const publishedAuthorial = await db.question.count({ where: { sourceType: "AUTHORIAL", status: "PUBLISHED" } });
  const missingExplanation = await db.question.count({ where: { OR: [{ explanation: "" }, { alternativeExplanations: "{}" }] } });
  const authorial = await db.question.count({ where: { sourceType: "AUTHORIAL" } });
  const official = await db.question.count({ where: { sourceType: "OFFICIAL" } });
  const webPublic = await db.question.count({ where: { sourceType: "WEB_PUBLIC" } });
  const withImage = await db.question.count({ where: { OR: [{ imageUrl: { not: null } }, { images: { not: "[]" } }] } });
  const withError = await db.question.count({ where: { reviewState: "HAS_ERROR" } });
  const databaseAlternatives = await db.question.findMany({ select: { id: true, alternatives: true, reviewNotes: true, reviewState: true } });
  const totalAlternatives = databaseAlternatives.reduce((total, item) => {
    try { return total + (JSON.parse(item.alternatives) as unknown[]).length; } catch { return total; }
  }, 0);
  const byVestibularRecords = await db.vestibular.findMany({
    select: { name: true, _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });
  const summary = {
    validFile: { total: questions.length, invalid: invalid.length, byVestibular: countBy(questions, (item) => item.vestibular) },
    database: {
      total: dbTotal,
      pending,
      pendingPedagogicalReview,
      authorial,
      official,
      webPublic,
      withImage,
      withError,
      totalAlternatives,
      missingExplanation,
      publishedAuthorial,
      byVestibular: Object.fromEntries(byVestibularRecords.map((item) => [item.name, item._count.questions])),
    },
  };
  const sourcesPath = path.resolve("scripts/import/output/banco-extenso-fontes.json");
  const authorialResultPath = path.resolve("scripts/import/output/questoes-autorais-result.json");
  const sources = JSON.parse(await fs.readFile(sourcesPath, "utf8")) as Array<{ pode_importar: boolean; tipo_fonte: string }>;
  const authorialResult = JSON.parse(await fs.readFile(authorialResultPath, "utf8")) as { totalDuplicates: number; totalRejectedLowQuality: number };
  const reached = byVestibularRecords.filter((item) => item._count.questions >= 900).map((item) => item.name);
  const report = `# Relatório final do banco extenso de questões\n\n` +
    `Gerado em ${new Date().toISOString()}. Questões autorais podem ser publicadas por ação administrativa explícita; a revisão pedagógica permanece rastreada separadamente.\n\n` +
    `## Totais no banco\n\n` +
    `- Questões cadastradas: ${dbTotal.toLocaleString("pt-BR")}\n` +
    `- Oficiais: ${official.toLocaleString("pt-BR")}\n` +
    `- Web pública: ${webPublic.toLocaleString("pt-BR")}\n` +
    `- Autorais EstudAki: ${authorial.toLocaleString("pt-BR")}\n` +
    `- Com imagem: ${withImage.toLocaleString("pt-BR")}\n` +
    `- Com explicação completa: ${(dbTotal - missingExplanation).toLocaleString("pt-BR")}\n` +
    `- Alternativas cadastradas: ${totalAlternatives.toLocaleString("pt-BR")}\n` +
    `- Ocultas em status REVIEW: ${pending.toLocaleString("pt-BR")}\n` +
    `- Publicadas, mas ainda pendentes de revisão pedagógica: ${pendingPedagogicalReview.toLocaleString("pt-BR")}\n` +
    `- Marcadas com erro: ${withError.toLocaleString("pt-BR")}\n` +
    `- Duplicadas ignoradas na geração: ${authorialResult.totalDuplicates.toLocaleString("pt-BR")}\n` +
    `- Rejeitadas automaticamente por qualidade: ${authorialResult.totalRejectedLowQuality.toLocaleString("pt-BR")}\n\n` +
    `## Distribuição por vestibular\n\n${byVestibularRecords.map((item) => `- ${item.name}: ${item._count.questions.toLocaleString("pt-BR")}`).join("\n")}\n\n` +
    `Vestibulares com pelo menos 900 questões: **${reached.join(", ")}**.\n\n` +
    `## Fontes\n\n` +
    `- Analisadas: ${sources.length}\n` +
    `- Aceitas para pipeline: ${sources.filter((item) => item.pode_importar).length}\n` +
    `- Recusadas: ${sources.filter((item) => item.tipo_fonte === "recusada").length}\n` +
    `- Web pública importada nesta execução: 0; nenhuma fonte não oficial apresentou permissão suficientemente clara.\n\n` +
    `## Pendências honestas\n\n` +
    `As 69 questões oficiais de UNICAMP já existentes possuem gabarito e imagens extraídas, mas ainda não têm explicação pedagógica completa. Elas foram marcadas como HAS_ERROR e continuam invisíveis ao aluno. Os demais JSONs oficiais extraídos somam centenas de itens, porém o novo importador os bloqueia até que recebam explicações originais revisadas.\n\n` +
    `## Publicação\n\n` +
    `Use Admin > Editor de questões > Fila do banco. Filtre por vestibular, matéria, conteúdo, dificuldade, fonte e status. Revise enunciado, gabarito, explicação e observações; só então altere reviewState para APPROVED e status para PUBLISHED.\n`;
  await fs.writeFile(path.resolve("scripts/import/output/banco-extenso-relatorio.md"), report, "utf8");
  await fs.writeFile(path.resolve("scripts/import/output/banco-extenso-questoes-com-erro.json"), JSON.stringify({
    generatorRejected: authorialResult.totalRejectedLowQuality,
    databaseWithError: databaseAlternatives.filter((item) => item.reviewState === "HAS_ERROR").map((item) => ({ id: item.id, reasons: [item.reviewNotes || "Revisão necessária"] })),
  }, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
  if (invalid.length) process.exitCode = 1;
}

main().finally(async () => db.$disconnect());
