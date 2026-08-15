"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ChallengeChipProps = {
  title: string;
  description: string;
  progress: number;
  total: number;
  icon: React.ReactNode;
  accent: "blue" | "orange" | "green" | "pink" | "yellow" | "purple";
  reward?: string;
  ctaLabel?: string;
  ctaHref?: string;
  done?: boolean;
};

const accentMap: Record<ChallengeChipProps["accent"], { bg: string; glow: string; shine: string }> = {
  blue: {
    bg: "from-[#1D9BF0] via-[#18B7F7] to-[#1DD7D0]",
    glow: "rgba(14, 165, 233, 0.38)",
    shine: "bg-[#7DD3FC]",
  },
  orange: {
    bg: "from-[#FF8A18] via-[#FFA51F] to-[#FFE01B]",
    glow: "rgba(251, 146, 60, 0.44)",
    shine: "bg-[#FDE68A]",
  },
  green: {
    bg: "from-[#36D66E] via-[#42DF85] to-[#5CE6BD]",
    glow: "rgba(34, 197, 94, 0.34)",
    shine: "bg-[#A7F3D0]",
  },
  pink: {
    bg: "from-[#F51BA2] via-[#FF35C7] to-[#FF67D8]",
    glow: "rgba(236, 72, 153, 0.38)",
    shine: "bg-[#FBCFE8]",
  },
  yellow: {
    bg: "from-[#FF9518] via-[#FFB21E] to-[#FFE01B]",
    glow: "rgba(250, 204, 21, 0.42)",
    shine: "bg-[#FDE68A]",
  },
  purple: {
    bg: "from-[#6B2CF5] via-[#8A42FF] to-[#A569FF]",
    glow: "rgba(124, 58, 237, 0.40)",
    shine: "bg-[#DDD6FE]",
  },
};

export function ChallengeChip({
  title,
  description,
  progress,
  total,
  icon,
  accent,
  reward,
  ctaLabel,
  ctaHref,
  done = false,
}: ChallengeChipProps) {
  const a = accentMap[accent];
  const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0;
  const inner = (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex min-h-[216px] min-w-0 flex-col gap-3 overflow-hidden rounded-[24px] bg-gradient-to-br p-5 text-white shadow-[0_24px_42px_-24px_rgba(15,23,42,0.36)]",
        a.bg,
        done && "opacity-90",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[24px] bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.30),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.14),transparent_46%)]"
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full opacity-20 blur-sm",
          a.shine,
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 rounded-full opacity-64 blur-2xl"
        style={{ background: a.glow }}
      />
      <div className="pointer-events-none absolute -right-9 bottom-1 flex h-32 w-32 rotate-[-10deg] items-center justify-center rounded-[30px] bg-white/18 text-white/36 opacity-76 transition group-hover:scale-105 group-hover:opacity-90 [&_svg]:h-20 [&_svg]:w-20 [&_svg]:stroke-[2.15]">
        {icon}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/22 text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.65)] ring-1 ring-white/35 backdrop-blur">
          {icon}
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/82">
            {done ? "Concluído" : "Próxima meta"}
          </p>
          <div className="mt-1 h-0.5 w-5 rounded-full bg-white/35" />
          <p className="mt-2 truncate text-lg font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.14)]">
            {title}
          </p>
        </div>
        {reward && (
          <span className="relative z-10 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur">
            {reward}
          </span>
        )}
      </div>

      <p className="relative z-10 max-w-[78%] text-xs font-semibold leading-5 text-white/88">
        {description}
      </p>

      <div className="relative z-10 mt-auto max-w-[74%]">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/75">
          <span>{progress}/{total}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/24">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-white/88"
          />
        </div>
        {ctaLabel && !done && (
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-black text-white">
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (ctaHref && !done) {
    return (
      <Link href={ctaHref} className="block h-full min-w-0">
        {inner}
      </Link>
    );
  }

  return inner;
}
