import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import {
  ensureEducationCatalog,
  getActivePreparationContext,
} from "@/lib/preparations";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const userId = await getPersistedUserId(user);
  if (!userId) {
    return NextResponse.json({ active: null, preparations: [] });
  }

  return NextResponse.json(await getActivePreparationContext(userId));
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const userId = await getPersistedUserId(user);
  if (!userId) {
    return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  }

  await ensureEducationCatalog();
  const preparations = await db.preparation.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ name: "asc" }],
    include: { vertical: true },
  });

  return NextResponse.json({ preparations });
}

