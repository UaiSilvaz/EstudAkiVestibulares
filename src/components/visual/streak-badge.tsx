"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type StreakBadgeProps = {
  days: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { wrap: "px-2.5 py-1 text-[10px]", icon: "h-3 w-3", num: "text-sm" },
  md: { wrap: "px-3 py-1.5 text-xs", icon: "h-3.5 w-3.5", num: "text-sm" },
  lg: { wrap: "px-4 py-2 text-sm", icon: "h-4 w-4", num: "text-base" },
};

export function StreakBadge({ days, size = "md", animated = true, className }: StreakBadgeProps) {
  const s = sizeMap[size];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FACC15] via-[#F97316] to-[#FB7185] font-black uppercase tracking-wider text-white shadow-[0_10px_22px_-8px_rgba(249,115,22,0.45)]",
        s.wrap,
        className,
      )}
    >
      <motion.span
        animate={animated ? { rotate: [-6, 8, -6], scale: [1, 1.12, 1] } : undefined}
        transition={animated ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <Flame className={s.icon} />
      </motion.span>
      <span className={s.num}>{days}</span>
      <span className="opacity-90">dias</span>
    </motion.span>
  );
}
