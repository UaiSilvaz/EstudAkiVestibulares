import { promises as fs } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient, type OfficialFile } from "@prisma/client";
import type { OldExamRecord } from "../src/lib/old-exams";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

const manifestPath = path.resolve("data/provas/provas-antigas.json");
const storageRoot = path.resolve("storage/official-files");

function sourcePath(file: OfficialFile) {
  return path.join(storageRoot, file.fileName);
}

function examId(year: number, day: number) {
  return `pa-enem-${year}-dia-${day}`;
}

function manifestRecord(year: number, day: number): OldExamRecord {
  const firstDay = day === 1;
  const id = examId(year, day);
  return {
    id,
    slug: `enem-${year}-dia-${day}`,
    vestibular: "ENEM",
    ano: year,
    titulo: `ENEM ${year} — ${day}º dia — ${firstDay ? "Caderno Azul" : "Caderno Amarelo"}`,
    descricao: `Aplicação regular do ENEM ${year}, ${firstDay ? "primeiro" : "segundo"} dia, caderno ${firstDay ? "1 azul" : "5 amarelo"}.`,
    fase: "Aplicação regular",
    dia: `${day}º dia`,
    tipo: "OFICIAL",
    arquivoProvaUrl: `/api/provas-antigas/${id}/arquivo?tipo=prova`,
    arquivoGabaritoUrl: `/api/provas-antigas/${id}/arquivo?tipo=gabarito`,
    arquivoProvaPath: `data/provas/enem/${year}/prova-${day}-dia.pdf`,
    arquivoGabaritoPath: `data/provas/enem/${year}/gabarito-${day}-dia.pdf`,
    fonteOficial: "INEP/gov.br",
    fonteUrl: `https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/${year}`,
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
}

function belongsToDay(file: OfficialFile, day: number) {
  if (file.examDay === `${day}º dia`) return true;
  const url = decodeURIComponent(file.originalUrl).toLowerCase();
  return day === 1
    ? /(?:_d1_|1[_ -]?dia|dia[_ -]?1|sabado)/i.test(url)
    : /(?:_d2_|2[_ -]?dia|dia[_ -]?2|domingo)/i.test(url);
}

async function main() {
  const existing = JSON.parse(await fs.readFile(manifestPath, "utf8")) as OldExamRecord[];
  const byId = new Map(existing.map((record) => [record.id, record]));
  const report: Array<{ year: number; day: number; exam: string; answerKey: string }> = [];

  for (let year = 2015; year <= 2025; year += 1) {
    const files = await db.officialFile.findMany({
      where: {
        vestibular: "ENEM",
        year,
        fileType: { in: ["EXAM", "ANSWER_KEY"] },
      },
      orderBy: { createdAt: "asc" },
    });
    for (const day of [1, 2]) {
      const dayLabel = `${day}º dia`;
      const exam = files.find(
        (file) => file.fileType === "EXAM" && belongsToDay(file, day),
      );
      const answerKey = files.find(
        (file) => file.fileType === "ANSWER_KEY" && belongsToDay(file, day),
      );
      if (!exam || !answerKey) {
        throw new Error(`Par oficial incompleto: ENEM ${year}, ${dayLabel}.`);
      }
      const directory = path.resolve(`data/provas/enem/${year}`);
      await fs.mkdir(directory, { recursive: true });
      const examTarget = path.join(directory, `prova-${day}-dia.pdf`);
      const answerTarget = path.join(directory, `gabarito-${day}-dia.pdf`);
      await fs.copyFile(sourcePath(exam), examTarget);
      await fs.copyFile(sourcePath(answerKey), answerTarget);

      const record = {
        ...(byId.get(examId(year, day)) ?? manifestRecord(year, day)),
        ...manifestRecord(year, day),
      };
      byId.set(record.id, record);
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
        where: { id: record.id },
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
        day,
        exam: path.relative(process.cwd(), examTarget).replaceAll("\\", "/"),
        answerKey: path.relative(process.cwd(), answerTarget).replaceAll("\\", "/"),
      });
    }
  }

  const records = [...byId.values()].sort(
    (first, second) =>
      second.ano - first.ano ||
      first.vestibular.localeCompare(second.vestibular) ||
      first.id.localeCompare(second.id),
  );
  const temporary = `${manifestPath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await fs.rename(temporary, manifestPath);
  console.log(JSON.stringify({ exams: report.length, report }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
