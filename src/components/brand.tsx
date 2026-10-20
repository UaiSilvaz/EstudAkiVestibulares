import { FastLink as Link } from "@/components/fast-link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_BASE = "/assets/norte-design/01_Logos_SVG";

export function BrandMark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("estudaki-brand-mark", className)} />;
}

export function Brand({ href = "/", light = false, compact = false, className }: {
  href?: string; light?: boolean; compact?: boolean; subtitle?: string; className?: string;
}) {
  return <Link href={href} aria-label="Norte Preparatórios" className={cn("estudaki-brand", light && "estudaki-brand--light", compact && "estudaki-brand--compact", className)}>
    {compact ? <BrandMark /> : <>
      <Image className="norte-brand-logo norte-brand-logo--dark" src={`${LOGO_BASE}/logo_horizontal_laranja.svg`} alt="Norte Preparatórios" width={1181} height={310} unoptimized />
      <Image className="norte-brand-logo norte-brand-logo--light" src={`${LOGO_BASE}/logo_horizontal_branco.svg`} alt="" aria-hidden="true" width={1181} height={310} unoptimized />
    </>}
  </Link>;
}
