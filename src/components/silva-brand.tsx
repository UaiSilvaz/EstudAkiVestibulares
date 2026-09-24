import { cn } from "@/lib/utils";

/** Original signature supplied with the Silva Educacional design reference. */
export function SilvaBrand({ compact = false, color = false, className }: { compact?: boolean; color?: boolean; className?: string }) {
  return <span className={cn("silva-brand", "silva-brand-original", color && "silva-brand-color", compact && "silva-brand-compact", className)} aria-label="Silva Educacional" role="img"><span className="silva-brand-art" aria-hidden="true" />{!compact && <span className="silva-brand-caption" aria-hidden="true">EDUCACIONAL</span>}</span>;
}
