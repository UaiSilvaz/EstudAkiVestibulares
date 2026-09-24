"use client";

import { useEffect } from "react";
import { SilvaBrand } from "@/components/silva-brand";

type IntroProps = {
  pending?: boolean; introductory?: boolean; label?: string;
  from?: string; to?: string; accent?: string; onComplete: () => boolean;
};

/** A brief loading state that never imposes an introductory animation delay. */
export function EstudakiIntro({ pending = false, label = "Carregando Silva Educacional", onComplete }: IntroProps) {
  useEffect(() => {
    if (pending) return;
    const timer = window.setTimeout(() => { onComplete(); }, 180);
    return () => window.clearTimeout(timer);
  }, [pending, onComplete]);
  return <div className="silva-loading" role="status" aria-live="polite"><SilvaBrand color /><div className="silva-loading-bar" aria-hidden="true" /><p>{label}</p></div>;
}
