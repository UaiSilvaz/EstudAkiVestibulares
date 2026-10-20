import Link from "next/link";
import { ArrowUpRight, Target } from "lucide-react";

export function StudyFocusPanel({ eyebrow, title, description, actionLabel, actionHref, completed, goal }: {
  eyebrow: string; title: string; description: string; actionLabel: string; actionHref: string; completed: number; goal: number;
}) {
  const progress = goal > 0 ? Math.min(100, Math.max(0, completed / goal * 100)) : 0;
  return <section aria-label={eyebrow} className="dashboard-focus">
    <div className="grid items-center gap-7 md:grid-cols-[minmax(0,1fr)_210px]">
      <div><p className="focus-eyebrow">{eyebrow}</p><h2 className="mt-4">{title}</h2><p className="focus-description mt-3 text-sm">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href={actionHref} className="theme-focus-primary inline-flex min-h-11 items-center justify-center gap-4 rounded-[10px] px-5 text-xs font-semibold">{actionLabel}<ArrowUpRight className="h-4 w-4" /></Link><Link href="/cronograma" className="theme-focus-secondary inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 text-xs">Ver meu plano</Link></div>
      </div>
      <div className="focus-goal"><div className="flex items-center justify-between gap-3"><p className="text-xs opacity-80">Meta de hoje</p><Target className="h-5 w-5 text-white/75" /></div><p className="mt-4 font-display text-4xl font-semibold">{completed}<span className="ml-2 text-base font-normal opacity-70">/ {goal}</span></p><p className="mt-2 text-[10px] opacity-75">questões respondidas</p><div className="focus-track mt-5 h-1 overflow-hidden rounded-full"><div className="h-full rounded-full" style={{ width: `${progress}%` }} /></div></div>
    </div>
  </section>;
}
