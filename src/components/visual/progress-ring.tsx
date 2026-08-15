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
  const dashOffset = circumference - (target / 100) * circumference;
  const id = `ring-gradient-${Math.round(target)}-${size}-${gradientFrom.replace(/[^a-z0-9]/gi, "")}-${gradientTo.replace(/[^a-z0-9]/gi, "")}`;

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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: dashOffset,
            transition: "stroke-dashoffset 160ms ease-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label ?? (
          <span className="font-display text-xl font-extrabold text-[#0F172A]">{Math.round(target)}</span>
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
