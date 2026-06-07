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
    gradient: "from-white to-[#F8FAFC]",
    iconBg: "from-[#2563EB] to-[#22D3EE]",
    accent: "#2563EB",
  },
  {
    nome: "Cadernos",
    preco: "R$ 19",
    periodo: "/mês",
    descricao: "Para quem quer aprofundar com material estruturado por matéria.",
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
    gradient: "from-[#FACC15] via-[#FDE68A] to-[#FFEDD5]",
    iconBg: "from-[#FACC15] to-[#F97316]",
    accent: "#C2410C",
    highlight: true,
  },
  {
    nome: "Plataforma completa",
    preco: "R$ 39",
    periodo: "/mês",
    descricao: "Para quem quer aprovação com banco de questões, simulados e análise.",
    features: [
      "Banco completo com 18 mil+ questões",
      "Simulados ilimitados e cronometrados",
      "Análise avançada de desempenho por tópico",
      "Aulas em vídeo Express e cadernos bônus",
      "Suporte prioritário via WhatsApp",
    ],
    cta: "Quero a plataforma completa",
    href: "/login",
    icon: Sparkles,
    gradient: "from-[#EFF6FF] to-[#DBEAFE]",
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
                  "relative flex h-full flex-col gap-4 overflow-hidden rounded-[28px] border p-6 transition-transform duration-300 hover:-translate-y-1",
                  plano.highlight
                    ? "border-amber-200/60 shadow-[0_24px_60px_-22px_rgba(250,204,21,0.30)]"
                    : "border-slate-100 bg-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]",
                )}
                style={
                  plano.highlight
                    ? {
                        background:
                          "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FED7AA 100%)",
                      }
                    : {
                        background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
                      }
                }
              >
                {plano.highlight && (
                  <div
                    className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#FACC15] opacity-40 blur-3xl"
                  />
                )}

                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md ring-1 ring-white/40 bg-gradient-to-br",
                      plano.iconBg,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {plano.badge && (
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                        plano.highlight
                          ? "border border-white/70 bg-white/80 text-amber-700"
                          : "bg-amber-50 text-amber-700 border border-amber-200",
                      )}
                    >
                      {plano.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3
                    className={cn(
                      "font-display text-2xl font-extrabold text-[#0F172A]",
                    )}
                  >
                    {plano.nome}
                  </h3>
                  <p
                    className="mt-1 text-sm font-medium text-slate-600"
                  >
                    {plano.descricao}
                  </p>
                </div>

                <div className="flex items-end gap-2">
                  <span
                    className="font-display text-4xl font-black text-[#0F172A]"
                  >
                    {plano.preco}
                  </span>
                  <span
                    className="mb-1 text-xs font-bold text-slate-500"
                  >
                    {plano.periodo}
                  </span>
                </div>

                <ul className="flex flex-col gap-2 text-sm">
                  {plano.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 font-semibold text-slate-600"
                    >
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#86EFAC]">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plano.href}
                  className={cn(
                    "ek-button mt-auto",
                    plano.highlight
                      ? "ek-button-energy"
                      : "ek-button-primary",
                  )}
                  style={{ borderRadius: 999 }}
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
