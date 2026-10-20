import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ChartNoAxesCombined, ClipboardList, Target } from "lucide-react";
import { StudyFocusPanel } from "./study-focus-panel";
import { PageHeader } from "../page-header";
import { StatTile } from "../visual/stat-tile";
import { EvolutionChart } from "../visual/evolution-chart";
import { StudyIcon } from "../visual/study-icon";
import { getVerticalTheme } from "@/config/vertical-themes";

/** A local component preview. Never used as a student's dashboard or data source. */
export function DashboardPreviewContent({ slug, controls }: { slug: string; controls?: React.ReactNode }) {
  const theme = getVerticalTheme(slug);
  return <div className="space-y-6">
    <PageHeader eyebrow={theme.shortName} title="Seu próximo passo começa aqui." description="Prévia local da interface · sem dados de alunos." action={controls} />
    <StudyFocusPanel eyebrow={theme.copy.dashboardKicker} title={theme.copy.heroTitle} description={theme.copy.heroDescription} actionLabel={theme.copy.primaryCta} actionHref="/questions" completed={0} goal={10} />
    <nav className="dashboard-shortcuts" aria-label="Atalhos de estudo"><Link href="/cronograma"><CalendarDays />Meu plano</Link><Link href="/questions"><ClipboardList />Praticar questões</Link><Link href="/simulados"><Target />Simulados</Link><Link href="/performance"><ChartNoAxesCombined />Meu progresso</Link></nav>
    <div className="grid gap-4 sm:grid-cols-3"><StatTile label="Questões hoje" value="0" hint="Sem atividade registrada" icon={null} accent="blue" /><StatTile label="Precisão" value="—" hint="Resultados conforme você estuda" icon={null} accent="blue" /><StatTile label="Revisões" value="0" hint="Seu próximo foco" icon={null} accent="blue" /></div>
    <div className="grid items-start gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <section className="dashboard-chart-card"><div className="mb-5 flex items-center justify-between"><h2 className="!mb-0">Sua semana de estudo</h2><CalendarDays className="h-4 w-4 text-[color:var(--theme-muted)]" /></div><div className="space-y-3">{theme.subjects.slice(0, 3).map((subject, index) => <div className="flex items-center gap-3 rounded-xl border border-[color:var(--theme-border)] p-3" key={subject.slug}><StudyIcon name={index === 0 ? "linguagens" : index === 1 ? "matematica" : "redacao"} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{subject.name}</p><p className="mt-1 text-[10px] text-[color:var(--theme-muted)]">Exemplo de organização do plano</p></div><ArrowRight className="h-4 w-4 text-[color:var(--theme-muted)]" /></div>)}</div><Link href="/cronograma" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--theme-primary)]">Ver meu plano<ArrowRight className="h-4 w-4" /></Link></section>
      <section className="dashboard-chart-card"><h2>Seu aprendizado em perspectiva</h2><EvolutionChart data={[null, null, null, null, null, null, null]} labels={["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]} height={150} /><div className="mt-6 flex items-center gap-3 border-t border-[color:var(--theme-border)] pt-5"><BookOpen className="h-5 w-5 text-[color:var(--theme-primary)]" /><p className="text-xs leading-6 text-[color:var(--theme-muted)]">Os resultados aparecem conforme você pratica.<br />Sem números inventados.</p></div></section>
    </div>
  </div>;
}
