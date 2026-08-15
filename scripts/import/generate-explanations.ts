import { promises as fs } from "node:fs";
import path from "node:path";
import { type BankQuestion, validateQuestion } from "./question-bank-core";

async function main() {
  const file = path.resolve("scripts/import/output/banco-extenso-questoes-validas.json");
  const questions = JSON.parse(await fs.readFile(file, "utf8")) as BankQuestion[];
  const incomplete = questions.flatMap((question) => {
    const reasons = validateQuestion(question).filter((reason) => reason.includes("explicacao"));
    return reasons.length ? [{ externalId: question.externalId, reasons }] : [];
  });
  console.log(JSON.stringify({ audited: questions.length, complete: questions.length - incomplete.length, incomplete: incomplete.length }, null, 2));
  if (incomplete.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
