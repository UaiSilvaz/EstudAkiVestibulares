"use client";

import { Check, ChevronDown, LockKeyhole, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
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
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        container.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function selectPreparation(preparation: Preparation) {
    if (preparation.id === active?.id || isPending) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      setError("");
      try {
        const response = await fetch("/api/preparations/active", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preparationId: preparation.id }),
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error("Preparation could not be selected");
        try { window.localStorage.setItem("estudaki:active-preparation-id", preparation.id); } catch { /* The server persists the active preparation. */ }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Não foi possível trocar a preparação. Tente novamente.");
      }
    });
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Selecionar preparação"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white px-3 text-left shadow-sm transition hover:border-[color:var(--primary)]",
          compact ? "h-11 max-w-[190px]" : "h-12 min-w-[230px] max-w-[310px]",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[color:var(--ink)]">
            {active?.displayName ?? "Escolha uma preparação"}
          </span>
          {!compact ? (
            <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              {active?.vertical.name ?? "Minhas preparações"}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[color:var(--muted)] transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div id={panelId} className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(92vw,330px)] overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-white p-2 shadow-sm animate-[estudaki-fast-pop_120ms_ease-out]">
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              Minhas preparações
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
                  disabled={isPending}
                  onClick={() => void selectPreparation(preparation)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition",
                    selected ? "bg-[color:var(--theme-surface-alt)]" : "hover:bg-slate-50",
                    isPending && "cursor-wait opacity-60",
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white"
                    style={{ background: selected ? optionTheme.gradients.sidebar : optionTheme.colors.secondary }}
                  >
                    {selected ? <Check className="h-4 w-4" /> : preparation.hasAccess ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : <LockKeyhole className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[color:var(--ink)]">
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
          {error && <p role="alert" className="px-3 py-2 text-xs text-[color:var(--theme-danger)]">{error}</p>}
          <a
            href="/explorar"
            className="mt-1 flex min-h-11 items-center gap-3 rounded-[18px] border border-dashed border-[color:var(--border)] px-3 text-sm font-semibold text-[color:var(--primary)] transition hover:bg-[color:var(--theme-surface-alt)]"
          >
            <Plus className="h-4 w-4" />
            Nova preparação
          </a>
        </div>
      ) : null}
    </div>
  );
}
