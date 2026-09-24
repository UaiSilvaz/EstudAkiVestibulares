"use client";

import { BarChart3, BookOpen, CheckCircle2, ChevronRight, Scale, Shield, Stethoscope, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { canonicalVerticalSlugs, getVerticalTheme, verticalThemeStyle, type StudyVertical } from "@/config/vertical-themes";
import { cn } from "@/lib/utils";

const iconByVertical: Record<StudyVertical, React.ReactNode> = {
  vestibular: <Trophy className="h-5 w-5" />,
  oab: <Scale className="h-5 w-5" />,
  concursos: <BookOpen className="h-5 w-5" />,
  "policia-civil": <Shield className="h-5 w-5" />,
  "policia-militar": <Shield className="h-5 w-5" />,
  militares: <Target className="h-5 w-5" />,
  medicina: <Stethoscope className="h-5 w-5" />,
};

export function DevThemeLab() {
  const [selected, setSelected] = useState<StudyVertical>("vestibular");
  const theme = useMemo(() => getVerticalTheme(selected), [selected]);

  return (
    <div style={verticalThemeStyle(selected)} className="min-h-screen rounded-[28px] bg-[color:var(--theme-background)] p-4 text-[color:var(--theme-text)] sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-3 shadow-[var(--theme-shadow)]">
          <div className="mb-4 flex items-center gap-3 p-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] text-white" style={{ background: "var(--theme-gradient-sidebar)" }}>
              &
            </span>
            <div>
              <p className="font-display text-lg font-black">Silva Educacional</p>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--theme-muted)]">{theme.shortName}</p>
            </div>
          </div>
          <div className="grid gap-1.5">
            {canonicalVerticalSlugs.map((slug) => {
              const itemTheme = getVerticalTheme(slug);
              const active = selected === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setSelected(slug)}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-[14px] px-3 text-left text-sm font-bold transition",
                    active
                      ? "bg-[color:color-mix(in_srgb,var(--theme-primary)_10%,white)] text-[color:var(--theme-primary)]"
                      : "text-[color:var(--theme-muted)] hover:bg-slate-50",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: itemTheme.gradients.sidebar }}>
                    {iconByVertical[slug]}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{itemTheme.shortName}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="relative overflow-hidden rounded-[28px] p-6 text-white shadow-[var(--theme-shadow)]" style={{ background: "var(--theme-gradient-hero)" }}>
            <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/12 blur-2xl" />
            <div className="relative z-10 max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/78">{theme.copy.dashboardKicker}</p>
              <h1 className="mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">{theme.copy.heroTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/82">{theme.copy.heroDescription}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-[var(--theme-button-radius)] bg-white px-5 py-3 text-sm font-black text-[color:var(--theme-primary)]">{theme.copy.primaryCta}</button>
                <button className="rounded-[var(--theme-button-radius)] border border-white/28 bg-white/12 px-5 py-3 text-sm font-black text-white">{theme.copy.secondaryCta}</button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Questoes resolvidas", value: "148", icon: <CheckCircle2 className="h-5 w-5" /> },
              { label: theme.copy.progressLabel, value: "72%", icon: <BarChart3 className="h-5 w-5" /> },
              { label: theme.copy.streakLabel, value: "12 dias", icon: <Trophy className="h-5 w-5" /> },
            ].map((card) => (
              <div key={card.label} className="rounded-[var(--theme-card-radius)] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-5 shadow-[var(--theme-shadow)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ background: "var(--theme-gradient-progress)" }}>{card.icon}</span>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--theme-muted)]">{card.label}</p>
                <p className="mt-2 font-display text-3xl font-black text-[color:var(--theme-text)]">{card.value}</p>
                <div className="mt-4 h-2 rounded-full bg-[color:color-mix(in_srgb,var(--theme-primary)_10%,white)]">
                  <div className="h-full w-[72%] rounded-full" style={{ background: "var(--theme-gradient-progress)" }} />
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-[var(--theme-card-radius)] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-5 shadow-[var(--theme-shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--theme-primary)]">Componentes</p>
                <h2 className="font-display text-xl font-black">Tokens aplicados</h2>
              </div>
              <span className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] px-3 py-1 text-xs font-black text-[color:var(--theme-primary)]">
                {theme.ui.gamificationIntensity}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {theme.subjects.slice(0, 4).map((subject, index) => (
                <div key={subject.slug} className="flex items-center gap-3 rounded-[18px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ background: index % 2 ? "var(--theme-secondary)" : "var(--theme-primary)" }}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{subject.name}</p>
                    <p className="text-xs font-semibold text-[color:var(--theme-muted)]">{theme.imagery.pattern}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[color:var(--theme-muted)]" />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
