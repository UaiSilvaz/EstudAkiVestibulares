"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  Trophy,
  Target,
  Timer,
  CheckCircle2,
  Zap,
  Brain,
} from "lucide-react";
import Link from "next/link";
import TextType from "../reactbits/TextType";
import { BackgroundIcons } from "../visual/background-icons";
import { FloatingBlob } from "../visual/motion-primitives";

const TYPING_TEXTS = [
  "Com questões organizadas.",
  "Com simulados inteligentes.",
  "Com trilhas por vestibular.",
  "Com estatísticas reais.",
];

const FLOATING_CARDS = [
  {
    icon: BookOpen,
    label: "Questões organizadas",
    accent: "from-[#60A5FA] to-[#22D3EE]",
    iconBg: "from-[#2563EB] to-[#22D3EE]",
  },
  {
    icon: Timer,
    label: "Simulados com tempo real",
    accent: "from-[#2563EB] to-[#A78BFA]",
    iconBg: "from-[#A78BFA] to-[#22D3EE]",
  },
  {
    icon: Trophy,
    label: "Estatísticas de desempenho",
    accent: "from-[#22C55E] to-[#22D3EE]",
    iconBg: "from-[#22C55E] to-[#86EFAC]",
  },
  {
    icon: Target,
    label: "Trilha por vestibular",
    accent: "from-[#22D3EE] to-[#22C55E]",
    iconBg: "from-[#FACC15] to-[#F97316]",
  },
];

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative isolate overflow-hidden pb-24 pt-32 sm:pt-40"
    >
      <BackgroundIcons density="medium" className="z-0" />
      <FloatingBlob
        color="rgba(96, 165, 250, 0.32)"
        className="left-[-6%] top-[-10%] h-[28rem] w-[28rem]"
      />
      <FloatingBlob
        color="rgba(34, 211, 238, 0.22)"
        className="right-[-8%] top-[5%] h-[24rem] w-[24rem]"
      />
      <FloatingBlob
        color="rgba(250, 204, 21, 0.18)"
        className="bottom-[-12%] left-[20%] h-[26rem] w-[26rem]"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:px-8">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/80 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-700 shadow-sm backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#22D3EE]" /> Nova geração
            vestibular
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="font-display mt-5 text-[2.6rem] font-extrabold leading-[1.05] text-[#0F172A] sm:text-5xl lg:text-[3.7rem]"
          >
            Estude para o vestibular{" "}
            <span className="ek-text-gradient">certo.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 font-display text-2xl font-extrabold leading-snug text-slate-700 sm:text-3xl"
          >
            Evolua com{" "}
            <TextType
              text={TYPING_TEXTS}
              as="span"
              typingSpeed={60}
              deletingSpeed={30}
              pauseDuration={1600}
              showCursor
              cursorCharacter="|"
              cursorClassName="text-[#2563EB] font-black"
              className="ek-text-gradient font-extrabold"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg"
          >
            Plataforma completa de estudos com banco de questões, simulados
            cronometrados, cadernos digitais e análise de desempenho por
            matéria, tema e dificuldade.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/login"
              className="ek-button ek-button-primary"
              style={{ borderRadius: 999 }}
            >
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#como-funciona"
              className="ek-button ek-button-ghost"
              style={{ borderRadius: 999 }}
            >
              Ver como funciona
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center gap-6 text-xs font-bold text-slate-600"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-[#22D3EE] to-[#2563EB]" />
                <div className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-[#22C55E] to-[#22D3EE]" />
                <div className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-[#2563EB] to-[#A78BFA]" />
              </div>
              <span>+ de centenas de estudantes ativos</span>
            </div>
            <span className="hidden h-3 w-px bg-slate-200 sm:inline" />
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              Conteúdo atualizado semanalmente
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          <div className="relative overflow-hidden rounded-[40px] border border-white/80 bg-white/70 p-5 shadow-[0_30px_80px_-20px_rgba(37,99,235,0.18)] backdrop-blur-2xl">
            <div
              aria-hidden
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#60A5FA] opacity-30 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-[#A78BFA] opacity-25 blur-3xl"
            />

            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                    Painel ativo
                  </span>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  ao vivo
                </span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FACC15] to-[#F97316] text-white">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Questão ENEM · 2024
                    </p>
                    <p className="text-xs font-black text-[#0F172A]">Matemática</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {["R$ 38 e R$ 30", "R$ 42 e R$ 35", "R$ 40 e R$ 32", "R$ 44 e R$ 28"].map((alt, i) => (
                    <div
                      key={alt}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold ${
                        i === 1
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-100 bg-white text-slate-600"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-black ${
                        i === 1 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {alt}
                      {i === 1 && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-gradient-to-br from-[#FEFCE8] to-white p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FACC15] to-[#F97316] text-white">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
                      Ranking
                    </p>
                    <p className="text-[11px] font-black text-[#0F172A]">Top 10% semana</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-cyan-100 bg-gradient-to-br from-[#ECFEFF] to-white p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-[#67E8F9] text-white">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-700">
                      Meta diária
                    </p>
                    <p className="text-[11px] font-black text-[#0F172A]">72% concluída</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FEF3C7] to-[#FFEDD5] px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FACC15] to-[#F97316] text-white">
                  <Zap className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-semibold text-amber-900">
                  <span className="font-black">+12%</span> essa semana — continue o ritmo!
                </p>
              </div>
            </div>
          </div>

          {FLOATING_CARDS.map((card, index) => {
            const Icon = card.icon;
            const positions = [
              "-top-6 -left-8",
              "-top-4 -right-10",
              "bottom-32 -left-12",
              "-bottom-8 -right-6",
            ];
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: [0, -8, 0] }}
                transition={{
                  opacity: { duration: 0.6, delay: 0.4 + index * 0.1 },
                  y: {
                    duration: 4 + index * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.2,
                  },
                }}
                className={`absolute z-20 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white px-3 py-2 text-[#0F172A] shadow-[0_18px_40px_-18px_rgba(15,23,42,0.18)] backdrop-blur-md sm:flex ${positions[index]}`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${card.iconBg} text-white`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-extrabold leading-tight text-[#0F172A]">
                  {card.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
