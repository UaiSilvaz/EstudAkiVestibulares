import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { assertPublicHttpsUrl } from "@/server/security/network";

export const runtime = "nodejs";

const PDF_SIGNATURE = "%PDF-";
const PDF_PROBE_RANGE = "bytes=0-4";

type PdfStream = {
  body: ReadableStream<Uint8Array>;
  headers: Headers;
  status: number;
};

function fetchPdfStream(url: URL, range: string | null, redirects = 0): Promise<PdfStream> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const headers: http.OutgoingHttpHeaders = { "User-Agent": "Mozilla/5.0 EstudAki PDF Reader" };
    if (range) headers.Range = range;

    const request = client.get(
      url,
      {
        headers,
      },
      (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location && redirects < 5) {
          const redirectUrl = new URL(response.headers.location, url);
          response.resume();
          void assertPublicHttpsUrl(redirectUrl)
            .then(() => fetchPdfStream(redirectUrl, range, redirects + 1))
            .then(resolve, reject);
          return;
        }

        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode ?? 500}`));
          response.resume();
          return;
        }

        const contentType = String(response.headers["content-type"] ?? "application/pdf").toLowerCase();
        if (contentType.includes("text/html") || contentType.includes("application/json")) {
          reject(new Error("Resposta remota nao e PDF."));
          response.resume();
          return;
        }

        const responseHeaders = new Headers({
          "Content-Type": response.headers["content-type"] ?? "application/pdf",
          "Cache-Control": "public, max-age=86400",
        });
        const contentLength = response.headers["content-length"];
        const contentRange = response.headers["content-range"];
        const acceptRanges = response.headers["accept-ranges"];

        if (contentLength) responseHeaders.set("Content-Length", contentLength);
        if (contentRange) responseHeaders.set("Content-Range", contentRange);
        responseHeaders.set("Accept-Ranges", acceptRanges ?? "bytes");

        resolve({
          body: Readable.toWeb(response) as ReadableStream<Uint8Array>,
          headers: responseHeaders,
          status: response.statusCode === 206 ? 206 : 200,
        });
      },
    );

    request.setTimeout(30000, () => {
      request.destroy(new Error("Timeout ao baixar PDF."));
    });
    request.on("error", reject);
  });
}

async function fetchPdfStreamWithRetries(url: URL, range: string | null) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetchPdfStream(url, range);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("PDF indisponivel.");
}

async function assertPdfUrl(url: URL) {
  const probe = await fetchPdfStreamWithRetries(url, PDF_PROBE_RANGE);
  const signature = await readStreamSignature(probe.body);

  if (signature !== PDF_SIGNATURE) {
    throw new Error("Resposta remota nao e PDF.");
  }
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "URL ausente." }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL invalida." }, { status: 400 });
  }

  try {
    await assertPublicHttpsUrl(url);
  } catch {
    return NextResponse.json({ error: "Protocolo nao permitido." }, { status: 400 });
  }

  try {
    await assertPdfUrl(url);
    const pdf = await fetchPdfStreamWithRetries(url, request.headers.get("range"));
    return new NextResponse(pdf.body, {
      status: pdf.status,
      headers: pdf.headers,
    });
  } catch {
    return NextResponse.json({ error: "PDF indisponivel." }, { status: 502 });
  }
}
