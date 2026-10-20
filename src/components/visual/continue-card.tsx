import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ContinueCardProps = { title: string; description: string; href: string; icon: React.ReactNode; meta?: string; accent: "blue" | "orange" | "green" | "pink" | "yellow" | "purple"; className?: string };

export function ContinueCard({ title, description, href, meta, className }: ContinueCardProps) {
  return <Link href={href} className={cn("flex min-w-0 items-center justify-between gap-4 rounded-[14px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-5 transition-colors duration-150 hover:border-[color:var(--theme-primary)]", className)}>
    <div className="min-w-0">
      {meta && <p className="mb-2 text-xs text-[color:var(--theme-muted)]">{meta}</p>}
      <h3 className="text-base font-semibold text-[color:var(--theme-text)]">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-[color:var(--theme-muted)]">{description}</p>
    </div>
    <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--theme-muted)]" />
  </Link>;
}
