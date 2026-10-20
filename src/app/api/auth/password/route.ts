import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/server/security/rate-limit";
import { clientIpFromRequest, readJsonRequest } from "@/server/security/request";

export async function POST(request: Request) {
  const limit = checkRateLimit({ key: `password:${clientIpFromRequest(request)}`, limit: 6, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: "Aguarde um minuto antes de tentar novamente." }, { status: 429 });
  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 4096 });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (!data || typeof data !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  try {
    if (typeof data.token === "string") {
      if (!/^[a-f0-9]{64}$/.test(data.token) || typeof data.password !== "string" || data.password.length < 8 || Buffer.byteLength(data.password) > 72) {
        return NextResponse.json({ error: "Use uma senha de 8 a 72 bytes e um link válido." }, { status: 400 });
      }
      const tokenHash = createHash("sha256").update(data.token).digest("hex");
      const passwordHash = await bcrypt.hash(data.password, 12);
      const changed = await db.$transaction(async (tx) => {
        const reset = await tx.passwordReset.findUnique({ where: { tokenHash } });
        if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return false;
        const claimed = await tx.passwordReset.updateMany({
          where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() },
        });
        if (!claimed.count) return false;
        await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, emailVerifiedAt: new Date() } });
        await tx.authSession.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.passwordReset.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } });
        return true;
      });
      return changed ? NextResponse.json({ message: "Senha alterada. Entre com sua nova senha." })
        : NextResponse.json({ error: "Link expirado ou já utilizado. Solicite outro." }, { status: 400 });
    }
    if (typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 254) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!apiKey || !from || !appUrl) return NextResponse.json({ error: "Recuperação por e-mail indisponível no momento." }, { status: 503 });
    const user = await db.user.findUnique({ where: { email: data.email.trim().toLowerCase() }, select: { id: true, email: true } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const reset = await db.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 15 * 60_000) } });
      const link = new URL("/recuperar-senha", appUrl);
      link.searchParams.set("token", token);
      let sent = false;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [user.email], subject: "Recupere seu acesso ao Norte Preparatórios",
            text: `Para criar uma nova senha, abra: ${link.toString()}\nO link expira em 15 minutos. Se não solicitou, ignore este e-mail.` }),
          signal: AbortSignal.timeout(10_000),
        });
        sent = response.ok;
      } finally {
        if (!sent) await db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
      }
      if (!sent) return NextResponse.json({ error: "Não foi possível enviar o e-mail. Tente novamente." }, { status: 503 });
    }
    return NextResponse.json({ message: "Se o e-mail estiver cadastrado, você receberá um link para criar sua senha." });
  } catch {
    return NextResponse.json({ error: "Não foi possível recuperar o acesso agora." }, { status: 503 });
  }
}
