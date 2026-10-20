import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

type ChallengeChipProps = {
  title: string; description: string; progress: number; total: number; icon: React.ReactNode;
  accent: "blue" | "orange" | "green" | "pink" | "yellow" | "purple";
  reward?: string; ctaLabel?: string; ctaHref?: string; done?: boolean;
};

export function ChallengeChip({ title, description, progress, total, reward, ctaLabel, ctaHref, done = false }: ChallengeChipProps) {
  const pct = total > 0 ? Math.max(0, Math.min(100, progress / total * 100)) : 0;
  const inner = <div className="flex h-full min-w-0 flex-col rounded-[14px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-5">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-sm font-semibold text-[color:var(--theme-text)]">{title}</h3>
      {done && <Check aria-label="Concluído" className="h-4 w-4 shrink-0 text-[color:var(--theme-success)]" />}
    </div>
    <p className="mt-2 text-xs leading-5 text-[color:var(--theme-muted)]">{description}</p>
    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[color:var(--theme-muted)]"><span>{progress}/{total}</span><span>{Math.round(pct)}%</span></div>
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color:var(--theme-surface-alt)]"><div style={{ width: `${pct}%` }} className="h-full bg-[color:var(--theme-primary)] transition-[width] duration-200" /></div>
    {reward && <p className="mt-2 text-xs text-[color:var(--theme-muted)]">{reward}</p>}
    {ctaLabel && !done && <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[color:var(--theme-primary)]">{ctaLabel}<ArrowRight className="h-3.5 w-3.5" /></span>}
  </div>;
  return ctaHref && !done ? <Link href={ctaHref} className="block h-full min-w-0 rounded-[14px]">{inner}</Link> : inner;
}
