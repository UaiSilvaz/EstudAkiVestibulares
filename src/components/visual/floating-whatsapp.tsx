"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const WHATSAPP_URL =
  "https://wa.me/5517997172045?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20EstudAki%20Vestibulares";

type FloatingWhatsAppProps = {
  variant?: "landing" | "platform";
};

export function FloatingWhatsApp({ variant = "landing" }: FloatingWhatsAppProps) {
  const [showLabel, setShowLabel] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (variant === "platform") return;
    if (dismissed) return;
    const interval = setInterval(() => {
      setShowLabel(true);
      const t = setTimeout(() => setShowLabel(false), 3000);
      return () => clearTimeout(t);
    }, 6500);
    const first = setTimeout(() => setShowLabel(true), 1200);
    const firstHide = setTimeout(() => setShowLabel(false), 4200);
    return () => {
      clearInterval(interval);
      clearTimeout(first);
      clearTimeout(firstHide);
    };
  }, [dismissed, variant]);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-end gap-3 animate-[estudaki-fast-sheet_140ms_ease-out]">
      {showLabel && variant === "landing" && (
        <div className="hidden items-center gap-3 rounded-full border border-emerald-200 bg-white px-4 py-2.5 shadow-[0_18px_40px_-12px_rgba(16,185,129,0.45)] animate-[estudaki-fast-pop_120ms_ease-out] md:flex">
          <span className="flex h-2 w-2 animate-blink rounded-full bg-emerald-500" />
          <p className="text-sm font-black text-slate-800">Precisa de ajuda?</p>
          <button
            type="button"
            aria-label="Fechar"
            onClick={(e) => {
              e.preventDefault();
              setDismissed(true);
            }}
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <Link
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
        className="group relative"
      >
        <span className="absolute inset-0 -z-10 rounded-full bg-emerald-400/40 blur-xl transition-opacity duration-300 group-hover:opacity-80" />
        <span className="absolute inset-0 -z-10 rounded-full ek-whatsapp-pulse" />
        <span className="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-[11px] font-black text-white shadow-lg ring-2 ring-white">
          1
        </span>
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-[0_18px_40px_-12px_rgba(16,185,129,0.7)] ring-1 ring-emerald-300/60 transition-transform duration-150 ease-out group-hover:scale-[1.04] group-active:scale-95">
          <MessageCircle className="h-8 w-8" strokeWidth={2.2} />
        </span>
      </Link>
    </div>
  );
}
