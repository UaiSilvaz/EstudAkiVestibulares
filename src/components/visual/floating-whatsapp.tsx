"use client";

import { MessageCircle, X } from "lucide-react";
import { motion } from "framer-motion";
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
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 220, damping: 18 }}
      className="fixed bottom-5 right-5 z-[60] flex items-end gap-3"
    >
      {showLabel && variant === "landing" && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          className="hidden items-center gap-3 rounded-full border border-emerald-200 bg-white px-4 py-2.5 shadow-[0_18px_40px_-12px_rgba(16,185,129,0.45)] md:flex"
        >
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
        </motion.div>
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
        <motion.span
          whileHover={{ scale: 1.08, rotate: 6 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-[0_18px_40px_-12px_rgba(16,185,129,0.7)] ring-1 ring-emerald-300/60"
        >
          <MessageCircle className="h-8 w-8" strokeWidth={2.2} />
        </motion.span>
      </Link>
    </motion.div>
  );
}
