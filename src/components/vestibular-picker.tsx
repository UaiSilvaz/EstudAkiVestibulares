"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpenCheck, ClipboardList, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import { FastLink } from "@/components/fast-link";
import { loopImageForVestibular } from "@/lib/assets";
import { cn } from "@/lib/utils";

type VestibularCard = {
  id: string;
  slug: string;
  name: string;
  color: string;
  description: string;
  questionCount: number;
  subjectCount: number;
};

const descriptions: Record<string, string> = {
  enem: "A prova mais importante do país, com peso em centenas de universidades. Treine por área, matéria e competência.",
  etec: "Entrada para escolas técnicas e Fatec do Centro Paula Souza. Multidisciplinar e atualizada.",
  fatec: "Bacharelado tecnológico gratuito e de alta empregabilidade. Prepare-se com simulados direcionados.",
  fuvest: "A porta de entrada para a USP, uma das melhores universidades do mundo. Conteúdo direto e aprofundado.",
  unesp: "Vagas em todo o estado de São Paulo, com excelente reputação e provas específicas.",
  unicamp: "Uma das mais concorridas do Brasil, com questões interdisciplinares e raciocínio crítico.",
  "provao-paulista": "Avaliação seriada para estudantes da rede pública paulista, alinhada ao currículo e ao ingresso nas universidades estaduais.",
};

function lightenHex(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

export function VestibularPicker({ vestibulares }: { vestibulares: VestibularCard[] }) {
  return (
    <section className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {vestibulares.map((item, index) => {
          const description = descriptions[item.slug] ?? item.description;
          const accent = item.color || "#2563EB";
          const cardBg = `linear-gradient(135deg, ${lightenHex(accent, 0.06)} 0%, #FFFFFF 60%, ${lightenHex(accent, 0.04)} 100%)`;
          const loopImage = loopImageForVestibular(item.slug);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: index * 0.05 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18)] transition-shadow hover:shadow-[0_24px_50px_-22px_rgba(15,23,42,0.25)] md:p-6"
              style={{
                background: cardBg,
                borderTop: `4px solid ${accent}`,
              }}
            >
              <div className="relative mb-5 flex min-h-40 items-center justify-center rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] md:min-h-48">
                <div
                  aria-hidden
                  className="absolute inset-x-7 bottom-5 h-5 rounded-full blur-xl"
                  style={{ background: lightenHex(accent, 0.18) }}
                />
                <Image
                  src={loopImage}
                  alt={item.name}
                  width={360}
                  height={220}
                  className="relative z-10 h-32 w-full object-contain drop-shadow-[0_18px_28px_rgba(15,23,42,0.18)] transition duration-300 group-hover:scale-105 md:h-40"
                  unoptimized
                />
              </div>

              <div className="relative">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#0F172A]">{item.name}</h3>
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: accent }}
                    >
                      <Sparkles className="h-3 w-3" />
                      oficial
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
                </div>
              </div>

              <div className="relative mt-5 flex items-center gap-4 border-t border-slate-100/80 pt-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: `linear-gradient(135deg, ${lightenHex(accent, 0.16)} 0%, ${lightenHex(accent, 0.28)} 100%)` }}
                  >
                    <ClipboardList className="h-3.5 w-3.5" style={{ color: accent }} />
                  </span>
                  <span>
                    <span className="text-base font-bold text-[#0F172A]">{item.questionCount}</span> questões
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: `linear-gradient(135deg, ${lightenHex(accent, 0.16)} 0%, ${lightenHex(accent, 0.28)} 100%)` }}
                  >
                    <BookOpenCheck className="h-3.5 w-3.5" style={{ color: accent }} />
                  </span>
                  <span>
                    <span className="text-base font-bold text-[#0F172A]">{item.subjectCount}</span> matérias
                  </span>
                </div>
              </div>

              <FastLink
                href={`/questions?vestibular=${item.slug}`}
                pendingClassName="scale-[0.99] opacity-95"
                pendingLabel={
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Abrindo {item.name}
                  </>
                }
                className={cn(
                  "relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99]",
                  "text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.30)] hover:shadow-[0_14px_30px_-12px_rgba(15,23,42,0.40)]"
                )}
                style={{
                  background: `linear-gradient(135deg, ${accent} 0%, ${lightenHex(accent, 0.85)} 100%)`,
                }}
              >
                Praticar {item.name}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </FastLink>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
