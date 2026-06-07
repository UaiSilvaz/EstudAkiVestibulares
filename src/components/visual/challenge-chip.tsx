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

const accentMap: Record<ChallengeChipProps["accent"], { bg: string; border: string; text: string; bar: string; icon: string }> = {
  blue:   { bg: "from-[#EFF6FF] to-white",  border: "border-blue-100",   text: "text-blue-700",   bar: "from-[#2563EB] to-[#22D3EE]", icon: "from-[#2563EB] to-[#22D3EE]" },
  orange: { bg: "from-[#FFF7ED] to-white",  border: "border-orange-100", text: "text-orange-700", bar: "from-[#FACC15] to-[#F97316]", icon: "from-[#FACC15] to-[#F97316]" },
  green:  { bg: "from-[#ECFDF5] to-white",  border: "border-emerald-100", text: "text-emerald-700", bar: "from-[#22C55E] to-[#86EFAC]", icon: "from-[#22C55E] to-[#86EFAC]" },
  pink:   { bg: "from-[#FDF2F8] to-white",  border: "border-pink-100",   text: "text-pink-700",   bar: "from-[#FB7185] to-[#FDA4AF]", icon: "from-[#FB7185] to-[#FDA4AF]" },
  yellow: { bg: "from-[#FEFCE8] to-white",  border: "border-amber-100",  text: "text-amber-700",  bar: "from-[#FACC15] to-[#FDE047]", icon: "from-[#FACC15] to-[#FDE047]" },
  purple: { bg: "from-[#F5F3FF] to-white",  border: "border-violet-100", text: "text-violet-700", bar: "from-[#A78BFA] to-[#C4B5FD]", icon: "from-[#A78BFA] to-[#C4B5FD]" },
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
        "group relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl border bg-gradient-to-br p-4 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.18)]",
        a.bg,
        a.border,
        done && "opacity-90",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white ring-2 ring-white",
            a.icon,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", a.text)}>
            {done ? "Concluído" : "Próxima meta"}
          </p>
          <p className="truncate text-sm font-extrabold text-[#0F172A]">{title}</p>
        </div>
        {reward && (
          <span className="rounded-full bg-gradient-to-r from-[#FACC15] to-[#F97316] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
            {reward}
          </span>
        )}
      </div>
      <p className="text-xs font-medium leading-5 text-slate-600">{description}</p>
      <div className="mt-auto">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
          <span>{progress}/{total}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn("h-full rounded-full bg-gradient-to-r", a.bar)}
          />
        </div>
        {ctaLabel && !done && (
          <div className={cn("mt-3 inline-flex items-center gap-1 text-xs font-black", a.text)}>
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (ctaHref && !done) {
    return (
      <Link href={ctaHref} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}
