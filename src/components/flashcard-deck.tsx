"use client";

import { motion } from "framer-motion";
import { Lightbulb, RotateCcw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Card = {
  id: string;
  front: string;
  back: string;
  subject: { name: string; color: string } | null;
  topic: { name: string } | null;
};

export function FlashcardDeck({ cards }: { cards: Card[] }) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card, index) => {
        const isFlipped = flipped[card.id];
        const subjectColor = card.subject?.color ?? "#2563EB";
        return (
          <motion.button
            key={card.id}
            type="button"
            onClick={() => setFlipped((current) => ({ ...current, [card.id]: !isFlipped }))}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className="ek-flip-card h-72 w-full text-left focus:outline-none"
            data-flipped={isFlipped ? "true" : "false"}
            aria-label={`Flashcard ${card.subject?.name ?? "Geral"} - clique para virar`}
          >
            <div className="ek-flip-inner h-full w-full">
              {/* Frente */}
              <div className="ek-flip-face flex h-full w-full flex-col gap-4 rounded-[28px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-black text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${subjectColor}, #22D3EE)` }}
                  >
                    {card.subject?.name ?? "Geral"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <Lightbulb className="h-3.5 w-3.5" />
                    clique para virar
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {card.topic?.name ?? "Flashcard"}
                </p>
                <p className="line-clamp-4 text-lg font-extrabold leading-relaxed text-[#0F172A]">
                  {card.front}
                </p>
                <div className="mt-auto flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Frente</span>
                  <RotateCcw className="h-4 w-4" />
                </div>
              </div>

              {/* Verso */}
              <div
                className={cn(
                  "ek-flip-face ek-flip-back flex h-full w-full flex-col gap-3 rounded-[28px] border p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18)]",
                )}
                style={{
                  background: `linear-gradient(135deg, ${subjectColor}1A 0%, #DBEAFE 100%)`,
                  borderColor: `${subjectColor}40`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-black text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${subjectColor}, #22D3EE)` }}
                  >
                    Resposta
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <RotateCcw className="h-3.5 w-3.5" />
                    voltar
                  </span>
                </div>
                <p className="line-clamp-5 text-base font-extrabold leading-relaxed text-[#0F172A]">
                  {card.back}
                </p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
