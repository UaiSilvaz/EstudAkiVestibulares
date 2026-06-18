import http from "node:http";
import https from "node:https";
import { NextResponse } from "next/server";

function fetchBuffer(url: URL): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.get(
      url,
      {
        headers: { "User-Agent": "Mozilla/5.0 EstudAki PDF Reader" },
        rejectUnauthorized: false,
      },
      (response) => {
        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode ?? 500}`));
          response.resume();
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: response.headers["content-type"] ?? "application/pdf",
          });
        });
      },
    );

    request.setTimeout(30000, () => {
      request.destroy(new Error("Timeout ao baixar PDF."));
    });
    request.on("error", reject);
  });
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

  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ error: "Protocolo nao permitido." }, { status: 400 });
  }

  try {
    const { buffer, contentType } = await fetchBuffer(url);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF indisponivel." }, { status: 502 });
  }
}
