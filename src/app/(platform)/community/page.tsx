import { MessageCircleQuestion, Sparkles, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CommunityPage() {
  await requireUser();
  const [activities, challenges] = await Promise.all([
    db.activity.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true },
      take: 12,
    }),
    db.challenge.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { endsAt: "asc" },
    }),
  ]);

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
