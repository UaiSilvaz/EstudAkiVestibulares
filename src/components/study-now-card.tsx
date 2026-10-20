"use client";

import { ArrowRight } from "lucide-react";
import { FastLink as Link } from "@/components/fast-link";
import type { StudyNowSession } from "@/lib/learning/study-session-planner";

export function StudyNowCard({ initialSession }: { initialSession: StudyNowSession }) {
  const nextBlock = initialSession.blocks[0];
  return <section className="rounded-[18px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-5 sm:p-6">
    <p className="text-xs font-semibold text-[color:var(--theme-primary)]">Seu próximo passo</p>
    <h2 className="mt-3 text-xl font-semibold text-[color:var(--theme-text)]">{nextBlock?.title ?? "Seu plano de hoje"}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--theme-muted)]">{nextBlock?.description ?? initialSession.summary}</p>
    <p className="mt-3 text-xs text-[color:var(--theme-muted)]">{initialSession.totalMinutes} min · {initialSession.blocks.length} {initialSession.blocks.length === 1 ? "atividade" : "atividades"}</p>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Link href={initialSession.startHref} pendingLabel="Abrindo sua atividade…" className="theme-focus-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-sm font-semibold">
        Começar agora<ArrowRight className="h-4 w-4" />
      </Link>
      <Link href="/cronograma" className="text-sm font-medium text-[color:var(--theme-muted)] hover:text-[color:var(--theme-primary)]">Ver plano completo</Link>
    </div>

  </section>;
}
