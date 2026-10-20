import { cn } from "@/lib/utils";

type StreakBadgeProps = { days: number; size?: "sm" | "md" | "lg"; animated?: boolean; className?: string };

export function StreakBadge({ days, className }: StreakBadgeProps) {
  return <span className={cn("professional-streak inline-flex items-center gap-1 text-xs text-[color:var(--theme-muted)]", className)}>
    <span className="font-semibold text-[color:var(--theme-text)]">{days}</span> {days === 1 ? "dia de estudo" : "dias de estudo"}
  </span>;
}
