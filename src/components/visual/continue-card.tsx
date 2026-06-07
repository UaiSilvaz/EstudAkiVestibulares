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

const accentMap: Record<ContinueCardProps["accent"], { ring: string; icon: string; text: string; cta: string; bg: string }> = {
  blue:   { ring: "from-[#2563EB] to-[#22D3EE]", icon: "from-[#2563EB] to-[#22D3EE]", text: "text-blue-700",   cta: "from-[#2563EB] to-[#22D3EE]", bg: "from-[#EFF6FF] via-white to-[#DBEAFE]" },
  orange: { ring: "from-[#FACC15] to-[#F97316]", icon: "from-[#FACC15] to-[#F97316]", text: "text-orange-700", cta: "from-[#FACC15] to-[#F97316]", bg: "from-[#FFF7ED] via-white to-[#FFEDD5]" },
  green:  { ring: "from-[#22C55E] to-[#86EFAC]", icon: "from-[#22C55E] to-[#86EFAC]", text: "text-emerald-700", cta: "from-[#22C55E] to-[#86EFAC]", bg: "from-[#ECFDF5] via-white to-[#D1FAE5]" },
  pink:   { ring: "from-[#FB7185] to-[#FDA4AF]", icon: "from-[#FB7185] to-[#FDA4AF]", text: "text-pink-700",   cta: "from-[#FB7185] to-[#FDA4AF]", bg: "from-[#FDF2F8] via-white to-[#FCE7F3]" },
  yellow: { ring: "from-[#FACC15] to-[#FDE047]", icon: "from-[#FACC15] to-[#FDE047]", text: "text-amber-700",  cta: "from-[#FACC15] to-[#FDE047]", bg: "from-[#FEFCE8] via-white to-[#FEF3C7]" },
  purple: { ring: "from-[#A78BFA] to-[#C4B5FD]", icon: "from-[#A78BFA] to-[#C4B5FD]", text: "text-violet-700", cta: "from-[#A78BFA] to-[#C4B5FD]", bg: "from-[#F5F3FF] via-white to-[#EDE9FE]" },
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
    <Link href={href} className={cn("block", className)}>
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "group relative overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18)]",
          a.bg,
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ring-2 ring-white",
              a.icon,
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            {meta && (
              <p className={cn("text-[10px] font-black uppercase tracking-[0.22em]", a.text)}>
                {meta}
              </p>
            )}
            <p className="truncate text-base font-extrabold text-[#0F172A]">{title}</p>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-600">{description}</p>
          </div>
          <motion.span
            whileHover={{ x: 4 }}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ring-2 ring-white",
              a.cta,
            )}
          >
            <ArrowRight className="h-4 w-4" />
          </motion.span>
        </div>
      </motion.div>
    </Link>
  );
}
