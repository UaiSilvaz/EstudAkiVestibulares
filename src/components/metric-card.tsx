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

const VARIANT_STYLE: Record<Variant, { bg: string; glow: string; shine: string; ink: string }> = {
  green: {
    bg: "linear-gradient(135deg, #36D66E 0%, #42DF85 52%, #5CE6BD 100%)",
    glow: "rgba(34, 197, 94, 0.36)",
    shine: "#A7F3D0",
    ink: "#FFFFFF",
  },
  orange: {
    bg: "linear-gradient(135deg, #FF8A18 0%, #FFA51F 52%, #FFE01B 100%)",
    glow: "rgba(251, 146, 60, 0.45)",
    shine: "#FDE68A",
    ink: "#FFFFFF",
  },
  blue: {
    bg: "linear-gradient(135deg, #1D9BF0 0%, #18B7F7 52%, #1DD7D0 100%)",
    glow: "rgba(14, 165, 233, 0.40)",
    shine: "#7DD3FC",
    ink: "#FFFFFF",
  },
  red: {
    bg: "linear-gradient(135deg, #F43F5E 0%, #FF4D86 52%, #FB7185 100%)",
    glow: "rgba(244, 63, 94, 0.40)",
    shine: "#FECDD3",
    ink: "#FFFFFF",
  },
  purple: {
    bg: "linear-gradient(135deg, #6B2CF5 0%, #8A42FF 52%, #A569FF 100%)",
    glow: "rgba(124, 58, 237, 0.42)",
    shine: "#DDD6FE",
    ink: "#FFFFFF",
  },
  yellow: {
    bg: "linear-gradient(135deg, #FF9518 0%, #FFB21E 52%, #FFE01B 100%)",
    glow: "rgba(250, 204, 21, 0.42)",
    shine: "#FDE68A",
    ink: "#FFFFFF",
  },
  pink: {
    bg: "linear-gradient(135deg, #F51BA2 0%, #FF35C7 52%, #FF67D8 100%)",
    glow: "rgba(236, 72, 153, 0.40)",
    shine: "#FBCFE8",
    ink: "#FFFFFF",
  },
  cyan: {
    bg: "linear-gradient(135deg, #06B6D4 0%, #22D3EE 52%, #67E8F9 100%)",
    glow: "rgba(34, 211, 238, 0.38)",
    shine: "#A5F3FC",
    ink: "#FFFFFF",
  },
  white: {
    bg: "linear-gradient(135deg, #1D9BF0 0%, #18B7F7 52%, #1DD7D0 100%)",
    glow: "rgba(14, 165, 233, 0.40)",
    shine: "#7DD3FC",
    ink: "#FFFFFF",
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
  color,
  variant = "white",
  suffix,
  delay = 0,
  className,
}: Props) {
  const isNumber = typeof value === "number";
  const v = VARIANT_STYLE[variant];
  const Icon = METRIC_ICONS[iconName];
  const glow = color ?? v.glow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, scale: 1.01 }}
      className={cn(
        "group relative min-h-[176px] overflow-hidden rounded-[24px] p-5 text-white shadow-[0_24px_42px_-24px_rgba(15,23,42,0.36)]",
        className,
      )}
      style={{ background: v.bg, color: v.ink }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[24px] bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.28),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_44%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full opacity-20 blur-sm"
        style={{ background: v.shine }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-10 h-40 w-40 rounded-full opacity-64 blur-2xl transition-opacity duration-300 group-hover:opacity-80"
        style={{ background: glow }}
      />
      <div className="pointer-events-none absolute -right-9 bottom-2 flex h-32 w-32 rotate-[-10deg] items-center justify-center rounded-[30px] bg-white/18 text-white/36 opacity-76 transition duration-300 group-hover:scale-105 group-hover:opacity-90">
        <Icon className="h-20 w-20" strokeWidth={2.15} />
      </div>

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/22 text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.65)] ring-1 ring-white/35 backdrop-blur">
            <Icon className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <span className="rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur">
            agora
          </span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/82">
          {label}
        </p>
        <div className="mt-2 h-0.5 w-5 rounded-full bg-white/35" />
        <p className="mt-3 font-display text-3xl font-extrabold leading-none text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.14)]">
          {isNumber ? <AnimatedNumber value={value as number} /> : value}
          {suffix && (
            <span className="ml-1 text-sm font-bold text-white/68">{suffix}</span>
          )}
        </p>
        {hint && (
          <p className="mt-2 max-w-[72%] text-xs font-semibold leading-5 text-white/88">{hint}</p>
        )}
      </div>
    </motion.div>
  );
}
