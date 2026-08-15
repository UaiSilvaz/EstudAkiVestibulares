import { createHash } from "node:crypto";
import {
  OfficialDownloadStatus,
  OfficialFileType,
  OfficialProcessingStatus,
  OfficialSourceKind,
  OfficialSourceStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { storeOfficialFile } from "@/lib/official-file-storage";

export const OFFICIAL_DOMAINS = [
  "gov.br",
  "download.inep.gov.br",
  "vestibulinho.etec.sp.gov.br",
  "vestibular.fatec.sp.gov.br",
  "fatweb.s3.amazonaws.com",
  "fuvest.br",
  "comvest.unicamp.br",
  "vunesp.com.br",
  "documento.vunesp.com.br",
  "provaopaulistaseriado.vunesp.com.br",
  "stcdndev.blob.core.windows.net",
  "vncdndev.azureedge.net",
  "vestibular.unesp.br",
  "www2.unesp.br",
] as const;

const discoveryKeywords = [
  "prova",
  "gabarito",
  ".pdf",
  "caderno",
  "questoes",
  "questões",
  "respostas",
];

const officialImporterUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/136.0 Safari/537.36 EstudAkiOfficialImporter/1.0";

export type OfficialSourceInput = {
  vestibular: string;
  year?: number | null;
  edition?: string;
  examDay?: string | null;
  fileType: OfficialFileType;
  sourceKind?: OfficialSourceKind;
  sourceUrl: string;
  notes?: string | null;
};

function cleanHost(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

export function isAllowedOfficialHost(hostname: string) {
  const host = cleanHost(hostname);
  return OFFICIAL_DOMAINS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export function parseApprovedOfficialUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Informe uma URL oficial válida.");
  }
  if (url.protocol !== "https:") throw new Error("A fonte oficial deve usar HTTPS.");
  if (!isAllowedOfficialHost(url.hostname)) {
    throw new Error(`Domínio não permitido: ${url.hostname}`);
  }
  url.hash = "";
  return url;
}

export function normalizeOfficialSourceInput(input: OfficialSourceInput) {
  const url = parseApprovedOfficialUrl(input.sourceUrl);
  const vestibular = input.vestibular.trim().toUpperCase();
  const edition = input.edition?.trim() || "regular";
  const year = input.year ? Number(input.year) : null;
  if (!vestibular) throw new Error("Informe o vestibular.");
  if (input.sourceKind !== OfficialSourceKind.SEED_PAGE && (!year || year < 1990 || year > 2100)) {
    throw new Error("Informe um ano válido para o arquivo.");
  }
  if (input.sourceKind === OfficialSourceKind.DIRECT_FILE && input.fileType === OfficialFileType.INDEX_PAGE) {
    throw new Error("Arquivo direto precisa ser prova ou gabarito.");
  }
  return {
    vestibular,
    year,
    edition,
    examDay: input.examDay?.trim() || null,
    fileType: input.fileType,
    sourceKind: input.sourceKind ?? OfficialSourceKind.DIRECT_FILE,
    sourceUrl: url.toString(),
    sourceDomain: cleanHost(url.hostname),
    notes: input.notes?.trim() || null,
  };
}

export async function logOfficialImport(input: {
  sourceId?: string | null;
  fileId?: string | null;
  action: string;
  status: string;
  message: string;
  metadata?: unknown;
}) {
  return db.officialImportLog.create({
    data: {
      sourceId: input.sourceId ?? null,
      fileId: input.fileId ?? null,
      action: input.action,
      status: input.status,
      message: input.message,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  });
}

function safeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

function pdfLooksValid(bytes: Buffer) {
  return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}

export async function downloadOfficialFile(sourceId: string) {
  const source = await db.officialSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Fonte não encontrada.");
  if (source.status !== OfficialSourceStatus.APPROVED) {
    throw new Error("A fonte precisa ser aprovada antes do download.");
  }
  if (source.sourceKind !== OfficialSourceKind.DIRECT_FILE) {
    throw new Error("Páginas-semente devem ser analisadas, não baixadas como PDF.");
  }
  if (!source.year || source.fileType === OfficialFileType.INDEX_PAGE) {
    throw new Error("Ano e tipo do arquivo são obrigatórios.");
  }

  const requestedUrl = parseApprovedOfficialUrl(source.sourceUrl);
  await logOfficialImport({
    sourceId,
    action: "download",
    status: "STARTED",
    message: "Download oficial iniciado.",
    metadata: { url: requestedUrl.toString() },
  });

  try {
    const response = await fetch(requestedUrl, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
      headers: { "User-Agent": officialImporterUserAgent },
    });
    if (!response.ok) throw new Error(`Servidor oficial respondeu ${response.status}.`);
    parseApprovedOfficialUrl(response.url);

    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > 80 * 1024 * 1024) throw new Error("PDF excede o limite de 80 MB.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 80 * 1024 * 1024) throw new Error("PDF excede o limite de 80 MB.");
    if (!pdfLooksValid(bytes)) throw new Error("O arquivo recebido não é um PDF válido.");

    const hash = createHash("sha256").update(bytes).digest("hex");
    const duplicate = await db.officialFile.findUnique({ where: { sha256Hash: hash } });
    if (duplicate) {
      await db.officialSource.update({
        where: { id: sourceId },
        data: { status: OfficialSourceStatus.DOWNLOADED },
      });
      await logOfficialImport({
        sourceId,
        fileId: duplicate.id,
        action: "download",
        status: "DUPLICATE",
        message: "Arquivo já existente; nenhum PDF foi duplicado.",
        metadata: { sha256: hash },
      });
      return { file: duplicate, duplicate: true };
    }

    const typeLabel = source.fileType === OfficialFileType.ANSWER_KEY ? "gabarito" : "prova";
    const fileName = `${safeSlug(source.vestibular)}-${source.year}-${safeSlug(source.edition)}-${typeLabel}-${hash.slice(0, 16)}.pdf`;
    await storeOfficialFile(fileName, bytes);

    const file = await db.$transaction(async (transaction) => {
      const created = await transaction.officialFile.create({
        data: {
          sourceId,
          vestibular: source.vestibular,
          year: source.year!,
          edition: source.edition,
          examDay: source.examDay,
          fileType: source.fileType,
          originalUrl: response.url,
          storageUrl: `/api/official-files/${fileName}`,
          fileName,
          mimeType: "application/pdf",
          fileSize: bytes.length,
          sha256Hash: hash,
          downloadStatus: OfficialDownloadStatus.DOWNLOADED,
          downloadLog: `Baixado em ${new Date().toISOString()} de ${response.url}`,
          processingStatus: OfficialProcessingStatus.WAITING_EXTRACTION,
        },
      });
      await transaction.officialSource.update({
        where: { id: sourceId },
        data: { status: OfficialSourceStatus.DOWNLOADED },
      });
      return created;
    });

    await logOfficialImport({
      sourceId,
      fileId: file.id,
      action: "download",
      status: "SUCCESS",
      message: "PDF validado, armazenado e registrado.",
      metadata: { sha256: hash, bytes: bytes.length, finalUrl: response.url },
    });
    return { file, duplicate: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida no download.";
    await db.officialSource.update({
      where: { id: sourceId },
      data: { status: OfficialSourceStatus.ERROR },
    });
    await logOfficialImport({
      sourceId,
      action: "download",
      status: "ERROR",
      message,
    });
    throw new Error(message);
  }
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function inferYear(value: string, fallback: number | null) {
  const match = value.match(/\b(20(?:1[5-9]|2[0-9]))\b/);
  return match ? Number(match[1]) : fallback;
}

export function inferOfficialFileType(value: string) {
  const decoded = decodeURIComponent(value);
  const fileName = decoded.split(/[?#]/)[0].split("/").pop() ?? decoded;
  if (/(?:^|[_-])GB(?:[_-]|$)/i.test(fileName)) return OfficialFileType.ANSWER_KEY;
  if (/(?:^|[_-])PV(?:[_-]|$)/i.test(fileName) || /caderno/i.test(fileName)) {
    return OfficialFileType.EXAM;
  }
  return /\bgabarito\b|\brespostas?\b|\banswer(?:\s|_)*key\b/i.test(decoded)
    ? OfficialFileType.ANSWER_KEY
    : OfficialFileType.EXAM;
}

export async function discoverOfficialLinks(sourceId: string) {
  const source = await db.officialSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Fonte não encontrada.");
  if (source.status !== OfficialSourceStatus.APPROVED) {
    throw new Error("A página-semente precisa ser aprovada.");
  }
  if (source.sourceKind !== OfficialSourceKind.SEED_PAGE) {
    throw new Error("A descoberta só é permitida em páginas-semente.");
  }

  const seedUrl = parseApprovedOfficialUrl(source.sourceUrl);
  const response = await fetch(seedUrl, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
    headers: {
      "User-Agent": officialImporterUserAgent,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Página oficial respondeu ${response.status}.`);
  parseApprovedOfficialUrl(response.url);
  const html = await response.text();
  const candidates = new Map<string, { text: string; context: string; url: URL }>();
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const rawHref = decodeHtml(match[1].trim());
    const text = decodeHtml(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    const searchable = `${rawHref} ${text}`.toLowerCase();
    if (!discoveryKeywords.some((keyword) => searchable.includes(keyword))) continue;
    let url: URL;
    try {
      url = new URL(rawHref, response.url);
      parseApprovedOfficialUrl(url.toString());
    } catch {
      continue;
    }
    url.hash = "";
    const contextStart = Math.max(0, (match.index ?? 0) - 12_000);
    const context = decodeHtml(
      html
        .slice(contextStart, match.index ?? 0)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    candidates.set(url.toString(), { text, context, url });
  }

  let created = 0;
  let existing = 0;
  let skippedWithoutYear = 0;
  for (const candidate of candidates.values()) {
    const searchable = `${candidate.url.pathname} ${candidate.url.search} ${candidate.text}`;
    const year =
      inferYear(searchable, null) ??
      source.year ??
      inferYear(candidate.context, null);
    const directPdf = /\.pdf(?:$|[?#])/i.test(candidate.url.toString());
    if (directPdf && !year) {
      skippedWithoutYear += 1;
      continue;
    }
    const result = await db.officialSource.upsert({
      where: { sourceUrl: candidate.url.toString() },
      update: {},
      create: {
        vestibular: source.vestibular,
        year,
        edition: source.edition,
        examDay: source.examDay,
        fileType: directPdf ? inferOfficialFileType(searchable) : OfficialFileType.INDEX_PAGE,
        sourceKind: directPdf ? OfficialSourceKind.DIRECT_FILE : OfficialSourceKind.SEED_PAGE,
        sourceUrl: candidate.url.toString(),
        sourceDomain: cleanHost(candidate.url.hostname),
        status: OfficialSourceStatus.PENDING,
        notes: `Descoberta em ${source.sourceUrl}${candidate.text ? ` — ${candidate.text}` : ""}`,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created += 1;
    else existing += 1;
  }

  await logOfficialImport({
    sourceId,
    action: "discover",
    status: "SUCCESS",
    message: `${created} fonte(s) pendente(s) descoberta(s).`,
    metadata: { candidates: candidates.size, created, existing, skippedWithoutYear },
  });
  return { candidates: candidates.size, created, existing, skippedWithoutYear };
}
