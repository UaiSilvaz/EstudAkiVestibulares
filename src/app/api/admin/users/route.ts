import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      xp: true,
      streak: true,
      league: true,
      weeklyHours: true,
      targetExam: true,
      createdAt: true,
      _count: {
        select: {
          attempts: true,
          achievements: true,
          studySessions: true,
        },
      },
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManageContent(currentUser.role)) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
    weeklyHours?: number;
    targetExam?: string;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nome, email e senha sao obrigatorios." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Email ja cadastrado." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = body.role && Object.values(Role).includes(body.role) ? body.role : Role.STUDENT;

  const created = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      weeklyHours:
        typeof body.weeklyHours === "number"
          ? Math.max(0, Math.min(80, Math.round(body.weeklyHours)))
          : 8,
      targetExam: body.targetExam?.trim() || "ENEM",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      xp: true,
      streak: true,
      league: true,
      weeklyHours: true,
      targetExam: true,
      createdAt: true,
    },
  });

  await db.activity.create({
    data: {
      userId: currentUser.id,
      type: "CONTENT",
      message: `${currentUser.name} cadastrou o usuario ${created.name}.`,
    },
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
