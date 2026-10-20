import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || Buffer.byteLength(password) > 72 ||
  ["Admin@123", "123456", "prof123"].includes(password)) {
  throw new Error("Configure SEED_ADMIN_EMAIL e uma SEED_ADMIN_PASSWORD exclusiva, com 12 a 72 bytes.");
}
const db = new PrismaClient();
try {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing && existing.role !== "ADMIN") throw new Error("O e-mail já pertence a outro cargo. Use um e-mail exclusivo para o administrador.");
  if (existing) {
    console.log("Administrador já cadastrado. A senha existente foi preservada; use recuperação para alterá-la.");
  } else {
    await db.user.create({ data: { email, name: "Administrador EstudAki", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) } });
    console.log("Administrador criado. Nenhuma conta ou conteúdo de demonstração foi importado.");
  }
} finally { await db.$disconnect(); }
