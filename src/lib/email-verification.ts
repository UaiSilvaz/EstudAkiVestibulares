import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export function emailVerificationRequired() {
  return process.env.NODE_ENV === "production" || process.env.EMAIL_VERIFICATION_REQUIRED === "true";
}

export function emailDeliveryConfigured() {
  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM &&
      (appUrl.protocol === "https:" || (process.env.NODE_ENV !== "production" &&
        ["localhost", "127.0.0.1"].includes(appUrl.hostname))));
  } catch { return false; }
}

export async function sendEmailVerification(user: { id: string; email: string }) {
  if (!emailDeliveryConfigured()) throw new Error("Confirmação por e-mail indisponível. Tente novamente mais tarde.");
  const token = randomBytes(32).toString("hex");
  const record = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`email-verification:${user.id}`}))`;
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true, emailVerifiedAt: true } });
    if (current.emailVerifiedAt || current.email !== user.email) return null;
    const recent = await tx.emailVerification.findFirst({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
    if (recent) return null;
    return tx.emailVerification.create({ data: { userId: user.id, email: user.email,
      tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60 * 60_000) } });
  });
  if (!record) return;
  const link = new URL("/confirmar-email", process.env.NEXT_PUBLIC_APP_URL!);
  link.searchParams.set("token", token);
  let sent = false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json",
        "Idempotency-Key": `verify-email/${record.id}` },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [user.email], subject: "Confirme seu e-mail no Norte Preparatórios",
        text: `Confirme seu endereço para começar a estudar: ${link.toString()}\nO link expira em uma hora. Se você não criou esta conta, ignore esta mensagem.` }),
      signal: AbortSignal.timeout(10_000),
    });
    sent = response.ok;
  } finally {
    if (!sent) await db.emailVerification.deleteMany({ where: { id: record.id, usedAt: null } });
  }
  if (!sent) throw new Error("Não foi possível enviar a confirmação. Solicite um novo e-mail.");
}

export async function confirmEmailVerification(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return db.$transaction(async tx => {
    const record = await tx.emailVerification.findUnique({ where: { tokenHash }, include: { user: { select: { email: true } } } });
    if (!record || record.usedAt || record.expiresAt <= new Date() || record.email !== record.user.email) return false;
    const claimed = await tx.emailVerification.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!claimed.count) return false;
    const updated = await tx.user.updateMany({ where: { id: record.userId, email: record.email }, data: { emailVerifiedAt: new Date() } });
    if (!updated.count) throw new Error("O endereço da conta foi alterado.");
    await tx.emailVerification.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
    return true;
  });
}
