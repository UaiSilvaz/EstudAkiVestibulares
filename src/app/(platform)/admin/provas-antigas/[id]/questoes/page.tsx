import { ArrowLeft, CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { getOldExam, listOldExamQuestions } from "@/lib/old-exams";
import { difficultyLabel } from "@/lib/utils";

export default async function AdminOldExamQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  const [exam, links] = await Promise.all([getOldExam(id), listOldExamQuestions(id)]);
  if (!exam) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/provas-antigas" className="estudaki-button estudaki-button-ghost"><ArrowLeft className="h-4 w-4" /> Voltar ao acervo</Link>
      <section className="rounded-[30px] border border-slate-100 bg-white p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">{exam.vestibular} · {exam.ano}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Questões vinculadas</h1>
        <p className="mt-2 font-semibold text-slate-500">{exam.titulo} · {links.length} vínculo(s)</p>
      </section>
      {links.length ? links.map((link) => (
        <article key={link.id} className="rounded-[24px] border border-slate-100 bg-white p-5">
          <div className="flex items-start gap-3">
            {link.questao.status === "PUBLISHED" ? <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" /> : <CircleAlert className="mt-1 h-5 w-5 text-amber-600" />}
            <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Questão {link.numeroQuestao} · {link.questao.status}</p><p className="mt-2 line-clamp-3 font-semibold leading-6 text-slate-700">{link.questao.statement}</p><p className="mt-2 text-xs font-bold text-slate-500">Gabarito: {link.questao.correctAlternative} · dificuldade: {difficultyLabel(link.questao.difficulty)}</p></div>
          </div>
        </article>
      )) : <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center"><CircleAlert className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-700">Nenhuma questão foi importada ou vinculada.</p><p className="mt-1 text-sm font-semibold text-slate-500">Revise os arquivos em scripts/import/output antes de executar qualquer importação.</p></div>}
    </div>
  );
}
