import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";

export default async function AdminSimuladosPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  const [simulados, simulations] = await Promise.all([
    db.simulado.findMany({ orderBy: { createdAt: "desc" } }),
    db.simulation.findMany({ include: { course: { select: { title: true, slug: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <div className="space-y-5">
    <PageHeader eyebrow="Administração" title="Simulados cadastrados" description={`${simulados.length + simulations.length} simulados e atividades de curso no banco.`} />
    <div className="grid gap-4 md:grid-cols-2">
      {simulados.map(item => <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">{item.title}</h2><p className="mt-2 text-sm text-slate-600">{item.status}</p><Link className="mt-4 inline-block text-blue-700" href={`/simulados/${item.id}`}>Abrir simulado</Link></article>)}
      {simulations.map(item => <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">{item.title}</h2><p className="mt-2 text-sm text-slate-600">{item.course.title} · {item.durationMinutes} minutos</p><Link className="mt-4 inline-block text-blue-700" href={`/cursos/${item.course.slug}`}>Abrir curso</Link></article>)}
    </div>
    {!simulados.length && !simulations.length && <p className="rounded-2xl bg-white p-6">Nenhum simulado cadastrado.</p>}
  </div>;
}
