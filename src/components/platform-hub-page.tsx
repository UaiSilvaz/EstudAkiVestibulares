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

const actionTone: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50/70 text-blue-700 hover:border-blue-200 hover:bg-blue-100/80",
  green: "border-emerald-100 bg-emerald-50/70 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100/80",
  orange: "border-orange-100 bg-orange-50/70 text-orange-700 hover:border-orange-200 hover:bg-orange-100/80",
  violet: "border-violet-100 bg-violet-50/70 text-violet-700 hover:border-violet-200 hover:bg-violet-100/80",
  teal: "border-cyan-100 bg-cyan-50/70 text-cyan-700 hover:border-cyan-200 hover:bg-cyan-100/80",
  slate: "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100",
  rose: "border-rose-100 bg-rose-50/70 text-rose-700 hover:border-rose-200 hover:bg-rose-100/80",
  amber: "border-amber-100 bg-amber-50/70 text-amber-700 hover:border-amber-200 hover:bg-amber-100/80",
};

const iconTone: Record<Tone, string> = {
  blue: "bg-blue-600 text-white shadow-blue-200",
  green: "bg-emerald-600 text-white shadow-emerald-200",
  orange: "bg-orange-600 text-white shadow-orange-200",
  violet: "bg-violet-600 text-white shadow-violet-200",
  teal: "bg-cyan-600 text-white shadow-cyan-200",
  slate: "bg-slate-800 text-white shadow-slate-200",
  rose: "bg-rose-600 text-white shadow-rose-200",
  amber: "bg-amber-500 text-white shadow-amber-200",
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
                "rounded-[24px] border bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)]",
                actionTone[stat.tone],
              )}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-75">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{stat.value}</p>
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
                "group flex min-h-[178px] flex-col justify-between rounded-[28px] border p-5 shadow-[0_22px_50px_-36px_rgba(15,23,42,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-32px_rgba(15,23,42,0.35)]",
                actionTone[action.tone],
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg",
                  iconTone[action.tone],
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-black text-slate-950">{action.title}</span>
                <span className="mt-2 block text-sm font-semibold leading-6 text-slate-600">
                  {action.description}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
                Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
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
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.28)] sm:p-6">
      <h2 className="font-display text-xl font-black text-slate-950">{title}</h2>
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
