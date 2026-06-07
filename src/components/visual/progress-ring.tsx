"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type ProgressRingProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  label?: React.ReactNode;
  caption?: React.ReactNode;
  className?: string;
};

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 10,
  trackColor = "rgba(37, 99, 235, 0.10)",
  gradientFrom = "#2563EB",
  gradientTo = "#22D3EE",
  label,
  caption,
  className,
}: ProgressRingProps) {
  const target = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 1200, bounce: 0 });
  const dashOffset = useTransform(springValue, (latest) => circumference - (latest / 100) * circumference);
  const numeric = useTransform(springValue, (latest) => Math.round(latest));

  useEffect(() => {
    motionValue.set(target);
  }, [target, motionValue]);

  const id = `ring-gradient-${Math.round(target)}-${size}`;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label ?? (
          <motion.span className="font-display text-xl font-extrabold text-[#0F172A]">
            {numeric}
          </motion.span>
        )}
        {caption && (
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
