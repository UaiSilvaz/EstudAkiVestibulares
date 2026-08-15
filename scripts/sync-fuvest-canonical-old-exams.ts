import { promises as fs } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import type { OldExamRecord } from "../src/lib/old-exams";

loadEnvConfig(process.cwd());
const db = new PrismaClient();
const manifestPath = path.resolve("data/provas/provas-antigas.json");

async function main() {
  const existing = JSON.parse(await fs.readFile(manifestPath, "utf8")) as OldExamRecord[];
  const byId = new Map(existing.map((record) => [record.id, record]));
  const report: Array<{ year: number; exam: string; answerKey: string }> = [];

  for (let year = 2020; year <= 2022; year += 1) {
    const files = await db.officialFile.findMany({
      where: {
        vestibular: "FUVEST",
        year,
        edition: "primeira-fase-canonical",
      },
    });
    const exam = files.find((file) => file.fileType === "EXAM");
    const answerKey = files.find((file) => file.fileType === "ANSWER_KEY");
    if (!exam || !answerKey) throw new Error(`Par oficial incompleto: FUVEST ${year}.`);

    const directory = path.resolve(`data/provas/fuvest/${year}`);
    await fs.mkdir(directory, { recursive: true });
    const examTarget = path.join(directory, "prova-1-fase.pdf");
    const answerTarget = path.join(directory, "gabarito-1-fase.pdf");
    await fs.copyFile(path.resolve("storage/official-files", exam.fileName), examTarget);
    await fs.copyFile(path.resolve("storage/official-files", answerKey.fileName), answerTarget);

    const id = `pa-fuvest-${year}-fase-1`;
    const record: OldExamRecord = {
      id,
      slug: `fuvest-${year}-fase-1`,
      vestibular: "FUVEST",
      ano: year,
      titulo: `FUVEST ${year} — 1ª fase — Versão V`,
      descricao: `Primeira fase da FUVEST ${year}, versão V, com gabarito oficial.`,
      fase: "1ª fase",
      dia: "Versão V",
      tipo: "OFICIAL",
      arquivoProvaUrl: `/api/provas-antigas/${id}/arquivo?tipo=prova`,
      arquivoGabaritoUrl: `/api/provas-antigas/${id}/arquivo?tipo=gabarito`,
      arquivoProvaPath: `data/provas/fuvest/${year}/prova-1-fase.pdf`,
      arquivoGabaritoPath: `data/provas/fuvest/${year}/gabarito-1-fase.pdf`,
      fonteOficial: "FUVEST",
      fonteUrl: `https://www.fuvest.br/acervo-vestibular-${year}/`,
      totalQuestoes: 90,
      status: "PENDENTE",
      importacaoStatus: "AGUARDANDO_EXTRACAO",
      importacaoRelatorio: null,
      questoesDetectadas: 0,
      questoesValidas: 0,
      questoesComErro: 0,
      imagensDetectadas: 0,
      questoesVinculadas: 0,
      atualizadoEm: new Date().toISOString(),
    };
    byId.set(id, { ...(byId.get(id) ?? {}), ...record });
    const {
      questoesVinculadas: _linked,
      questoesDisponiveis: _available,
      criadoEm: _created,
      atualizadoEm: _updated,
      ...databaseRecord
    } = record;
    void _linked;
    void _available;
    void _created;
    void _updated;
    await db.provaAntiga.upsert({
      where: { id },
      update: {
        ...databaseRecord,
        officialExamFileId: exam.id,
        officialKeyFileId: answerKey.id,
        fileHash: exam.sha256Hash,
      },
      create: {
        ...databaseRecord,
        officialExamFileId: exam.id,
        officialKeyFileId: answerKey.id,
        fileHash: exam.sha256Hash,
      },
    });
    report.push({
      year,
      exam: path.relative(process.cwd(), examTarget).replaceAll("\\", "/"),
      answerKey: path.relative(process.cwd(), answerTarget).replaceAll("\\", "/"),
    });
  }

  const records = [...byId.values()].sort(
    (first, second) =>
      second.ano - first.ano ||
      first.vestibular.localeCompare(second.vestibular) ||
      first.id.localeCompare(second.id),
  );
  await fs.writeFile(manifestPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ exams: report.length, report }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
