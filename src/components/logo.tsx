import Link from "next/link";
import { LogoEstudAki } from "./logo-estudaki";
import { SilvaBrand } from "./silva-brand";

type Props = { compact?: boolean; href?: string; variant?: "default" | "light" | "dark"; size?: "sm" | "md" | "lg" };

export function Logo({ compact = false, href = "/dashboard", variant = "default", size }: Props) {
  if (compact) return <Link href={href}><SilvaBrand compact color={variant === "default"} className={variant === "light" ? "!text-white" : undefined} /></Link>;
  return <LogoEstudAki href={href} variant={variant} size={size ?? "md"} />;
}
