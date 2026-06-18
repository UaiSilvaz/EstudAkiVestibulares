import { MessageCircleQuestion, Sparkles, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActivityType, ContentStatus, type Challenge, type Prisma } from "@prisma/client";

type ActivityWithUser = Prisma.ActivityGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        role: true;
        avatarUrl: true;
      };
    };
  };
}>;

export default async function CommunityPage() {
  const user = await requireUser();
  let activities: ActivityWithUser[] = [];
  let challenges: Challenge[] = [];

  try {
    [activities, challenges] = await Promise.all([
      db.activity.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
        take: 12,
      }),
      db.challenge.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { endsAt: "asc" },
      }),
    ]);
  } catch {
    const now = new Date();
    activities = [
      {
        id: "local-activity-1",
        userId: user.id,
        type: ActivityType.QUESTION,
        message: `${user.name} acessou o acervo de provas antigas.`,
        xp: 30,
        createdAt: now,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      },
      {
        id: "local-activity-2",
        userId: null,
        type: ActivityType.CONTENT,
        message: "Novo acervo local com ENEM, ETEC, FATEC, FUVEST, UNICAMP e UNESP.",
        xp: 0,
        createdAt: now,
        user: null,
      },
    ];
    challenges = [
      {
        id: "local-challenge-1",
        title: "Resolver 20 questoes por dia",
        description: "Use provas antigas para manter constancia durante a semana.",
        rewardXp: 350,
        goal: 20,
        metric: "questions",
        status: ContentStatus.PUBLISHED,
        startsAt: now,
        endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  return (
    <div>
      <PageHeader
        eyebrow="Comunidade"
        title="Evolucao, desafios e duvidas"
        description="Uma comunidade orientada ao estudo: conquistas, ranking, desafios e duvidas por questao, sem feed social aberto."
      />
      <section className="grid gap-5 xl:grid-cols-[0.85fr_1fr]">
        <div className="space-y-5">
          <div className="estudaki-card rounded-[30px] p-6">
            <div className="mb-4 flex items-center gap-3">
              <Trophy className="h-6 w-6 text-amber-500" />
              <h2 className="text-2xl font-black text-slate-950">Desafios semanais</h2>
            </div>
            <div className="space-y-3">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="rounded-2xl bg-white p-4">
                  <p className="font-black text-slate-950">{challenge.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{challenge.description}</p>
                  <p className="mt-2 text-xs font-black text-amber-500">+{challenge.rewardXp} XP</p>
                </div>
              ))}
            </div>
          </div>

          <div className="estudaki-card rounded-[30px] p-6">
            <div className="mb-4 flex items-center gap-3">
              <MessageCircleQuestion className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-black text-slate-950">Duvidas por questao</h2>
            </div>
            <p className="text-sm leading-6 text-slate-500">
              A estrutura esta pronta para comentarios em cada questao. Alunos perguntam;
              professores e monitores respondem com contexto pedagogico.
            </p>
          </div>
        </div>

        <div className="estudaki-card rounded-[30px] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-black text-slate-950">Feed de evolucao</h2>
          </div>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="font-semibold text-slate-700">{activity.message}</p>
                <p className="mt-1 text-xs font-black text-slate-400">
                  {activity.user?.name ?? "EstudAki"} · {activity.type}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
