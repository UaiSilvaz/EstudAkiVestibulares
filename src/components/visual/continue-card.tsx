"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ContinueCardProps = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  meta?: string;
  accent: "blue" | "orange" | "green" | "pink" | "yellow" | "purple";
  className?: string;
};

const accentMap: Record<ContinueCardProps["accent"], { bg: string; glow: string; shine: string }> = {
  blue: {
    bg: "from-[#1D9BF0] via-[#18B7F7] to-[#1DD7D0]",
    glow: "rgba(14, 165, 233, 0.40)",
    shine: "bg-[#7DD3FC]",
  },
  orange: {
    bg: "from-[#FF8A18] via-[#FFA51F] to-[#FFE01B]",
    glow: "rgba(251, 146, 60, 0.45)",
    shine: "bg-[#FDE68A]",
  },
  green: {
    bg: "from-[#36D66E] via-[#42DF85] to-[#5CE6BD]",
    glow: "rgba(34, 197, 94, 0.36)",
    shine: "bg-[#A7F3D0]",
  },
  pink: {
    bg: "from-[#F51BA2] via-[#FF35C7] to-[#FF67D8]",
    glow: "rgba(236, 72, 153, 0.40)",
    shine: "bg-[#FBCFE8]",
  },
  yellow: {
    bg: "from-[#FF9518] via-[#FFB21E] to-[#FFE01B]",
    glow: "rgba(250, 204, 21, 0.42)",
    shine: "bg-[#FDE68A]",
  },
  purple: {
    bg: "from-[#6B2CF5] via-[#8A42FF] to-[#A569FF]",
    glow: "rgba(124, 58, 237, 0.42)",
    shine: "bg-[#DDD6FE]",
  },
};

export function ContinueCard({
  title,
  description,
  href,
  icon,
  meta,
  accent,
  className,
}: ContinueCardProps) {
  const a = accentMap[accent];

  return (
    <Link href={href} className={cn("block min-w-0", className)}>
      <motion.div
        whileHover={{ y: -3, scale: 1.005 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "group relative min-h-[116px] min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br p-4 text-white shadow-[0_24px_42px_-24px_rgba(15,23,42,0.36)] sm:min-h-[150px] sm:rounded-[24px] sm:p-6",
          a.bg,
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
          className="pointer-events-none absolute -right-14 -top-10 h-40 w-40 rounded-full opacity-64 blur-2xl"
          style={{ background: a.glow }}
        />
        <div className="pointer-events-none absolute -right-8 bottom-0 flex h-28 w-28 rotate-[-10deg] items-center justify-center rounded-[30px] bg-white/18 text-white/36 opacity-76 transition group-hover:scale-105 group-hover:opacity-90 sm:h-32 sm:w-32 [&_svg]:h-16 [&_svg]:w-16 sm:[&_svg]:h-20 sm:[&_svg]:w-20 [&_svg]:stroke-[2.15]">
          {icon}
        </div>

        <div className="relative z-10 flex h-full items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/22 text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.65)] ring-1 ring-white/35 backdrop-blur sm:h-12 sm:w-12">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            {meta && (
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/82">
                {meta}
              </p>
            )}
            <div className="mt-1 h-0.5 w-5 rounded-full bg-white/35" />
            <p className="mt-1.5 line-clamp-2 max-w-[82%] text-base font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.14)] sm:mt-2 sm:text-lg md:max-w-[86%]">
              {title}
            </p>
            <p className="mt-1 line-clamp-1 max-w-[78%] text-xs font-semibold text-white/88 md:max-w-[82%]">
              {description}
            </p>
          </div>
          <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-white shadow-sm backdrop-blur sm:h-10 sm:w-10">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
