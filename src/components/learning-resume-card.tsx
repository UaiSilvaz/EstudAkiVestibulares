import { BookOpen, Trophy } from "@/components/visual/aicon-icons";
import { ArrowRight, Check, Lock, Play } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type ResumeTrailStep = {
  id: string;
  label: string;
  state: "completed" | "current" | "next" | "locked" | "final";
};

export type LearningResumeCardProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  nextLabel: string;
  detailLabel: string;
  progressPercent: number;
  progressLabel: string;
  href: string;
  ctaLabel: string;
  steps: ResumeTrailStep[];
  icon?: React.ReactNode;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function LearningResumeCard({
  eyebrow,
  title,
  subtitle,
  nextLabel,
  detailLabel,
  progressPercent,
  progressLabel,
  href,
  ctaLabel,
  steps,
  icon,
  secondaryHref = "/cursos",
  secondaryLabel = "Ver meus cursos",
}: LearningResumeCardProps) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));

  return (
    <section
      className="theme-resume-card group relative min-w-0 overflow-hidden rounded-[18px] border border-[color:color-mix(in_srgb,var(--theme-primary)_20%,white)] p-4 text-white shadow-sm transition hover:-translate-y-0.5 shadow-sm sm:rounded-[18px] sm:p-5"
      style={{ background: "var(--theme-gradient-stat)" }}
    >
      <span className="theme-resume-accent absolute inset-x-0 top-0 hidden h-px" aria-hidden />
      <div aria-hidden className="theme-resume-sheen pointer-events-none absolute -inset-px rounded-[18px]  professional-neutral" />
      <div aria-hidden className="theme-resume-ghost pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/18 blur-2xl" />
      <div className="theme-resume-ghost pointer-events-none absolute -right-7 bottom-1 hidden h-32 w-32 rotate-[-10deg] items-center justify-center rounded-[18px] bg-white/14 text-white/28 transition  md:flex [&_svg]:h-20 [&_svg]:w-20 [&_svg]:stroke-[1.8]">
        {icon ?? <BookOpen />}
      </div>

      <div className="relative z-10 grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(360px,1.25fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div className="theme-resume-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/26 bg-white/18 text-white shadow-sm backdrop-blur">
            {icon ?? <BookOpen className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="theme-resume-eyebrow text-[10px] font-semibold uppercase tracking-wide text-white/80">{eyebrow}</p>
            <div className="theme-resume-rule mt-2 h-0.5 w-6 rounded-full bg-white/38" />
            <h2 className="mt-2 line-clamp-1 font-display text-xl font-semibold leading-tight text-white sm:text-2xl">{title}</h2>
            <p className="mt-1 line-clamp-1 text-sm font-bold text-white/84">{subtitle}</p>
          </div>
        </div>

        <div className="theme-resume-track min-w-0 rounded-[18px] border border-white/16 bg-white/12 px-3 py-3 backdrop-blur lg:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-1 text-xs font-semibold uppercase tracking-wide text-white/74">{nextLabel}</p>
              <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/88">{detailLabel}</p>
            </div>
            <span className="theme-resume-percent shrink-0 rounded-full border border-white/22 bg-white/14 px-3 py-1 text-xs font-semibold text-white">{safeProgress}%</span>
          </div>

          <div className="mt-3 flex min-w-0 items-center justify-center overflow-hidden px-1 py-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex min-w-0 items-center">
                <TrailNode step={step} index={index} />
                {index < steps.length - 1 ? <span className="theme-trail-connector mx-1 h-1 w-8 rounded-full bg-white/24 transition group-hover:bg-white/38 sm:w-10 lg:w-12" /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:w-[190px] lg:flex-col lg:items-stretch">
          <div className="min-w-0 lg:text-right">
            <p className="font-display text-3xl font-semibold leading-none text-white">{safeProgress}%</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/74">{progressLabel}</p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2 lg:justify-end">
            <Link href={href} className="theme-resume-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--theme-button-radius)] bg-white px-5 text-sm font-semibold uppercase tracking-wide text-[color:var(--theme-primary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white/94">
              {ctaLabel}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href={secondaryHref} className="theme-resume-secondary inline-flex min-h-10 items-center justify-center rounded-[var(--theme-button-radius)] border border-white/22 bg-white/10 px-4 text-xs font-semibold text-white/88 backdrop-blur transition hover:bg-white/16">
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrailNode({ step, index }: { step: ResumeTrailStep; index: number }) {
  const lift = index % 2 === 0 ? "-translate-y-1" : "translate-y-1";
  const nodeIcon = {
    completed: <Check className="h-4 w-4" strokeWidth={3} />,
    current: <Play className="h-4 w-4 fill-current" strokeWidth={2.6} />,
    next: <span className="h-2.5 w-2.5 rounded-full bg-current" />,
    locked: <Lock className="h-3.5 w-3.5" strokeWidth={2.6} />,
    final: <Trophy className="h-4 w-4" strokeWidth={2.6} />,
  }[step.state];

  return (
    <div className={cn("relative flex w-10 shrink-0 flex-col items-center sm:w-12", lift)}>
      <span
        title={step.label}
        data-state={step.state}
        className={cn(
          "theme-trail-node flex h-9 w-9 items-center justify-center rounded-full border text-white shadow-sm transition  sm:h-10 sm:w-10",
          step.state === "completed" && "border-white/38 bg-white/22",
          step.state === "current" && "border-white bg-white text-[color:var(--theme-primary)] shadow-sm",
          step.state === "next" && "border-white/34 bg-white/10 text-white/80",
          step.state === "locked" && "border-white/20 bg-white/8 text-white/56",
          step.state === "final" && "border-amber-100 bg-amber-300 text-amber-950",
        )}
      >
        {nodeIcon}
      </span>
      {step.state === "current" ? (
        <span className="mt-1 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.12em] text-white">Você</span>
      ) : (
        <span className="mt-1 h-2 text-[0]" aria-hidden>.</span>
      )}
    </div>
  );
}
