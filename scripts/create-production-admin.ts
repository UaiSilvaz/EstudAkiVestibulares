import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { emailDeliveryConfigured, sendEmailVerification } from "../src/lib/email-verification";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || Buffer.byteLength(password) > 72 || ["Admin@123", "123456"].includes(password)) {
    throw new Error("Configure SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD com uma senha exclusiva de 12 a 72 bytes.");
  }
  if (await db.user.count({ where: { role: "ADMIN" } })) throw new Error("Já existe administrador. Use a conta existente; nenhuma conta foi alterada.");
  if (!emailDeliveryConfigured()) throw new Error("Configure Resend, remetente e endereço do aplicativo antes de criar o administrador.");
  const user = await db.user.create({ data: { email, name: "Administrador", passwordHash: await bcrypt.hash(password, 12), role: "ADMIN" } });
  await sendEmailVerification(user);
  console.log("Administrador criado. Confirme o e-mail recebido antes de entrar. Retire SEED_ADMIN_PASSWORD das variáveis depois desta operação.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Não foi possível criar o administrador."); process.exitCode = 1; }).finally(() => db.$disconnect());
