import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncUserAchievements } from "@/lib/backend-metrics";
import { awardStudyXp, lockStudentProgress } from "@/lib/study-xp";

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
  const result = await db.$transaction(async tx => {
    await lockStudentProgress(tx, persistedUserId);
    const rows = await tx.questionAttempt.updateMany({ where: { userId: persistedUserId, questionId: id, correct: false, annulled: false, reviewed: false }, data: { reviewed: true, reviewedAt: new Date() } });
    if (rows.count) await awardStudyXp(tx, persistedUserId, "review:" + id, 3, "Revisão de questão concluída");
    return rows;
  });

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
