import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = { title: string; description?: string; icon?: LucideIcon; action?: React.ReactNode; accent?: "blue" | "orange" | "green" | "pink" | "yellow" | "purple"; className?: string };

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return <div className={cn("flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-5 py-8 text-center", className)}>
    <Icon aria-hidden="true" className="mb-3 h-6 w-6 text-[color:var(--theme-muted)]" strokeWidth={1.75} />
    <h3 className="text-sm font-semibold text-[color:var(--theme-text)]">{title}</h3>
    {description && <p className="mt-2 max-w-sm text-sm leading-6 text-[color:var(--theme-muted)]">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
