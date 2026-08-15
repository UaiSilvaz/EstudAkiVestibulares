import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  accent?: "blue" | "orange" | "green" | "pink" | "yellow" | "purple";
  className?: string;
};

const accentMap: Record<NonNullable<EmptyStateProps["accent"]>, { ring: string; icon: string }> = {
  blue:   { ring: "from-[#2563EB] to-[#22D3EE]", icon: "from-[#2563EB] to-[#22D3EE]" },
  orange: { ring: "from-[#FACC15] to-[#F97316]", icon: "from-[#FACC15] to-[#F97316]" },
  green:  { ring: "from-[#22C55E] to-[#86EFAC]", icon: "from-[#22C55E] to-[#86EFAC]" },
  pink:   { ring: "from-[#FB7185] to-[#FDA4AF]", icon: "from-[#FB7185] to-[#FDA4AF]" },
  yellow: { ring: "from-[#FACC15] to-[#FDE047]", icon: "from-[#FACC15] to-[#FDE047]" },
  purple: { ring: "from-[#A78BFA] to-[#C4B5FD]", icon: "from-[#A78BFA] to-[#C4B5FD]" },
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  accent = "blue",
  className,
}: EmptyStateProps) {
  const a = accentMap[accent];
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#60A5FA] opacity-15 blur-3xl"
      />
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-lg ring-4 ring-white",
          a.icon,
        )}
      >
        <Icon className="h-7 w-7" strokeWidth={2.2} />
      </div>
      <h3 className="mt-1 font-display text-lg font-extrabold text-[#0F172A]">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm font-medium text-slate-600">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
