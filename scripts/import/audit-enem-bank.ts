import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

const db = new PrismaClient();

type Alternative = {
  key?: string;
  text?: string;
  imageUrl?: string | null;
};

function parseAlternatives(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as Alternative[]) : [];
  } catch {
    return [];
  }
}

function normalizeAlternativeContent(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}=<>+\-−×÷/%.,]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function brokenEncoding(value: string | null) {
  return Boolean(value && /Ãƒ|Ã‚|Ã§|Ã£|Ã¡|Ã©|Ãª|Ã³|Ã´|Ãº|Ã­|Ãµ|â€|�/.test(value));
}

function localImageMissing(url: string | null | undefined) {
  if (!url || !url.startsWith("/")) return false;
  const questionAssetPrefix = "/api/questions/assets/";
  if (url.startsWith(questionAssetPrefix)) {
    return !existsSync(
      path.join(process.cwd(), "storage", "questoes", url.slice(questionAssetPrefix.length)),
    );
  }
  return !existsSync(path.join(process.cwd(), "public", url.replace(/^\/+/, "")));
}

function parseQuestionImages(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? (parsed as Array<{ url?: string | null; assetType?: string | null; relation?: string | null }>)
      : [];
  } catch {
    return [];
  }
}

async function main() {
  const enem = await db.vestibular.findUnique({
    where: { slug: "enem" },
    select: { id: true, name: true },
  });
  if (!enem) throw new Error("Vestibular ENEM não encontrado.");

  const questions = await db.question.findMany({
    where: { vestibularId: enem.id },
    include: {
      subject: { select: { name: true } },
      topic: { select: { name: true } },
    },
    orderBy: [{ year: "desc" }, { createdAt: "asc" }],
  });

  const otherExamEnemSources = await db.question.count({
    where: {
      vestibularId: { not: enem.id },
      OR: [
        { sourceName: { contains: "ENEM", mode: "insensitive" } },
        { sourceName: { contains: "INEP", mode: "insensitive" } },
        { sourceUrl: { contains: "enem", mode: "insensitive" } },
      ],
    },
  });

  const issues = questions.map((question) => {
    const alternatives = parseAlternatives(question.alternatives);
    const keys = alternatives.map((item) => String(item.key ?? "").trim().toUpperCase());
    const contentKeys = alternatives.map((item) => {
      const text = normalizeAlternativeContent(String(item.text ?? ""));
      const imageUrl = String(item.imageUrl ?? "").trim();
      return imageUrl ? `${text}|image:${imageUrl}` : text;
    });
    const images = parseQuestionImages(question.images);
    const hasStatementVisual = Boolean(question.imageUrl) ||
      images.some(
        (image) =>
          (image.assetType === "VISUAL" || image.assetType === "PROMPT_FACSIMILE") &&
          image.relation === "STATEMENT",
      );
    const visualText = `${question.supportText ?? ""} ${question.statement}`;
    const reasons: string[] = [];

    if (question.sourceType !== "OFFICIAL") reasons.push("origem não oficial");
    if (
      question.sourceType === "OFFICIAL" &&
      !/INEP/i.test(question.sourceName ?? "") &&
      !/(gov\.br\/inep|enem)/i.test(question.sourceUrl ?? "")
    ) {
      reasons.push("fonte oficial não confirmada");
    }
    if (alternatives.length !== 5) reasons.push("quantidade de alternativas diferente de cinco");
    if (new Set(keys).size !== alternatives.length || keys.some((key) => !key)) {
      reasons.push("identificação de alternativas inválida");
    }
    if (new Set(contentKeys).size !== alternatives.length || contentKeys.some((key) => !key)) {
      reasons.push("alternativas duplicadas ou vazias");
    }
    if (!keys.includes(question.correctAlternative)) reasons.push("gabarito não encontrado nas alternativas");
    if (!question.statement.trim()) reasons.push("comando ausente");
    if (
      !question.supportText?.trim() &&
      !question.imageUrl &&
      /^[a-záéíóúâêôãõç]/u.test(question.statement.trim())
    ) {
      reasons.push("possível início truncado");
    }
    if (!question.subjectId || !question.topicId) reasons.push("classificação incompleta");
    if (
      /\b(gráfico|tabela|figura|charge|tirinha|diagrama|ilustração)\b/i.test(visualText) &&
      !hasStatementVisual
    ) {
      reasons.push("elemento visual citado sem imagem");
    }
    if (localImageMissing(question.imageUrl)) reasons.push("arquivo principal de imagem ausente");
    if (alternatives.some((item) => localImageMissing(item.imageUrl))) {
      reasons.push("arquivo de imagem de alternativa ausente");
    }
    if (
      [
        question.supportText,
        question.statement,
        question.explanation,
        question.alternativeExplanations,
      ].some(brokenEncoding)
    ) {
      reasons.push("codificação de texto corrompida");
    }
    const reviewNotes = question.reviewNotes ?? "";
    if (/comando da questão ausente|comando.*incompleto/i.test(reviewNotes)) {
      reasons.push("comando ausente");
    }
    if (/elemento visual citado/i.test(reviewNotes) && !reasons.includes("elemento visual citado sem imagem")) {
      reasons.push("elemento visual citado sem imagem");
    }
    if (/alternativas duplicadas|alternativa sem texto/i.test(reviewNotes) && !reasons.includes("alternativas duplicadas ou vazias")) {
      reasons.push("alternativas duplicadas ou vazias");
    }

    return {
      id: question.id,
      year: question.year,
      exam: question.exam,
      status: question.status,
      sourceType: question.sourceType,
      reviewState: question.reviewState,
      subject: question.subject.name,
      topic: question.topic?.name ?? null,
      statement: question.statement.slice(0, 180),
      reviewNotes: question.reviewNotes,
      reasons,
    };
  });

  const countReason = (reason: string) =>
    issues.filter((item) => item.reasons.includes(reason)).length;
  const manualReview = issues.filter(
    (item) => item.status !== "PUBLISHED" || item.reviewState === "HAS_ERROR",
  );
  const official = questions.filter((question) => question.sourceType === "OFFICIAL");
  const publishedOfficial = official.filter((question) => question.status === "PUBLISHED");
  const nonOfficial = questions.filter((question) => question.sourceType !== "OFFICIAL");
  const incomplete = issues.filter(
    (item) =>
      item.sourceType === "OFFICIAL" &&
      (item.reviewState === "HAS_ERROR" ||
        item.reasons.some((reason) =>
          [
            "quantidade de alternativas diferente de cinco",
            "identificação de alternativas inválida",
            "alternativas duplicadas ou vazias",
            "comando ausente",
            "possível início truncado",
            "elemento visual citado sem imagem",
            "arquivo principal de imagem ausente",
            "arquivo de imagem de alternativa ausente",
          ].includes(reason),
        )),
  );
  const exampleReasons = [
    "origem não oficial",
    "comando ausente",
    "possível início truncado",
    "alternativas duplicadas ou vazias",
    "elemento visual citado sem imagem",
    "gabarito não encontrado nas alternativas",
    "codificação de texto corrompida",
  ];
  const examples = exampleReasons.flatMap((reason) =>
    issues
      .filter((item) => item.reasons.includes(reason))
      .slice(0, 4)
      .map((item) => ({ ...item, highlightedReason: reason })),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      allEnemRows: questions.length,
      officialRows: official.length,
      publishedOfficial: publishedOfficial.length,
      hiddenNonOfficial: nonOfficial.filter((question) => question.status !== "PUBLISHED").length,
      publishedNonOfficial: nonOfficial.filter((question) => question.status === "PUBLISHED").length,
      enemSourcesOutsideEnem: otherExamEnemSources,
      incomplete: incomplete.length,
      invalidAnswerKey: countReason("gabarito não encontrado nas alternativas"),
      duplicateOrEmptyAlternatives: countReason("alternativas duplicadas ou vazias"),
      missingVisual: countReason("elemento visual citado sem imagem"),
      suspiciousOpening: countReason("possível início truncado"),
      missingImageFile:
        countReason("arquivo principal de imagem ausente") +
        countReason("arquivo de imagem de alternativa ausente"),
      brokenEncoding: countReason("codificação de texto corrompida"),
      unverifiedOfficialSource: countReason("fonte oficial não confirmada"),
      missingClassification: countReason("classificação incompleta"),
      manualReview: manualReview.length,
      officialManualReview: manualReview.filter((item) => item.sourceType === "OFFICIAL").length,
    },
    examples,
  };

  const reportDirectory = path.join(process.cwd(), "data", "reports");
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(
    path.join(reportDirectory, "enem-question-audit-latest.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const markdown = `# Auditoria do banco ENEM

Gerado em: ${report.generatedAt}

## Resumo

- Registros vinculados ao ENEM: ${report.totals.allEnemRows}
- Questões oficiais identificadas: ${report.totals.officialRows}
- Questões oficiais publicadas: ${report.totals.publishedOfficial}
- Questões não oficiais ocultas: ${report.totals.hiddenNonOfficial}
- Questões não oficiais publicadas: ${report.totals.publishedNonOfficial}
- Fontes ENEM vinculadas a outros vestibulares: ${report.totals.enemSourcesOutsideEnem}
- Questões estruturalmente incompletas: ${report.totals.incomplete}
- Gabaritos inválidos: ${report.totals.invalidAnswerKey}
- Alternativas duplicadas ou vazias: ${report.totals.duplicateOrEmptyAlternatives}
- Elementos visuais citados sem imagem: ${report.totals.missingVisual}
- Possíveis inícios truncados: ${report.totals.suspiciousOpening}
- Arquivos de imagem ausentes: ${report.totals.missingImageFile}
- Textos com codificação corrompida: ${report.totals.brokenEncoding}
- Fontes oficiais sem confirmação: ${report.totals.unverifiedOfficialSource}
- Classificações incompletas: ${report.totals.missingClassification}
- Registros fora da publicação ou com erro: ${report.totals.manualReview}
- Questões oficiais que exigem revisão manual: ${report.totals.officialManualReview}

## Critério

A auditoria percorre cada registro ENEM e verifica origem, publicação, cinco alternativas, unicidade, gabarito, classificação, referências visuais, arquivos locais e codificação. Nenhum gabarito ou conteúdo ausente é inventado; itens duvidosos permanecem fora da listagem pública.
`;
  await writeFile(
    path.join(reportDirectory, "enem-question-audit-latest.md"),
    markdown,
    "utf8",
  );

  console.log(JSON.stringify(report.totals, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
