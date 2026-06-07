"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Flame,
  Gauge,
  GraduationCap,
  LineChart,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { AnimatedNumber } from "./visual/animated-number";
import { cn } from "@/lib/utils";

type Variant =
  | "green"
  | "orange"
  | "blue"
  | "red"
  | "purple"
  | "yellow"
  | "pink"
  | "cyan"
  | "white";

type Props = {
  label: string;
  value: number | string;
  hint?: string;
  iconName: MetricIconName;
  color?: string;
  variant?: Variant;
  suffix?: string;
  delay?: number;
  className?: string;
};

const VARIANT_STYLE: Record<Variant, { bg: string; borderTop: string; iconBg: string; iconShadow: string; accent: string }> = {
  green: {
    bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 45%, #A7F3D0 100%)",
    borderTop: "#22C55E",
    iconBg: "linear-gradient(135deg, #22C55E, #86EFAC)",
    iconShadow: "0 10px 22px -8px rgba(34, 197, 94, 0.55)",
    accent: "#15803D",
  },
  orange: {
    bg: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 45%, #FED7AA 100%)",
    borderTop: "#FB923C",
    iconBg: "linear-gradient(135deg, #F97316, #FDBA74)",
    iconShadow: "0 10px 22px -8px rgba(249, 115, 22, 0.55)",
    accent: "#C2410C",
  },
  blue: {
    bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 45%, #BAE6FD 100%)",
    borderTop: "#3B82F6",
    iconBg: "linear-gradient(135deg, #3B82F6, #67E8F9)",
    iconShadow: "0 10px 22px -8px rgba(59, 130, 246, 0.55)",
    accent: "#1D4ED8",
  },
  red: {
    bg: "linear-gradient(135deg, #FEF2F2 0%, #FFE4E6 45%, #FECDD3 100%)",
    borderTop: "#F43F5E",
    iconBg: "linear-gradient(135deg, #F43F5E, #FDA4AF)",
    iconShadow: "0 10px 22px -8px rgba(244, 63, 94, 0.45)",
    accent: "#BE123C",
  },
  purple: {
    bg: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 45%, #DDD6FE 100%)",
    borderTop: "#A78BFA",
    iconBg: "linear-gradient(135deg, #A78BFA, #C4B5FD)",
    iconShadow: "0 10px 22px -8px rgba(167, 139, 250, 0.55)",
    accent: "#6D28D9",
  },
  yellow: {
    bg: "linear-gradient(135deg, #FEFCE8 0%, #FEF3C7 45%, #FDE68A 100%)",
    borderTop: "#FACC15",
    iconBg: "linear-gradient(135deg, #FACC15, #FDE047)",
    iconShadow: "0 10px 22px -8px rgba(250, 204, 21, 0.55)",
    accent: "#A16207",
  },
  pink: {
    bg: "linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 45%, #FBCFE8 100%)",
    borderTop: "#FB7185",
    iconBg: "linear-gradient(135deg, #FB7185, #FDA4AF)",
    iconShadow: "0 10px 22px -8px rgba(251, 113, 133, 0.55)",
    accent: "#BE185D",
  },
  cyan: {
    bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 45%, #A5F3FC 100%)",
    borderTop: "#22D3EE",
    iconBg: "linear-gradient(135deg, #22D3EE, #67E8F9)",
    iconShadow: "0 10px 22px -8px rgba(34, 211, 238, 0.55)",
    accent: "#0E7490",
  },
  white: {
    bg: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
    borderTop: "#CBD5E1",
    iconBg: "linear-gradient(135deg, #2563EB, #22D3EE)",
    iconShadow: "0 10px 22px -8px rgba(37, 99, 235, 0.40)",
    accent: "#0F172A",
  },
};

const METRIC_ICONS = {
  alertTriangle: AlertTriangle,
  bookOpen: BookOpen,
  checkCircle: CheckCircle2,
  clipboardList: ClipboardList,
  fileText: FileText,
  flame: Flame,
  gauge: Gauge,
  graduationCap: GraduationCap,
  lineChart: LineChart,
  trophy: Trophy,
  users: Users,
  video: Video,
};

type MetricIconName = keyof typeof METRIC_ICONS;

export function MetricCard({
  label,
  value,
  hint,
  iconName,
  color = "#2563EB",
  variant = "white",
  suffix,
  delay = 0,
  className,
}: Props) {
  const isNumber = typeof value === "number";
  const v = VARIANT_STYLE[variant];
  const Icon = METRIC_ICONS[iconName];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
      className={cn(
        "group relative overflow-hidden rounded-3xl p-5",
        className,
      )}
      style={{
        background: v.bg,
        borderTop: `4px solid ${v.borderTop}`,
        boxShadow:
          "0 14px 32px -18px rgba(15, 23, 42, 0.10), 0 1px 0 rgba(255, 255, 255, 0.6) inset",
        border: `1px solid ${v.borderTop}1A`,
        borderTopColor: v.borderTop,
      }}
    >
      <div
        aria-hidden
        className="absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-55"
        style={{ background: color }}
      />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white ring-1 ring-white/40"
            style={{
              background: v.iconBg,
              boxShadow: v.iconShadow,
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <span
            className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur"
            style={{ color: v.accent }}
          >
            agora
          </span>
        </div>
        <p
          className="text-[11px] font-black uppercase tracking-[0.22em]"
          style={{ color: v.accent }}
        >
          {label}
        </p>
        <p className="mt-1 font-display text-3xl font-extrabold leading-tight text-[#0F172A]">
          {isNumber ? <AnimatedNumber value={value as number} /> : value}
          {suffix && (
            <span className="ml-1 text-sm font-bold text-slate-500">{suffix}</span>
          )}
        </p>
        {hint && (
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600">{hint}</p>
        )}
      </div>
    </motion.div>
  );
}
