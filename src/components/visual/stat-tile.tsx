"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  accent: "blue" | "orange" | "green" | "pink" | "yellow" | "purple" | "red" | "cyan";
  delta?: { value: string; positive?: boolean; suffix?: string };
  progress?: number;
  className?: string;
  onClick?: () => void;
};

const accentMap: Record<StatTileProps["accent"], { bg: string; shine: string; icon: string; glow: string }> = {
  blue: {
    bg: "from-[#1D9BF0] via-[#18B7F7] to-[#1DD7D0]",
    shine: "bg-[#7DD3FC]",
    icon: "from-white/30 to-white/10",
    glow: "rgba(14, 165, 233, 0.42)",
  },
  orange: {
    bg: "from-[#FF8A18] via-[#FFA51F] to-[#FFE01B]",
    shine: "bg-[#FFF176]",
    icon: "from-white/30 to-white/10",
    glow: "rgba(251, 146, 60, 0.45)",
  },
  green: {
    bg: "from-[#36D66E] via-[#42DF85] to-[#5CE6BD]",
    shine: "bg-[#A7F3D0]",
    icon: "from-white/30 to-white/10",
    glow: "rgba(34, 197, 94, 0.36)",
  },
  pink: {
    bg: "from-[#F51BA2] via-[#FF35C7] to-[#FF67D8]",
    shine: "bg-[#FBCFE8]",
    icon: "from-white/30 to-white/10",
    glow: "rgba(236, 72, 153, 0.40)",
  },
  yellow: {
    bg: "from-[#FF9518] via-[#FFB21E] to-[#FFE01B]",
    shine: "bg-[#FDE68A]",
    icon: "from-white/30 to-white/10",
    glow: "rgba(250, 204, 21, 0.42)",
  },
  purple: {
    bg: "from-[#6B2CF5] via-[#8A42FF] to-[#A569FF]",
    shine: "bg-[#DDD6FE]",
    icon: "from-white/30 to-white/10",
    glow: "rgba(124, 58, 237, 0.40)",
  },
  red: {
    bg: "from-[#F43F5E] via-[#FF4D86] to-[#FB7185]",
    shine: "bg-[#FECDD3]",
    icon: "from-white/30 to-white/10",
    glow: "rgba(244, 63, 94, 0.38)",
  },
  cyan: {
    bg: "from-[#06B6D4] via-[#22D3EE] to-[#67E8F9]",
    shine: "bg-[#A5F3FC]",
    icon: "from-white/30 to-white/10",
    glow: "rgba(34, 211, 238, 0.36)",
  },
};

export function StatTile({
  label,
  value,
  hint,
  icon,
  accent,
  delta,
  progress,
  className,
  onClick,
}: StatTileProps) {
  const a = accentMap[accent];
  const Comp = onClick ? "button" : "div";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative min-h-[176px] min-w-0 overflow-hidden rounded-[24px] bg-gradient-to-br p-5 text-left text-white shadow-[0_24px_42px_-24px_rgba(15,23,42,0.36)] sm:p-6",
        a.bg,
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[24px] bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.28),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_44%)]"
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full opacity-20 blur-sm",
          a.shine,
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-10 h-40 w-40 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-80"
        style={{ background: a.glow }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-9 bottom-2 flex h-32 w-32 rotate-[-10deg] items-center justify-center rounded-[30px] bg-gradient-to-br text-white/36 opacity-70 transition duration-300 group-hover:scale-105 group-hover:opacity-85 [&_svg]:h-20 [&_svg]:w-20 [&_svg]:stroke-[2.15]",
          a.icon,
        )}
      >
        {icon}
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/22 text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.65)] ring-1 ring-white/35 backdrop-blur">
          {icon}
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-white/30 px-2.5 py-1 text-[10px] font-black text-white shadow-sm backdrop-blur",
              delta.positive
                ? "bg-white/22"
                : "bg-black/10",
            )}
          >
            <ArrowUpRight className={cn("h-3 w-3", !delta.positive && "rotate-180")} />
            {delta.value}
            {delta.suffix && <span className="text-[9px] opacity-80">{delta.suffix}</span>}
          </span>
        )}
      </div>

      <div className="relative z-10 mt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/82">
          {label}
        </p>
        <div className="mt-2 h-0.5 w-5 rounded-full bg-white/35" />
        <p className="mt-3 font-display text-3xl font-extrabold leading-none text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.14)]">
          {value}
        </p>
        {hint && (
          <p className="mt-2 max-w-[72%] text-xs font-semibold leading-5 text-white/88">{hint}</p>
        )}
      </div>

      {typeof progress === "number" && (
        <div className="relative z-10 mt-4 h-1.5 max-w-[72%] overflow-hidden rounded-full bg-white/24">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-white/88"
          />
        </div>
      )}

      {Comp === "button" && (
        <button
          type="button"
          onClick={onClick}
          aria-label={typeof label === "string" ? label : undefined}
          className="absolute inset-0 z-20"
        />
      )}
    </motion.div>
  );
}
