"use client";

import { Crown, Feather, Gem, Leaf, Shield, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type LeagueBadgeProps = {
  league: string;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  className?: string;
};

const LEAGUES = {
  Bronze: {
    icon: Feather,
    bg: "from-[#D0925B] via-[#E7B47F] to-[#F6D0A7]",
    inset: "from-[#9A5D2E] to-[#C9874D]",
    text: "text-[#7C3F16]",
    glow: "rgba(208,146,91,0.46)",
  },
  Prata: {
    icon: Shield,
    bg: "from-[#DCE8F3] via-[#F5FAFF] to-[#AFC4D8]",
    inset: "from-[#7F98AF] to-[#DDEAF5]",
    text: "text-[#52677C]",
    glow: "rgba(148,163,184,0.48)",
  },
  Ouro: {
    icon: Crown,
    bg: "from-[#FFB21E] via-[#FFE45C] to-[#FF9F1A]",
    inset: "from-[#F97316] to-[#FACC15]",
    text: "text-[#A16207]",
    glow: "rgba(250,204,21,0.55)",
  },
  Platina: {
    icon: Star,
    bg: "from-[#7DD3FC] via-[#E0F7FF] to-[#60A5FA]",
    inset: "from-[#2563EB] to-[#67E8F9]",
    text: "text-[#1D4ED8]",
    glow: "rgba(96,165,250,0.50)",
  },
  Esmeralda: {
    icon: Leaf,
    bg: "from-[#2FEA76] via-[#8CF6B4] to-[#15C973]",
    inset: "from-[#15803D] to-[#22C55E]",
    text: "text-[#047857]",
    glow: "rgba(34,197,94,0.46)",
  },
  Diamante: {
    icon: Gem,
    bg: "from-[#67E8F9] via-[#CFFAFE] to-[#A78BFA]",
    inset: "from-[#06B6D4] to-[#8B5CF6]",
    text: "text-[#6D28D9]",
    glow: "rgba(103,232,249,0.52)",
  },
} as const;

const sizeMap = {
  sm: { shell: "h-9 w-9", icon: "h-4 w-4", label: "text-[10px]", gap: "gap-2" },
  md: { shell: "h-12 w-12", icon: "h-5 w-5", label: "text-xs", gap: "gap-2.5" },
  lg: { shell: "h-16 w-16", icon: "h-7 w-7", label: "text-sm", gap: "gap-3" },
  xl: { shell: "h-24 w-24", icon: "h-11 w-11", label: "text-base", gap: "gap-4" },
} as const;

export function LeagueBadge({ league, size = "md", showLabel = true, className }: LeagueBadgeProps) {
  const cfg = LEAGUES[league as keyof typeof LEAGUES] ?? LEAGUES.Bronze;
  const Icon = cfg.icon;
  const s = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center", s.gap, className)}>
      <span
        className={cn(
          "relative isolate inline-flex shrink-0 items-center justify-center drop-shadow-[0_16px_20px_rgba(15,23,42,0.18)]",
          s.shell,
        )}
        style={{ filter: `drop-shadow(0 12px 18px ${cfg.glow})` }}
      >
        <span className={cn("absolute inset-0 rotate-[30deg] rounded-[28%] bg-gradient-to-br", cfg.bg)} />
        <span className={cn("absolute inset-[10%] rotate-[30deg] rounded-[24%] bg-gradient-to-br opacity-78", cfg.inset)} />
        <span className="absolute inset-[18%] rotate-[30deg] rounded-[22%] bg-white/18" />
        <span className="absolute left-[24%] top-[13%] h-[74%] w-[22%] rotate-[33deg] rounded-full bg-white/30 blur-[1px]" />
        <span className="relative z-10 flex h-[62%] w-[62%] items-center justify-center rounded-2xl bg-white/16 text-white shadow-inner ring-1 ring-white/28">
          <Icon className={s.icon} strokeWidth={2.5} />
        </span>
      </span>
      {showLabel && (
        <span className="min-w-0 leading-none">
          <span className="block text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">
            Liga
          </span>
          <span className={cn("mt-1 block font-black uppercase tracking-wider", s.label, cfg.text)}>
            {league}
          </span>
        </span>
      )}
      <Sparkles className="sr-only" />
    </div>
  );
}
