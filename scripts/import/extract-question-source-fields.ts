import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

const db = new PrismaClient();

function extractSourceFields(value: string | null) {
  if (!value) return null;
  const lines = value.split(/\r?\n/);
  const citationLines: string[] = [];
  let accessedAt: string | null = null;
  const contentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(Disponível em:|Fonte:)/i.test(trimmed)) {
      citationLines.push(trimmed);
      continue;
    }
    if (/^Acesso em:/i.test(trimmed)) {
      accessedAt = trimmed
        .replace(/^Acesso em:\s*/i, "")
        .replace(/\s*\(adaptado\)\s*\.?$/i, "")
        .replace(/\.$/, "")
        .trim();
      continue;
    }
    contentLines.push(line);
  }

  if (!citationLines.length && !accessedAt) return null;
  return {
    content: contentLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    citation: citationLines.join(" "),
    accessedAt,
  };
}

async function main() {
  const questions = await db.question.findMany({
    where: {
      OR: [
        { supportText: { contains: "Disponível em:", mode: "insensitive" } },
        { supportText: { contains: "Acesso em:", mode: "insensitive" } },
        { supportText: { contains: "Fonte:", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      supportText: true,
      sourceCitation: true,
      sourceAccessedAt: true,
    },
  });

  const updates = questions.flatMap((question) => {
    const extracted = extractSourceFields(question.supportText);
    if (!extracted) return [];
    return [
      db.question.update({
        where: { id: question.id },
        data: {
          supportText: extracted.content,
          sourceCitation: question.sourceCitation || extracted.citation || null,
          sourceAccessedAt: question.sourceAccessedAt || extracted.accessedAt,
        },
      }),
    ];
  });

  for (let index = 0; index < updates.length; index += 250) {
    await db.$transaction(updates.slice(index, index + 250));
  }

  console.log(
    JSON.stringify(
      {
        scanned: questions.length,
        updated: updates.length,
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
