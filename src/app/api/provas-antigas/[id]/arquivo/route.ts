import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOldExamPublicPdfCandidates, getOldExamRemotePdfCandidates, isProbablyPdfUrl } from "@/lib/old-exam-documents";
import { getOldExam, resolveOldExamFile } from "@/lib/old-exams";

export const runtime = "nodejs";

const PDF_SIGNATURE = "%PDF-";
const PDF_PROBE_RANGE = "bytes=0-4";
const publicRoot = path.resolve(process.cwd(), "public");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const { id } = await params;
  const url = new URL(request.url);
  const kind = url.searchParams.get("tipo") === "gabarito" ? "gabarito" : "prova";
  const download = url.searchParams.get("download") === "1";
  const exam = await getOldExam(id);

  if (!exam) return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });

  for (const publicPath of getOldExamPublicPdfCandidates(exam, kind)) {
    const absolutePath = resolvePublicPdfPath(publicPath);
    if (!absolutePath) continue;

    try {
      if (await fileStartsWithPdfSignature(absolutePath)) {
        return await filePdfResponse(absolutePath, `${exam.slug}-${kind}.pdf`, request, download);
      }
    } catch {
      // Try the next local/official source.
    }
  }

  try {
    const resolved = await resolveOldExamFile(id, kind);
    if (resolved) {
      return await filePdfResponse(resolved.absolutePath, `${resolved.record.slug}-${kind}.pdf`, request, download);
    }
  } catch {
    // Fallbacks below handle deployments without local data files.
  }

  const storedPath = kind === "gabarito" ? exam.arquivoGabaritoPath : exam.arquivoProvaPath;
  if (storedPath) {
    try {
      const relative = storedPath.replace(/^data[\\/]+provas[\\/]+/, "").replace(/\\/g, "/");
      if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
        return await filePdfResponse(path.join(process.cwd(), "private-old-exams", relative), `${exam.slug}-${kind}.pdf`, request, download);
      }
    } catch {
      // Fallback to official URL below.
    }
  }

  const official = await db.provaAntiga
    .findUnique({
      where: { id },
      select: {
        officialExamFile: { select: { originalUrl: true } },
        officialKeyFile: { select: { originalUrl: true } },
      },
    })
    .catch(() => null);
  const officialUrl = kind === "gabarito" ? official?.officialKeyFile?.originalUrl : official?.officialExamFile?.originalUrl;
  const remoteCandidates = [...new Set([...getOldExamRemotePdfCandidates(exam, kind), officialUrl].filter((value): value is string => Boolean(value)))];

  for (const remoteUrl of remoteCandidates) {
    try {
      return await remotePdfResponse(remoteUrl, `${exam.slug}-${kind}.pdf`, request, download);
    } catch {
      // Try the next canonical source before failing the request.
    }
  }

  return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });
}

function basePdfHeaders(fileName: string, download: boolean) {
  return new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
  });
}

async function filePdfResponse(absolutePath: string, fileName: string, request: Request, download: boolean) {
  const stat = await fs.stat(absolutePath);
  if (!stat.isFile()) throw new Error("Arquivo invalido.");

  const range = parseRange(request.headers.get("range"), stat.size);
  const headers = basePdfHeaders(fileName, download);

  if (range) {
    const stream = createReadStream(absolutePath, { start: range.start, end: range.end });
    const length = range.end - range.start + 1;
    headers.set("Content-Length", String(length));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${stat.size}`);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: 206,
      headers,
    });
  }

  const stream = createReadStream(absolutePath);
  headers.set("Content-Length", String(stat.size));
  return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    status: 200,
    headers,
  });
}

async function remotePdfResponse(remoteUrl: string, fileName: string, request: Request, download: boolean) {
  await assertRemotePdf(remoteUrl);

  const remote = await fetchRemotePdfStreamWithRetries(new URL(remoteUrl), request.headers.get("range"));
  if (!pdfHeadersLookValid(remote.headers, remoteUrl)) {
    await remote.body.cancel().catch(() => undefined);
    throw new Error("Fonte retornou conteudo que nao e PDF.");
  }

  const headers = basePdfHeaders(fileName, download);
  copyHeader(remote.headers, headers, "Content-Length");
  copyHeader(remote.headers, headers, "Content-Range");
  copyHeader(remote.headers, headers, "Accept-Ranges");

  return new NextResponse(remote.body, {
    status: remote.status,
    headers,
  });
}

async function assertRemotePdf(remoteUrl: string) {
  const probe = await fetchRemotePdfStreamWithRetries(new URL(remoteUrl), PDF_PROBE_RANGE);
  if (!pdfHeadersLookValid(probe.headers, remoteUrl)) {
    await probe.body.cancel().catch(() => undefined);
    throw new Error("Fonte retornou conteudo que nao e PDF.");
  }

  const signature = await readStreamSignature(probe.body);
  if (signature !== PDF_SIGNATURE) {
    throw new Error("Fonte retornou conteudo que nao e PDF.");
  }
}

function pdfHeadersLookValid(headers: Headers, sourceUrl: string) {
  const contentType = headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html") || contentType.includes("application/json")) return false;
  return !contentType || contentType.includes("pdf") || isProbablyPdfUrl(sourceUrl);
}

async function readStreamSignature(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const bytes: number[] = [];

  try {
    while (bytes.length < PDF_SIGNATURE.length) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      for (const byte of value) {
        if (bytes.length >= PDF_SIGNATURE.length) break;
        bytes.push(byte);
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  return Buffer.from(bytes).toString("ascii");
}

function resolvePublicPdfPath(publicPath: string) {
  try {
    const pathname = decodeURIComponent(new URL(publicPath, "https://estudaki.local").pathname);
    if (!pathname.toLowerCase().endsWith(".pdf")) return null;

    const relativePath = pathname.replace(/^\/+/, "").replace(/\//g, path.sep);
    const absolutePath = path.resolve(publicRoot, relativePath);
    if (absolutePath !== publicRoot && !absolutePath.startsWith(`${publicRoot}${path.sep}`)) return null;
    return absolutePath;
  } catch {
    return null;
  }
}

async function fileStartsWithPdfSignature(absolutePath: string) {
  const handle = await fs.open(absolutePath, "r");
  try {
    const buffer = Buffer.alloc(PDF_SIGNATURE.length);
    const { bytesRead } = await handle.read(buffer, 0, PDF_SIGNATURE.length, 0);
    return bytesRead === PDF_SIGNATURE.length && buffer.toString("ascii") === PDF_SIGNATURE;
  } finally {
    await handle.close();
  }
}

async function fetchRemotePdfStreamWithRetries(url: URL, range: string | null) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetchRemotePdfStream(url, range);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Fonte oficial indisponivel.");
}

function fetchRemotePdfStream(url: URL, range: string | null, redirects = 0): Promise<{ body: ReadableStream<Uint8Array>; headers: Headers; status: number }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const headers: http.OutgoingHttpHeaders = {
      Accept: "application/pdf,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 EstudAki PDF Reader",
    };
    if (range) headers.Range = range;

    const proxyRequest = client.get(
      url,
      {
        headers,
        rejectUnauthorized: false,
      },
      (response) => {
        const statusCode = response.statusCode ?? 500;
        const location = response.headers.location;
        if ([301, 302, 303, 307, 308].includes(statusCode) && location && redirects < 5) {
          response.resume();
          void fetchRemotePdfStream(new URL(location, url), range, redirects + 1).then(resolve, reject);
          return;
        }

        if (statusCode >= 400) {
          response.resume();
          reject(new Error(`Fonte recusou ${statusCode}`));
          return;
        }

        const responseHeaders = new Headers({
          "Content-Type": String(response.headers["content-type"] ?? "application/pdf"),
        });
        const contentLength = response.headers["content-length"];
        const contentRange = response.headers["content-range"];
        const acceptRanges = response.headers["accept-ranges"];
        if (contentLength) responseHeaders.set("Content-Length", String(contentLength));
        if (contentRange) responseHeaders.set("Content-Range", String(contentRange));
        responseHeaders.set("Accept-Ranges", String(acceptRanges ?? "bytes"));

        resolve({
          body: Readable.toWeb(response) as ReadableStream<Uint8Array>,
          headers: responseHeaders,
          status: statusCode === 206 ? 206 : 200,
        });
      },
    );

    proxyRequest.setTimeout(30000, () => {
      proxyRequest.destroy(new Error("Timeout ao abrir PDF oficial."));
    });
    proxyRequest.on("error", reject);
  });
}

function parseRange(rangeHeader: string | null, totalSize: number) {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start = rawStart ? Number(rawStart) : 0;
  let end = rawEnd ? Number(rawEnd) : totalSize - 1;

  if (!rawStart && rawEnd) {
    const suffixLength = Number(rawEnd);
    start = Math.max(totalSize - suffixLength, 0);
    end = totalSize - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= totalSize) {
    return null;
  }

  return { start, end: Math.min(end, totalSize - 1) };
}

function copyHeader(from: Headers, to: Headers, name: string) {
  const value = from.get(name);
  if (value) to.set(name, value);
}
