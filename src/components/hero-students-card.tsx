"use client";

import { BookOpen, Trophy } from "@/components/visual/aicon-icons";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, GraduationCap, Sparkles, Star, Zap, Flame, CheckCircle2, Brain } from "lucide-react";

export function HeroStudentsCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="group relative min-h-[480px] overflow-hidden rounded-[18px] border border-blue-100/60 p-7 shadow-sm md:p-10"
      style={{
        background:
          "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 40%, #BAE6FD 70%, #A5F3FC 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute -right-12 -top-12 h-72 w-72 rounded-full bg-[#60A5FA] opacity-30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-[#A78BFA] opacity-25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-12 right-20 h-56 w-56 rounded-full bg-[#22D3EE] opacity-25 blur-3xl"
      />

      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(37, 99, 235, 0.10) 1.4px, transparent 1.4px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative z-10 grid h-full grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[#22D3EE]" />
            Criado para estudar com direção
          </div>
          <h2 className="max-w-lg font-display text-4xl font-bold leading-[1.03] tracking-tight text-[#0F172A] md:text-5xl lg:text-[3.4rem]">
            Sua aprovação
            <br />
            <span className="ek-text-gradient-mix">começa aqui.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm font-medium leading-6 text-slate-600 md:text-base">
            Questões, simulados, desempenho e inteligência de estudo em uma única
            plataforma para acelerar seus resultados.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/questions" className="ek-button ek-button-primary">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/provas" className="ek-button ek-button-ghost">
              Ver provas antigas
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> +120 XP por acerto
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600" /> 8+ vestibulares
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" /> 2.000+ questões
            </span>
          </div>
        </div>

        <div className="relative hidden h-full min-h-[360px] lg:block">
          <motion.div
            animate={{ opacity: 1 }}
            transition={{ duration: 5, repeat: 0, ease: "easeInOut" }}
            className="absolute right-2 top-2 w-full max-w-[280px] rounded-3xl border border-white/80 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl    text-[color:var(--theme-text)] shadow-md professional-neutral">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Questão ENEM · 2023
                </p>
                <p className="text-xs font-semibold text-[#0F172A]">Matemática</p>
              </div>
            </div>
            <p className="text-[12px] font-semibold leading-relaxed text-slate-700">
              Uma loja vende dois modelos de camisetas. O primeiro é vendido por
              R$ 45 a unidade...
            </p>
            <div className="mt-3 space-y-1.5">
              {["R$ 38 e R$ 30", "R$ 42 e R$ 35", "R$ 40 e R$ 32", "R$ 44 e R$ 28"].map((alt, i) => (
                <div
                  key={alt}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold ${
                    i === 1
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-100 bg-white text-slate-600"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-semibold ${
                    i === 1 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {alt}
                  {i === 1 && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -4, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 0.4 },
              y: { duration: 4.5, repeat: 0, ease: "easeInOut", delay: 0.5 },
            }}
            className="absolute -bottom-2 left-0 flex items-center gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl    text-[color:var(--theme-text)] shadow-md professional-neutral">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Ranking
              </p>
              <p className="text-sm font-semibold text-[#0F172A]">Top 10% da liga Prata</p>
            </div>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -5, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 0.55 },
              y: { duration: 5.5, repeat: 0, ease: "easeInOut", delay: 0.8 },
            }}
            className="absolute -right-4 top-44 flex items-center gap-2 rounded-2xl border border-white/80    px-3 py-2 shadow-sm professional-neutral"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl    text-[color:var(--theme-text)] shadow-md professional-neutral">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                +12% semana
              </p>
              <p className="text-[11px] font-semibold text-[#0F172A]">Evoluindo rápido</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -3, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 0.7 },
              y: { duration: 6, repeat: 0, ease: "easeInOut", delay: 1 },
            }}
            className="absolute bottom-12 right-12 flex items-center gap-2 rounded-2xl border border-white/80    px-3 py-2 shadow-sm professional-neutral"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl    text-[color:var(--theme-text)] shadow-md professional-neutral">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-pink-700">
                Streak
              </p>
              <p className="text-[11px] font-semibold text-[#0F172A]">9 dias seguidos</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
