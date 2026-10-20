import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string; value: React.ReactNode; hint?: React.ReactNode; icon: React.ReactNode;
  ghostIcon?: React.ReactNode;
  accent: "blue" | "orange" | "green" | "pink" | "yellow" | "purple" | "red" | "cyan";
  delta?: { value: string; positive?: boolean; suffix?: string };
  progress?: number; className?: string; onClick?: () => void;
};

export function StatTile({ label, value, hint, delta, progress, className, onClick }: StatTileProps) {
  const TrendIcon = delta?.positive ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={cn("professional-stat relative min-w-0 rounded-[14px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-[color:var(--theme-muted)]">{label}</p>
        {delta && <span className={cn("inline-flex items-center gap-1 text-xs font-medium", delta.positive ? "text-[color:var(--theme-success)]" : "text-[color:var(--theme-danger)]")}>
          <TrendIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> {delta.value} {delta.suffix}
        </span>}
      </div>
      <div className="mt-3 text-3xl font-semibold leading-none tracking-tight text-[color:var(--theme-text)]">{value}</div>
      {hint && <p className="mt-2 text-xs leading-5 text-[color:var(--theme-muted)]">{hint}</p>}
      {typeof progress === "number" && <div className="mt-4 h-1 overflow-hidden rounded-full bg-[color:var(--theme-surface-alt)]">
        <div className="h-full rounded-full bg-[color:var(--theme-primary)] transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>}
      {onClick && <button type="button" onClick={onClick} aria-label={label} className="absolute inset-0 rounded-[14px]" />}
    </div>
  );
}
