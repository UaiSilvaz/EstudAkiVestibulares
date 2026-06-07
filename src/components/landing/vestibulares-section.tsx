"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import GlareHover from "../reactbits/GlareHover";

type Vestibular = {
  name: string;
  short: string;
  description: string;
  highlight: string;
  href: string;
  span?: "wide" | "tall" | "normal";
  gradient: string;
  accent: string;
  bullets: string[];
  iconBg: string;
  iconColor: string;
  logoSrc: string;
  logoAlt: string;
};

const VESTIBULARES: Vestibular[] = [
  {
    name: "ENEM",
    short: "Exame Nacional do Ensino Médio",
    description:
      "A porta de entrada para universidades federais e privadas. Treine com provas comentadas, redação e simulados cronometrados.",
    highlight: "+180 questões por prova",
    href: "/provas?exam=ENEM",
    span: "wide",
    gradient: "linear-gradient(135deg, #0B1E5B 0%, #145CFF 55%, #28D7FF 100%)",
    accent: "#28D7FF",
    iconBg: "rgba(255,255,255,0.18)",
    iconColor: "#FFFFFF",
    bullets: [
      "5 dias de prova no formato real",
      "Áreas e competências avaliadas",
      "Redação com correção por competência",
    ],
    logoSrc: "/loop/Enem_logo.png",
    logoAlt: "ENEM",
  },
  {
    name: "ETEC",
    short: "Vestibulinho das Escolas Técnicas",
    description: "Para cursos técnicos do Centro Paula Souza.",
    highlight: "Provas anteriores",
    href: "/provas?exam=ETEC",
    gradient: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 60%, #BBF7D0 100%)",
    accent: "#16A34A",
    iconBg: "linear-gradient(135deg, #22C55E, #86EFAC)",
    iconColor: "#FFFFFF",
    bullets: ["Múltipla escolha", "Língua portuguesa", "Matemática básica"],
    logoSrc: "/loop/etec.png",
    logoAlt: "ETEC",
  },
  {
    name: "FATEC",
    short: "Faculdade de Tecnologia de SP",
    description: "Para os cursos tecnológicos do Centro Paula Souza.",
    highlight: "Simulados cronometrados",
    href: "/provas?exam=FATEC",
    gradient: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 60%, #A5F3FC 100%)",
    accent: "#0E7490",
    iconBg: "linear-gradient(135deg, #22D3EE, #67E8F9)",
    iconColor: "#FFFFFF",
    bullets: ["54 questões", "3 horas de prova", "Múltiplas áreas"],
    logoSrc: "/loop/fatec-identidade-removebg-preview.png",
    logoAlt: "FATEC",
  },
  {
    name: "FUVEST",
    short: "Vestibular da USP",
    description: "Primeira fase e segunda fase da USP.",
    highlight: "Banco por disciplina",
    href: "/provas?exam=FUVEST",
    gradient: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 60%, #FCD34D 100%)",
    accent: "#A16207",
    iconBg: "linear-gradient(135deg, #FACC15, #FDE047)",
    iconColor: "#FFFFFF",
    bullets: ["2 fases", "90 questões 1ª fase", "10 questões discursivas"],
    logoSrc: "/loop/img-logo-fuvest-1.webp",
    logoAlt: "FUVEST",
  },
  {
    name: "UNESP",
    short: "Universidade Estadual Paulista",
    description: "Vestibular próprio aplicado pela VUNESP.",
    highlight: "Comentários em vídeo",
    href: "/provas?exam=UNESP",
    gradient: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 60%, #FED7AA 100%)",
    accent: "#C2410C",
    iconBg: "linear-gradient(135deg, #F97316, #FDBA74)",
    iconColor: "#FFFFFF",
    bullets: ["Conhecimentos gerais", "Língua estrangeira", "Redação"],
    logoSrc: "/loop/unesp-removebg-preview.png",
    logoAlt: "UNESP",
  },
  {
    name: "UNICAMP",
    short: "Universidade Estadual de Campinas",
    description: "Uma das provas mais concorridas do país.",
    highlight: "Análise por competência",
    href: "/provas?exam=UNICAMP",
    gradient: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 60%, #DDD6FE 100%)",
    accent: "#6D28D9",
    iconBg: "linear-gradient(135deg, #A78BFA, #C4B5FD)",
    iconColor: "#FFFFFF",
    bullets: ["1ª fase multidisciplinar", "2ª fase específica", "Redação dissertativa"],
    logoSrc: "/loop/UNICAMP_logo.svg.png",
    logoAlt: "UNICAMP",
  },
];

export function VestibularesSection() {
  const featured = VESTIBULARES[0];
  const rest = VESTIBULARES.slice(1);

  return (
    <section
      id="vestibulares"
      className="relative isolate overflow-hidden bg-white py-24 sm:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50rem 30rem at 90% 0%, rgba(40,215,255,0.10), transparent 70%), radial-gradient(50rem 30rem at 10% 100%, rgba(20,92,255,0.08), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 sm:mb-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.25em] text-blue-700">
                <Sparkles className="h-3 w-3" /> Vestibulares
              </p>
              <h2 className="font-display text-4xl font-extrabold leading-[1.05] text-[#0F172A] sm:text-5xl lg:text-6xl">
                Cada prova com a{" "}
                <span className="relative inline-block">
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(120deg, #145CFF 0%, #28D7FF 50%, #3DBB6A 100%)",
                    }}
                  >
                    sua cara
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 200 12"
                    className="absolute -bottom-2 left-0 h-3 w-full text-[#28D7FF]"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 9 C 40 2, 80 2, 120 7 S 180 11, 198 5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>
              </h2>
              <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600">
                Conteúdo específico por vestibular, simulados no formato real
                e estatísticas que ajudam a entender onde você mais evolui.
              </p>
            </div>
            <Link
              href="/provas"
              className="group inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-[#0F172A] shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:self-auto"
            >
              Ver todos
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-2 lg:row-span-2"
          >
            <GlareHover
              width="100%"
              height="100%"
              background={featured.gradient}
              borderRadius="32px"
              borderColor="rgba(255,255,255,0.15)"
              glareColor="#FFFFFF"
              glareOpacity={0.18}
              glareAngle={-30}
              glareSize={420}
              transitionDuration={800}
              className="!flex !items-stretch"
            >
              <div className="flex h-full w-full flex-col gap-6 p-7 text-white sm:p-9">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/95 p-2.5 shadow-lg backdrop-blur"
                      style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featured.logoSrc}
                        alt={featured.logoAlt}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-white/70">
                        {featured.short}
                      </p>
                      <h3 className="font-display mt-1 text-4xl font-black leading-none sm:text-5xl">
                        {featured.name}
                      </h3>
                    </div>
                  </div>
                  <span className="hidden rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur sm:inline-flex">
                    <Sparkles className="mr-1 inline h-3 w-3" /> Mais procurado
                  </span>
                </div>

                <p className="max-w-xl text-base font-medium leading-relaxed text-white/85">
                  {featured.description}
                </p>

                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {featured.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-[12px] font-semibold text-white backdrop-blur"
                    >
                      <span
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md"
                        style={{ background: featured.iconBg, color: featured.iconColor }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-white/80">
                    <BookOpen className="h-4 w-4" /> {featured.highlight}
                  </div>
                  <Link
                    href={featured.href}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#0B1E5B] shadow-md transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Começar agora <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </GlareHover>
          </motion.div>

          {rest.map((vest, index) => {
            const isTall = index === 0;
            return (
              <motion.div
                key={vest.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + index * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={isTall ? "lg:row-span-2" : ""}
              >
                <GlareHover
                  width="100%"
                  height="100%"
                  background={vest.gradient}
                  borderRadius="28px"
                  borderColor="rgba(255,255,255,0.9)"
                  glareColor={vest.accent}
                  glareOpacity={0.18}
                  glareAngle={-30}
                  glareSize={320}
                  transitionDuration={700}
                  className="!flex !items-stretch"
                >
                  <div className="flex h-full w-full flex-col gap-3 p-5 text-[#0F172A] sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white p-1.5 shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={vest.logoSrc}
                            alt={vest.logoAlt}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div>
                          <p
                            className="text-[9px] font-extrabold uppercase tracking-[0.25em]"
                            style={{ color: vest.accent }}
                          >
                            {vest.short}
                          </p>
                          <h3 className="font-display mt-0.5 text-2xl font-black leading-none">
                            {vest.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm font-medium leading-relaxed text-slate-700">
                      {vest.description}
                    </p>

                    <ul className="mt-1 flex flex-col gap-1.5 text-[12px] font-semibold text-slate-700">
                      {vest.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2">
                          <span
                            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md"
                            style={{ background: vest.iconBg, color: vest.iconColor }}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider"
                        style={{ color: vest.accent }}
                      >
                        <GraduationCap className="h-3 w-3" /> {vest.highlight}
                      </span>
                      <Link
                        href={vest.href}
                        className="group inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0F172A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Estudar <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </GlareHover>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
