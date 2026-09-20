import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActivePreparationContext } from "@/lib/preparations";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const userId = await getPersistedUserId(user);
  if (!userId) {
    return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  }

  let body: { preparationId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  if (typeof body.preparationId !== "string") {
    return NextResponse.json({ error: "Preparacao nao informada." }, { status: 400 });
  }

  const membership = await db.userPreparation.findFirst({
    where: {
      userId,
      preparationId: body.preparationId,
      status: "ACTIVE",
    },
    select: { preparationId: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Preparacao nao encontrada para este usuario." }, { status: 404 });
  }

  await db.user.update({
    where: { id: userId },
    data: { activePreparationId: membership.preparationId },
  });

  return NextResponse.json(await getActivePreparationContext(userId));
}

