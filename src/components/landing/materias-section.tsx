"use client";

import { motion } from "framer-motion";
import {
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  Globe2,
  BookText,
  Languages,
  Pen,
  History,
  Palette,
  Music4,
  Code2,
  Brain,
  Sigma,
} from "lucide-react";
import { FloatingBlob } from "../visual/motion-primitives";

type Materia = {
  nome: string;
  icon: typeof Calculator;
  cor: string;
  cor2: string;
  questoes: number;
  acerto: number;
  status: "dominada" | "evolucao" | "atencao";
  descricao: string;
};

const MATERIAS: Materia[] = [
  {
    nome: "Matemática",
    icon: Calculator,
    cor: "#2563EB",
    cor2: "#22D3EE",
    questoes: 2480,
    acerto: 78,
    status: "evolucao",
    descricao: "Álgebra, geometria e análise combinatória",
  },
  {
    nome: "Física",
    icon: Atom,
    cor: "#22C55E",
    cor2: "#22D3EE",
    questoes: 1820,
    acerto: 64,
    status: "evolucao",
    descricao: "Mecânica, termodinâmica e eletricidade",
  },
  {
    nome: "Química",
    icon: FlaskConical,
    cor: "#A78BFA",
    cor2: "#22D3EE",
    questoes: 1640,
    acerto: 71,
    status: "evolucao",
    descricao: "Orgânica, físico-química e inorgânica",
  },
  {
    nome: "Biologia",
    icon: Leaf,
    cor: "#22C55E",
    cor2: "#2563EB",
    questoes: 1740,
    acerto: 82,
    status: "dominada",
    descricao: "Citologia, ecologia e genética",
  },
  {
    nome: "Geografia",
    icon: Globe2,
    cor: "#F97316",
    cor2: "#FACC15",
    questoes: 1320,
    acerto: 55,
    status: "atencao",
    descricao: "Geopolítica, clima e urbanização",
  },
  {
    nome: "Língua Portuguesa",
    icon: BookText,
    cor: "#2563EB",
    cor2: "#22C55E",
    questoes: 2860,
    acerto: 89,
    status: "dominada",
    descricao: "Gramática, interpretação e literatura",
  },
  {
    nome: "Inglês",
    icon: Languages,
    cor: "#22D3EE",
    cor2: "#2563EB",
    questoes: 720,
    acerto: 76,
    status: "evolucao",
    descricao: "Interpretação de texto e vocabulário",
  },
  {
    nome: "Espanhol",
    icon: Languages,
    cor: "#F97316",
    cor2: "#FDBA74",
    questoes: 420,
    acerto: 68,
    status: "evolucao",
    descricao: "Leitura e gramática básica",
  },
  {
    nome: "Redação",
    icon: Pen,
    cor: "#F97316",
    cor2: "#22D3EE",
    questoes: 320,
    acerto: 80,
    status: "dominada",
    descricao: "Dissertativo-argumentativo e competências",
  },
  {
    nome: "História",
    icon: History,
    cor: "#A78BFA",
    cor2: "#2563EB",
    questoes: 1980,
    acerto: 61,
    status: "evolucao",
    descricao: "Brasil colonial, império e república",
  },
  {
    nome: "Filosofia",
    icon: Brain,
    cor: "#A78BFA",
    cor2: "#F97316",
    questoes: 580,
    acerto: 70,
    status: "evolucao",
    descricao: "Filosofia antiga, moderna e contemporânea",
  },
  {
    nome: "Sociologia",
    icon: Brain,
    cor: "#22C55E",
    cor2: "#2563EB",
    questoes: 480,
    acerto: 73,
    status: "evolucao",
    descricao: "Cultura, política e movimentos sociais",
  },
  {
    nome: "Artes",
    icon: Palette,
    cor: "#FB7185",
    cor2: "#A78BFA",
    questoes: 320,
    acerto: 84,
    status: "dominada",
    descricao: "História da arte e linguagens visuais",
  },
  {
    nome: "Música",
    icon: Music4,
    cor: "#A78BFA",
    cor2: "#22D3EE",
    questoes: 140,
    acerto: 90,
    status: "dominada",
    descricao: "Teoria musical e história da música",
  },
  {
    nome: "Programação",
    icon: Code2,
    cor: "#22D3EE",
    cor2: "#A78BFA",
    questoes: 240,
    acerto: 58,
    status: "atencao",
    descricao: "Lógica, algoritmos e estrutura de dados",
  },
];

const STATUS_MAP: Record<
  Materia["status"],
  { label: string; bg: string; text: string; border: string }
> = {
  dominada: {
    label: "Dominada",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  evolucao: {
    label: "Em evolução",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
  },
  atencao: {
    label: "Precisa atenção",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
};

export function MateriasSection() {
  return (
    <section
      id="materias"
      className="relative isolate overflow-hidden py-24 sm:py-32"
      style={{
        background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
      }}
    >
      <FloatingBlob
        color="rgba(96, 165, 250, 0.20)"
        className="left-[-6%] top-[-5%] h-[28rem] w-[28rem]"
      />
      <FloatingBlob
        color="rgba(134, 239, 172, 0.16)"
        className="right-[-6%] top-[20%] h-[22rem] w-[22rem]"
      />
      <FloatingBlob
        color="rgba(250, 204, 21, 0.14)"
        className="bottom-[-10%] left-[20%] h-[26rem] w-[26rem]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.3em] text-blue-700">
            Matérias
          </p>
          <h2 className="font-display text-4xl font-extrabold leading-tight text-[#0F172A] sm:text-5xl">
            Cada matéria com sua{" "}
            <span className="ek-text-gradient">cor e energia</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-slate-600">
            Acompanhe seu progresso por disciplina, identifique pontos fracos e
            receba recomendações personalizadas de revisão.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MATERIAS.map((m, index) => {
            const Icon = m.icon;
            const status = STATUS_MAP[m.status];
            return (
              <motion.div
                key={m.nome}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_12px_32px_-18px_rgba(15,23,42,0.10)]"
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${m.cor}, ${m.cor2})`,
                  }}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md ring-1 ring-white/40"
                    style={{
                      background: `linear-gradient(135deg, ${m.cor}, ${m.cor2})`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.text} ${status.border}`}
                  >
                    {status.label}
                  </span>
                </div>

                <h3 className="font-display mt-4 text-lg font-extrabold text-[#0F172A]">
                  {m.nome}
                </h3>
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-slate-500">
                  {m.descricao}
                </p>

                <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1">
                    <Sigma className="h-3 w-3" />
                    {m.questoes.toLocaleString("pt-BR")} questões
                  </span>
                  <span className="font-black text-[#0F172A]">{m.acerto}% acerto</span>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${m.acerto}%` }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${m.cor}, ${m.cor2})`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
