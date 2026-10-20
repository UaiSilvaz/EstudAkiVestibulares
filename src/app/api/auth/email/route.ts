import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmEmailVerification, emailDeliveryConfigured, sendEmailVerification } from "@/lib/email-verification";
import { checkRateLimit } from "@/server/security/rate-limit";
import { clientIpFromRequest, readJsonRequest } from "@/server/security/request";

export async function POST(request: Request) {
  const limit = checkRateLimit({ key: `email:${clientIpFromRequest(request)}`, limit: 6, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: "Aguarde um minuto para tentar novamente." }, { status: 429 });
  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 4096 });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (!data || typeof data !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  try {
    if (typeof data.token === "string") {
      return await confirmEmailVerification(data.token)
        ? NextResponse.json({ message: "E-mail confirmado. Entre para começar a estudar." })
        : NextResponse.json({ error: "Link expirado ou já utilizado. Solicite outra confirmação." }, { status: 400 });
    }
    if (typeof data.email !== "string" || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }
    if (!emailDeliveryConfigured()) return NextResponse.json({ error: "Confirmação por e-mail indisponível no momento." }, { status: 503 });
    const user = await db.user.findUnique({ where: { email: data.email.trim().toLowerCase() }, select: { id: true, email: true, emailVerifiedAt: true } });
    if (user && !user.emailVerifiedAt) await sendEmailVerification(user);
    return NextResponse.json({ message: "Se houver uma conta aguardando confirmação, você receberá um e-mail. Confira também o spam." });
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar seu e-mail agora. Tente novamente." }, { status: 503 });
  }
}
