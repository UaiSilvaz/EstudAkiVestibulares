"use client";

import { Award } from "@/components/visual/aicon-icons";
import { AnimatePresence, motion } from "framer-motion";


type LevelUpOverlayProps = { event: { league: string; xp?: number; nonce: number } | null };

export function LevelUpOverlay({ event }: LevelUpOverlayProps) {
  return <AnimatePresence>{event && <motion.div key={event.nonce} role="status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed bottom-6 right-6 z-[10000] flex max-w-[calc(100vw-48px)] items-center gap-3 rounded-[14px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-5 py-4 shadow-lg">
    <Award aria-hidden="true" className="h-5 w-5 text-[color:var(--theme-primary)]" />
    <div><p className="text-sm font-semibold text-[color:var(--theme-text)]">Você avançou para a liga {event.league}.</p><p className="mt-1 text-xs text-[color:var(--theme-muted)]">Sua constância está trazendo resultados.</p></div>
  </motion.div>}</AnimatePresence>;
}
