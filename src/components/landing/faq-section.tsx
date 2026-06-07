"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CircleHelp } from "lucide-react";
import { useState } from "react";

const FAQ = [
  {
    pergunta: "Como funciona o acesso aos cadernos e simulados?",
    resposta:
      "Você entra na plataforma, escolhe o vestibular e a matéria, e tem acesso imediato a simulados cronometrados, cadernos digitais, mapas mentais e estatísticas de desempenho por tópico.",
  },
  {
    pergunta: "Posso usar o EstudAki no celular?",
    resposta:
      "Sim. A plataforma é responsiva e funciona em qualquer dispositivo — celular, tablet e desktop — com a mesma experiência.",
  },
  {
    pergunta: "Os simulados seguem o formato oficial?",
    resposta:
      "Sim. Cada simulado é montado com o mesmo número de questões, tempo e áreas dos vestibulares oficiais (ENEM, FUVEST, UNICAMP, ETEC, FATEC, UERJ, Provão Paulista).",
  },
  {
    pergunta: "Posso cancelar a qualquer momento?",
    resposta:
      "Pode. Não temos fidelidade. Você cancela quando quiser direto no painel, sem burocracia.",
  },
  {
    pergunta: "Quantas questões estão disponíveis?",
    resposta:
      "São mais de 18 mil questões comentadas, organizadas por vestibular, matéria, tema e nível de dificuldade. O banco é atualizado semanalmente.",
  },
  {
    pergunta: "Tem plano gratuito?",
    resposta:
      "Tem. No plano gratuito você tem acesso a 200 questões por matéria, 1 simulado diagnóstico por mês e estatísticas básicas — o suficiente para começar a estudar hoje.",
  },
  {
    pergunta: "Como funciona o sistema de evolução?",
    resposta:
      "A plataforma mostra seu desempenho por matéria e por tópico, identifica pontos fracos e recomenda automaticamente quais questões revisar para melhorar o aproveitamento.",
  },
  {
    pergunta: "Vocês ajudam com redação?",
    resposta:
      "Sim. Temos caderno específico de redação com estrutura, competências, exemplos comentados e simulados cronometrados para você treinar antes da prova.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section
      id="faq"
      className="relative isolate overflow-hidden bg-white py-24 sm:py-32"
    >
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#145CFF]">
            Dúvidas frequentes
          </p>
          <h2 className="font-display text-4xl font-extrabold leading-tight text-[#0F172A] sm:text-5xl">
            Perguntas{" "}
            <span className="ek-text-gradient-soft">frequentes</span>
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQ.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={item.pergunta}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-[0_18px_40px_-22px_rgba(6,36,92,0.18)] backdrop-blur-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-[#F4F8FF]"
                  aria-expanded={isOpen}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#145CFF] to-[#28D7FF] text-white">
                    <CircleHelp className="h-4 w-4" />
                  </div>
                  <span className="flex-1 font-display text-base font-extrabold text-[#0F172A]">
                    {item.pergunta}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#145CFF]/10 text-[#145CFF]"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 pl-[4.5rem] text-sm font-medium leading-relaxed text-slate-600">
                        {item.resposta}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
