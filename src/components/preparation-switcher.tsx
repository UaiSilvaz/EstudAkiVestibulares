"use client";

import { Check, ChevronDown, GraduationCap, HeartPulse, Landmark, Loader2, Plus, Scale, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FastLink } from "./fast-link";
import { trackForPreparation, tracks } from "@/config/tracks";
import { useTrack } from "@/providers/track-provider";
import type { ActivePreparationContext } from "@/lib/preparations";

type Preparation = NonNullable<ActivePreparationContext["active"]>;
const icons = { vestibulares: GraduationCap, enem: GraduationCap, medicina: HeartPulse, oab: Scale, policia: Shield, concursos: Landmark };

export function PreparationSwitcher({ active, preparations }: { active: Preparation | null; preparations: Preparation[]; compact?: boolean }) {
  const router = useRouter();
  const { track, setTrack } = useTrack();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const Icon = icons[track];

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  function select(preparation: Preparation) {
    if (preparation.id === active?.id) { setOpen(false); return; }
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/preparations/active", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preparationId: preparation.id }) });
        if (!response.ok) throw new Error("Não foi possível trocar sua preparação. Tente novamente.");
        setTrack(trackForPreparation(preparation));
        setOpen(false);
        try { localStorage.setItem("estudaki:active-preparation-id", preparation.id); } catch { /* The server has saved the choice. */ }
        router.refresh();
        trigger.current?.focus();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível conectar. Tente novamente."); }
    });
  }

  return <div ref={root} className="silva-switcher">
    <button ref={trigger} className="silva-switcher-trigger" type="button" aria-expanded={open} aria-controls="silva-preparations" onClick={() => setOpen(!open)} disabled={isPending}>
      <span className="silva-icon">{isPending ? <Loader2 className="animate-spin" /> : <Icon />}</span><span className="min-w-0 flex-1"><small>MINHA TRILHA</small><strong className="block truncate">{active?.displayName ?? "Escolha sua preparação"}</strong></span><ChevronDown size={14} />
    </button>
    {open && <div id="silva-preparations" className="silva-popover" aria-label="Trocar preparação"><p className="silva-eyebrow px-3 py-2">Trocar preparação</p><div className="max-h-80 overflow-y-auto">
      {preparations.map((preparation) => { const id = trackForPreparation(preparation); const OptionIcon = icons[id]; return <button type="button" className="silva-switcher-option" key={preparation.userPreparationId} disabled={isPending} aria-pressed={preparation.id === active?.id} onClick={() => select(preparation)}><OptionIcon size={18} /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{preparation.displayName}</span><span className="block text-xs silva-muted">{tracks[id].name}</span></span>{preparation.id === active?.id && <Check size={16} />}</button>; })}
      {!preparations.length && <p className="px-3 py-4 text-sm silva-muted">Escolha um objetivo para começar seu plano.</p>}
    </div><FastLink href="/explorar" onClick={() => setOpen(false)} className="silva-switcher-option border-t border-[var(--border)]"><Plus size={17} />Explorar preparações</FastLink></div>}
    {error && <p role="alert" className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
  </div>;
}
