"use client";

import { Check, ChevronDown, LockKeyhole, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActivePreparationContext } from "@/lib/preparations";
import { getVerticalTheme } from "@/config/vertical-themes";
import { cn } from "@/lib/utils";

type Preparation = NonNullable<ActivePreparationContext["active"]>;

export function PreparationSwitcher({
  active,
  preparations,
  compact = false,
}: {
  active: Preparation | null;
  preparations: Preparation[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const activeTheme = getVerticalTheme(active?.vertical.slug);

  async function selectPreparation(preparation: Preparation) {
    if (preparation.id === active?.id || isPending) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/preparations/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preparationId: preparation.id }),
      });
      if (response.ok) {
        window.localStorage.setItem("estudaki:active-preparation-id", preparation.id);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Selecionar preparacao"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white px-3 text-left shadow-sm transition hover:border-[color:var(--primary)]",
          compact ? "h-11 max-w-[190px]" : "h-12 min-w-[230px] max-w-[310px]",
        )}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: activeTheme.gradients.sidebar }}
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-[color:var(--ink)]">
            {active?.displayName ?? "Escolha uma preparacao"}
          </span>
          {!compact ? (
            <span className="block truncate text-[10px] font-black uppercase tracking-wider text-[color:var(--muted)]">
              {active?.vertical.name ?? "Minhas preparacoes"}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[color:var(--muted)] transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(92vw,330px)] overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-white p-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.38)] animate-[estudaki-fast-pop_120ms_ease-out]">
          <div className="px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Minhas preparacoes
            </p>
          </div>
          <div className="max-h-[280px] overflow-y-auto pr-1 thin-scrollbar">
            {preparations.map((preparation) => {
              const selected = preparation.id === active?.id;
              const optionTheme = getVerticalTheme(preparation.vertical.slug);
              return (
                <button
                  key={preparation.userPreparationId}
                  type="button"
                  onClick={() => void selectPreparation(preparation)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition",
                    selected ? "bg-[color:color-mix(in_srgb,var(--theme-primary)_10%,white)]" : "hover:bg-slate-50",
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white"
                    style={{ background: selected ? optionTheme.gradients.sidebar : optionTheme.colors.secondary }}
                  >
                    {selected ? <Check className="h-4 w-4" /> : preparation.hasAccess ? <Sparkles className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[color:var(--ink)]">
                      {preparation.displayName}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-[color:var(--muted)]">
                      {preparation.vertical.name}
                      {preparation.hasAccess ? "" : " · acesso premium"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <a
            href="/explorar"
            className="mt-1 flex min-h-11 items-center gap-3 rounded-[18px] border border-dashed border-[color:var(--border)] px-3 text-sm font-black text-[color:var(--primary)] transition hover:bg-[color:color-mix(in_srgb,var(--primary)_8%,white)]"
          >
            <Plus className="h-4 w-4" />
            Nova preparacao
          </a>
        </div>
      ) : null}
    </div>
  );
}
