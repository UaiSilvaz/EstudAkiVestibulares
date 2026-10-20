import { RankingLeaderboard, type RankingPlayer } from "@/components/ranking-leaderboard";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leagueForXp } from "@/lib/utils";

type RankingUser = {
  id: string;
  name: string;
  email: string;
  xp: number;
  league: string;
  avatarUrl: string | null;
  targetExam: string | null;
};

function currentUserAsRankingUser(user: RankingUser): RankingUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    xp: user.xp,
    league: user.league,
    avatarUrl: user.avatarUrl,
    targetExam: user.targetExam,
  };
}

export default async function RankingPage() {
  const currentUser = await requireUser();
  let users: RankingUser[] = [];
  let totalUsers = 0;
  let myRank: number | null = null;
  let nextUser: Pick<RankingUser, "id" | "name" | "xp"> | null = null;

  try {
    const [leaderboardUsers, total, usersAhead, nearestAhead] = await Promise.all([
      db.user.findMany({
        where: { role: "STUDENT" },
        orderBy: { xp: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          email: true,
          xp: true,
          league: true,
          avatarUrl: true,
          targetExam: true,
        },
      }),
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { role: "STUDENT", xp: { gt: currentUser.xp } } }),
      db.user.findFirst({
        where: { role: "STUDENT", xp: { gt: currentUser.xp } },
        orderBy: { xp: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          xp: true,
          league: true,
          avatarUrl: true,
          targetExam: true,
        },
      }),
    ]);

    users = leaderboardUsers;
    totalUsers = total;
    myRank = currentUser.role === "STUDENT" ? usersAhead + 1 : null;
    nextUser = nearestAhead;

    if (currentUser.role === "STUDENT" && !users.some((user) => user.id === currentUser.id)) {
      users = [...users, currentUserAsRankingUser(currentUser)].sort((a, b) => b.xp - a.xp);
    }
  } catch {
    users = [];
    totalUsers = 0;
    myRank = null;
  }

  const players: RankingPlayer[] = users.map((user) => ({
    id: user.id, name: user.name, xp: user.xp,
    league: leagueForXp(user.xp, user.targetExam),
    avatarUrl: user.avatarUrl ?? null,
    targetExam: user.targetExam ?? "ENEM",
    rank: user.id === currentUser.id && myRank ? myRank : users.filter(other => other.xp > user.xp).length + 1,
  }));

  if (!myRank) {
    const currentIndex = players.findIndex((user) => user.id === currentUser.id);
    myRank = currentIndex >= 0 ? players[currentIndex].rank : null;
  }

  if (!nextUser) {
    nextUser =
      players
        .filter((user) => user.xp > currentUser.xp)
        .sort((first, second) => first.xp - second.xp)[0] ?? null;
  }

  const currentLeague = leagueForXp(currentUser.xp, currentUser.targetExam);
  const xpToOvertake = nextUser ? Math.max(0, nextUser.xp - currentUser.xp + 1) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ranking"
        title="Leaderboard Norte Preparatórios"
        description="Pódio, foto de perfil, liga atual e XP com microanimações no hover para deixar a disputa com cara de jogo."
      />

      <RankingLeaderboard
        players={players}
        currentUserId={currentUser.id}
        currentXp={currentUser.xp}
        currentLeague={currentLeague}
        myRank={myRank}
        totalUsers={totalUsers || players.length}
        xpToOvertake={xpToOvertake}
        nextName={nextUser?.name ?? null}
      />
    </div>
  );
}
