import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FastLink } from "@/components/fast-link";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "orange" | "violet" | "teal" | "slate" | "rose" | "amber";

export type HubAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
};

export type HubStat = {
  label: string;
  value: string;
  tone: Tone;
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  actions: HubAction[];
  stats?: HubStat[];
  children?: React.ReactNode;
};

export function PlatformHubPage({
  eyebrow,
  title,
  description,
  actions,
  stats = [],
  children,
}: Props) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      {stats.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={`${stat.label}-${stat.value}`}
              className={cn(
                "rounded-[18px] border bg-white p-4 shadow-sm",
                "border-[color:var(--theme-border)] text-[color:var(--theme-muted)]",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <FastLink
              key={action.href}
              href={action.href}
              className={cn(
                "professional-hub-card group flex min-h-[176px] flex-col gap-4 justify-between rounded-[18px] border p-5 shadow-sm transition-colors duration-150",
                "border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-primary)] hover:border-[color:var(--theme-primary)]",
              )}
            >
              <span
                className={cn(
                  "professional-hub-icon flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)]",
                  "text-[color:var(--theme-muted)]",
                )}
              >
                <Icon aria-hidden="true" className="h-8 w-8" />
              </span>
              <span>
                <span className="block text-base font-semibold text-[color:var(--theme-text)]">{action.title}</span>
                <span className="mt-2 block text-sm font-normal leading-6 text-[color:var(--theme-muted)]">
                  {action.description}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                Abrir <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
            </FastLink>
          );
        })}
      </section>

      {children}
    </div>
  );
}

export function ChecklistPanel({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold leading-6 text-slate-600">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
