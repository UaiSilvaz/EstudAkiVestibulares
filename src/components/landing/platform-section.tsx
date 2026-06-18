"use client";

import { motion } from "framer-motion";
import {
  BookOpenCheck,
  GraduationCap,
  Library,
  type LucideIcon,
  PenLine,
  Target,
  Timer,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { EKButton } from "../visual/ek-button";
import { FadeUp, SectionTitle } from "../visual/motion-primitives";

type Item = {
  icon: LucideIcon;
  title: string;
  text: string;
  color: string;
  color2: string;
};

const items: Item[] = [
  { icon: Target, title: "Lista inteligente", text: "Questões recomendadas para o seu momento.", color: "#1E73FF", color2: "#005CFF" },
  { icon: Timer, title: "Cronograma automático", text: "Plano gerado a partir do seu ritmo.", color: "#FF6B00", color2: "#FFC400" },
  { icon: BookOpenCheck, title: "Revisão dos erros", text: "Tudo que você errou separado para revisar.", color: "#7C3AED", color2: "#A855F7" },
  { icon: Trophy, title: "Liga de estudo", text: "XP, conquistas, ranking e evolução.", color: "#FFC400", color2: "#FF6B00" },
  { icon: Library, title: "Cadernos digitais", text: "Apostilas e cadernos com compra direta.", color: "#3DBB6A", color2: "#00C896" },
  { icon: PenLine, title: "Redação com IA", text: "Treine, receba feedback e evolua.", color: "#FF4D00", color2: "#FF6B00" },
  { icon: Video, title: "Express", text: "Vídeos curtos para revisar em minutos.", color: "#EC4899", color2: "#A855F7" },
  { icon: Users, title: "Comunidade", text: "Ranking, feed e desafios com outros alunos.", color: "#38BDF8", color2: "#005CFF" },
];

export function PlatformSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#F7FAFF] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          align="center"
          eyebrow="Por dentro do EstudAki"
          title={
            <>
              Uma plataforma{" "}
              <span className="ek-text-gradient-mix">viva, completa e colorida</span>.
            </>
          }
          description="Tudo o que você precisa, num só lugar, com a cara de produto premium."
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <FadeUp key={item.title} delay={index * 0.05}>
                <motion.div
                  whileHover={{ y: -7, scale: 1.015 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className="group relative min-h-[188px] overflow-hidden rounded-[26px] p-6 text-white shadow-[0_24px_46px_-28px_rgba(15,23,42,0.38)] transition-shadow hover:shadow-[0_34px_70px_-30px_rgba(30,115,255,0.44)]"
                  style={{
                    background: `linear-gradient(135deg, ${item.color} 0%, ${item.color2} 100%)`,
                  }}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-px rounded-[26px] bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.28),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_44%)]"
                  />
                  <div
                    aria-hidden
                    className="absolute -right-16 -top-14 h-44 w-44 rounded-full bg-white/20 blur-3xl transition-opacity duration-300 group-hover:opacity-90"
                  />
                  <div className="pointer-events-none absolute -right-9 bottom-2 flex h-32 w-32 rotate-[-10deg] items-center justify-center rounded-[30px] bg-white/16 text-white/34 opacity-80 transition duration-300 group-hover:scale-105">
                    <Icon className="h-20 w-20" strokeWidth={2.15} />
                  </div>
                  <div
                    className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/22 text-white shadow-lg ring-1 ring-white/35 backdrop-blur"
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.2} />
                  </div>
                  <h3 className="relative z-10 font-display text-xl font-black text-white">
                    {item.title}
                  </h3>
                  <div className="relative z-10 mt-2 h-0.5 w-6 rounded-full bg-white/35" />
                  <p className="relative z-10 mt-3 max-w-[78%] text-sm font-bold leading-6 text-white/88">
                    {item.text}
                  </p>
                </motion.div>
              </FadeUp>
            );
          })}
        </div>

        <FadeUp delay={0.3} className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <EKButton href="/login" variant="primary" size="lg">
            Começar agora
          </EKButton>
          <EKButton href="/questions" variant="glass" size="lg" icon={GraduationCap}>
            Explorar plataforma
          </EKButton>
        </FadeUp>
      </div>
    </section>
  );
}
