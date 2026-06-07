import Link from "next/link";
import { LogoEstudAki } from "./logo-estudaki";

type Props = {
  compact?: boolean;
  href?: string;
  variant?: "default" | "light" | "dark";
  size?: "sm" | "md" | "lg";
};

export function Logo({ compact = false, href = "/dashboard", variant = "default", size }: Props) {
  if (compact) {
    return (
      <Link href={href} aria-label="EstudAki Vestibulares" className="group flex items-center gap-2.5">
        <span className="relative">
          <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-[#1E73FF] via-[#005CFF] to-[#00C896] opacity-90 blur-md transition-opacity duration-300 group-hover:opacity-100" />
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E73FF] via-[#005CFF] to-[#00C896] text-base font-black text-white shadow-[0_10px_30px_-10px_rgba(30,115,255,0.6)] ring-1 ring-white/40">
            &amp;
          </span>
        </span>
        <span className="flex flex-col leading-none">
          <span className="ek-text-gradient-mix text-lg font-extrabold tracking-tight">EstudAki</span>
          <span className="mt-1 text-[9px] font-black uppercase tracking-[0.32em] text-slate-500">
            Vestibulares
          </span>
        </span>
      </Link>
    );
  }

  return <LogoEstudAki href={href} variant={variant} size={size ?? "md"} />;
}
