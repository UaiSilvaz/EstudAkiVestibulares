import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { buildStudyNowRecommendation } from "@/lib/learning/study-now";

function readAvailableMinutes(value: unknown) {
  if (value === "default" || value == null) return "default";
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const availableMinutes = readAvailableMinutes(
    typeof body === "object" && body ? (body as { availableMinutes?: unknown }).availableMinutes : undefined,
  );

  if (availableMinutes === null) {
    return NextResponse.json({ error: "Tempo disponivel invalido." }, { status: 400 });
  }

  const persistedUserId = await getPersistedUserId(user);
  try {
    const recommendation = await buildStudyNowRecommendation({
      userId: persistedUserId ?? user.id,
      profile: {
        name: user.name,
        weeklyHours: user.weeklyHours,
        targetExam: user.targetExam,
      },
      availableMinutes,
    });

    return NextResponse.json({ recommendation });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel montar a sessao agora." },
      { status: 500 },
    );
  }
}
