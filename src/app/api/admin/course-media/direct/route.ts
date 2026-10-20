import { NextResponse } from "next/server";
import { canUseTeacherTools, getCurrentUser } from "@/lib/auth";
import { completeDirectUpload, prepareDirectUpload } from "@/lib/course-media-direct";
import { readJsonRequest, clientIpFromRequest } from "@/server/security/request";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canUseTeacherTools(user.role)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  if (!checkRateLimit({ key: `media-upload:${user.id}:${clientIpFromRequest(request)}`, limit: 30, windowMs: 60_000 }).allowed) return NextResponse.json({ error: "Aguarde antes de enviar mais arquivos." }, { status: 429 });
  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 8192 });
  if (!parsed.ok) return parsed.response;
  if (!parsed.data || typeof parsed.data !== "object") return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  try {
    if (parsed.data.action === "complete" && typeof parsed.data.receipt === "string") return NextResponse.json(await completeDirectUpload(user.id, parsed.data.receipt));
    const upload = await prepareDirectUpload(user.id, parsed.data);
    if (!upload) return NextResponse.json({ localUpload: process.env.NODE_ENV !== "production", error: "Configure o Storage para enviar arquivos." }, { status: 503 });
    return NextResponse.json(upload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível enviar o arquivo." }, { status: 400 });
  }
}
