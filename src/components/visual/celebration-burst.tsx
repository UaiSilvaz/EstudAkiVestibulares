"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

type Origin = { x: number; y: number };

type CelebrationBurstProps = {
  trigger: number;
  origins?: Origin[];
  xp?: number;
  count?: number;
};

const COLORS = ["#2563EB", "#22D3EE", "#22C55E", "#FACC15", "#F97316", "#FB7185", "#A78BFA", "#3B82F6"];

type Piece = {
  id: number;
  left: number;
  top: number;
  delay: number;
  color: string;
  rotate: number;
  dx: number;
  size: number;
  duration: number;
  shape: "rect" | "circle" | "strip";
};

function buildPieces(trigger: number, origins: Origin[], count: number): Piece[] {
  return Array.from({ length: count }).map((_, index) => {
    const origin = origins[index % origins.length] ?? { x: 50, y: 50 };
    return {
      id: trigger * 1000 + index,
      left: origin.x,
      top: origin.y,
      delay: Math.random() * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotate: Math.random() * 360,
      dx: (Math.random() - 0.5) * 40,
      size: 6 + Math.random() * 8,
      duration: 1.4 + Math.random() * 0.8,
      shape: (["rect", "circle", "strip"] as const)[Math.floor(Math.random() * 3)],
    };
  });
}

export function CelebrationBurst({ trigger, origins, xp, count = 90 }: CelebrationBurstProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [showXp, setShowXp] = useState(false);

  useEffect(() => {
    if (trigger <= 0) return;
    const list = origins && origins.length > 0 ? origins : [{ x: 50, y: 55 }];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(buildPieces(trigger, list, count));
    setShowXp(true);
    const t1 = setTimeout(() => setShowXp(false), 1700);
    const t2 = setTimeout(() => setPieces([]), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [trigger, origins, count]);

  if (trigger <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{
            x: `${piece.left}vw`,
            y: `${piece.top}vh`,
            rotate: piece.rotate,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            x: `calc(${piece.left}vw + ${piece.dx}vw)`,
            y: "115vh",
            rotate: piece.rotate + 720,
            opacity: 0,
            scale: 0.9,
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: piece.shape === "strip" ? piece.size * 0.4 : piece.size,
            height: piece.shape === "strip" ? piece.size * 1.8 : piece.size,
            background: piece.color,
            borderRadius: piece.shape === "circle" ? 999 : 2,
          }}
        />
      ))}

      <AnimatePresence>
        {showXp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {origins?.map((origin, idx) => (
              <motion.div
                key={`${trigger}-${idx}`}
                initial={{ opacity: 0, y: 0, scale: 0.7 }}
                animate={{ opacity: [0, 1, 1, 0], y: -80, scale: [0.7, 1.1, 1, 0.95] }}
                transition={{ duration: 1.6, delay: 0.1 + idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute",
                  left: `${origin.x}%`,
                  top: `${origin.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className="rounded-full bg-gradient-to-r from-[#FACC15] via-[#F97316] to-[#FB7185] px-3 py-1 text-sm font-black text-white shadow-[0_18px_38px_-10px_rgba(249,115,22,0.55)] ring-2 ring-white"
              >
                {xp ? `+${xp} XP` : "Boa!"}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
