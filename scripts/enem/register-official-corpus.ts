import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  mkdir,
  open,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  OfficialDownloadStatus,
  OfficialFileType,
  OfficialProcessingStatus,
  OfficialSourceKind,
  OfficialSourceStatus,
  Prisma,
  PrismaClient,
  ProvaAntigaStatus,
  type OfficialFile,
} from "@prisma/client";
import type { OldExamRecord } from "../../src/lib/old-exams";

loadEnvConfig(process.cwd());

const db = new PrismaClient();
const inventoryPath = path.resolve(
  "data/provas/enem/INVENTARIO_OFICIAL_ENEM_2009_2025.md",
);
const manifestPath = path.resolve("data/provas/provas-antigas.json");
const storageRoot = path.resolve("storage/official-files");
const pilotOldExamId = "pa-enem-2022-dia-2";
const pilotExamSha256 =
  "068a960ff3fde64d89484995f1a323676c354ad1efa27c109f09a4bb90619756";
const pilotKeySha256 =
  "2aca83d7cf5e990f63318a525883d2e77ba2d2baf815566efb96287dbf631b11";
const officialIndexBase =
  "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos";
const urlAliases = {
  E: "https://download.inep.gov.br/educacao_basica/enem",
  N: "https://download.inep.gov.br/enem/provas_e_gabaritos",
} as const;

type Day = 1 | 2;

type MatrixEntry = {
  year: number;
  day: Day;
  consolidatedPageStart: number;
  consolidatedPageEnd: number;
  questionStart: number;
  questionEnd: number;
  bookletNumber: number;
  bookletColor: string;
  hasLanguageVariants: boolean;
};

type LedgerEntry = {
  examPath: string;
  examSize: number;
  examSha256: string;
  keyPath: string;
  keySize: number;
  keySha256: string;
};

type UrlEntry = {
  examUrl: string;
  keyUrl: string;
};

type ArtifactSpec = {
  localPath: string;
  size: number;
  sha256: string;
  officialUrl: string;
  fileType: OfficialFileType;
};

type CorpusEntry = MatrixEntry & {
  key: string;
  exam: ArtifactSpec;
  answerKey: ArtifactSpec;
};

type PreparedArtifact = {
  fileName: string;
  storageUrl: string;
  copied: boolean;
};

type PilotSnapshot = {
  oldExamId: string;
  status: ProvaAntigaStatus;
  importacaoStatus: string;
  officialExamFileId: string;
  officialKeyFileId: string;
  officialExamStatus: OfficialProcessingStatus;
  officialKeyStatus: OfficialProcessingStatus;
  questionLinks: number;
  jobs: Array<{
    id: string;
    status: string;
    examFileId: string;
    answerKeyFileId: string;
  }>;
};

type Replacement = {
  oldExamId: string;
  kind: "exam" | "answer_key";
  oldFileId: string;
  oldSha256: string;
  newFileId: string;
  newSha256: string;
};

function corpusKey(year: number, day: number) {
  return `${year}/D${day}`;
}

function asDay(raw: string): Day {
  const day = Number(raw);
  if (day !== 1 && day !== 2) throw new Error(`Dia inválido no inventário: ${raw}`);
  return day;
}

function parsePositiveInteger(raw: string, label: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} inválido no inventário: ${raw}`);
  }
  return value;
}

function assertSha256(raw: string, label: string) {
  if (!/^[a-f0-9]{64}$/u.test(raw)) throw new Error(`${label} inválido: ${raw}`);
  return raw;
}

function expandOfficialUrl(raw: string) {
  const match = raw.match(/^([EN])\/(.+)$/u);
  if (!match) throw new Error(`URL sem alias E/N reconhecido: ${raw}`);
  const alias = match[1] as keyof typeof urlAliases;
  return `${urlAliases[alias]}/${match[2]}`;
}

function colorSlug(color: string) {
  return color
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function canonicalEdition(entry: CorpusEntry) {
  return `regular-cd${entry.bookletNumber}-${colorSlug(entry.bookletColor)}`;
}

function oldExamId(entry: CorpusEntry) {
  return `pa-enem-${entry.year}-dia-${entry.day}`;
}

function parseInventory(contents: string): CorpusEntry[] {
  const matrix = new Map<string, MatrixEntry>();
  const ledger = new Map<string, LedgerEntry>();
  const urls = new Map<string, UrlEntry>();

  for (const line of contents.split(/\r?\n/u)) {
    const matrixMatch = line.match(
      /^\| (20\d{2}) D([12]) \| (\d+)[–-](\d+) \| (\d+)[–-](\d+) \| CD(\d+) (Azul|Amarelo|Rosa)(?: †)? \| (—|EN\/ES) \|/u,
    );
    if (matrixMatch) {
      const year = Number(matrixMatch[1]);
      const day = asDay(matrixMatch[2]);
      matrix.set(corpusKey(year, day), {
        year,
        day,
        consolidatedPageStart: Number(matrixMatch[3]),
        consolidatedPageEnd: Number(matrixMatch[4]),
        questionStart: Number(matrixMatch[5]),
        questionEnd: Number(matrixMatch[6]),
        bookletNumber: Number(matrixMatch[7]),
        bookletColor: matrixMatch[8],
        hasLanguageVariants: matrixMatch[9] === "EN/ES",
      });
      continue;
    }

    if (/^20\d{2}\/D[12] \| data\/provas\/enem\//u.test(line)) {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length !== 7) throw new Error(`Linha de ledger inválida: ${line}`);
      ledger.set(parts[0], {
        examPath: parts[1],
        examSize: parsePositiveInteger(parts[2], `${parts[0]} tamanho da prova`),
        examSha256: assertSha256(parts[3], `${parts[0]} SHA da prova`),
        keyPath: parts[4],
        keySize: parsePositiveInteger(parts[5], `${parts[0]} tamanho do gabarito`),
        keySha256: assertSha256(parts[6], `${parts[0]} SHA do gabarito`),
      });
      continue;
    }

    if (/^20\d{2}\/D[12] \| [EN]\//u.test(line)) {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length !== 3) throw new Error(`Linha de URL inválida: ${line}`);
      urls.set(parts[0], {
        examUrl: expandOfficialUrl(parts[1]),
        keyUrl: expandOfficialUrl(parts[2]),
      });
    }
  }

  if (matrix.size !== 34 || ledger.size !== 34 || urls.size !== 34) {
    throw new Error(
      `Inventário incompleto: matriz=${matrix.size}, ledger=${ledger.size}, URLs=${urls.size}; esperado 34 em cada seção.`,
    );
  }

  const corpus = [...matrix.entries()].map(([key, entry]) => {
    const files = ledger.get(key);
    const officialUrls = urls.get(key);
    if (!files || !officialUrls) throw new Error(`Par incompleto no inventário: ${key}`);
    return {
      ...entry,
      key,
      exam: {
        localPath: files.examPath,
        size: files.examSize,
        sha256: files.examSha256,
        officialUrl: officialUrls.examUrl,
        fileType: OfficialFileType.EXAM,
      },
      answerKey: {
        localPath: files.keyPath,
        size: files.keySize,
        sha256: files.keySha256,
        officialUrl: officialUrls.keyUrl,
        fileType: OfficialFileType.ANSWER_KEY,
      },
    } satisfies CorpusEntry;
  });

  corpus.sort((first, second) => first.year - second.year || first.day - second.day);
  const actualYears = new Set(corpus.map((entry) => entry.year));
  if (actualYears.size !== 17 || Math.min(...actualYears) !== 2009 || Math.max(...actualYears) !== 2025) {
    throw new Error("O corpus precisa cobrir exatamente 2009–2025.");
  }
  return corpus;
}

async function hashFile(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function assertPdfArtifact(artifact: ArtifactSpec, label: string) {
  const absolutePath = path.resolve(artifact.localPath);
  const metadata = await stat(absolutePath);
  if (!metadata.isFile()) throw new Error(`${label}: caminho não é arquivo (${artifact.localPath}).`);
  if (metadata.size !== artifact.size) {
    throw new Error(`${label}: tamanho ${metadata.size}, esperado ${artifact.size}.`);
  }
  const handle = await open(absolutePath, "r");
  try {
    const signature = Buffer.alloc(5);
    await handle.read(signature, 0, signature.length, 0);
    if (signature.toString("ascii") !== "%PDF-") throw new Error(`${label}: assinatura PDF ausente.`);
  } finally {
    await handle.close();
  }
  const actualHash = await hashFile(absolutePath);
  if (actualHash !== artifact.sha256) {
    throw new Error(`${label}: SHA-256 ${actualHash}, esperado ${artifact.sha256}.`);
  }
}

async function validateLocalCorpus(corpus: CorpusEntry[]) {
  for (const entry of corpus) {
    await assertPdfArtifact(entry.exam, `${entry.key} prova`);
    await assertPdfArtifact(entry.answerKey, `${entry.key} gabarito`);
  }
}

function generatedFileName(entry: CorpusEntry, artifact: ArtifactSpec) {
  const kind = artifact.fileType === OfficialFileType.EXAM ? "prova" : "gabarito";
  return [
    "enem",
    entry.year,
    `d${entry.day}`,
    `cd${entry.bookletNumber}`,
    colorSlug(entry.bookletColor),
    kind,
    artifact.sha256.slice(0, 16),
  ].join("-") + ".pdf";
}

async function ensureStorageCopy(
  entry: CorpusEntry,
  artifact: ArtifactSpec,
  existing: OfficialFile | undefined,
) {
  const fileName = existing?.fileName ?? generatedFileName(entry, artifact);
  if (!/^[a-z0-9-]+\.pdf$/u.test(fileName)) {
    throw new Error(`${entry.key}: nome de armazenamento inválido (${fileName}).`);
  }
  const target = path.resolve(storageRoot, fileName);
  if (target !== storageRoot && !target.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error(`${entry.key}: destino fora de storage/official-files.`);
  }
  let copied = false;
  try {
    const current = await stat(target);
    if (!current.isFile()) throw new Error(`${target} não é arquivo.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await copyFile(path.resolve(artifact.localPath), target);
    copied = true;
  }
  const [storedMetadata, storedHash] = await Promise.all([stat(target), hashFile(target)]);
  if (storedMetadata.size !== artifact.size || storedHash !== artifact.sha256) {
    throw new Error(`${entry.key}: cópia de storage diverge para ${fileName}.`);
  }
  return {
    fileName,
    storageUrl: existing?.storageUrl ?? `/api/official-files/${fileName}`,
    copied,
  } satisfies PreparedArtifact;
}

async function prepareStorage(corpus: CorpusEntry[]) {
  await mkdir(storageRoot, { recursive: true });
  const hashes = corpus.flatMap((entry) => [entry.exam.sha256, entry.answerKey.sha256]);
  const existingFiles = await db.officialFile.findMany({ where: { sha256Hash: { in: hashes } } });
  const existingByHash = new Map(existingFiles.map((file) => [file.sha256Hash, file]));
  const prepared = new Map<string, PreparedArtifact>();
  for (const entry of corpus) {
    for (const artifact of [entry.exam, entry.answerKey]) {
      prepared.set(
        artifact.sha256,
        await ensureStorageCopy(entry, artifact, existingByHash.get(artifact.sha256)),
      );
    }
  }
  return { prepared, copied: [...prepared.values()].filter((value) => value.copied).length };
}

async function snapshotPilot(client: PrismaClient | Prisma.TransactionClient): Promise<PilotSnapshot> {
  const [exam, questionLinks, jobs] = await Promise.all([
    client.provaAntiga.findUnique({
      where: { id: pilotOldExamId },
      include: { officialExamFile: true, officialKeyFile: true },
    }),
    client.provaAntigaQuestao.count({ where: { provaAntigaId: pilotOldExamId } }),
    client.questionImportJob.findMany({
      where: { provaAntigaId: pilotOldExamId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        status: true,
        examFileId: true,
        answerKeyFileId: true,
      },
    }),
  ]);
  if (!exam?.officialExamFile || !exam.officialKeyFile) {
    throw new Error("Piloto 2022 D2 não possui os dois arquivos oficiais vinculados.");
  }
  if (
    exam.officialExamFile.sha256Hash !== pilotExamSha256 ||
    exam.officialKeyFile.sha256Hash !== pilotKeySha256
  ) {
    throw new Error("Piloto 2022 D2 está vinculado a hashes diferentes dos validados.");
  }
  return {
    oldExamId: exam.id,
    status: exam.status,
    importacaoStatus: exam.importacaoStatus,
    officialExamFileId: exam.officialExamFile.id,
    officialKeyFileId: exam.officialKeyFile.id,
    officialExamStatus: exam.officialExamFile.processingStatus,
    officialKeyStatus: exam.officialKeyFile.processingStatus,
    questionLinks,
    jobs: jobs.map((job) => ({ ...job, status: String(job.status) })),
  };
}

function assertPilotPreserved(before: PilotSnapshot, after: PilotSnapshot) {
  const stableBefore = JSON.stringify(before);
  const stableAfter = JSON.stringify(after);
  if (stableBefore !== stableAfter) {
    throw new Error(
      `Piloto 2022 D2 foi alterado indevidamente. Antes=${stableBefore}; depois=${stableAfter}`,
    );
  }
}

function sourceNotes(entry: CorpusEntry, artifact: ArtifactSpec) {
  const kind = artifact.fileType === OfficialFileType.EXAM ? "prova" : "gabarito";
  return [
    `Corpus canônico ENEM ${entry.year}, ${entry.day}º dia, caderno ${entry.bookletNumber} ${entry.bookletColor}.`,
    `${kind} oficial do INEP validado pelo inventário local.`,
    `Páginas consolidadas ${entry.consolidatedPageStart}–${entry.consolidatedPageEnd}; questões ${entry.questionStart}–${entry.questionEnd}.`,
    `Arquivo ${artifact.localPath}; ${artifact.size} bytes; SHA-256 ${artifact.sha256}.`,
  ].join(" ");
}

async function upsertSource(
  tx: Prisma.TransactionClient,
  entry: CorpusEntry,
  artifact: ArtifactSpec,
) {
  const existing = await tx.officialSource.findUnique({
    where: { sourceUrl: artifact.officialUrl },
    select: { approvedAt: true },
  });
  const now = new Date();
  const data = {
    vestibular: "ENEM",
    year: entry.year,
    edition: canonicalEdition(entry),
    examDay: `${entry.day}º dia`,
    fileType: artifact.fileType,
    sourceKind: OfficialSourceKind.DIRECT_FILE,
    sourceDomain: new URL(artifact.officialUrl).hostname.toLowerCase(),
    status: OfficialSourceStatus.DOWNLOADED,
    notes: sourceNotes(entry, artifact),
    approvedAt: existing?.approvedAt ?? now,
    archivedAt: null,
  };
  return tx.officialSource.upsert({
    where: { sourceUrl: artifact.officialUrl },
    update: data,
    create: { ...data, sourceUrl: artifact.officialUrl },
  });
}

async function upsertFile(
  tx: Prisma.TransactionClient,
  entry: CorpusEntry,
  artifact: ArtifactSpec,
  prepared: PreparedArtifact,
  sourceId: string,
) {
  const existing = await tx.officialFile.findUnique({ where: { sha256Hash: artifact.sha256 } });
  const isPilot = oldExamId(entry) === pilotOldExamId;
  const processingStatus =
    isPilot && existing
      ? existing.processingStatus
      : OfficialProcessingStatus.WAITING_REVIEW;
  const data = {
    sourceId,
    vestibular: "ENEM",
    year: entry.year,
    edition: canonicalEdition(entry),
    examDay: `${entry.day}º dia`,
    fileType: artifact.fileType,
    originalUrl: artifact.officialUrl,
    storageUrl: prepared.storageUrl,
    fileName: prepared.fileName,
    mimeType: "application/pdf",
    fileSize: artifact.size,
    downloadStatus: OfficialDownloadStatus.DOWNLOADED,
    processingStatus,
  };
  return tx.officialFile.upsert({
    where: { sha256Hash: artifact.sha256 },
    update: data,
    create: {
      ...data,
      sha256Hash: artifact.sha256,
      downloadLog: `Registrado do corpus canônico local em ${new Date().toISOString()} a partir de ${artifact.officialUrl}`,
    },
  });
}

async function archiveSupersededFile(
  tx: Prisma.TransactionClient,
  entry: CorpusEntry,
  kind: "exam" | "answer_key",
  oldFileId: string | null,
  targetFile: OfficialFile,
  replacements: Replacement[],
) {
  if (!oldFileId || oldFileId === targetFile.id) return;
  const oldFile = await tx.officialFile.findUnique({
    where: { id: oldFileId },
    include: { source: true },
  });
  if (!oldFile || oldFile.sha256Hash === targetFile.sha256Hash) return;
  const historicalEdition = `historical-superseded-${entry.year}-d${entry.day}`;
  await tx.officialFile.update({
    where: { id: oldFile.id },
    data: { edition: historicalEdition },
  });
  if (oldFile.sourceId !== targetFile.sourceId) {
    const note = `Substituída no corpus canônico por ${targetFile.id} (${targetFile.sha256Hash}) sem exclusão do histórico.`;
    await tx.officialSource.update({
      where: { id: oldFile.sourceId },
      data: {
        edition: historicalEdition,
        status: OfficialSourceStatus.ARCHIVED,
        archivedAt: new Date(),
        notes: oldFile.source.notes ? `${oldFile.source.notes}\n${note}` : note,
      },
    });
  }
  replacements.push({
    oldExamId: oldExamId(entry),
    kind,
    oldFileId: oldFile.id,
    oldSha256: oldFile.sha256Hash,
    newFileId: targetFile.id,
    newSha256: targetFile.sha256Hash,
  });
}

function oldExamMetadata(entry: CorpusEntry) {
  const id = oldExamId(entry);
  const ordinal = entry.day === 1 ? "primeiro" : "segundo";
  return {
    id,
    vestibular: "ENEM",
    slug: `enem-${entry.year}-dia-${entry.day}`,
    ano: entry.year,
    titulo: `ENEM ${entry.year} — ${entry.day}º dia — Caderno ${entry.bookletNumber} ${entry.bookletColor}`,
    descricao: `Aplicação regular do ENEM ${entry.year}, ${ordinal} dia, caderno ${entry.bookletNumber} ${entry.bookletColor.toLowerCase()}.`,
    fase: "Aplicação regular",
    dia: `${entry.day}º dia`,
    tipo: "OFICIAL",
    arquivoProvaUrl: `/api/provas-antigas/${id}/arquivo?tipo=prova`,
    arquivoGabaritoUrl: `/api/provas-antigas/${id}/arquivo?tipo=gabarito`,
    arquivoProvaPath: entry.exam.localPath,
    arquivoGabaritoPath: entry.answerKey.localPath,
    fonteOficial: "INEP/gov.br",
    fonteUrl: `${officialIndexBase}/${entry.year}`,
    totalQuestoes: 90,
  };
}

async function registerCorpus(
  corpus: CorpusEntry[],
  prepared: Map<string, PreparedArtifact>,
) {
  const currentRows = await db.provaAntiga.findMany({
    where: { id: { in: corpus.map(oldExamId) } },
    select: { id: true, officialExamFileId: true, officialKeyFileId: true },
  });
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const replacements: Replacement[] = [];
  const result = await db.$transaction(
    async (tx) => {
      const registered: Array<{
        oldExamId: string;
        examFileId: string;
        keyFileId: string;
        examSourceId: string;
        keySourceId: string;
      }> = [];
      for (const entry of corpus) {
        const examSource = await upsertSource(tx, entry, entry.exam);
        const keySource = await upsertSource(tx, entry, entry.answerKey);
        const examPrepared = prepared.get(entry.exam.sha256);
        const keyPrepared = prepared.get(entry.answerKey.sha256);
        if (!examPrepared || !keyPrepared) throw new Error(`${entry.key}: storage não preparado.`);
        const examFile = await upsertFile(
          tx,
          entry,
          entry.exam,
          examPrepared,
          examSource.id,
        );
        const keyFile = await upsertFile(
          tx,
          entry,
          entry.answerKey,
          keyPrepared,
          keySource.id,
        );
        const id = oldExamId(entry);
        const current = currentById.get(id);
        await archiveSupersededFile(
          tx,
          entry,
          "exam",
          current?.officialExamFileId ?? null,
          examFile,
          replacements,
        );
        await archiveSupersededFile(
          tx,
          entry,
          "answer_key",
          current?.officialKeyFileId ?? null,
          keyFile,
          replacements,
        );
        const metadata = oldExamMetadata(entry);
        const createData = {
          ...metadata,
          officialExamFileId: examFile.id,
          officialKeyFileId: keyFile.id,
          fileHash: entry.exam.sha256,
          status: ProvaAntigaStatus.PENDENTE,
          importacaoStatus: "AGUARDANDO_REVISAO",
          importacaoRelatorio: null,
          questoesDetectadas: 0,
          questoesValidas: 0,
          questoesComErro: 0,
          imagensDetectadas: 0,
        };
        const updateData = {
          ...metadata,
          officialExamFileId: examFile.id,
          officialKeyFileId: keyFile.id,
          fileHash: entry.exam.sha256,
          ...(id === pilotOldExamId
            ? {}
            : {
                status: ProvaAntigaStatus.PENDENTE,
                importacaoStatus: "AGUARDANDO_REVISAO",
              }),
        };
        await tx.provaAntiga.upsert({
          where: { id },
          update: updateData,
          create: createData,
        });
        registered.push({
          oldExamId: id,
          examFileId: examFile.id,
          keyFileId: keyFile.id,
          examSourceId: examSource.id,
          keySourceId: keySource.id,
        });
      }
      await tx.officialImportLog.create({
        data: {
          action: "register_enem_official_corpus",
          status: "SUCCESS",
          message: "Corpus canônico ENEM 2009–2025 registrado em estado de revisão; piloto 2022 D2 preservado.",
          metadata: JSON.stringify({
            exams: registered.length,
            sources: registered.length * 2,
            files: registered.length * 2,
            replacements,
          }),
        },
      });
      return registered;
    },
    { maxWait: 30_000, timeout: 180_000 },
  );
  return { registered: result, replacements };
}

async function syncManifest(corpus: CorpusEntry[]) {
  const [existingManifest, databaseRows] = await Promise.all([
    readFile(manifestPath, "utf8").then((contents) => JSON.parse(contents) as OldExamRecord[]),
    db.provaAntiga.findMany({
      where: { id: { in: corpus.map(oldExamId) } },
      include: { _count: { select: { questoes: true } } },
    }),
  ]);
  const existingById = new Map(existingManifest.map((record) => [record.id, record]));
  const databaseById = new Map(databaseRows.map((record) => [record.id, record]));
  const now = new Date().toISOString();
  for (const entry of corpus) {
    const id = oldExamId(entry);
    const current = databaseById.get(id);
    if (!current) throw new Error(`${id}: ausente no banco ao sincronizar manifesto.`);
    const previous = existingById.get(id);
    existingById.set(id, {
      ...(previous ?? {}),
      ...oldExamMetadata(entry),
      status: current.status,
      importacaoStatus: current.importacaoStatus,
      importacaoRelatorio: current.importacaoRelatorio,
      questoesDetectadas: current.questoesDetectadas,
      questoesValidas: current.questoesValidas,
      questoesComErro: current.questoesComErro,
      imagensDetectadas: current.imagensDetectadas,
      questoesVinculadas: current._count.questoes,
      criadoEm: previous?.criadoEm ?? current.criadoEm.toISOString(),
      atualizadoEm: now,
    } as OldExamRecord);
  }
  const records = [...existingById.values()].sort(
    (first, second) =>
      second.ano - first.ano ||
      first.vestibular.localeCompare(second.vestibular) ||
      first.id.localeCompare(second.id),
  );
  const temporary = `${manifestPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await rename(temporary, manifestPath);
  return records.filter((record) => record.vestibular === "ENEM").length;
}

async function verifyCorpus(corpus: CorpusEntry[], pilotBefore: PilotSnapshot) {
  const [rows, manifest, pilotAfter] = await Promise.all([
    db.provaAntiga.findMany({
      where: { id: { in: corpus.map(oldExamId) } },
      include: {
        officialExamFile: { include: { source: true } },
        officialKeyFile: { include: { source: true } },
        _count: { select: { questoes: true } },
      },
      orderBy: [{ ano: "asc" }, { dia: "asc" }],
    }),
    readFile(manifestPath, "utf8").then((contents) => JSON.parse(contents) as OldExamRecord[]),
    snapshotPilot(db),
  ]);
  assertPilotPreserved(pilotBefore, pilotAfter);
  if (rows.length !== 34) throw new Error(`Banco retornou ${rows.length}/34 provas antigas.`);
  const manifestEnem = manifest.filter((record) => record.vestibular === "ENEM");
  if (manifestEnem.length !== 34) {
    throw new Error(`Manifesto contém ${manifestEnem.length}/34 provas ENEM.`);
  }
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const manifestById = new Map(manifestEnem.map((record) => [record.id, record]));
  const fileIds = new Set<string>();
  const sourceIds = new Set<string>();
  let waitingReviewFiles = 0;
  let pendingOldExams = 0;
  let linkedQuestions = 0;

  for (const entry of corpus) {
    const id = oldExamId(entry);
    const row = rowById.get(id);
    const manifestRecord = manifestById.get(id);
    if (!row?.officialExamFile || !row.officialKeyFile || !manifestRecord) {
      throw new Error(`${id}: registro, arquivos ou manifesto incompletos.`);
    }
    const edition = canonicalEdition(entry);
    const expectedArtifacts = [
      [row.officialExamFile, entry.exam, "prova"],
      [row.officialKeyFile, entry.answerKey, "gabarito"],
    ] as const;
    for (const [file, artifact, label] of expectedArtifacts) {
      if (
        file.sha256Hash !== artifact.sha256 ||
        file.fileSize !== artifact.size ||
        file.originalUrl !== artifact.officialUrl ||
        file.edition !== edition ||
        file.examDay !== `${entry.day}º dia` ||
        file.source.sourceUrl !== artifact.officialUrl ||
        file.source.status !== OfficialSourceStatus.DOWNLOADED ||
        file.source.edition !== edition
      ) {
        throw new Error(`${id}: metadados de ${label} divergem do inventário.`);
      }
      if (id === pilotOldExamId) {
        if (file.processingStatus !== OfficialProcessingStatus.PUBLISHED) {
          throw new Error(`${id}: estado publicado do piloto foi perdido em ${label}.`);
        }
      } else {
        if (file.processingStatus !== OfficialProcessingStatus.WAITING_REVIEW) {
          throw new Error(`${id}: ${label} não está em WAITING_REVIEW.`);
        }
        waitingReviewFiles += 1;
      }
      const storedPath = path.resolve(storageRoot, file.fileName);
      const [storedMetadata, storedHash] = await Promise.all([stat(storedPath), hashFile(storedPath)]);
      if (storedMetadata.size !== artifact.size || storedHash !== artifact.sha256) {
        throw new Error(`${id}: storage de ${label} diverge do inventário.`);
      }
      fileIds.add(file.id);
      sourceIds.add(file.source.id);
    }
    if (
      row.arquivoProvaPath !== entry.exam.localPath ||
      row.arquivoGabaritoPath !== entry.answerKey.localPath ||
      row.fileHash !== entry.exam.sha256 ||
      !row.titulo.includes(`Caderno ${entry.bookletNumber} ${entry.bookletColor}`)
    ) {
      throw new Error(`${id}: ProvaAntiga diverge do caderno canônico.`);
    }
    if (id !== pilotOldExamId) {
      if (
        row.status !== ProvaAntigaStatus.PENDENTE ||
        row.importacaoStatus !== "AGUARDANDO_REVISAO"
      ) {
        throw new Error(`${id}: deveria estar PENDENTE/AGUARDANDO_REVISAO.`);
      }
      pendingOldExams += 1;
    }
    if (
      manifestRecord.arquivoProvaPath !== entry.exam.localPath ||
      manifestRecord.arquivoGabaritoPath !== entry.answerKey.localPath ||
      manifestRecord.status !== row.status ||
      manifestRecord.importacaoStatus !== row.importacaoStatus
    ) {
      throw new Error(`${id}: manifesto não reflete o registro do banco.`);
    }
    linkedQuestions += row._count.questoes;
  }

  if (fileIds.size !== 68 || sourceIds.size !== 68) {
    throw new Error(`Relações não são 68/68: arquivos=${fileIds.size}, fontes=${sourceIds.size}.`);
  }
  if (pendingOldExams !== 33 || waitingReviewFiles !== 66) {
    throw new Error(
      `Estados inesperados: provas pendentes=${pendingOldExams}/33, arquivos em revisão=${waitingReviewFiles}/66.`,
    );
  }
  return {
    oldExams: rows.length,
    manifestOldExams: manifestEnem.length,
    officialSources: sourceIds.size,
    officialFiles: fileIds.size,
    pendingOldExams,
    waitingReviewFiles,
    publishedPilotFiles: 2,
    linkedQuestions,
    pilot: pilotAfter,
  };
}

async function main() {
  const inventory = await readFile(inventoryPath, "utf8");
  const corpus = parseInventory(inventory);
  await validateLocalCorpus(corpus);
  const pilotBefore = await snapshotPilot(db);
  const verifyOnly = process.argv.includes("--verify-only");
  if (verifyOnly) {
    const verification = await verifyCorpus(corpus, pilotBefore);
    console.log(JSON.stringify({ mode: "verify-only", verification }, null, 2));
    return;
  }
  const storage = await prepareStorage(corpus);
  const registration = await registerCorpus(corpus, storage.prepared);
  const manifestOldExams = await syncManifest(corpus);
  const verification = await verifyCorpus(corpus, pilotBefore);
  console.log(
    JSON.stringify(
      {
        mode: "register",
        inventory: path.relative(process.cwd(), inventoryPath).replaceAll("\\", "/"),
        corpusEntries: corpus.length,
        storageFilesCopied: storage.copied,
        registered: registration.registered.length,
        replacements: registration.replacements,
        manifestOldExams,
        verification,
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
