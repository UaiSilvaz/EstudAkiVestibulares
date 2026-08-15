"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { StudyIcon, type StudyIconName } from "@/components/visual/study-icon";

type SubjectTheme =
  | "humanas"
  | "biologia"
  | "redacao"
  | "quimica"
  | "matematica"
  | "linguagens"
  | "fisica";

type SubjectCard = {
  id: SubjectTheme;
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  longDescription: string;
  questions: string;
  focus: string;
  href: string;
  icon: StudyIconName;
  accent: string;
  rgb: string;
};

const SUBJECTS: SubjectCard[] = [
  {
    id: "humanas",
    index: "01",
    eyebrow: "Área do conhecimento",
    title: "Ciências Humanas",
    description: "História, Geografia, Filosofia e Sociologia",
    longDescription:
      "Treine leitura de mapas, atualidades, Brasil, mundo contemporâneo, filosofia e sociologia com questões separadas por tema.",
    questions: "+2.800 questões",
    focus: "Interpretação e contexto",
    href: "/login?redirect=/questions?subject=humanas",
    icon: "ciencias-humanas",
    accent: "#F6B500",
    rgb: "246,181,0",
  },
  {
    id: "biologia",
    index: "02",
    eyebrow: "Ciências da Natureza",
    title: "Biologia",
    description: "Vida, ecologia, genética e evolução",
    longDescription:
      "Domine ecologia, citologia, fisiologia, genética e evolução com revisão visual e banco de questões por dificuldade.",
    questions: "+1.700 questões",
    focus: "Natureza aplicada",
    href: "/login?redirect=/questions?subject=biologia",
    icon: "biologia",
    accent: "#72BF32",
    rgb: "114,191,50",
  },
  {
    id: "redacao",
    index: "03",
    eyebrow: "Produção textual",
    title: "Redação",
    description: "Estrutura, repertório e argumentação",
    longDescription:
      "Organize tese, repertório, proposta de intervenção e evolução por competência para escrever com mais segurança.",
    questions: "Correção por competência",
    focus: "Nota alta no texto",
    href: "/login?redirect=/redacao",
    icon: "redacao",
    accent: "#FF7A17",
    rgb: "255,122,23",
  },
  {
    id: "quimica",
    index: "04",
    eyebrow: "Ciências da Natureza",
    title: "Química",
    description: "Matéria, reações, orgânica e energia",
    longDescription:
      "Pratique química geral, orgânica, físico-química e temas ambientais com questões completas e filtros acumulativos.",
    questions: "+1.600 questões",
    focus: "Reações e cálculo",
    href: "/login?redirect=/questions?subject=quimica",
    icon: "quimica",
    accent: "#8B43EE",
    rgb: "139,67,238",
  },
  {
    id: "matematica",
    index: "05",
    eyebrow: "Raciocínio lógico",
    title: "Matemática",
    description: "Números, funções, geometria e estatística",
    longDescription:
      "Resolva questões de álgebra, funções, porcentagem, geometria, probabilidade e estatística no ritmo de prova.",
    questions: "+2.400 questões",
    focus: "Cálculo sem travar",
    href: "/login?redirect=/questions?subject=matematica",
    icon: "matematica",
    accent: "#3D8DF5",
    rgb: "61,141,245",
  },
  {
    id: "linguagens",
    index: "06",
    eyebrow: "Comunicação",
    title: "Linguagens",
    description: "Português, literatura, artes e idiomas",
    longDescription:
      "Treine interpretação, gêneros textuais, literatura, artes, inglês e espanhol com leitura responsiva no celular.",
    questions: "+2.800 questões",
    focus: "Leitura rápida",
    href: "/login?redirect=/questions?subject=linguagens",
    icon: "linguagens",
    accent: "#1686AA",
    rgb: "22,134,170",
  },
  {
    id: "fisica",
    index: "07",
    eyebrow: "Ciências da Natureza",
    title: "Física",
    description: "Movimento, energia, ondas e eletricidade",
    longDescription:
      "Revise mecânica, eletricidade, termologia, óptica e ondas com questões visuais bem dimensionadas.",
    questions: "+1.800 questões",
    focus: "Fenômenos e fórmulas",
    href: "/login?redirect=/questions?subject=fisica",
    icon: "fisica",
    accent: "#F43E48",
    rgb: "244,62,72",
  },
];

export function MateriasSection() {
  const [selectedId, setSelectedId] = useState<SubjectTheme>("matematica");

  const selected = useMemo(
    () => SUBJECTS.find((subject) => subject.id === selectedId) ?? SUBJECTS[0],
    [selectedId],
  );

  return (
    <section
      id="materias"
      className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#fbfcff_0%,#f4f7ff_58%,#ffffff_100%)] py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-[#7B61FF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-36 bottom-28 h-80 w-80 rounded-full bg-[#FF9A5F]/12 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-blue-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            Matérias interativas
          </p>
          <h2 className="font-display mt-5 text-[1.75rem] font-black leading-tight text-slate-950 sm:text-5xl">
            Escolha a matéria e entre direto no treino certo.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600">
            Ícones visuais, cores por área e cards rápidos para você começar em
            questões, simulados ou materiais sem ficar procurando.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SUBJECTS.map((subject, index) => {
            const isSelected = subject.id === selected.id;
            return (
              <motion.button
                key={subject.id}
                type="button"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.035 }}
                onClick={() => setSelectedId(subject.id)}
                className="group relative min-h-[25rem] overflow-hidden rounded-[28px] border bg-white/85 p-5 text-left shadow-[0_18px_46px_-30px_rgba(15,23,42,0.28)] outline-none transition duration-300 hover:-translate-y-2 focus-visible:ring-4 active:scale-[0.98]"
                style={{
                  borderColor: isSelected ? `rgba(${subject.rgb},0.46)` : "rgba(34,42,72,0.08)",
                  boxShadow: isSelected
                    ? `0 28px 70px -35px rgba(${subject.rgb},0.78), 0 0 0 4px rgba(${subject.rgb},0.09)`
                    : undefined,
                }}
                aria-pressed={isSelected}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(145deg, rgba(${subject.rgb},0.12), transparent 48%, rgba(${subject.rgb},0.06))`,
                  }}
                />

                <div className="relative z-10 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <span>{subject.eyebrow}</span>
                  <span
                    className="grid h-9 w-9 place-items-center rounded-xl transition group-hover:rotate-6 group-hover:scale-105"
                    style={{ backgroundColor: `rgba(${subject.rgb},0.10)`, color: subject.accent }}
                  >
                    {subject.index}
                  </span>
                </div>

                <div className="relative z-10 my-2 grid min-h-56 place-items-center">
                  <div
                    className="absolute h-48 w-48 rounded-full blur-sm transition-transform duration-500 group-hover:scale-110"
                    style={{
                      background: `radial-gradient(circle, rgba(${subject.rgb},0.17), rgba(${subject.rgb},0.03) 60%, transparent 72%)`,
                    }}
                  />
                  <div
                    className="absolute h-48 w-48 rounded-full border opacity-0 transition duration-500 group-hover:rotate-12 group-hover:opacity-100"
                    style={{ borderColor: `rgba(${subject.rgb},0.18)` }}
                  />
                  <StudyIcon
                    name={subject.icon}
                    variant="plain"
                    size="xl"
                    className="relative z-10 h-56 w-56 drop-shadow-[0_22px_22px_rgba(15,23,42,0.12)] transition duration-500 group-hover:-translate-y-2 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="relative z-10">
                  <h3 className="font-display text-2xl font-black leading-tight text-slate-950">
                    {subject.title}
                  </h3>
                  <p className="mt-2 min-h-10 text-sm font-semibold leading-6 text-slate-500">
                    {subject.description}
                  </p>
                </div>

                <div className="relative z-10 mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  <span>{isSelected ? "Selecionada" : "Explorar matéria"}</span>
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full transition group-hover:rotate-45 group-hover:text-white"
                    style={{
                      backgroundColor: isSelected ? subject.accent : `rgba(${subject.rgb},0.10)`,
                      color: isSelected ? "#FFFFFF" : subject.accent,
                    }}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.28 }}
            className="relative mt-6 overflow-hidden rounded-[30px] border bg-white/86 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.32)] md:grid md:grid-cols-[17rem_1fr_auto] md:items-center md:gap-6 md:p-7"
            style={{
              borderColor: `rgba(${selected.rgb},0.18)`,
              backgroundImage: `radial-gradient(30rem 22rem at 0% 50%, rgba(${selected.rgb},0.14), transparent 68%)`,
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedId("matematica")}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-400 transition hover:rotate-90 hover:text-slate-700"
              aria-label="Voltar para Matemática"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative grid min-h-48 place-items-center">
              <div
                className="absolute h-40 w-40 rounded-full border"
                style={{
                  borderColor: `rgba(${selected.rgb},0.18)`,
                  boxShadow: `0 0 0 28px rgba(${selected.rgb},0.05), 0 0 0 54px rgba(${selected.rgb},0.025)`,
                }}
              />
              <StudyIcon
                name={selected.icon}
                variant="plain"
                size="xl"
                className="relative z-10 h-52 w-52 drop-shadow-[0_22px_24px_rgba(15,23,42,0.14)]"
              />
            </div>

            <div className="relative z-10 mt-4 md:mt-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: selected.accent }}>
                {selected.eyebrow}
              </p>
              <h3 className="font-display mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                {selected.title}
              </h3>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                {selected.longDescription}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[selected.questions, selected.focus, "Filtros por tema"].map((item) => (
                  <span
                    key={item}
                    className="rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-wider"
                    style={{
                      borderColor: `rgba(${selected.rgb},0.18)`,
                      backgroundColor: `rgba(${selected.rgb},0.08)`,
                      color: selected.accent,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-6 flex flex-col gap-3 md:mt-0 md:min-w-52">
              <Link
                href={selected.href}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ backgroundColor: selected.accent, boxShadow: `0 16px 28px rgba(${selected.rgb},0.24)` }}
              >
                Praticar agora <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login?redirect=/materials"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Ver materiais
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
