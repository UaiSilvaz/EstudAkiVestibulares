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

export function StreakBadge({ days, size = "md", animated = false, className }: StreakBadgeProps) {
  const s = sizeMap[size];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FACC15] via-[#F97316] to-[#FB7185] font-black uppercase tracking-wider text-white shadow-[0_10px_22px_-8px_rgba(249,115,22,0.45)]",
        s.wrap,
        className,
      )}
    >
      <span className={cn(animated && "animate-[estudaki-fast-pulse_900ms_ease-in-out_infinite]")}>
        <Flame className={s.icon} />
      </span>
      <span className={s.num}>{days}</span>
      <span className="opacity-90">dias</span>
    </span>
  );
}
