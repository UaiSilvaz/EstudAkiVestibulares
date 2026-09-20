"use client";

import { Check, Contrast, Moon, Paintbrush, PanelsTopLeft, Sun, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getVerticalTheme, normalizeVerticalSlug, verticalThemeStyle } from "@/config/vertical-themes";
import { cn } from "@/lib/utils";

type AppearancePreferences = {
  colorMode: "system" | "light" | "dark";
  backgroundIntensity: "subtle" | "balanced" | "immersive";
  iconMood: "colorful" | "line" | "minimal";
};

const STORAGE_KEY = "estudaki:appearance";

const defaults: AppearancePreferences = {
  colorMode: "system",
  backgroundIntensity: "balanced",
  iconMood: "colorful",
};

function parseStored(value: string | null): AppearancePreferences {
  if (!value) return defaults;

  try {
    return { ...defaults, ...(JSON.parse(value) as Partial<AppearancePreferences>) };
  } catch {
    return defaults;
  }
}

export function AppearanceSettings({ verticalSlug }: { verticalSlug?: string | null }) {
  const vertical = normalizeVerticalSlug(verticalSlug);
  const theme = useMemo(() => getVerticalTheme(vertical), [vertical]);
  const [settings, setSettings] = useState<AppearancePreferences>(defaults);

  useEffect(() => {
    queueMicrotask(() => {
      setSettings(parseStored(window.localStorage.getItem(STORAGE_KEY)));
    });
  }, []);

  function update(next: Partial<AppearancePreferences>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("estudaki:appearance-updated"));
  }

  return (
    <section
      id="aparencia"
      className="relative overflow-hidden rounded-[32px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-6 shadow-[var(--theme-shadow)] md:p-7"
    >
      <div aria-hidden className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-[color:var(--theme-primary)]/14 blur-3xl" />
      <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: "var(--theme-gradient-sidebar)" }}>
              <Paintbrush className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--theme-primary)]">
                Aparencia
              </p>
              <h2 className="font-display text-2xl font-black text-[color:var(--theme-text)]">
                Personalize sua plataforma
              </h2>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[color:var(--theme-muted)]">
            Ajuste claro/escuro, intensidade dos fundos e comportamento visual dos icones para deixar o EstudAki com a sua cara.
          </p>

          <div className="mt-6 grid gap-5">
            <OptionGroup
              icon={<Contrast className="h-4 w-4" />}
              title="Tema claro ou escuro"
              description="Use um visual leve durante o dia ou uma interface mais imersiva para estudar a noite."
            >
              <SegmentedOption label="Sistema" active={settings.colorMode === "system"} onClick={() => update({ colorMode: "system" })} icon={<PanelsTopLeft className="h-4 w-4" />} />
              <SegmentedOption label="Claro" active={settings.colorMode === "light"} onClick={() => update({ colorMode: "light" })} icon={<Sun className="h-4 w-4" />} />
              <SegmentedOption label="Escuro" active={settings.colorMode === "dark"} onClick={() => update({ colorMode: "dark" })} icon={<Moon className="h-4 w-4" />} />
            </OptionGroup>

            <OptionGroup
              icon={<Wand2 className="h-4 w-4" />}
              title="Fundo e imagem da vertical"
              description="Controle se as imagens de Medicina, Policia, OAB e outras aparecem discretas ou mais presentes."
            >
              <SegmentedOption label="Sutil" active={settings.backgroundIntensity === "subtle"} onClick={() => update({ backgroundIntensity: "subtle" })} />
              <SegmentedOption label="Equilibrado" active={settings.backgroundIntensity === "balanced"} onClick={() => update({ backgroundIntensity: "balanced" })} />
              <SegmentedOption label="Imersivo" active={settings.backgroundIntensity === "immersive"} onClick={() => update({ backgroundIntensity: "immersive" })} />
            </OptionGroup>

            <OptionGroup
              icon={<Paintbrush className="h-4 w-4" />}
              title="Icones"
              description="Mantenha icones coloridos para uma experiencia jovem ou reduza a saturacao para um ambiente adulto e sobrio."
            >
              <SegmentedOption label="Coloridos" active={settings.iconMood === "colorful"} onClick={() => update({ iconMood: "colorful" })} />
              <SegmentedOption label="Linha" active={settings.iconMood === "line"} onClick={() => update({ iconMood: "line" })} />
              <SegmentedOption label="Minimal" active={settings.iconMood === "minimal"} onClick={() => update({ iconMood: "minimal" })} />
            </OptionGroup>
          </div>
        </div>

        <div
          className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-white/18 p-5 text-white shadow-[0_24px_56px_-34px_rgba(15,23,42,0.48)]"
          style={{
            ...verticalThemeStyle(vertical),
            background: "var(--theme-gradient-hero)",
            borderRadius: "32px",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(90deg, ${theme.colors.primaryDark} 0%, rgba(0,0,0,0.26) 100%), url("${theme.imagery.backgroundImage}")`,
              opacity: settings.backgroundIntensity === "subtle" ? 0.18 : settings.backgroundIntensity === "immersive" ? 0.52 : 0.34,
            }}
          />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/78">{theme.shortName}</p>
            <h3 className="mt-3 font-display text-3xl font-black leading-tight">{theme.copy.heroTitle}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/82">{theme.copy.heroDescription}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="min-h-11 rounded-[var(--theme-button-radius)] bg-white px-5 text-sm font-black text-[color:var(--theme-primary)] transition"
              >
                {theme.copy.primaryCta}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-[var(--theme-button-radius)] border border-white/26 bg-white/12 px-5 text-sm font-black text-white backdrop-blur-xl"
              >
                {theme.copy.secondaryCta}
              </button>
            </div>
          </div>
          <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2">
            {["Meta", "XP", "Horas"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/20 bg-white/14 p-3 backdrop-blur-xl">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/66">{item}</p>
                <p className="mt-1 font-display text-xl font-black">72%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OptionGroup({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] p-4">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--theme-primary)_12%,white)] text-[color:var(--theme-primary)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-black text-[color:var(--theme-text)]">{title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--theme-muted)]">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SegmentedOption({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-[var(--theme-button-radius)] border px-3 text-xs font-black transition",
        active
          ? "border-[color:var(--theme-primary)] bg-[color:var(--theme-primary)] text-white shadow-[0_12px_24px_-18px_var(--theme-primary)]"
          : "border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)] hover:text-[color:var(--theme-primary)]",
      )}
    >
      {icon}
      {label}
      {active ? <Check className="h-3.5 w-3.5" /> : null}
    </button>
  );
}
