"use client";

import { motion } from "framer-motion";
import {
  Timer,
  CheckCircle2,
  Target,
  Sparkles,
  Brain,
} from "lucide-react";
import ScrollReveal from "../reactbits/ScrollReveal";
import { FloatingBlob } from "../visual/motion-primitives";

export function SimuladosSection() {
  return (
    <section
      id="simulados"
      className="relative isolate overflow-hidden py-24 sm:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
        }}
      />
      <FloatingBlob
        color="rgba(96, 165, 250, 0.20)"
        className="right-[-8%] top-[10%] h-[26rem] w-[26rem]"
      />
      <FloatingBlob
        color="rgba(34, 197, 94, 0.16)"
        className="left-[-8%] bottom-[-8%] h-[26rem] w-[26rem]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8">
        <div>
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.3em] text-blue-700">
            Simulados e desempenho
          </p>
          <h2 className="font-display text-4xl font-extrabold leading-tight text-[#0F172A] sm:text-5xl">
            Treine como se fosse{" "}
            <span className="ek-text-gradient-soft">o dia da prova</span>
          </h2>
          <div className="mt-6">
            <ScrollReveal
              baseOpacity={0.15}
              baseRotation={1.2}
              blurStrength={3}
              textClassName="font-medium text-slate-600 sm:text-lg leading-relaxed"
            >
              Cronômetro real, gabarito comentado, estatísticas por matéria e por tópico, comparação com a média dos usuários e recomendação automática de revisão.
            </ScrollReveal>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: Timer, label: "Cronômetro real" },
              { icon: CheckCircle2, label: "Gabarito comentado" },
              { icon: Target, label: "Análise por matéria" },
              { icon: Brain, label: "Recomendação de revisão" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-extrabold text-[#0F172A]">
                    {item.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-slate-100 bg-white p-6 shadow-[0_24px_60px_-22px_rgba(37,99,235,0.20)]">
            <div
              aria-hidden
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#60A5FA] opacity-25 blur-3xl"
            />
            <div className="relative z-10">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Simulado ENEM 2024 • 1ª fase
                  </p>
                  <h3 className="font-display mt-1 text-lg font-black text-[#0F172A]">
                    Painel em tempo real
                  </h3>
                </div>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700">
                  Em andamento
                </span>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <Stat label="Tempo" value="01:48:20" color="from-[#2563EB] to-[#22D3EE]" />
                <Stat label="Acertos" value="42" color="from-[#22C55E] to-[#86EFAC]" />
                <Stat label="Erros" value="14" color="from-[#FB7185] to-[#FDA4AF]" />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <span>Porcentagem geral</span>
                  <span className="font-black text-[#0F172A]">75%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "75%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#22C55E]"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-[#ECFDF5] to-white p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                    Matérias fortes
                  </p>
                  <p className="mt-1 text-sm font-black text-[#0F172A]">
                    Biologia, Português
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-[#FEF2F2] to-white p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                    Matérias fracas
                  </p>
                  <p className="mt-1 text-sm font-black text-[#0F172A]">
                    Geografia, Física
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#F97316] p-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/25">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold leading-tight">
                  <span className="font-black">Recomendado:</span> revisar 12
                  questões de Geografia e 8 de Física.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-3">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl`}
      />
      <p className="relative text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="relative font-display mt-1 text-2xl font-black text-[#06245C]">
        {value}
      </p>
    </div>
  );
}
