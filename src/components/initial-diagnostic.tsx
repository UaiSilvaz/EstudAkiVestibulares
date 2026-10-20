import { Target, BarChart3 } from "@/components/visual/aicon-icons";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import { StudyIcon, type StudyIconName } from "@/components/visual/study-icon";

type DiagnosticArea = { key: StudyIconName; label: string; initialScore: number | null; attempts: number };
export function InitialDiagnostic({ areas, pendingErrors }: { areas: DiagnosticArea[]; pendingErrors: number }) {
  const measured = areas.filter(area => area.initialScore !== null);
  return <div className="space-y-6">
    <header className="rounded-3xl border border-orange-100    p-6 sm:p-8 professional-neutral"><Target className="h-8 w-8 text-orange-600" strokeWidth={1.5} /><h1 className="mt-4 font-display text-3xl font-bold">Conheça seu ponto de partida.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Este diagnóstico usa suas respostas nas questões. Comece por uma lista curta; seus acertos e dificuldades vão aparecer aqui conforme você pratica.</p>
      <Link href="/questions?session=1&count=10" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white">Responder questões do diagnóstico<ArrowRight className="h-4 w-4" /></Link>
    </header>
    <div className="flex items-center gap-2 text-sm text-slate-500"><BarChart3 className="h-4 w-4" />{measured.length} áreas com pelo menos 3 respostas · {pendingErrors} erros registrados</div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{areas.map(area => <article key={area.key} className="rounded-2xl border border-slate-100 bg-white p-5"><div className="flex items-center justify-between"><StudyIcon name={area.key} size="sm" /><span className="text-xs text-slate-400">{area.attempts} respostas</span></div><h2 className="mt-4 font-semibold">{area.label}</h2>{area.initialScore === null ? <p className="mt-3 text-sm text-slate-400">Ainda sem histórico suficiente.</p> : <><p className="mt-3 text-2xl font-bold">{area.initialScore}%<span className="ml-1 text-xs font-normal text-slate-400">de acertos</span></p><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: area.initialScore + "%" }} /></div></>}</article>)}</div>
    <p className="flex items-start gap-2 text-xs leading-5 text-slate-400"><CircleHelp className="h-4 w-4 shrink-0" />A porcentagem mostra acertos nas questões respondidas. Ela não representa uma nota prevista na prova.</p>
    <Link href="/cronograma" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700">Ver meu cronograma<ArrowRight className="h-4 w-4" /></Link>
  </div>;
}
