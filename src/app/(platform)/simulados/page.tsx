import { CalendarClock, CheckCircle2, Clock3, PlayCircle } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { simulationState } from "@/lib/exam-simulations";

type ScheduledExam = Prisma.ExamGetPayload<{
  include: { vestibular: true; attempts: { select: { submittedAt: true; score: true } } };
}>;

export default async function SimuladosPage() {
  const user = await requireUser();
  let exams: ScheduledExam[];
  try {
    exams = await db.exam.findMany({
      where: { isSimulado: true, status: "PUBLISHED" },
      include: { vestibular: true, attempts: { where: { userId: user.id }, select: { submittedAt: true, score: true } } },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    });
  } catch {
    exams = [];
  }

  return <div>
    <PageHeader eyebrow="Simulados oficiais" title="Provas com data, PDF e tempo real" description="O PDF e liberado na abertura. Responda na folha digital e receba o gabarito na data definida pela equipe." />
    {exams.length === 0 ? <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-12 text-center"><CalendarClock className="mx-auto h-10 w-10 text-orange-400" /><h2 className="mt-3 text-xl font-black text-slate-950">Nenhum simulado agendado</h2><p className="mt-2 text-slate-500">Quando a equipe publicar a próxima prova, ela aparecerá aqui.</p></div> :
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{exams.map((exam) => {
        const state = simulationState(exam); const attempt = exam.attempts[0];
        const label = attempt?.submittedAt ? "Ver entrega" : state === "OPEN" ? "Iniciar agora" : state === "SCHEDULED" ? "Ver detalhes" : "Encerrado";
        return <article key={exam.id} className="estudaki-card rounded-[30px] p-6" style={{ borderTop: `4px solid ${exam.color}` }}>
          <div className="flex items-center justify-between gap-2"><span className="rounded-full px-3 py-1 text-xs font-black text-white" style={{ background: exam.vestibular.color }}>{exam.vestibular.name}</span><Status state={state} submitted={Boolean(attempt?.submittedAt)} /></div>
          <h2 className="mt-5 text-2xl font-black text-slate-950">{exam.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{exam.description || "Simulado em PDF preparado pela equipe EstudAki."}</p>
          <div className="mt-5 grid grid-cols-2 gap-3"><Mini label="Questões" value={String(exam.questionCount ?? "--")} /><Mini label="Tempo" value={`${exam.durationMinutes ?? "--"} min`} /></div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600"><p>Abre: {formatDate(exam.startsAt) ?? "imediatamente"}</p><p className="mt-1">Encerra: {formatDate(exam.endsAt) ?? "sem prazo"}</p>{attempt?.score != null && <p className="mt-1 text-emerald-700">Nota: {attempt.score.toFixed(1)}%</p>}</div>
          <Link href={`/simulados/${exam.id}`} className="estudaki-button estudaki-button-primary mt-5 w-full"><PlayCircle className="h-4 w-4" />{label}</Link>
        </article>;
      })}</section>}
  </div>;
}

function Status({ state, submitted }: { state: "SCHEDULED" | "OPEN" | "CLOSED"; submitted: boolean }) {
  if (submitted) return <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700"><CheckCircle2 className="h-4 w-4" />Entregue</span>;
  return <span className={`inline-flex items-center gap-1 text-xs font-black ${state === "OPEN" ? "text-emerald-700" : "text-slate-500"}`}><Clock3 className="h-4 w-4" />{state === "OPEN" ? "Aberto" : state === "SCHEDULED" ? "Agendado" : "Fechado"}</span>;
}
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p></div>; }
function formatDate(value: Date | null) { return value?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }); }
