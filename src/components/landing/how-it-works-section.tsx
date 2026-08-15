"use client";

import { motion } from "framer-motion";
import { BookOpen, GraduationCap, LineChart, Timer } from "lucide-react";

const STEPS = [
  {
    icon: GraduationCap,
    title: "Escolha seu vestibular",
    description:
      "ENEM, ETEC, FATEC, FUVEST, UNESP, UNICAMP, UERJ ou Provão Paulista.",
    gradient: "from-[#145CFF] to-[#28D7FF]",
  },
  {
    icon: BookOpen,
    title: "Estude por matéria e conteúdo",
    description:
      "As questões são organizadas por matéria, tema e dificuldade.",
    gradient: "from-[#28D7FF] to-[#3DBB6A]",
  },
  {
    icon: Timer,
    title: "Faça simulados reais",
    description:
      "Treine com tempo, gabarito, revisão e análise de desempenho.",
    gradient: "from-[#3DBB6A] to-[#145CFF]",
  },
  {
    icon: LineChart,
    title: "Veja sua evolução",
    description:
      "Acompanhe acertos, erros, pontos fracos e conteúdos para revisar.",
    gradient: "from-[#A78BFA] to-[#22D3EE]",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className="relative isolate overflow-hidden py-24 sm:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 30rem at 50% 0%, rgba(40,215,255,0.16), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#145CFF]">
            Como funciona
          </p>
          <h2 className="font-display text-4xl font-extrabold leading-tight text-[#0F172A] sm:text-5xl">
            Quatro passos para{" "}
            <span className="ek-text-gradient">estudar certo</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-slate-600">
            Sem perder tempo. Sem material solto. Uma trilha clara, do básico ao
            simulado final.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_40px_-22px_rgba(6,36,92,0.20)] backdrop-blur-md"
              >
                <div
                  className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${step.gradient} opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40`}
                />
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} text-white shadow-md`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-2xl font-black text-slate-300">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-display text-xl font-extrabold leading-tight text-[#0F172A]">
                  {step.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  {step.description}
                </p>
                <div className="mt-auto h-1 w-12 rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] opacity-60" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
