"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Plano = {
  nome: string;
  preco: string;
  periodo: string;
  descricao: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  cta: string;
  href: string;
  icon: typeof BookOpen;
  gradient: string;
  iconBg: string;
  accent: string;
};

const PLANOS: Plano[] = [
  {
    nome: "Gratuito",
    preco: "R$ 0",
    periodo: "para sempre",
    descricao: "Para começar a estudar hoje mesmo, sem cartão de crédito.",
    features: [
      "Acesso a 200 questões por matéria",
      "1 simulado diagnóstico por mês",
      "Estatísticas básicas de desempenho",
      "Conteúdo de demonstração dos cadernos",
    ],
    cta: "Começar grátis",
    href: "/login",
    icon: BookOpen,
    gradient: "linear-gradient(135deg, #1D9BF0 0%, #18B7F7 52%, #1DD7D0 100%)",
    iconBg: "from-[#2563EB] to-[#22D3EE]",
    accent: "#2563EB",
  },
  {
    nome: "Cadernos",
    preco: "R$ 19",
    periodo: "/mês",
    descricao: "Para quem quer aprofundar os estudos com material organizado por matéria.",
    features: [
      "Todos os cadernos ENEM, ETEC, FATEC, FUVEST",
      "Mapas mentais e resumos em PDF",
      "3 simulados por mês com gabarito comentado",
      "Suporte por e-mail",
    ],
    badge: "Recomendado",
    cta: "Assinar Cadernos",
    href: "/login",
    icon: GraduationCap,
    gradient: "linear-gradient(135deg, #FF8A18 0%, #FFA51F 52%, #FFE01B 100%)",
    iconBg: "from-[#FACC15] to-[#F97316]",
    accent: "#C2410C",
    highlight: true,
  },
  {
    nome: "Plataforma completa",
    preco: "R$ 39",
    periodo: "/mês",
    descricao: "Para quem busca aprovação com banco de questões, simulados e análise de desempenho.",
    features: [
      "Banco completo com mais de 18 mil questões",
      "Simulados ilimitados e cronometrados",
      "Análise avançada de desempenho por tópico",
      "Biblioteca privada de PDFs e materiais bonus",
      "Suporte prioritário pelo WhatsApp",
    ],
    cta: "Quero a plataforma completa",
    href: "/login",
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #6B2CF5 0%, #8A42FF 52%, #FF35C7 100%)",
    iconBg: "from-[#2563EB] to-[#A78BFA]",
    accent: "#2563EB",
  },
];

export function PricingSection() {
  return (
    <section
      id="precos"
      className="relative isolate overflow-hidden py-24 sm:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.3em] text-blue-700">
            Preços
          </p>
          <h2 className="font-display text-4xl font-extrabold leading-tight text-[#0F172A] sm:text-5xl">
            Comece agora sua{" "}
            <span className="ek-text-gradient-soft">preparação</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-slate-600">
            Sem fidelidade, cancele quando quiser. Acesso imediato em todos os
            dispositivos.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLANOS.map((plano, index) => {
            const Icon = plano.icon;
            return (
              <motion.div
                key={plano.nome}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={cn(
                  "group relative flex min-h-[440px] flex-col gap-4 overflow-hidden rounded-[28px] border border-white/28 p-6 text-white shadow-[0_28px_58px_-32px_rgba(15,23,42,0.45)] transition-transform duration-300 hover:-translate-y-1.5",
                )}
                style={{ background: plano.gradient }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-[28px] bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.28),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_44%)]"
                />
                <div className="pointer-events-none absolute -right-12 bottom-5 flex h-36 w-36 rotate-[-12deg] items-center justify-center rounded-[34px] bg-white/16 text-white/30 transition duration-300 group-hover:scale-105">
                  <Icon className="h-24 w-24" strokeWidth={2.1} />
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl bg-white/22 text-white shadow-md ring-1 ring-white/40 backdrop-blur bg-gradient-to-br",
                      plano.iconBg,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {plano.badge && (
                    <span
                      className={cn(
                        "rounded-full border border-white/35 bg-white/22 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur",
                      )}
                    >
                      {plano.badge}
                    </span>
                  )}
                </div>

                <div className="relative z-10">
                  <h3
                    className={cn(
                      "font-display text-2xl font-black text-white",
                    )}
                  >
                    {plano.nome}
                  </h3>
                  <p
                    className="mt-2 min-h-[62px] text-sm font-bold leading-6 text-white/84"
                  >
                    {plano.descricao}
                  </p>
                </div>

                <div className="relative z-10 flex items-end gap-2">
                  <span
                    className="font-display text-4xl font-black text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.14)]"
                  >
                    {plano.preco}
                  </span>
                  <span
                    className="mb-1 text-xs font-bold text-white/70"
                  >
                    {plano.periodo}
                  </span>
                </div>

                <ul className="relative z-10 flex flex-col gap-2 text-sm">
                  {plano.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 font-bold leading-5 text-white/88"
                    >
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/24 ring-1 ring-white/30">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plano.href}
                  className={cn(
                    "relative z-10 mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-xs font-black uppercase tracking-wider text-[#0F172A] shadow-md transition hover:-translate-y-0.5 hover:shadow-xl",
                  )}
                >
                  {plano.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
