import { CartItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";

async function currentUserId() {
  const user = await getCurrentUser();
  return user ? getPersistedUserId(user) : null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const items = await db.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        include: { material: { include: { subject: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    items,
    count: items.filter((item) => item.status === "CART").reduce((sum, item) => sum + item.quantity, 0),
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const body = (await request.json()) as { productId?: string; status?: CartItemStatus };
  if (!body.productId) return NextResponse.json({ error: "Produto não informado." }, { status: 400 });
  const product = await db.product.findFirst({
    where: { id: body.productId, status: "PUBLISHED" },
  });
  if (!product) return NextResponse.json({ error: "Produto indisponível." }, { status: 404 });
  const item = await db.cartItem.upsert({
    where: { userId_productId: { userId, productId: product.id } },
    update: { status: body.status ?? "CART" },
    create: { userId, productId: product.id, status: body.status ?? "CART" },
    include: { product: { include: { material: true } } },
  });
  return NextResponse.json({ item });
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const body = (await request.json()) as {
    id?: string;
    status?: CartItemStatus;
    quantity?: number;
  };
  const item = body.id
    ? await db.cartItem.findFirst({ where: { id: body.id, userId } })
    : null;
  if (!item) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  const updated = await db.cartItem.update({
    where: { id: item.id },
    data: {
      status: body.status,
      quantity:
        typeof body.quantity === "number"
          ? Math.min(10, Math.max(1, Math.round(body.quantity)))
          : undefined,
    },
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Item não informado." }, { status: 400 });
  const result = await db.cartItem.deleteMany({ where: { id, userId } });
  return NextResponse.json({ removed: result.count > 0 });
}
