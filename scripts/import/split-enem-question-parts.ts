import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { splitQuestionParts } from "../../src/lib/question-formatting";

loadEnvConfig(process.cwd());

const db = new PrismaClient();
const shouldApply = process.argv.includes("--apply");

async function main() {
  const enem = await db.vestibular.findUnique({
    where: { slug: "enem" },
    select: { id: true },
  });
  if (!enem) throw new Error("Vestibular ENEM não encontrado.");

  const questions = await db.question.findMany({
    where: {
      vestibularId: enem.id,
      sourceType: "OFFICIAL",
      supportText: null,
    },
    select: {
      id: true,
      year: true,
      exam: true,
      statement: true,
    },
  });

  const splitQuestions = questions.flatMap((question) => {
    const parts = splitQuestionParts(question.statement);
    return parts.supportText
      ? [{ ...question, supportText: parts.supportText, prompt: parts.prompt }]
      : [];
  });

  if (shouldApply) {
    for (let index = 0; index < splitQuestions.length; index += 250) {
      await db.$transaction(
        splitQuestions.slice(index, index + 250).map((question) =>
          db.question.update({
            where: { id: question.id },
            data: {
              supportText: question.supportText,
              statement: question.prompt,
            },
          }),
        ),
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: questions.length,
        separated: splitQuestions.length,
        applied: shouldApply,
        samples: splitQuestions.slice(0, 12).map((question) => ({
          year: question.year,
          exam: question.exam,
          supportEnd: question.supportText.slice(-140),
          prompt: question.prompt,
        })),
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
