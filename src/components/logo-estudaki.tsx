import { cn } from "@/lib/utils";
import Link from "next/link";

type Props = {
  href?: string;
  className?: string;
  variant?: "default" | "light" | "dark";
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { title: "text-lg", sub: "text-[9px]" },
  md: { title: "text-2xl", sub: "text-[10px]" },
  lg: { title: "text-3xl", sub: "text-[11px]" },
} as const;

const variantMap = {
  default: {
    title: "ek-text-gradient-mix",
    sub: "text-slate-500",
  },
  light: {
    title: "text-white",
    sub: "text-white/70",
  },
  dark: {
    title: "ek-text-gradient-blue",
    sub: "text-[#061A40]/70",
  },
} as const;

export function LogoEstudAki({
  href = "/",
  className,
  variant = "default",
  size = "md",
}: Props) {
  const sizes = sizeMap[size];
  const colors = variantMap[variant];

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-1 py-1 font-display",
        className,
      )}
    >
      <span className="relative inline-flex">
        <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-[#1E73FF] via-[#005CFF] to-[#00C896] opacity-90 blur-md transition-opacity duration-300 group-hover:opacity-100" />
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E73FF] via-[#005CFF] to-[#00C896] text-base font-black text-white shadow-[0_10px_30px_-10px_rgba(30,115,255,0.7)] ring-1 ring-white/40">
          &amp;
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-extrabold tracking-tight", sizes.title, colors.title)}>
          EstudAki
        </span>
        <span
          className={cn(
            "mt-1 font-black uppercase tracking-[0.32em]",
            sizes.sub,
            colors.sub,
          )}
        >
          Vestibulares
        </span>
      </span>
    </Link>
  );
}
