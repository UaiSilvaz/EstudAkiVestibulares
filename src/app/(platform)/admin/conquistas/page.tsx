import { Award, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { achievementCategoryCounts } from "@/lib/achievement-catalog";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

const categoryLabels: Record<string, string> = {
  FIRST_STEPS: "Primeiros passos",
  QUESTIONS_TOTAL: "Questoes",
  CORRECT_TOTAL: "Acertos",
  SUBJECT: "Disciplinas",
  STREAK: "Sequencia",
  STUDY_TIME: "Tempo",
  PERFORMANCE: "Desempenho",
  SIMULATION: "Simulados",
  EXAM: "Vestibulares",
  ERROR_NOTEBOOK: "Caderno de erros",
  ESSAY: "Redacao",
  CONTENT_MASTERY: "Conteudos",
  COMMUNITY: "Comunidade",
  MATERIALS: "Materiais e aulas",
  SECRET: "Secretas",
};

export default async function AdminConquistasPage() {
  await requireManager();

  const [total, unlocked, byCategory, rarest] = await Promise.all([
    db.achievement.count(),
    db.userAchievement.count({ where: { completed: true } }),
    db.achievement.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { category: "asc" },
    }),
    db.achievement.findMany({
      orderBy: [{ rarity: "desc" }, { order: "asc" }],
      take: 12,
      select: {
        slug: true,
        title: true,
        category: true,
        rarity: true,
        xpReward: true,
        _count: { select: { users: { where: { completed: true } } } },
      },
    }),
  ]);

  const counts = new Map(byCategory.map((item) => [item.category, item._count._all]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gamificacao"
        title="Administrar conquistas"
        description="Catalogo oficial de 500 conquistas EstudAki, com categorias, raridades, requisitos e recompensas."
        action={
          <Link href="/conquistas" className="ek-button ek-button-primary">
            <Sparkles className="h-4 w-4" />
            Ver como aluno
          </Link>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-[8px] bg-gradient-to-br from-[#2563EB] to-[#22D3EE] p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/70">Catalogo</p>
          <p className="mt-2 text-3xl font-black">{total}</p>
        </article>
        <article className="rounded-[8px] bg-gradient-to-br from-[#F97316] to-[#FACC15] p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/70">Desbloqueios</p>
          <p className="mt-2 text-3xl font-black">{unlocked}</p>
        </article>
        <article className="rounded-[8px] bg-gradient-to-br from-[#22C55E] to-[#22D3EE] p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/70">Status</p>
          <p className="mt-2 text-3xl font-black">{total === 500 ? "OK" : "Revisar"}</p>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(achievementCategoryCounts).map(([category, expected]) => {
          const count = counts.get(category) ?? 0;
          return (
            <article key={category} className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{categoryLabels[category] ?? category}</p>
                  <p className="text-xs font-bold text-slate-500">Esperado: {expected}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${count === expected ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {count}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Auditoria rapida</p>
            <h2 className="text-2xl font-black text-slate-950">Conquistas raras e desbloqueios</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-[8px] bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
            <RefreshCw className="h-4 w-4" />
            Recalculo automatico ao abrir /conquistas
          </span>
        </div>
        <div className="grid gap-2">
          {rarest.map((achievement) => (
            <div key={achievement.slug} className="flex items-center justify-between gap-3 rounded-[8px] border border-slate-100 bg-slate-50 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#FACC15] to-[#F97316] text-white">
                  <Award className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{achievement.title}</p>
                  <p className="text-xs font-bold text-slate-500">{achievement.category} · {achievement.rarity} · {achievement.xpReward} XP</p>
                </div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                {achievement._count.users} aluno(s)
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
