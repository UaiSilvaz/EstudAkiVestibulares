import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { readPilotBundle } from "./pilot-2022-day2";

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

export async function collectPilotSnapshot(db: PrismaClient) {
  const [oldExam, job, links, officialFiles, logs] = await Promise.all([
    db.provaAntiga.findUnique({
      where: { id: "pa-enem-2022-dia-2" },
      include: { officialExamFile: true, officialKeyFile: true },
    }),
    db.questionImportJob.findUnique({
      where: { pilotId: "enem-2022-dia-2-caderno-5-amarelo" },
      include: {
        extractions: { orderBy: { officialNumber: "asc" } },
        revisions: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.provaAntigaQuestao.findMany({
      where: { provaAntigaId: "pa-enem-2022-dia-2" },
      orderBy: { numeroQuestao: "asc" },
      include: {
        questao: {
          include: {
            alternativeItems: { orderBy: { order: "asc" } },
            imageItems: { orderBy: { order: "asc" } },
            blocks: { orderBy: { order: "asc" } },
            structuredExtraction: true,
            revisions: { orderBy: { createdAt: "asc" } },
            officialAnswerKey: true,
          },
        },
      },
    }),
    db.officialFile.findMany({
      where: {
        vestibular: "ENEM",
        year: 2022,
        sha256Hash: {
          in: [
            "068a960ff3fde64d89484995f1a323676c354ad1efa27c109f09a4bb90619756",
            "2aca83d7cf5e990f63318a525883d2e77ba2d2baf815566efb96287dbf631b11",
          ],
        },
      },
      include: {
        answerKeys: {
          where: { questionNumber: { gte: 91, lte: 180 } },
          orderBy: { questionNumber: "asc" },
        },
      },
    }),
    db.officialImportLog.findMany({
      where: {
        action: { startsWith: "enem_2022_day2" },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    schemaVersion: 1,
    pilotId: "enem-2022-dia-2-caderno-5-amarelo",
    capturedAt: new Date().toISOString(),
    oldExam,
    job,
    links,
    officialFiles,
    logs,
  };
}

export async function writePilotSnapshot(
  db: PrismaClient,
  kind: "backup" | "export",
  requestedOutput?: string,
) {
  const bundle = await readPilotBundle({ validateAssets: false });
  const snapshot = await collectPilotSnapshot(db);
  const directory = path.resolve(
    process.cwd(),
    path.dirname(bundle.structuredPath),
    kind === "backup" ? "backups" : "exports",
  );
  await mkdir(directory, { recursive: true });
  const outputPath = requestedOutput
    ? path.resolve(process.cwd(), requestedOutput)
    : path.join(directory, `${kind}-${timestamp()}.json`);
  const payload = `${JSON.stringify(snapshot, null, 2)}\n`;
  const sha256 = createHash("sha256").update(payload).digest("hex");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload, { encoding: "utf8", flag: "wx" });
  await writeFile(`${outputPath}.sha256`, `${sha256}  ${path.basename(outputPath)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return {
    kind,
    outputPath: path.relative(process.cwd(), outputPath).replaceAll("\\", "/"),
    sha256,
    questions: snapshot.links.length,
    answerKeys: snapshot.officialFiles.reduce((total, file) => total + file.answerKeys.length, 0),
  };
}
