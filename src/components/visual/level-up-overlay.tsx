"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Gift, Sparkles } from "lucide-react";
import { LeagueBadge } from "./league-badge";

type LevelUpOverlayProps = {
  event: {
    league: string;
    xp?: number;
    nonce: number;
  } | null;
};

const CONFETTI = ["#FACC15", "#F97316", "#22D3EE", "#22C55E", "#FB7185", "#A78BFA", "#FFFFFF"];

function seededUnit(seed: number) {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
}

function buildPieces(nonce: number) {
  return Array.from({ length: 70 }, (_, index) => {
    const base = nonce + index * 17;
    return {
      id: index,
      x: 8 + seededUnit(base) * 84,
      delay: seededUnit(base + 1) * 0.35,
      dx: (seededUnit(base + 2) - 0.5) * 34,
      rotate: seededUnit(base + 3) * 720,
      size: 5 + seededUnit(base + 4) * 9,
      color: CONFETTI[Math.floor(seededUnit(base + 5) * CONFETTI.length)],
    };
  });
}

export function LevelUpOverlay({ event }: LevelUpOverlayProps) {
  const pieces = event ? buildPieces(event.nonce) : [];

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] overflow-hidden bg-slate-950/42 backdrop-blur-md"
        >
          {pieces.map((piece) => (
            <motion.span
              key={`${event.nonce}-${piece.id}`}
              initial={{ x: `${piece.x}vw`, y: "-8vh", rotate: 0, opacity: 1 }}
              animate={{
                x: `calc(${piece.x}vw + ${piece.dx}vw)`,
                y: "112vh",
                rotate: piece.rotate,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 2.6, delay: piece.delay, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: piece.size,
                height: piece.size * 1.5,
                background: piece.color,
                borderRadius: 3,
              }}
            />
          ))}

          <div className="absolute inset-0 flex items-center justify-center p-5">
            <motion.div
              initial={{ y: 30, scale: 0.88, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 18, scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-[34px] bg-gradient-to-b from-[#40C9FF] via-[#22BDF2] to-[#1D9BF0] p-7 text-center text-white shadow-[0_40px_100px_-40px_rgba(14,165,233,0.72)]"
            >
              <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute -right-20 bottom-4 h-56 w-56 rounded-full bg-[#FACC15]/20 blur-3xl" />
              <motion.p
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-[12px] font-black uppercase tracking-[0.34em] text-white/82"
              >
                Level up
              </motion.p>
              <motion.div
                initial={{ scale: 0.8, rotate: -8 }}
                animate={{ scale: [0.8, 1.08, 1], rotate: [-8, 4, 0] }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative mx-auto mt-7 h-36 w-44"
              >
                <div className="absolute inset-x-8 bottom-0 h-24 rounded-[26px] bg-gradient-to-b from-[#FFD84D] to-[#FFB21E] shadow-[0_20px_30px_-18px_rgba(15,23,42,0.45)]" />
                <div className="absolute inset-x-3 bottom-14 h-16 rounded-[28px] bg-gradient-to-b from-[#FFE873] to-[#FACC15]" />
                <div className="absolute inset-x-12 bottom-10 h-20 rounded-t-[18px] bg-gradient-to-b from-[#0EA5E9] to-[#1D4ED8]" />
                <div className="absolute left-1/2 bottom-8 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-white text-[#FACC15] shadow-lg">
                  <Gift className="h-6 w-6" />
                </div>
                <motion.div
                  animate={{ y: [0, -8, 0], scale: [1, 1.04, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                  className="absolute left-1/2 top-0 -translate-x-1/2"
                >
                  <LeagueBadge league={event.league} size="xl" showLabel={false} />
                </motion.div>
              </motion.div>

              <h2 className="mt-8 font-display text-3xl font-black tracking-tight">
                Liga {event.league}
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm font-bold leading-6 text-white/86">
                Você subiu de nível. Continue respondendo para abrir novas conquistas.
              </p>
              <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-black uppercase tracking-wider shadow-sm backdrop-blur">
                <ArrowUp className="h-4 w-4" />
                {event.xp ? `+${event.xp} XP` : "Nova liga"}
                <Sparkles className="h-4 w-4" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
