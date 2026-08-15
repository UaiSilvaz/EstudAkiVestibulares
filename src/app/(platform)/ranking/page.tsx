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
  let nextUser: RankingUser | null = null;

  try {
    const [leaderboardUsers, total, usersAhead, nearestAhead] = await Promise.all([
      db.user.findMany({
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
      db.user.count(),
      db.user.count({ where: { xp: { gt: currentUser.xp } } }),
      db.user.findFirst({
        where: { xp: { gt: currentUser.xp } },
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
    myRank = usersAhead + 1;
    nextUser = nearestAhead;

    if (!users.some((user) => user.id === currentUser.id)) {
      users = [...users, currentUserAsRankingUser(currentUser)].sort((a, b) => b.xp - a.xp);
    }
  } catch {
    users = [
      currentUserAsRankingUser(currentUser),
      {
        id: "local-ranking-1",
        name: "Ana ENEM",
        email: "ana@example.local",
        xp: 9600,
        league: "Diamante",
        avatarUrl: null,
        targetExam: "ENEM",
      },
      {
        id: "local-ranking-2",
        name: "Lucas FUVEST",
        email: "lucas@example.local",
        xp: 7850,
        league: "Platina",
        avatarUrl: null,
        targetExam: "FUVEST",
      },
      {
        id: "local-ranking-3",
        name: "Marina UNICAMP",
        email: "marina@example.local",
        xp: 6420,
        league: "Ouro",
        avatarUrl: null,
        targetExam: "UNICAMP",
      },
      {
        id: "local-ranking-4",
        name: "Rafael ETEC",
        email: "rafael@example.local",
        xp: 4380,
        league: "Platina",
        avatarUrl: null,
        targetExam: "ETEC",
      },
      {
        id: "local-ranking-5",
        name: "Beatriz Medicina",
        email: "beatriz@example.local",
        xp: 3220,
        league: "Ouro",
        avatarUrl: null,
        targetExam: "ENEM",
      },
      {
        id: "local-ranking-6",
        name: "Joao Simulados",
        email: "joao@example.local",
        xp: 2100,
        league: "Prata",
        avatarUrl: null,
        targetExam: "UNESP",
      },
    ].sort((a, b) => b.xp - a.xp);
    totalUsers = users.length;
  }

  const players: RankingPlayer[] = users.map((user, index) => ({
    ...user,
    league: leagueForXp(user.xp),
    avatarUrl: user.avatarUrl ?? null,
    targetExam: user.targetExam ?? "ENEM",
    rank: user.id === currentUser.id && myRank ? myRank : index + 1,
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

  const currentLeague = leagueForXp(currentUser.xp);
  const xpToOvertake = nextUser ? Math.max(0, nextUser.xp - currentUser.xp + 1) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ranking"
        title="Leaderboard EstudAki"
        description="Podio, foto de perfil, liga atual e XP com microanimacoes no hover para deixar a disputa com cara de jogo."
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
