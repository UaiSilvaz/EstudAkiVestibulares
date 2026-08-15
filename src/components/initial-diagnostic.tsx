"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Info,
  Loader2,
  RotateCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { StudyIcon, type StudyIconName } from "@/components/visual/study-icon";
import { cn } from "@/lib/utils";

type DiagnosticArea = {
  key: StudyIconName;
  label: string;
  initialScore: number | null;
  attempts: number;
};

type Props = {
  areas: DiagnosticArea[];
  pendingErrors: number;
};

const storageKey = "estudaki:diagnostic:v1";

function readInitialScores(areas: DiagnosticArea[]) {
  const fallback = Object.fromEntries(areas.map((area) => [area.key, area.initialScore ?? 50])) as Record<string, number>;
  if (typeof window === "undefined") return fallback;

  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return fallback;

  try {
    return { ...fallback, ...(JSON.parse(saved) as Record<string, number>) };
  } catch {
    window.localStorage.removeItem(storageKey);
    return fallback;
  }
}

function scoreBand(score: number) {
  if (score < 45) {
    return {
      label: "Prioridade alta",
      detail: "entra primeiro no cronograma",
      badge: "bg-orange-100 text-orange-700",
      card: "border-orange-200 bg-orange-50/70",
      bar: "from-[#F97316] to-[#FACC15]",
    };
  }
  if (score < 70) {
    return {
      label: "Prioridade media",
      detail: "recebe reforco semanal",
      badge: "bg-blue-100 text-blue-700",
      card: "border-blue-100 bg-blue-50/60",
      bar: "from-[#2563EB] to-[#22D3EE]",
    };
  }
  return {
    label: "Manter ritmo",
    detail: "aparece para manutencao",
    badge: "bg-emerald-100 text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/60",
    bar: "from-[#22C55E] to-[#86EFAC]",
  };
}

function confidenceLabel(attempts: number) {
  if (attempts >= 8) return "historico forte";
  if (attempts >= 3) return "historico parcial";
  return "autoavaliacao";
}

export function InitialDiagnostic({ areas, pendingErrors }: Props) {
  const router = useRouter();
  const { notify } = useFeedback();
  const [phase, setPhase] = useState<"input" | "result">("input");
  const [scores, setScores] = useState<Record<string, number>>(() => readInitialScores(areas));
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    router.prefetch("/cronograma");
    router.prefetch("/dashboard");
  }, [router]);

  const ranked = useMemo(
    () =>
      areas
        .map((area) => ({
          ...area,
          score: Math.round(scores[area.key] ?? area.initialScore ?? 50),
        }))
        .sort((a, b) => a.score - b.score),
    [areas, scores],
  );
  const priorities = ranked.slice(0, 2);
  const strongest = [...ranked].reverse().slice(0, 2);
  const readiness = Math.round(ranked.reduce((sum, area) => sum + area.score, 0) / Math.max(1, ranked.length));

  async function createPlan() {
    setCreating(true);
    try {
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error();
      window.localStorage.removeItem(storageKey);
      notify({
        tone: "success",
        title: "Plano atualizado",
        message: "Seu cronograma ja considera seu ponto de partida.",
      });
      router.replace("/cronograma");
    } catch {
      notify({
        tone: "error",
        title: "Plano nao criado",
        message: "Nao conseguimos atualizar o cronograma agora. Tente novamente.",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_24px_56px_-34px_rgba(37,99,235,0.32)] md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-cyan-200/35 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-14 h-44 w-44 rounded-full bg-orange-200/25 blur-3xl" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              Diagnostico inicial
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-[#0F172A] md:text-4xl">
              Calibre sua base antes do plano
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Ajuste cada area em poucos segundos. O cronograma usa estes sinais para decidir o que entra primeiro na semana.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <FlowCue icon={<BarChart3 className="h-4 w-4" />} title="Historico" detail="tentativas reais quando existirem" />
              <FlowCue icon={<Info className="h-4 w-4" />} title="Autoavaliacao" detail="sua percepcao completa as lacunas" />
              <FlowCue icon={<BookOpenCheck className="h-4 w-4" />} title="Plano" detail="prioridades viram tarefas" />
            </div>
          </div>
          <aside className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Prontidao geral</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="font-display text-5xl font-extrabold text-[#0F172A]">{readiness}%</p>
              <Target className="h-12 w-12 text-blue-600/35" />
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F97316] via-[#FACC15] to-[#22C55E]"
                style={{ width: `${readiness}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
              {pendingErrors} erro(s) pendentes podem virar revisoes no cronograma.
            </p>
          </aside>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {phase === "input" ? (
          <motion.section
            key="input"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_26px_60px_-34px_rgba(15,23,42,0.34)] md:p-7"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                  Diagnostico rapido
                </p>
                <h2 className="font-display text-2xl font-extrabold text-[#0F172A]">
                  Como esta sua base hoje?
                </h2>
                <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Quanto menor a nota, mais cedo aquela area aparece no plano. Ajuste sem medo: voce pode refazer depois.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScores(Object.fromEntries(areas.map((area) => [area.key, area.initialScore ?? 50])))}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Recalibrar
              </button>
            </div>

            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              {[35, 58, 82].map((score) => {
                const band = scoreBand(score);
                return (
                  <div key={band.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", band.badge)}>
                      {band.label}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{band.detail}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {areas.map((area) => {
                const value = scores[area.key] ?? area.initialScore ?? 50;
                const band = scoreBand(value);
                return (
                  <article key={area.key} className={cn("rounded-[24px] border p-4 transition", band.card)}>
                    <div className="flex items-center gap-3">
                      <StudyIcon name={area.key} size="sm" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-extrabold text-[#0F172A]">{area.label}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", band.badge)}>
                            {band.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {confidenceLabel(area.attempts)}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-blue-700 shadow-sm">
                        {Math.round(value)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={value}
                      aria-label={`Nivel em ${area.label}`}
                      onChange={(event) =>
                        setScores((current) => ({ ...current, [area.key]: Number(event.target.value) }))
                      }
                      className="mt-4 w-full accent-blue-600"
                    />
                    <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span>Preciso revisar</span>
                      <span>base ok</span>
                      <span>Estou seguro</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {area.attempts > 0 ? `${area.attempts} tentativa(s) usadas como referencia.` : "Sem historico ainda; sua percepcao guia a primeira semana."}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPhase("result")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#22D3EE] px-5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.75)] transition hover:-translate-y-0.5"
              >
                Ver meu ponto de partida
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
          >
            <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_26px_60px_-34px_rgba(15,23,42,0.34)] md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                      Resultado inicial
                    </p>
                    <h2 className="font-display text-2xl font-extrabold text-[#0F172A]">
                      Prioridade agora: {priorities.map((item) => item.label).join(" e ")}.
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                      O cronograma vai equilibrar reforco nas lacunas com manutencao dos seus pontos fortes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPhase("input")}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Ajustar notas
                </button>
              </div>

              <div className="mt-6 grid gap-3">
                {ranked.map((area, index) => {
                  const band = scoreBand(area.score);
                  return (
                    <div key={area.key} className="grid gap-3 rounded-[22px] border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-[52px_minmax(0,1fr)_74px] sm:items-center">
                      <StudyIcon name={area.key} size="sm" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            #{index + 1}
                          </span>
                          <h3 className="font-black text-[#0F172A]">{area.label}</h3>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", band.badge)}>
                            {band.label}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r", band.bar)}
                            style={{ width: `${area.score}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{band.detail}</p>
                      </div>
                      <p className="font-display text-2xl font-extrabold text-[#0F172A]">{area.score}%</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="self-start rounded-[30px] border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-5 text-white shadow-[0_24px_55px_-30px_rgba(37,99,235,0.68)]">
              <Sparkles className="h-8 w-8 text-yellow-200" />
              <h3 className="mt-4 font-display text-2xl font-extrabold">O que entra no plano</h3>
              <div className="mt-5 space-y-3">
                {priorities.map((item, index) => (
                  <div key={item.key} className="rounded-2xl border border-white/24 bg-white/16 p-3 backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/70">Prioridade {index + 1}</p>
                    <p className="mt-1 font-black">{item.label}</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-white/24 bg-white/16 p-3 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/70">Pontos fortes</p>
                  <p className="mt-1 font-black">{strongest.map((item) => item.label).join(" e ")}</p>
                </div>
                <div className="rounded-2xl border border-white/24 bg-white/16 p-3 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/70">Primeira semana</p>
                  <p className="mt-1 text-sm font-bold leading-5">
                    Revisoes, questoes e blocos curtos serao ordenados por estas prioridades.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={creating}
                onClick={() => void createPlan()}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                {creating ? "Criando plano..." : "Criar meu plano"}
              </button>
            </aside>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlowCue({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-[22px] border border-slate-100 bg-slate-50/80 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-[#0F172A]">{title}</span>
        <span className="block text-xs font-bold leading-5 text-slate-500">{detail}</span>
      </span>
    </div>
  );
}
