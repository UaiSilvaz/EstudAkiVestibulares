import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { findPilotJob } from "@/lib/enem-import-admin";

type RouteParameters = { params: Promise<{ jobId: string }> };

export const runtime = "nodejs";

function localRoot(...segments: string[]) {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), ...segments);
}

export async function GET(request: Request, context: RouteParameters) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { jobId } = await context.params;
  const job = await findPilotJob(jobId);
  if (!job) return NextResponse.json({ error: "Job do piloto não encontrado." }, { status: 404 });
  const { searchParams } = new URL(request.url);
  if (searchParams.get("kind") !== "consolidated") {
    return NextResponse.json({ error: "Arquivo não permitido." }, { status: 400 });
  }
  const allowedDirectory = process.env.ENEM_CONSOLIDATED_ROOT
    ? path.resolve(process.env.ENEM_CONSOLIDATED_ROOT)
    : localRoot("data", "QUESTÕES");
  const filePath = path.resolve(allowedDirectory, "Banco_Provas_ENEM_2009_2025_EstudAki.pdf");
  if (!filePath.startsWith(`${allowedDirectory}${path.sep}`)) {
    return NextResponse.json({ error: "Caminho de arquivo recusado." }, { status: 400 });
  }
  let fileSize: number;
  try {
    fileSize = (await stat(filePath)).size;
  } catch {
    return NextResponse.json({ error: "PDF consolidado indisponível." }, { status: 404 });
  }

  const range = request.headers.get("range");
  let start = 0;
  let end = fileSize - 1;
  let status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }
    start = match[1] ? Number(match[1]) : 0;
    end = match[2] ? Number(match[2]) : Math.min(fileSize - 1, start + 4 * 1024 * 1024 - 1);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= fileSize) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }
    end = Math.min(end, fileSize - 1);
    status = 206;
  }
  const nodeStream = createReadStream(filePath, { start, end });
  const stream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": "application/pdf",
    "Content-Disposition": 'inline; filename="Banco_Provas_ENEM_2009_2025_EstudAki.pdf"',
    "Content-Length": String(end - start + 1),
    "Cache-Control": "private, no-store",
  });
  if (status === 206) headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  return new Response(stream, { status, headers });
}
