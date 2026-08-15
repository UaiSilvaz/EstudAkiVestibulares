import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";

async function main() {
  const production =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || "admin@local.estudaki";
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

  if (production && (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD)) {
    throw new Error("SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD são obrigatórios em produção.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await db.user.upsert({
    where: { email },
    update: {
      name: "Administrador EstudAki",
      passwordHash,
      role: Role.ADMIN,
      targetExam: "ENEM",
    },
    create: {
      email,
      name: "Administrador EstudAki",
      passwordHash,
      role: Role.ADMIN,
      xp: 12800,
      streak: 42,
      league: "Diamante",
      weeklyHours: 20,
      targetExam: "ENEM",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  console.log(JSON.stringify(admin, null, 2));
}

main()
  .finally(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
