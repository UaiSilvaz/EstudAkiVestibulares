import { Brand } from "./brand";
export function Logo({ compact = false, href = "/dashboard", variant = "default", size = "md" }: {
  compact?: boolean; href?: string; variant?: "default" | "light" | "dark"; size?: "sm" | "md" | "lg";
}) {
  return <Brand href={href} compact={compact} light={variant === "light"} className={`estudaki-brand--${size}`} />;
}
