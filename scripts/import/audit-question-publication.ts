import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import path from "node:path";

loadEnvConfig(process.cwd());

const db = new PrismaClient();

type Alternative = {
  key?: string;
  text?: string;
};

function normalizedAlternative(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function parseAlternatives(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as Alternative[]) : [];
  } catch {
    return [];
  }
}

function hasMissingVisual(
  statement: string,
  supportText: string | null,
  imageUrl: string | null,
) {
  if (imageUrl) return false;
  return /\b(gráfico|tabela|figura|charge|tirinha|diagrama|ilustração)\b/i.test(
    `${supportText ?? ""} ${statement}`,
  );
}

function imageExists(imageUrl: string | null) {
  if (!imageUrl || !imageUrl.startsWith("/")) return true;
  return existsSync(path.join(process.cwd(), "public", imageUrl.replace(/^\/+/, "")));
}

function hasMissingCommand(statement: string, supportText: string | null) {
  if (supportText || !statement.trim().endsWith(".")) return false;
  const tail = statement
    .slice(-260)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  return !/\b(qual|quais|quanto|quanta|quantos|quantas|assinale|marque|corresponde|representa|indica|consiste|encontra-se|deve ser|devera|sera|e o|e a|sao os|sao as|mais se aproxima|respectivamente)\b/.test(
    tail,
  );
}

function hasSuspiciousOpening(
  statement: string,
  supportText: string | null,
  imageUrl: string | null,
) {
  if (supportText?.trim() || imageUrl) return false;
  return /^[a-záéíóúâêôãõç]/u.test(statement.trim());
}

function qualityProblems(question: {
  statement: string;
  supportText: string | null;
  alternatives: string;
  correctAlternative: string;
  imageUrl: string | null;
}) {
  const problems: string[] = [];
  const alternatives = parseAlternatives(question.alternatives);
  const keys = alternatives.map((item) => String(item.key ?? "").trim().toUpperCase());
  const texts = alternatives.map((item) => normalizedAlternative(String(item.text ?? "")));

  if (alternatives.length !== 5) problems.push("quantidade de alternativas inválida");
  if (keys.some((key) => !key) || new Set(keys).size !== keys.length) {
    problems.push("identificação das alternativas inválida");
  }
  if (!keys.includes(question.correctAlternative.trim().toUpperCase())) {
    problems.push("gabarito não corresponde às alternativas");
  }
  if (texts.some((text) => !text)) problems.push("alternativa sem texto");
  if (new Set(texts).size !== texts.length) problems.push("alternativas duplicadas ou incompletas");
  if (question.statement.trim().length < 70 && !question.supportText && !question.imageUrl) {
    problems.push("enunciado incompleto");
  }
  if (hasSuspiciousOpening(question.statement, question.supportText, question.imageUrl)) {
    problems.push("possível início truncado ou texto de apoio não separado");
  }
  if (hasMissingVisual(question.statement, question.supportText, question.imageUrl)) {
    problems.push("elemento visual citado, mas não cadastrado");
  }
  if (hasMissingCommand(question.statement, question.supportText)) {
    problems.push("comando da questão ausente ou incompleto");
  }
  if (!imageExists(question.imageUrl)) problems.push("arquivo de imagem não encontrado");
  if (/Ãƒ|Ã‚|Ã§|Ã£|Ã¡|Ã©|Ãª|Ã³|Ã´|Ãº|Ã­|Ãµ|â€|�/.test(question.statement)) {
    problems.push("texto com codificação corrompida");
  }

  return problems;
}

async function main() {
  const enem = await db.vestibular.findUnique({
    where: { slug: "enem" },
    select: { id: true },
  });
  if (!enem) throw new Error("Vestibular ENEM não encontrado.");

  const authorialEnem = await db.question.updateMany({
    where: {
      vestibularId: enem.id,
      sourceType: { not: "OFFICIAL" },
      status: "PUBLISHED",
    },
    data: {
      status: "REVIEW",
      reviewState: "PENDING_REVIEW",
      reviewNotes:
        "Retirada da área pública do ENEM: esta seção aceita somente questões oficiais com fonte verificável.",
    },
  });

  const misplacedEnem = await db.question.updateMany({
    where: {
      vestibularId: { not: enem.id },
      status: "PUBLISHED",
      OR: [
        { sourceName: { contains: "ENEM", mode: "insensitive" } },
        { sourceName: { contains: "INEP", mode: "insensitive" } },
        { sourceUrl: { contains: "enem", mode: "insensitive" } },
      ],
    },
    data: {
      status: "REVIEW",
      reviewState: "HAS_ERROR",
      reviewNotes:
        "Publicação suspensa: a fonte indica ENEM, mas a questão estava vinculada a outro vestibular.",
    },
  });

  const officialQuestions = await db.question.findMany({
    where: {
      vestibularId: enem.id,
      sourceType: "OFFICIAL",
      status: "PUBLISHED",
    },
    select: {
      id: true,
      statement: true,
      supportText: true,
      alternatives: true,
      correctAlternative: true,
      imageUrl: true,
    },
  });

  const qualityIssues: Array<{ id: string; problems: string[] }> = [];
  for (const question of officialQuestions) {
    const problems = qualityProblems(question);
    if (problems.length) qualityIssues.push({ id: question.id, problems });
  }

  await db.$transaction(
    qualityIssues.map((item) =>
      db.question.update({
        where: { id: item.id },
        data: {
          status: "REVIEW",
          reviewState: "HAS_ERROR",
          reviewNotes: `Revisão automática de qualidade: ${item.problems.join("; ")}.`,
        },
      }),
    ),
  );

  const publishedOfficialEnem = await db.question.count({
    where: {
      vestibularId: enem.id,
      sourceType: "OFFICIAL",
      status: "PUBLISHED",
    },
  });

  console.log(
    JSON.stringify(
      {
        hiddenAuthorialEnem: authorialEnem.count,
        hiddenMisplacedEnem: misplacedEnem.count,
        hiddenForQualityReview: qualityIssues.length,
        publishedOfficialEnem,
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
  .finally(async () => {
    await db.$disconnect();
  });
