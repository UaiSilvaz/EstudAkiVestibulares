"use client";

import { motion } from "framer-motion";
import {
  Atom,
  BookOpen,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Globe,
  Headphones,
  type LucideIcon,
  PenLine,
  ScrollText,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { type CSSProperties } from "react";

const ICONS: LucideIcon[] = [
  BookOpen,
  Calculator,
  Atom,
  Globe,
  Headphones,
  CalendarDays,
  Target,
  Sparkles,
  ScrollText,
  PenLine,
  FlaskConical,
  ClipboardList,
  CheckCircle2,
  Star,
];

type Props = {
  className?: string;
  density?: "low" | "medium" | "high";
  opacity?: number;
  color?: string;
};

export function BackgroundIcons({ className, density = "medium", opacity = 0.08, color = "#1E73FF" }: Props) {
  const count = density === "low" ? 16 : density === "high" ? 44 : 28;
  const items = Array.from({ length: count }).map((_, index) => {
    const Icon = ICONS[index % ICONS.length];
    const left = (index * 37) % 100;
    const top = (index * 53) % 100;
    const size = 22 + ((index * 7) % 28);
    const rotate = (index * 17) % 360;
    return { Icon, left, top, size, rotate, key: index };
  });

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      style={{ opacity }}
    >
      {items.map((item) => (
        <motion.span
          key={item.key}
          initial={{ y: 0, rotate: item.rotate }}
          animate={{ y: [0, -8, 0], rotate: [item.rotate, item.rotate + 6, item.rotate] }}
          transition={{
            duration: 6 + (item.key % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (item.key % 5) * 0.4,
          }}
          className="absolute"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            color,
          }}
        >
          <item.Icon style={{ width: item.size, height: item.size } as CSSProperties} strokeWidth={1.6} />
        </motion.span>
      ))}
    </div>
  );
}
