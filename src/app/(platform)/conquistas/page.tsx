import Link from "next/link";
import { Sparkles } from "lucide-react";
import { AchievementGallery } from "@/components/achievements/achievement-gallery";
import { PageHeader } from "@/components/page-header";
import { getPersistedUserId, requireUser } from "@/lib/auth";
import { betaAchievementCatalog } from "@/lib/achievement-catalog";
import { syncUserAchievements } from "@/lib/backend-metrics";
import { db } from "@/lib/db";

export default async function ConquistasPage() {
  const sessionUser = await requireUser();
  const persistedUserId = await getPersistedUserId(sessionUser);
  let currentUser = sessionUser;
  let achievementError = false;
  let achievements: Array<{
    id: string;
    progress: number;
    completed: boolean;
    unlockedAt: Date | null;
    percentage: number;
    achievement: {
      slug: string;
      title: string;
      description: string;
      lockedDescription: string | null;
      category: string;
      rarity: string;
      metric: string;
      target: number;
      requirement: unknown;
      xpReward: number;
      coinReward: number;
      titleReward: string | null;
      cosmeticReward: string | null;
      icon: string;
      iconKey: string;
      iconDescription: string;
      color: string;
      isHidden: boolean;
    };
  }> = [];

  try {
    const persistedUser = persistedUserId
      ? await db.user.findUnique({ where: { id: persistedUserId } })
      : null;
    if (persistedUser) {
      currentUser = persistedUser;
      achievements = await syncUserAchievements(persistedUser);
      const refreshedUser = await db.user.findUnique({ where: { id: persistedUser.id } });
      if (refreshedUser) currentUser = refreshedUser;
    }
  } catch (error) {
    console.error("Falha ao sincronizar conquistas", error);
    achievementError = true;
  }

  if (achievements.length === 0) {
    achievements = betaAchievementCatalog.map((item) => ({
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
    }));
  }

  const galleryAchievements = achievements.map((record) => ({
    id: record.id,
    progress: record.progress,
    completed: record.completed,
    unlockedAt: record.unlockedAt?.toISOString() ?? null,
    percentage: record.percentage,
    achievement: {
      slug: record.achievement.slug,
      title: record.achievement.title,
      description: record.achievement.description,
      lockedDescription: record.achievement.lockedDescription,
      category: record.achievement.category,
      rarity: record.achievement.rarity,
      metric: record.achievement.metric,
      target: record.achievement.target,
      requirement: null,
      xpReward: record.achievement.xpReward,
      coinReward: record.achievement.coinReward,
      titleReward: record.achievement.titleReward,
      cosmeticReward: record.achievement.cosmeticReward,
      icon: record.achievement.icon,
      iconKey: record.achievement.iconKey,
      iconDescription: record.achievement.iconDescription,
      color: record.achievement.color,
      isHidden: record.achievement.isHidden,
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conquistas"
        title="Colecao de progresso"
        highlight="EstudAki"
        description="Uma selecao beta com 20 emblemas para acompanhar os primeiros marcos de estudo, revisao, questoes e constancia."
        action={
          <Link
            href="/perfil"
            className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#22C55E] px-5 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:-translate-y-0.5 active:scale-[0.99]"
          >
            Ver perfil <Sparkles className="h-4 w-4" />
          </Link>
        }
      />

      {achievementError && (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          Nao foi possivel sincronizar seu progresso agora. O catalogo foi carregado em modo seguro.
        </div>
      )}

      <AchievementGallery achievements={galleryAchievements} totalXp={currentUser.xp} />
    </div>
  );
}
