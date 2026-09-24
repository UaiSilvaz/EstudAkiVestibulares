import Link from "next/link";
import { SilvaBrand } from "./silva-brand";
import { cn } from "@/lib/utils";

type Props = { href?: string; className?: string; variant?: "default" | "light" | "dark"; size?: "sm" | "md" | "lg" };

// Compatibility export for existing consumers.
export function LogoEstudAki({ href = "/", className, variant = "default", size = "md" }: Props) {
  return <Link href={href} className={cn("inline-flex", size === "sm" && "origin-left scale-90", className)}><SilvaBrand color={variant === "default"} className={variant === "light" ? "!text-white" : undefined} /></Link>;
}
