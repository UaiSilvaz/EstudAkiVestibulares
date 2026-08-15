import { ContentStatus, Prisma } from "@prisma/client";
import { achievementCatalog, achievementCategorySummary } from "@/lib/achievement-catalog";
import { db } from "@/lib/db";

async function main() {
  const slugs = achievementCatalog.map((achievement) => achievement.slug);

  await db.$transaction(async (transaction) => {
    const staleAchievements = await transaction.achievement.findMany({
      where: { slug: { notIn: slugs } },
      select: { id: true },
    });

    if (staleAchievements.length) {
      const staleIds = staleAchievements.map((achievement) => achievement.id);
      await transaction.userAchievement.deleteMany({
        where: { achievementId: { in: staleIds } },
      });
      await transaction.achievement.deleteMany({
        where: { id: { in: staleIds } },
      });
    }

    for (const achievement of achievementCatalog) {
      const data = {
        title: achievement.name,
        description: achievement.description,
        lockedDescription: achievement.lockedDescription,
        category: achievement.category,
        rarity: achievement.rarity,
        metric: achievement.metric,
        target: achievement.target,
        requirement: achievement.requirement as Prisma.InputJsonObject,
        subjectId: achievement.subjectId ?? null,
        examId: achievement.examId ?? null,
        contentId: achievement.contentId ?? null,
        icon: achievement.icon,
        color: achievement.color,
        xpReward: achievement.xpReward,
        coinReward: achievement.coinReward,
        titleReward: achievement.titleReward ?? null,
        cosmeticReward: achievement.cosmeticReward ?? null,
        iconKey: achievement.iconKey,
        iconDescription: achievement.iconDescription,
        unlockedIconPath: achievement.unlockedIconPath,
        lockedIconPath: achievement.lockedIconPath,
        isHidden: achievement.isHidden,
        isRepeatable: achievement.isRepeatable,
        order: achievement.order,
        criteriaType: achievement.criteriaType,
        criteriaValue: achievement.criteriaValue,
        status: ContentStatus.PUBLISHED,
      };

      await transaction.achievement.upsert({
        where: { slug: achievement.slug },
        update: data,
        create: { slug: achievement.slug, ...data },
      });
    }
  });

  const total = await db.achievement.count();
  const published = await db.achievement.count({ where: { status: ContentStatus.PUBLISHED } });

  console.log(`Conquistas sincronizadas: ${total}`);
  console.log(`Conquistas publicadas: ${published}`);
  console.log(JSON.stringify(achievementCategorySummary(), null, 2));

  if (total !== 500 || published !== 500) {
    throw new Error(`Catalogo invalido no banco: total=${total}, published=${published}`);
  }
}

main()
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
