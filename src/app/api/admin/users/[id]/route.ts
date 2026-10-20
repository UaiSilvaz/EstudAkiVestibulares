import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { manageAdminAccount } from "@/lib/admin-account-management";

function validRole(value: unknown): value is Role {
  return typeof value === "string" && Object.values(Role).includes(value as Role);
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/users/[id]">) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;

  const { id } = await context.params;
  const body = (await request.json()) as {
    role?: unknown;
    weeklyHours?: unknown;
    targetExam?: unknown;
    productId?: unknown;
    licenseAction?: unknown;
    banned?: unknown;
    banReason?: unknown;
  };
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  if (body.role !== undefined || body.banned !== undefined) {
    const result = await manageAdminAccount(authorization.user.id, id, body);
    return NextResponse.json("error" in result ? { error: result.error } : { user: result.user }, { status: result.status });
  }

  const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const data: {
    role?: Role;
    weeklyHours?: number;
    targetExam?: string;
  } = {};

  if (body.role !== undefined) {
    if (!validRole(body.role)) {
      return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
    }
    data.role = body.role;
  }

  if (typeof body.weeklyHours === "number" && Number.isFinite(body.weeklyHours)) {
    data.weeklyHours = Math.max(0, Math.min(80, Math.round(body.weeklyHours)));
  }

  if (typeof body.targetExam === "string") {
    data.targetExam = body.targetExam.trim().slice(0, 80) || "ENEM";
  }

  if (typeof body.productId === "string" && body.productId && body.licenseAction) {
    const product = await db.product.findUnique({
      where: { id: body.productId },
      select: { id: true, name: true, materialId: true },
    });
    if (!product?.materialId) {
      return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
    }

    if (body.licenseAction === "grant") {
      await db.userProduct.upsert({
        where: { userId_productId: { userId: id, productId: product.id } },
        update: { unlockedAt: new Date() },
        create: { userId: id, productId: product.id },
      });
    } else if (body.licenseAction === "revoke") {
      await db.userProduct.deleteMany({ where: { userId: id, productId: product.id } });
    } else {
      return NextResponse.json({ error: "Ação de material invalida." }, { status: 400 });
    }

    await db.activity.create({
      data: {
        userId: authorization.user.id,
        type: "CONTENT",
        message: `${authorization.user.name} ${
          body.licenseAction === "grant" ? "liberou" : "restringiu"
        } o material ${product.name} para ${target.email}.`,
      },
    });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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
      userId: authorization.user.id,
      type: "CONTENT",
      message: `${authorization.user.name} atualizou o usuário ${updated.email}.`,
    },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/admin/users/[id]">) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;

  const { id } = await context.params;
  if (id === authorization.user.id) {
    return NextResponse.json(
      { error: "Você não pode excluir a própria conta administrativa." },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const adminCount = await db.user.count({ where: { role: Role.ADMIN } });
  if (target.role === Role.ADMIN && adminCount <= 1) {
    return NextResponse.json(
      { error: "Mantenha pelo menos um administrador ativo." },
      { status: 400 },
    );
  }

  await db.$transaction([
    db.user.delete({ where: { id } }),
    db.activity.create({
      data: {
        userId: authorization.user.id,
        type: "CONTENT",
        message: `${authorization.user.name} excluiu o usuário ${target.email}.`,
      },
    }),
  ]);

  return NextResponse.json({ deleted: true });
}
