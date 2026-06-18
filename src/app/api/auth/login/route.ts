import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "admin@gmail";
const ADMIN_PASSWORD = "Admin@123";

export async function POST(request: Request) {
  const { email, password, name } = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isAdminLogin = normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);
  const displayName =
    name?.trim() ||
    (isAdminLogin ? "Administrador EstudAki" : normalizedEmail.split("@")[0] || "Estudante");

  let user: { id: string; name: string; email: string; role: Role } = {
    id: isAdminLogin ? "local-admin" : `local-user:${encodeURIComponent(normalizedEmail)}`,
    name: displayName,
    email: normalizedEmail,
    role: isAdminLogin ? Role.ADMIN : Role.STUDENT,
  };

  try {
    user = await db.user.upsert({
      where: { email: normalizedEmail },
      update: {
        passwordHash,
        name: displayName,
        ...(isAdminLogin ? { role: Role.ADMIN } : {}),
      },
      create: {
        email: normalizedEmail,
        name: displayName,
        passwordHash,
        role: isAdminLogin ? Role.ADMIN : Role.STUDENT,
        targetExam: "ENEM",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  } catch {
    // Local development fallback when DATABASE_URL is not configured.
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
