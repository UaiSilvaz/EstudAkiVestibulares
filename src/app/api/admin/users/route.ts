import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { ensureEstudakiMaterials } from "@/lib/materials-bootstrap";

export async function GET() {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  try {
    await ensureEstudakiMaterials();
  } catch (error) {
    console.error("Falha ao preparar materiais no admin", error);
  }

  const [users, products] = await Promise.all([
    db.user.findMany({
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
      purchases: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          buyerEmail: true,
          status: true,
          createdAt: true,
          product: { select: { name: true, priceCents: true, checkoutUrl: true } },
        },
      },
      licenses: {
        orderBy: { unlockedAt: "desc" },
        take: 5,
        select: {
          id: true,
          unlockedAt: true,
          progress: true,
          product: { select: { name: true, slug: true, priceCents: true } },
        },
      },
      cartItems: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          quantity: true,
          product: { select: { name: true, priceCents: true } },
        },
      },
      _count: {
        select: {
          attempts: { where: { annulled: false } },
          achievements: true,
          studySessions: true,
          purchases: true,
          licenses: true,
        },
      },
    },
    }),
    db.product.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        priceCents: true,
        checkoutUrl: true,
        material: { select: { title: true, fileUrl: true, premium: true } },
      },
    }),
  ]);

  return NextResponse.json({
    users,
    products: products.filter((product) => product.material),
  });
}

export async function POST(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const currentUser = authorization.user;

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
