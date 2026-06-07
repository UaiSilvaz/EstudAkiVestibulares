"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  ArrowRight,
  FileText,
  Sparkles,
  ShoppingCart,
  Layers,
  Brain,
  FileQuestion,
  Lock,
} from "lucide-react";
import Link from "next/link";

type MaterialType = "PDF" | "Simulado" | "Caderno" | "Resumo Visual";
type Vestibular = "ENEM" | "ETEC" | "ENEM & ETEC";

type Material = {
  id: string;
  title: string;
  type: MaterialType;
  vestibular: Vestibular;
  description: string;
  cover: string;
  questions?: number;
  pages?: number;
  highlight?: string;
  featured?: boolean;
};

const COVER_ENEM_EXATAS =
  "/cadernos/CADERNO%201000%20QUESTOES%20ENEM%20ESTUDAKI%20EXATAS.jpg";
const COVER_ENEM_LING =
  "/cadernos/CADERNO%201000%20QUESTOES%20ENEM%20ESTUDAKI%20LINGUAGENS%20HUMANAS.jpg";
const COVER_ETEC =
  "/cadernos/F%C3%93RMULA%20DA%20APROVA%C3%87%C3%83O%20-%20VESTIBULINHO%20ETEC%202026%20%23ESTUDAKI.jpg";
const COVER_PACK_ETEC = "/cadernos/SUPER%20PACK%20250%20QUEST%C3%95ES%20ETEC%20.png";

const MATERIALS: Material[] = [
  {
    id: "enem-exatas-1000",
    title: "Caderno 1000 Questões — ENEM Exatas",
    type: "Caderno",
    vestibular: "ENEM",
    description:
      "1.000 questões comentadas de Matemática, Física, Química e Biologia, separadas por habilidade e nível de dificuldade.",
    cover: COVER_ENEM_EXATAS,
    questions: 1000,
    pages: 180,
    highlight: "Mais procurado",
    featured: true,
  },
  {
    id: "enem-linguagens-1000",
    title: "Caderno 1000 Questões — Linguagens e Humanas",
    type: "Caderno",
    vestibular: "ENEM",
    description:
      "Português, Inglês, Espanhol, Artes, História, Geografia, Filosofia e Sociologia em um único caderno.",
    cover: COVER_ENEM_LING,
    questions: 1000,
    pages: 180,
  },
  {
    id: "etec-formula-2026",
    title: "Fórmula da Aprovação — Vestibulinho ETEC 2026",
    type: "Resumo Visual",
    vestibular: "ETEC",
    description:
      "Resumos visuais, mapas mentais e fórmulas-chave para a prova do Vestibulinho ETEC 2026.",
    cover: COVER_ETEC,
    pages: 96,
  },
  {
    id: "pack-250-etec",
    title: "Super Pack 250 Questões — ETEC",
    type: "Simulado",
    vestibular: "ETEC",
    description:
      "250 questões estilo ETEC com gabarito comentado e simulados cronometrados para treinar em qualquer lugar.",
    cover: COVER_PACK_ETEC,
    questions: 250,
    pages: 64,
  },
  {
    id: "enem-redacao",
    title: "Caderno de Redação ENEM",
    type: "PDF",
    vestibular: "ENEM",
    description:
      "Estrutura da redação, as 5 competências avaliadas, modelos nota 1000 e banco de repertório sociocultural.",
    cover: COVER_ENEM_LING,
    pages: 72,
  },
  {
    id: "etec-mapas-mentais",
    title: "Mapas Mentais — Raciocínio Lógico ETEC",
    type: "Resumo Visual",
    vestibular: "ETEC",
    description:
      "Mapas mentais coloridos com os temas que mais caem em Raciocínio Lógico no Vestibulinho ETEC.",
    cover: COVER_ETEC,
    pages: 48,
  },
];

function typeIcon(type: MaterialType) {
  switch (type) {
    case "PDF":
      return <FileText className="h-3 w-3" />;
    case "Simulado":
      return <FileQuestion className="h-3 w-3" />;
    case "Caderno":
      return <BookOpen className="h-3 w-3" />;
    case "Resumo Visual":
      return <Brain className="h-3 w-3" />;
  }
}

function vestibularAccent(v: Vestibular): { bg: string; text: string; border: string } {
  if (v === "ENEM") {
    return {
      bg: "linear-gradient(135deg, rgba(20,92,255,0.12), rgba(40,215,255,0.18))",
      text: "#145CFF",
      border: "rgba(20,92,255,0.25)",
    };
  }
  if (v === "ETEC") {
    return {
      bg: "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(132,204,22,0.18))",
      text: "#15803D",
      border: "rgba(34,197,94,0.28)",
    };
  }
  return {
    bg: "linear-gradient(135deg, rgba(168,85,247,0.14), rgba(236,72,153,0.18))",
    text: "#7C3AED",
    border: "rgba(168,85,247,0.28)",
  };
}

export function MaterialsSection() {
  return (
    <section
      id="cadernos"
      className="relative isolate overflow-hidden bg-[#F8FAFC] py-24 sm:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 36rem at 50% 0%, rgba(40,215,255,0.10), transparent 70%), radial-gradient(40rem 26rem at 100% 100%, rgba(20,92,255,0.08), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 sm:mb-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.25em] text-blue-700">
                <Sparkles className="h-3 w-3" /> Biblioteca digital
              </p>
              <h2 className="font-display text-4xl font-extrabold leading-tight text-[#0F172A] sm:text-5xl">
                Material{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(120deg, #145CFF 0%, #28D7FF 50%, #3DBB6A 100%)",
                  }}
                >
                  pronto pra revisar
                </span>
              </h2>
              <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-slate-600">
                Cadernos digitais, mapas mentais e simulados cronometrados para
                acelerar sua preparação para qualquer vestibular. Visualize a
                capa por inteiro e adquira em um clique.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <Link
                href="/materials"
                className="group inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-[#0F172A] shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:self-auto"
              >
                <Layers className="h-4 w-4" /> Ver biblioteca completa
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Lock className="h-3 w-3" /> Faça login para adquirir
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MATERIALS.map((material, index) => {
            const v = vestibularAccent(material.vestibular);
            return (
              <motion.article
                key={material.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:border-blue-200 hover:shadow-[0_24px_60px_-20px_rgba(20,92,255,0.35)]"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(20,92,255,0.04), rgba(40,215,255,0.06))",
                  }}
                />

                <div className="relative isolate aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-60"
                    style={{
                      background:
                        "radial-gradient(70% 60% at 50% 30%, rgba(40,215,255,0.10), transparent 70%)",
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={material.cover}
                    alt={material.title}
                    className="relative h-full w-full object-contain p-5 drop-shadow-[0_18px_28px_rgba(15,23,42,0.18)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                    loading="lazy"
                    draggable={false}
                  />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {material.highlight ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                        <Sparkles className="h-2.5 w-2.5" /> {material.highlight}
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute right-3 top-3">
                    <span
                      className="inline-flex items-center gap-1 rounded-full border bg-white/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur"
                      style={{ color: v.text, borderColor: v.border, background: v.bg }}
                    >
                      {material.vestibular}
                    </span>
                  </div>
                </div>

                <div className="relative flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600"
                    >
                      {typeIcon(material.type)} {material.type}
                    </span>
                    {material.questions ? (
                      <span className="text-[10px] font-semibold text-slate-500">
                        • {material.questions.toLocaleString("pt-BR")} questões
                      </span>
                    ) : null}
                    {material.pages ? (
                      <span className="text-[10px] font-semibold text-slate-500">
                        • {material.pages} páginas
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-display text-lg font-extrabold leading-snug text-[#0F172A]">
                    {material.title}
                  </h3>
                  <p className="text-[13px] font-medium leading-relaxed text-slate-600">
                    {material.description}
                  </p>

                  <div className="mt-auto pt-3">
                    <Link
                      href="/login?redirect=/materials"
                      className="group/btn relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-5 py-3 text-[12px] font-extrabold uppercase tracking-wider text-white shadow-md transition-all duration-500 hover:shadow-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, #145CFF 0%, #28D7FF 100%)",
                      }}
                    >
                      <span
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/btn:opacity-100"
                        style={{
                          background:
                            "linear-gradient(135deg, #0B3FCC 0%, #145CFF 50%, #28D7FF 100%)",
                        }}
                      />
                      <ShoppingCart className="relative h-4 w-4" />
                      <span className="relative">Adquirir material</span>
                      <ArrowRight className="relative h-3.5 w-3.5 transition-transform duration-500 group-hover/btn:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-14 flex flex-col items-center justify-center gap-3"
        >
          <Link
            href="/materials"
            className="ek-button ek-button-primary"
            style={{ borderRadius: 999 }}
          >
            <BookOpen className="h-4 w-4" /> Explorar toda a biblioteca
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-xs font-medium text-slate-500">
            + de 50 cadernos, simulados e resumos visuais disponíveis para você
          </p>
        </motion.div>
      </div>
    </section>
  );
}
