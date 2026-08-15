import { db } from "../../src/lib/db";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = argument("--email")?.trim().toLowerCase();
  const expectedId = argument("--expected-id")?.trim();
  const createdAfter = argument("--created-after")?.trim();

  if (!email || !expectedId || !createdAfter) {
    throw new Error(
      "Uso: tsx scripts/enem/cleanup-corpus-app-evidence-user.ts --email <email> --expected-id <id> --created-after <ISO>",
    );
  }
  if (!/^[a-z0-9._+-]+@app-evidence\.estudaki\.invalid$/.test(email)) {
    throw new Error("A limpeza aceita somente usuários temporários @app-evidence.estudaki.invalid.");
  }

  const lowerBound = new Date(createdAfter);
  if (Number.isNaN(lowerBound.getTime())) {
    throw new Error("--created-after deve ser uma data ISO válida.");
  }

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          activities: true,
          attempts: true,
          authoredQuestions: true,
          authoredVideos: true,
          achievements: true,
          purchases: true,
          licenses: true,
          pdfAnnotations: true,
          studySessions: true,
          videoComments: true,
          videoLikes: true,
          videoSaves: true,
          examAttempts: true,
          questionFavorites: true,
          questionReports: true,
          cartItems: true,
          ownedFlashcards: true,
          flashcardFavorites: true,
          essays: true,
          communityPosts: true,
          communityPostLikes: true,
          conversationMemberships: true,
          chatMessages: true,
          createdConversations: true,
          studyPlanTasks: true,
        },
      },
    },
  });

  if (!user) throw new Error("Usuário temporário não localizado para limpeza.");
  if (user.id !== expectedId) throw new Error("ID do usuário temporário diverge do ID esperado.");
  if (user.role !== "STUDENT") throw new Error("Usuário temporário não possui papel STUDENT.");
  if (user.createdAt < lowerBound) {
    throw new Error("Usuário localizado é anterior ao início desta execução; limpeza recusada.");
  }

  const allowedRelations = new Set(["activities", "attempts"]);
  const unexpectedRelations = Object.entries(user._count)
    .filter(([relation, count]) => !allowedRelations.has(relation) && count > 0)
    .map(([relation, count]) => ({ relation, count }));
  if (unexpectedRelations.length > 0) {
    throw new Error(
      `Usuário temporário possui relações inesperadas: ${JSON.stringify(unexpectedRelations)}.`,
    );
  }

  const deleted = await db.$transaction(async (transaction) => {
    const attempts = await transaction.questionAttempt.deleteMany({ where: { userId: user.id } });
    const activities = await transaction.activity.deleteMany({ where: { userId: user.id } });
    await transaction.user.delete({ where: { id: user.id } });
    return { attempts: attempts.count, activities: activities.count, users: 1 };
  });

  const [
    users,
    attempts,
    activities,
    examAttempts,
    essays,
    favorites,
    reports,
    studySessions,
  ] = await Promise.all([
    db.user.count({ where: { id: user.id } }),
    db.questionAttempt.count({ where: { userId: user.id } }),
    db.activity.count({ where: { userId: user.id } }),
    db.examAttempt.count({ where: { userId: user.id } }),
    db.essaySubmission.count({ where: { userId: user.id } }),
    db.questionFavorite.count({ where: { userId: user.id } }),
    db.questionReport.count({ where: { userId: user.id } }),
    db.studySession.count({ where: { userId: user.id } }),
  ]);
  const remaining = {
    users,
    attempts,
    activities,
    examAttempts,
    essays,
    favorites,
    reports,
    studySessions,
  };
  console.log(
    JSON.stringify({
      cleaned: Object.values(remaining).every((count) => count === 0),
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      deleted,
      remaining,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
