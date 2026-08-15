"use client";

import { motion } from "framer-motion";
import {
  ClipboardList,
  Compass,
  Library,
  LineChart,
  type LucideIcon,
  ShieldCheck,
  Target,
  Timer,
} from "lucide-react";
import { EKButton } from "../visual/ek-button";
import {
  FadeUp,
  GlowIcon,
  SectionTitle,
  SpotlightCard,
} from "../visual/motion-primitives";
import { cn } from "@/lib/utils";

type Feature = {
  title: string;
  text: string;
  icon: LucideIcon;
  badge: string;
  gradient: string;
  glowClass: string;
  size?: "sm" | "md" | "lg";
};

const features: Feature[] = [
  {
    title: "Banco de questões inteligente",
    text: "Filtre por vestibular, matéria, conteúdo e dificuldade, além de revisar seus erros.",
    icon: ClipboardList,
    badge: "Questões",
    gradient: "from-[#1E73FF] via-[#005CFF] to-[#38BDF8]",
    glowClass: "ek-glow-blue",
    size: "lg",
  },
  {
    title: "Simulados com tempo real",
    text: "Cronômetro, gabarito comentado e ritmo semelhante ao da prova.",
    icon: Timer,
    badge: "Simulados",
    gradient: "from-[#FF4D00] via-[#FF6B00] to-[#FFC400]",
    glowClass: "ek-glow-orange",
    size: "md",
  },
  {
    title: "Cadernos digitais completos",
    text: "Materiais com capa, benefícios e compra direta pela Hotmart.",
    icon: Library,
    badge: "Materiais",
    gradient: "from-[#3DBB6A] via-[#00C896] to-[#7CFFB2]",
    glowClass: "ek-glow-green",
    size: "md",
  },
  {
    title: "Desempenho e estatísticas",
    text: "Acompanhe acertos, erros, evolução por matéria e os conteúdos que precisam de reforço.",
    icon: LineChart,
    badge: "Desempenho",
    gradient: "from-[#7C3AED] via-[#A855F7] to-[#EC4899]",
    glowClass: "ek-glow-violet",
    size: "md",
  },
  {
    title: "Trilha por vestibular",
    text: "Sequência inteligente de estudo para ENEM, ETEC, FATEC, FUVEST e outros vestibulares.",
    icon: Compass,
    badge: "Trilhas",
    gradient: "from-[#001B5E] via-[#1E73FF] to-[#00C896]",
    glowClass: "ek-glow-blue",
    size: "md",
  },
  {
    title: "Plano de estudos automático",
    text: "Cronograma gerado de acordo com seu ritmo, foco e meta de aprovação.",
    icon: Target,
    badge: "Cronograma",
    gradient: "from-[#FFC400] via-[#FF6B00] to-[#FF4D00]",
    glowClass: "ek-glow-yellow",
    size: "md",
  },
  {
    title: "Painel docente premium",
    text: "Área administrativa completa para cadastrar questões, materiais, provas e PDFs.",
    icon: ShieldCheck,
    badge: "Admin",
    gradient: "from-[#EC4899] via-[#F472B6] to-[#A855F7]",
    glowClass: "ek-glow-pink",
    size: "md",
  },
  {
    title: "Biblioteca privada",
    text: "Compra direta, capa visivel e PDF liberado por licenca.",
    icon: Library,
    badge: "Materiais",
    gradient: "from-[#6B2CF5] via-[#8A42FF] to-[#C4B5FD]",
    glowClass: "ek-glow-purple",
    size: "md",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="plataforma"
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#F7FAFF] to-white py-24"
    >
      <motion.div
        aria-hidden
        className="ek-glow-blue absolute -left-40 top-10 h-96 w-96"
      />
      <motion.div
        aria-hidden
        className="ek-glow-orange absolute -right-32 bottom-10 h-96 w-96"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          align="center"
          eyebrow="Por que o EstudAki"
          title={
            <>
              Tudo o que você precisa para{" "}
              <span className="ek-text-gradient-mix">estudar melhor</span>.
            </>
          }
          description="Uma plataforma completa, com navegação fluida, recursos objetivos e foco total na sua aprovação."
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const sizeClass =
              feature.size === "lg"
                ? "lg:col-span-2 lg:row-span-2"
                : feature.size === "sm"
                  ? ""
                  : "";
            return (
              <FadeUp
                key={feature.title}
                delay={index * 0.05}
                className={sizeClass}
              >
                <SpotlightCard
                  className={cn(
                    "h-full overflow-hidden",
                    feature.size === "lg" && "min-h-[300px] p-8",
                  )}
                  spotlightColor={
                    feature.glowClass === "ek-glow-blue"
                      ? "rgba(30,115,255,0.20)"
                      : feature.glowClass === "ek-glow-orange"
                        ? "rgba(255,107,0,0.20)"
                        : feature.glowClass === "ek-glow-green"
                          ? "rgba(61,187,106,0.20)"
                          : feature.glowClass === "ek-glow-violet"
                            ? "rgba(124,58,237,0.20)"
                            : feature.glowClass === "ek-glow-pink"
                              ? "rgba(236,72,153,0.20)"
                              : "rgba(255,196,0,0.20)"
                  }
                >
                  <div className="relative z-10 flex h-full flex-col">
                    <div className="mb-5 flex items-start justify-between">
                      <GlowIcon
                        bgClass={feature.gradient}
                        glowClass={feature.glowClass}
                        size={feature.size === "lg" ? "h-16 w-16" : "h-14 w-14"}
                      >
                        <Icon className="h-7 w-7" strokeWidth={2.2} />
                      </GlowIcon>
                      <span className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur">
                        {feature.badge}
                      </span>
                    </div>
                    <h3
                      className={cn(
                        "font-display font-extrabold text-[#061A40]",
                        feature.size === "lg" ? "text-3xl" : "text-xl",
                      )}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-3 font-medium leading-7 text-slate-500",
                        feature.size === "lg" && "max-w-md text-base",
                      )}
                    >
                      {feature.text}
                    </p>
                    {feature.size === "lg" && (
                      <div className="mt-auto flex flex-wrap gap-2 pt-6">
                        {["Questões", "Simulados", "Cadernos", "Estatísticas"].map(
                          (tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-blue-100 bg-blue-50/60 px-3 py-1 text-xs font-bold text-blue-700"
                            >
                              {tag}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </SpotlightCard>
              </FadeUp>
            );
          })}
        </div>

        <FadeUp delay={0.4} className="mt-12 flex justify-center">
          <EKButton href="/login" variant="primary" size="lg">
            Entrar na plataforma
          </EKButton>
        </FadeUp>
      </div>
    </section>
  );
}
