import { Clock3, PlayCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";

export default async function SimuladosPage() {
  await requireUser();
  const simulados = await db.simulado.findMany({
    where: { status: "PUBLISHED" },
    include: { vestibular: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Simulados"
        title="Treinos completos e diagnosticos"
        description="Listas e simulados para medir desempenho e alimentar o plano inteligente."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {simulados.map((simulado) => {
          const questionIds = parseJson<string[]>(simulado.questionIds, []);
          return (
            <article key={simulado.id} className="estudaki-card rounded-[30px] p-6">
              <span
                className="rounded-full px-3 py-1 text-xs font-black text-white"
                style={{ background: simulado.vestibular.color }}
              >
                {simulado.vestibular.name}
              </span>
              <h2 className="mt-5 text-2xl font-black text-slate-950">{simulado.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{simulado.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Questoes</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{questionIds.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Tempo</p>
                  <p className="mt-1 flex items-center gap-1 text-xl font-black text-slate-950">
                    <Clock3 className="h-4 w-4" />
                    {simulado.durationMin}m
                  </p>
                </div>
              </div>
              <Link href="/questions" className="estudaki-button estudaki-button-primary mt-5 w-full">
                <PlayCircle className="h-4 w-4" />
                Iniciar treino
              </Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
