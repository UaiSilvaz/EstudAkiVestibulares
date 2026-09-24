"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
export function AppearanceSettings({ verticalSlug }: { verticalSlug?: string | null }) {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    const sync = () => {
      try { const value = JSON.parse(localStorage.getItem("estudaki:appearance") || "{}").colorMode; setMode(value === "light" || value === "dark" ? value : "system"); } catch { /* Use system appearance. */ }
    };
    queueMicrotask(sync); window.addEventListener("estudaki:appearance-updated", sync);
    return () => window.removeEventListener("estudaki:appearance-updated", sync);
  }, []);
  function update(next: Mode) {
    setMode(next);
    try { const stored = JSON.parse(localStorage.getItem("estudaki:appearance") || "{}"); localStorage.setItem("estudaki:appearance", JSON.stringify({ ...stored, colorMode: next })); window.dispatchEvent(new CustomEvent("estudaki:appearance-updated")); } catch { /* Storage may be unavailable. */ }
  }
  return <section id="aparencia" className="silva-card" data-preparation={verticalSlug}><p className="silva-eyebrow">SEU AMBIENTE DE ESTUDOS</p><h2 className="mt-3 font-display text-2xl font-extrabold">Aparência</h2><p className="silva-muted mt-3 text-sm leading-6">Escolha a iluminação mais confortável para estudar. As cores acompanham sua preparação.</p><div className="mt-6 grid gap-4 sm:grid-cols-3">{[{ id: "system", label: "Sistema", icon: Monitor, description: "Acompanha seu dispositivo" }, { id: "light", label: "Claro", icon: Sun, description: "Leveza para o seu dia" }, { id: "dark", label: "Escuro", icon: Moon, description: "Conforto para estudar à noite" }].map(({ id, label, icon: Icon, description }) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => update(id as Mode)} className="silva-card text-left transition hover:-translate-y-1" style={mode === id ? { borderColor: "var(--brand)", background: "var(--brand-soft)" } : undefined}><span className="flex justify-between"><span className="silva-icon"><Icon /></span>{mode === id && <Check size={18} className="text-[var(--brand)]" />}</span><strong className="block mt-4">{label}</strong><span className="block mt-2 text-xs silva-muted">{description}</span></button>)}</div></section>;
}
