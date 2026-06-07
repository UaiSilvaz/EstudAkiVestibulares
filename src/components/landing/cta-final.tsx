"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { BackgroundIcons } from "../visual/background-icons";

const STATS = [
  { value: "18k+", label: "Questões comentadas", color: "from-[#2563EB] to-[#22D3EE]" },
  { value: "8", label: "Vestibulares cobertos", color: "from-[#22C55E] to-[#86EFAC]" },
  { value: "15", label: "Matérias disponíveis", color: "from-[#FACC15] to-[#F97316]" },
  { value: "100%", label: "Mobile e desktop", color: "from-[#FB7185] to-[#A78BFA]" },
];

export function CtaFinal() {
  return (
    <section className="relative isolate overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] border border-blue-200/50 bg-white p-10 text-center shadow-[0_30px_80px_-22px_rgba(37,99,235,0.18)] sm:p-16"
        style={{
          background:
            "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 40%, #FDF2F8 100%)",
        }}
      >
        <BackgroundIcons density="low" className="z-0 opacity-40" color="#2563EB" />

        <div
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#60A5FA] opacity-25 blur-3xl"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#FB7185] opacity-20 blur-3xl"
        />
        <div
          className="pointer-events-none absolute right-10 top-1/2 h-56 w-56 rounded-full bg-[#FACC15] opacity-20 blur-3xl"
        />

        <div className="relative">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.25em] text-blue-700 shadow-sm">
            <Sparkles className="h-3 w-3 text-amber-500" /> Comece hoje, sem cartão
          </div>

          <h2 className="font-display mx-auto max-w-3xl text-3xl font-extrabold leading-tight text-[#0F172A] sm:text-5xl">
            Comece sua preparação com mais{" "}
            <span className="ek-text-gradient">clareza</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-slate-600 sm:text-lg">
            Questões, simulados, cadernos e evolução em um só lugar. Sem
            bagunça, sem promessa vazia.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.06 }}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <p className={`bg-gradient-to-r ${s.color} bg-clip-text font-display text-2xl font-black text-transparent sm:text-3xl`}>
                  {s.value}
                </p>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:text-xs">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="ek-button ek-button-primary"
              style={{ borderRadius: 999 }}
            >
              <Zap className="h-4 w-4" /> Ir para o painel
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#cadernos"
              className="ek-button ek-button-ghost"
              style={{ borderRadius: 999 }}
            >
              <BookOpen className="h-4 w-4" /> Ver materiais
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
