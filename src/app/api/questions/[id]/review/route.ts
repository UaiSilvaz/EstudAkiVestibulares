import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncUserAchievements } from "@/lib/backend-metrics";
import { leagueForXp } from "@/lib/utils";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  }

  const { id } = await params;
  const result = await db.questionAttempt.updateMany({
    where: {
      userId: persistedUserId,
      questionId: id,
      correct: false,
      annulled: false,
      reviewed: false,
    },
    data: {
      reviewed: true,
      reviewedAt: new Date(),
    },
  });

  if (result.count > 0) {
    const userBeforeReward = await db.user.findUnique({
      where: { id: persistedUserId },
      select: { xp: true, league: true },
    });
    const nextLeague = userBeforeReward ? leagueForXp(userBeforeReward.xp + 3) : null;
    await db.$transaction([
      db.user.update({
        where: { id: persistedUserId },
        data: {
          xp: { increment: 3 },
          ...(nextLeague && nextLeague !== userBeforeReward?.league ? { league: nextLeague } : {}),
        },
      }),
      db.activity.create({
        data: {
          userId: persistedUserId,
          type: "CONTENT",
          message: `${user.name} revisou uma questão do caderno de erros.`,
          xp: 3,
        },
      }),
    ]);
  }

  const persistedUser = await db.user.findUnique({ where: { id: persistedUserId } });
  const achievements =
    result.count > 0 && persistedUser
      ? (await syncUserAchievements(persistedUser).catch((error) => {
          console.error("Falha ao sincronizar conquistas de revisão:", error);
          return [];
        }))
          .filter((record) => record.newlyUnlocked)
          .map((record) => record.achievement)
      : [];

  return NextResponse.json({ reviewed: result.count, achievements });
}
