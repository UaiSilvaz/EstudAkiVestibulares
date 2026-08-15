import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { betaAchievementCatalog } from "@/lib/achievement-catalog";
import { db } from "@/lib/db";
import { syncUserAchievements } from "@/lib/backend-metrics";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  }
  const persistedUser = await db.user.findUnique({ where: { id: persistedUserId } });
  if (!persistedUser) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 409 });
  }
  try {
    const achievements = await syncUserAchievements(persistedUser);
    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("Falha ao sincronizar conquistas pela API", error);
    return NextResponse.json({
      achievements: betaAchievementCatalog.map((item) => ({
        id: `catalog-${item.slug}`,
        progress: 0,
        completed: false,
        unlockedAt: null,
        percentage: 0,
        achievement: {
          slug: item.slug,
          title: item.name,
          description: item.description,
          lockedDescription: item.lockedDescription,
          category: item.category,
          rarity: item.rarity,
          metric: item.metric,
          target: item.criteriaValue,
          requirement: null,
          xpReward: item.xpReward,
          coinReward: item.coinReward,
          titleReward: item.titleReward ?? null,
          cosmeticReward: item.cosmeticReward ?? null,
          icon: item.icon,
          iconKey: item.iconKey,
          iconDescription: item.iconDescription,
          color: item.color,
          isHidden: item.isHidden,
        },
      })),
      safeMode: true,
    });
  }
}
