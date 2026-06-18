import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    avatarUrl?: string | null;
    weeklyHours?: number;
    targetExam?: string;
  };

  try {
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        name: body.name?.trim() || undefined,
        avatarUrl: body.avatarUrl === undefined ? undefined : body.avatarUrl || null,
        weeklyHours:
          typeof body.weeklyHours === "number"
            ? Math.max(0, Math.min(80, Math.round(body.weeklyHours)))
            : undefined,
        targetExam: body.targetExam?.trim() || undefined,
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
      },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({
      user: {
        ...user,
        name: body.name?.trim() || user.name,
        avatarUrl: body.avatarUrl === undefined ? user.avatarUrl : body.avatarUrl || null,
        weeklyHours:
          typeof body.weeklyHours === "number"
            ? Math.max(0, Math.min(80, Math.round(body.weeklyHours)))
            : user.weeklyHours,
        targetExam: body.targetExam?.trim() || user.targetExam,
      },
    });
  }
}
