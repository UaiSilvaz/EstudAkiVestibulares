"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type CelebrationBurstProps = { trigger: number; origins?: { x: number; y: number }[]; xp?: number; count?: number };

export function CelebrationBurst({ trigger, xp }: CelebrationBurstProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setVisible(trigger > 0); });
    const timeout = setTimeout(() => setVisible(false), 1600);
    return () => { active = false; clearTimeout(timeout); };
  }, [trigger]);
  return <AnimatePresence>{visible && <motion.div key={trigger} role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[10px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-4 py-3 text-sm text-[color:var(--theme-text)] shadow-lg">
    Atividade concluída{typeof xp === "number" && xp > 0 ? ` · +${xp} XP` : ""}
  </motion.div>}</AnimatePresence>;
}
