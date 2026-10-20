import type { Prisma } from "@prisma/client";
import { leagueForXp } from "./utils";

export function studyDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export async function lockStudentProgress(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"progress:" + userId}))`;
}

export async function awardStudyXp(tx: Prisma.TransactionClient, userId: string, sourceKey: string, amount: number, reason: string) {
  await lockStudentProgress(tx, userId);
  await reconcileStudyXp(tx, userId);
  const existing = await tx.xpAward.findUnique({ where: { userId_sourceKey: { userId, sourceKey } } });
  if (existing || amount <= 0) return 0;
  if (!Number.isSafeInteger(amount)) throw new Error("Invalid XP award");
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  await tx.xpAward.create({ data: { userId, sourceKey, amount, reason } });
  const updated = await tx.user.update({ where: { id: userId }, data: {
    xp: { increment: amount }, league: leagueForXp(user.xp + amount, user.targetExam),
  } });
  await tx.activity.create({ data: { userId, type: "XP", xp: amount, message: reason } });
  return updated.xp - user.xp;
}

// One-time conversion of persisted learning history; arbitrary demo balances are not retained.
export async function reconcileStudyXp(tx: Prisma.TransactionClient, userId: string) {
  await lockStudentProgress(tx, userId);
  const marker = "migration:study-ledger-v1";
  if (await tx.xpAward.findUnique({ where: { userId_sourceKey: { userId, sourceKey: marker } } })) return;
  const [attempts, lessons, achievements, rewards, simulations, lessonQuestions, legacyReviews] = await Promise.all([
    tx.questionAttempt.findMany({ where: { userId, annulled: false }, orderBy: { createdAt: "asc" }, select: { questionId: true, correct: true, createdAt: true } }),
    tx.lessonProgress.findMany({ where: { userId, completed: true, xpAwarded: { gt: 0 } }, select: { lessonId: true, xpAwarded: true, completedAt: true, lesson: { select: { xpReward: true } } } }),
    tx.userAchievement.findMany({ where: { userId, completed: true, rewardClaimed: true }, select: { achievementId: true, unlockedAt: true, achievement: { select: { xpReward: true } } } }),
    tx.userReward.findMany({ where: { userId }, select: { rewardId: true, claimedAt: true, reward: { select: { xpReward: true } } } }),
    tx.simulationAttempt.findMany({ where: { userId, xpAwarded: { gt: 0 } }, orderBy: { submittedAt: "asc" }, select: { simulationId: true, xpAwarded: true, submittedAt: true } }),
    tx.lessonQuestionAttempt.findMany({ where: { userId, xpAwarded: { gt: 0 } }, orderBy: { createdAt: "asc" }, select: { questionId: true, xpAwarded: true, createdAt: true } }),
    tx.activity.findMany({ where: { userId, type: "CONTENT", xp: 3, message: { contains: "revisou uma questão" } }, select: { id: true, createdAt: true } }),
  ]);
  const rows = new Map<string, { amount: number; createdAt: Date; reason: string }>();
  const add = (key: string, amount: number, date: Date | null, reason: string) => { if (!rows.has(key) && amount > 0) rows.set(key, { amount, createdAt: date ?? new Date(), reason }); };
  for (const row of attempts) add("question:" + row.questionId, row.correct ? 15 : 5, row.createdAt, "Histórico de questões");
  for (const row of lessonQuestions) add("question:" + row.questionId, row.xpAwarded, row.createdAt, "Histórico de questões em aulas");
  for (const row of lessons) add("lesson:" + row.lessonId, Math.min(row.xpAwarded, row.lesson.xpReward), row.completedAt, "Histórico de aulas concluídas");
  for (const row of achievements) add("achievement:" + row.achievementId, row.achievement.xpReward, row.unlockedAt, "Histórico de conquistas");
  for (const row of rewards) add("reward:" + row.rewardId, row.reward.xpReward, row.claimedAt, "Histórico de recompensas");
  for (const row of simulations) add("simulation:" + row.simulationId, row.xpAwarded, row.submittedAt, "Histórico de simulados");
  for (const row of legacyReviews) add("legacy-review:" + row.id, 3, row.createdAt, "Histórico de revisões");
  if (rows.size) await tx.xpAward.createMany({ data: [...rows].map(([sourceKey, row]) => ({ userId, sourceKey, ...row })), skipDuplicates: true });
  await tx.xpAward.create({ data: { userId, sourceKey: marker, amount: 0, reason: "Saldo conciliado com o histórico de aprendizagem" } });
  const total = await tx.xpAward.aggregate({ where: { userId }, _sum: { amount: true } });
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  await tx.user.update({ where: { id: userId }, data: { xp: total._sum.amount ?? 0, league: leagueForXp(total._sum.amount ?? 0, user.targetExam) } });
}

export async function syncStudyStreak(tx: Prisma.TransactionClient, userId: string) {
  await lockStudentProgress(tx, userId);
  const [attempts, lessons, sessions] = await Promise.all([
    tx.questionAttempt.findMany({ where: { userId, annulled: false }, select: { createdAt: true } }),
    tx.lessonProgress.findMany({ where: { userId, completedAt: { not: null } }, select: { completedAt: true } }),
    tx.studySession.findMany({ where: { userId, endedAt: { not: null }, durationSeconds: { gt: 0 } }, select: { endedAt: true } }),
  ]);
  const days = new Set([...attempts.map(row => row.createdAt), ...lessons.map(row => row.completedAt!), ...sessions.map(row => row.endedAt!)].map(studyDayKey));
  let date = new Date(), streak = 0;
  if (!days.has(studyDayKey(date))) date = new Date(date.getTime() - 86400000);
  while (days.has(studyDayKey(date))) { streak++; date = new Date(date.getTime() - 86400000); }
  await tx.user.update({ where: { id: userId }, data: { streak } });
  return streak;
}
