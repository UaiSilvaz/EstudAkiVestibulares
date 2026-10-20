"use client";

import { useEffect, useState } from "react";
import { getVerticalTheme } from "@/config/vertical-themes";
import { cn } from "@/lib/utils";

type Mode = "system" | "light" | "dark";
const STORAGE_KEY = "estudaki:appearance";
const choices: { id: Mode; label: string }[] = [{ id: "system", label: "Sistema" }, { id: "light", label: "Claro" }, { id: "dark", label: "Escuro" }];

export function AppearanceSettings({ verticalSlug }: { verticalSlug?: string | null }) {
  const theme = getVerticalTheme(verticalSlug);
  const [mode, setMode] = useState<Mode>("light");
  useEffect(() => {
    const sync = () => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
        setMode(choices.some(choice => choice.id === saved.colorMode) ? saved.colorMode : "light");
      } catch { /* Keep the default light appearance if stored preferences are invalid. */ }
    };
    queueMicrotask(sync);
    window.addEventListener("estudaki:appearance-updated", sync);
    return () => window.removeEventListener("estudaki:appearance-updated", sync);
  }, []);
  function update(colorMode: Mode) {
    setMode(colorMode);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ colorMode, backgroundIntensity: "subtle", iconMood: "line" })); }
    catch { /* Keep the selected mode for this session. */ }
    window.dispatchEvent(new CustomEvent("estudaki:appearance-updated"));
  }
  return <section id="aparencia" className="rounded-[18px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-5 sm:p-6">
    <h2 className="text-lg font-semibold text-[color:var(--theme-text)]">Aparência</h2>
    <p className="mt-2 text-sm leading-6 text-[color:var(--theme-muted)]">Escolha a luminosidade para estudar {theme.shortName}. A identidade Norte permanece nos dois modos.</p>
    <div role="group" aria-label="Modo de aparência" className="mt-5 flex flex-wrap gap-2">
      {choices.map(choice => <button key={choice.id} type="button" aria-pressed={mode === choice.id} onClick={() => update(choice.id)} className={cn(
        "min-h-11 rounded-[10px] border px-5 text-sm transition-colors duration-150",
        mode === choice.id ? "border-[color:var(--theme-primary)] bg-[color:var(--theme-surface-alt)] font-semibold text-[color:var(--theme-primary)]" : "border-[color:var(--theme-border)] text-[color:var(--theme-muted)]",
      )}>{choice.label}</button>)}
    </div>
  </section>;
}
