import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DiscoveredExam, OfficialDocumentRef } from "../../types";
import { slugify } from "../../text";

export const ENEM_INVENTORY_PATH = path.join(
  "data",
  "provas",
  "enem",
  "INVENTARIO_OFICIAL_ENEM_2009_2025.md",
);

const OFFICIAL_INDEX_URL =
  "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos";

const URL_ALIASES = {
  E: "https://download.inep.gov.br/educacao_basica/enem",
  N: "https://download.inep.gov.br/enem/provas_e_gabaritos",
} as const;

type MatrixEntry = {
  year: number;
  day: 1 | 2;
  pageStart: number;
  pageEnd: number;
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

export type EnemInventoryEntry = MatrixEntry & {
  id: string;
  edition: string;
  sourcePageUrl: string;
  exam: OfficialDocumentRef;
  answerKey: OfficialDocumentRef;
};

function keyOf(year: number, day: number) {
  return `${year}/D${day}`;
}

function parsePositiveInteger(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} invalid: ${value}`);
  }
  return parsed;
}

function parseSha256(value: string, label: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${label} invalid: ${value}`);
  return value;
}

function parseRange(value: string, label: string) {
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length < 2) throw new Error(`${label} invalid: ${value}`);
  return { start: numbers[0]!, end: numbers[1]! };
}

function expandOfficialUrl(value: string) {
  const match = value.match(/^([EN])\/(.+)$/);
  if (!match) throw new Error(`Unknown INEP URL alias: ${value}`);
  const alias = match[1] as keyof typeof URL_ALIASES;
  return `${URL_ALIASES[alias]}/${match[2]}`;
}

function parseMatrixLine(parts: string[]): [string, MatrixEntry] | null {
  const heading = parts[1]?.match(/^(20\d{2})\s+D([12])$/);
  if (!heading) return null;
  const pages = parseRange(parts[2] ?? "", `${parts[1]} pages`);
  const questions = parseRange(parts[3] ?? "", `${parts[1]} questions`);
  const booklet = (parts[4] ?? "").match(/^CD(\d+)\s+([^\s]+)/);
  if (!booklet) throw new Error(`${parts[1]} booklet invalid: ${parts[4]}`);
  const year = Number(heading[1]);
  const day = Number(heading[2]) as 1 | 2;
  return [
    keyOf(year, day),
    {
      year,
      day,
      pageStart: pages.start,
      pageEnd: pages.end,
      questionStart: questions.start,
      questionEnd: questions.end,
      bookletNumber: Number(booklet[1]),
      bookletColor: booklet[2]!,
      hasLanguageVariants: (parts[5] ?? "").includes("EN/ES"),
    },
  ];
}

function parseLedgerLine(line: string): [string, LedgerEntry] | null {
  if (!/^20\d{2}\/D[12]\s+\|\s+data\/provas\/enem\//.test(line)) return null;
  const parts = line.split("|").map((part) => part.trim());
  if (parts.length !== 7) throw new Error(`Invalid ENEM ledger row: ${line}`);
  return [
    parts[0]!,
    {
      examPath: parts[1]!,
      examSize: parsePositiveInteger(parts[2]!, `${parts[0]} exam size`),
      examSha256: parseSha256(parts[3]!, `${parts[0]} exam sha256`),
      keyPath: parts[4]!,
      keySize: parsePositiveInteger(parts[5]!, `${parts[0]} answer key size`),
      keySha256: parseSha256(parts[6]!, `${parts[0]} answer key sha256`),
    },
  ];
}

function parseUrlLine(line: string): [string, UrlEntry] | null {
  if (!/^20\d{2}\/D[12]\s+\|\s+[EN]\//.test(line)) return null;
  const parts = line.split("|").map((part) => part.trim());
  if (parts.length !== 3) throw new Error(`Invalid ENEM URL row: ${line}`);
  return [
    parts[0]!,
    {
      examUrl: expandOfficialUrl(parts[1]!),
      keyUrl: expandOfficialUrl(parts[2]!),
    },
  ];
}

export function parseEnemInventory(contents: string): EnemInventoryEntry[] {
  const matrix = new Map<string, MatrixEntry>();
  const ledger = new Map<string, LedgerEntry>();
  const urls = new Map<string, UrlEntry>();

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("|")) {
      const matrixLine = parseMatrixLine(trimmed.split("|").map((part) => part.trim()));
      if (matrixLine) matrix.set(...matrixLine);
      continue;
    }
    const ledgerLine = parseLedgerLine(trimmed);
    if (ledgerLine) {
      ledger.set(...ledgerLine);
      continue;
    }
    const urlLine = parseUrlLine(trimmed);
    if (urlLine) urls.set(...urlLine);
  }

  return [...matrix.entries()]
    .map(([key, entry]) => {
      const files = ledger.get(key);
      const fileUrls = urls.get(key);
      if (!files || !fileUrls) {
        throw new Error(`Incomplete ENEM inventory entry: ${key}`);
      }
      const edition = `regular-cd${entry.bookletNumber}-${slugify(entry.bookletColor)}`;
      const id = `inep-enem-${entry.year}-d${entry.day}-cd${entry.bookletNumber}-${slugify(entry.bookletColor)}`;
      return {
        ...entry,
        id,
        edition,
        sourcePageUrl: `${OFFICIAL_INDEX_URL}/${entry.year}`,
        exam: {
          kind: "exam",
          url: fileUrls.examUrl,
          localPath: files.examPath,
          sha256: files.examSha256,
          sizeBytes: files.examSize,
          mimeType: "application/pdf",
        },
        answerKey: {
          kind: "answer_key",
          url: fileUrls.keyUrl,
          localPath: files.keyPath,
          sha256: files.keySha256,
          sizeBytes: files.keySize,
          mimeType: "application/pdf",
        },
      } satisfies EnemInventoryEntry;
    })
    .sort((first, second) => first.year - second.year || first.day - second.day);
}

export async function readEnemInventory(inventoryPath = ENEM_INVENTORY_PATH) {
  const contents = await readFile(path.resolve(inventoryPath), "utf8");
  return parseEnemInventory(contents);
}

export function toDiscoveredExam(entry: EnemInventoryEntry): DiscoveredExam {
  return {
    provider: "inep",
    id: entry.id,
    examName: `ENEM ${entry.year}`,
    year: entry.year,
    edition: entry.edition,
    application: "regular",
    day: entry.day,
    phase: "objetiva",
    bookletCode: `CD${entry.bookletNumber}`,
    bookletColor: entry.bookletColor,
    institutionName: "ENEM",
    boardName: "INEP",
    sourcePageUrl: entry.sourcePageUrl,
    documents: [entry.exam, entry.answerKey],
    expectedQuestionCount: entry.questionEnd - entry.questionStart + 1,
    metadata: {
      pageStart: entry.pageStart,
      pageEnd: entry.pageEnd,
      questionStart: entry.questionStart,
      questionEnd: entry.questionEnd,
      hasLanguageVariants: entry.hasLanguageVariants,
    },
  };
}
