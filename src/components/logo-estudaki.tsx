import { Brand } from "./brand";
import { cn } from "@/lib/utils";

type Props = { href?: string; className?: string; variant?: "default" | "light" | "dark"; size?: "sm" | "md" | "lg" };
export function LogoEstudAki({ href = "/", className, variant = "default", size = "md" }: Props) {
  return <Brand href={href} light={variant === "light"} className={cn(`estudaki-brand--${size}`, className)} />;
}
