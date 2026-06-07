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

const accentMap: Record<StatTileProps["accent"], { bg: string; border: string; text: string; icon: string; ring: string; glow: string }> = {
  blue:   { bg: "from-[#EFF6FF] to-[#DBEAFE]", border: "border-[#3B82F6]/20", text: "text-blue-700",   icon: "from-[#3B82F6] to-[#22D3EE]", ring: "ring-blue-200",   glow: "#60A5FA" },
  orange: { bg: "from-[#FFF7ED] to-[#FFEDD5]", border: "border-[#FB923C]/20", text: "text-orange-700", icon: "from-[#F97316] to-[#FACC15]", ring: "ring-orange-200", glow: "#FB923C" },
  green:  { bg: "from-[#ECFDF5] to-[#D1FAE5]", border: "border-[#22C55E]/20", text: "text-emerald-700", icon: "from-[#22C55E] to-[#86EFAC]", ring: "ring-emerald-200", glow: "#22C55E" },
  pink:   { bg: "from-[#FDF2F8] to-[#FCE7F3]", border: "border-[#FB7185]/20", text: "text-pink-700",   icon: "from-[#FB7185] to-[#FDA4AF]", ring: "ring-pink-200",   glow: "#FB7185" },
  yellow: { bg: "from-[#FEFCE8] to-[#FEF3C7]", border: "border-[#FACC15]/30", text: "text-amber-700",  icon: "from-[#FACC15] to-[#FDE047]", ring: "ring-amber-200",  glow: "#FACC15" },
  purple: { bg: "from-[#F5F3FF] to-[#EDE9FE]", border: "border-[#A78BFA]/20", text: "text-violet-700", icon: "from-[#A78BFA] to-[#C4B5FD]", ring: "ring-violet-200", glow: "#A78BFA" },
  red:    { bg: "from-[#FEF2F2] to-[#FFE4E6]", border: "border-[#F43F5E]/20", text: "text-rose-700",   icon: "from-[#F43F5E] to-[#FDA4AF]", ring: "ring-rose-200",   glow: "#F43F5E" },
  cyan:   { bg: "from-[#ECFEFF] to-[#CFFAFE]", border: "border-[#22D3EE]/20", text: "text-cyan-700",   icon: "from-[#22D3EE] to-[#67E8F9]", ring: "ring-cyan-200",   glow: "#22D3EE" },
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
        "group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5 text-left shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18)]",
        a.bg,
        a.border,
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
        style={{ background: a.glow }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white ring-2 ring-white/70",
            a.icon,
            a.ring,
          )}
        >
          {icon}
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black",
              delta.positive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700",
            )}
          >
            <ArrowUpRight className={cn("h-3 w-3", !delta.positive && "rotate-180")} />
            {delta.value}
            {delta.suffix && <span className="text-[9px] opacity-80">{delta.suffix}</span>}
          </span>
        )}
      </div>

      <div className="relative z-10 mt-4">
        <p className={cn("text-[10px] font-black uppercase tracking-[0.22em]", a.text)}>
          {label}
        </p>
        <p className="mt-1 font-display text-3xl font-extrabold leading-none text-[#0F172A]">
          {value}
        </p>
        {hint && (
          <p className="mt-2 text-xs font-semibold text-slate-600">{hint}</p>
        )}
      </div>

      {typeof progress === "number" && (
        <div className="relative z-10 mt-4 h-1.5 overflow-hidden rounded-full bg-white/70">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn("h-full rounded-full bg-gradient-to-r", a.icon)}
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
