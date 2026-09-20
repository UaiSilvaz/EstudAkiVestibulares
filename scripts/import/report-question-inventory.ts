import { promises as fs } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

const db = new PrismaClient();

async function grouped<K extends string>(
  key: K,
  rows: Array<Record<K, string | null> & { _count: { _all: number } }>,
) {
  return Object.fromEntries(rows.map((row) => [row[key] ?? "null", row._count._all]));
}

async function main() {
  const reportDir = path.resolve("reports");
  await fs.mkdir(reportDir, { recursive: true });

  const [
    total,
    official,
    authorial,
    published,
    review,
    bySourceTypeRows,
    byStatusRows,
    byReviewRows,
    vestibularRows,
  ] = await Promise.all([
    db.question.count(),
    db.question.count({ where: { sourceType: "OFFICIAL" } }),
    db.question.count({ where: { sourceType: "AUTHORIAL" } }),
    db.question.count({ where: { status: "PUBLISHED" } }),
    db.question.count({ where: { status: "REVIEW" } }),
    db.question.groupBy({ by: ["sourceType"], _count: { _all: true } }),
    db.question.groupBy({ by: ["status"], _count: { _all: true } }),
    db.question.groupBy({ by: ["reviewState"], _count: { _all: true } }),
    db.vestibular.findMany({
      select: {
        name: true,
        _count: { select: { questions: true } },
        questions: {
          select: { sourceType: true, status: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const byVestibular = Object.fromEntries(
    vestibularRows.map((row) => [
      row.name,
      {
        total: row._count.questions,
        official: row.questions.filter((question) => question.sourceType === "OFFICIAL").length,
        authorial: row.questions.filter((question) => question.sourceType === "AUTHORIAL").length,
        published: row.questions.filter((question) => question.status === "PUBLISHED").length,
        review: row.questions.filter((question) => question.status === "REVIEW").length,
      },
    ]),
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    totals: {
      total,
      official,
      authorial,
      published,
      review,
      target6000Reached: total >= 6000,
      target8000Reached: total >= 8000,
      officialGapTo6000: Math.max(0, 6000 - official),
      officialGapTo8000: Math.max(0, 8000 - official),
    },
    bySourceType: await grouped("sourceType", bySourceTypeRows),
    byStatus: await grouped("status", byStatusRows),
    byReviewState: await grouped("reviewState", byReviewRows),
    byVestibular,
  };

  const markdown = [
    "# Inventario de questoes",
    "",
    `Gerado em: ${payload.generatedAt}`,
    "",
    "## Totais",
    "",
    `- Total: ${total}`,
    `- Oficiais: ${official}`,
    `- Autorais: ${authorial}`,
    `- Publicadas: ${published}`,
    `- Em revisao: ${review}`,
    `- Meta 6000 atingida: ${payload.totals.target6000Reached ? "sim" : "nao"}`,
    `- Meta 8000 atingida: ${payload.totals.target8000Reached ? "sim" : "nao"}`,
    `- Gap oficial ate 6000: ${payload.totals.officialGapTo6000}`,
    `- Gap oficial ate 8000: ${payload.totals.officialGapTo8000}`,
    "",
    "## Por vestibular",
    "",
    ...Object.entries(byVestibular).map(
      ([name, row]) =>
        `- ${name}: ${row.total} total; ${row.official} oficiais; ${row.authorial} autorais; ${row.published} publicadas; ${row.review} em revisao`,
    ),
    "",
  ].join("\n");

  await Promise.all([
    fs.writeFile(path.join(reportDir, "question-inventory.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(reportDir, "question-inventory.md"), markdown, "utf8"),
  ]);

  console.log(JSON.stringify(payload.totals, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
