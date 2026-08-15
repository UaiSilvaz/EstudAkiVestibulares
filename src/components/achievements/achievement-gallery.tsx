"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Filter, Lock, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AchievementGlyph, AchievementIcon } from "./achievement-icon";

type AchievementView = {
  id: string;
  progress: number;
  completed: boolean;
  unlockedAt: string | null;
  percentage: number;
  achievement: {
    slug: string;
    title: string;
    description: string;
    lockedDescription: string | null;
    category: string;
    rarity: string;
    metric: string;
    target: number;
    requirement: unknown;
    xpReward: number;
    coinReward: number;
    titleReward: string | null;
    cosmeticReward: string | null;
    icon: string;
    iconKey: string;
    iconDescription: string;
    color: string;
    isHidden: boolean;
  };
};

const rarityLabels: Record<string, string> = {
  COMMON: "Comum",
  UNCOMMON: "Incomum",
  RARE: "Rara",
  EPIC: "Epica",
  LEGENDARY: "Lendaria",
  MYTHIC: "Mitica",
  SECRET: "Secreta",
};

const categoryLabels: Record<string, string> = {
  FIRST_STEPS: "Primeiros passos",
  QUESTIONS_TOTAL: "Questoes",
  CORRECT_TOTAL: "Acertos",
  SUBJECT: "Disciplinas",
  STREAK: "Sequencia",
  STUDY_TIME: "Tempo",
  PERFORMANCE: "Desempenho",
  SIMULATION: "Simulados",
  EXAM: "Vestibulares",
  ERROR_NOTEBOOK: "Caderno de erros",
  ESSAY: "Redacao",
  CONTENT_MASTERY: "Conteudos",
  COMMUNITY: "Comunidade",
  MATERIALS: "Materiais e aulas",
  SECRET: "Secretas",
};

const tones = [
  { name: "blue", from: "#2563EB", via: "#1D9BF0", to: "#22D3EE", soft: "#EFF6FF", glow: "rgba(37,99,235,0.38)" },
  { name: "orange", from: "#FF8A18", via: "#FFA51F", to: "#FFE01B", soft: "#FFF7ED", glow: "rgba(249,115,22,0.42)" },
  { name: "purple", from: "#6B2CF5", via: "#8A42FF", to: "#A569FF", soft: "#F5F3FF", glow: "rgba(124,58,237,0.38)" },
  { name: "green", from: "#36D66E", via: "#42DF85", to: "#5CE6BD", soft: "#ECFDF5", glow: "rgba(34,197,94,0.34)" },
  { name: "pink", from: "#F51BA2", via: "#FF35C7", to: "#FF67D8", soft: "#FDF2F8", glow: "rgba(236,72,153,0.38)" },
  { name: "cyan", from: "#168CC8", via: "#13A8D8", to: "#22C7DF", soft: "#ECFEFF", glow: "rgba(34,211,238,0.34)" },
] as const;

const categoryToneIndex: Record<string, number> = {
  FIRST_STEPS: 0,
  QUESTIONS_TOTAL: 0,
  CORRECT_TOTAL: 3,
  SUBJECT: 1,
  STREAK: 2,
  STUDY_TIME: 5,
  PERFORMANCE: 3,
  SIMULATION: 1,
  EXAM: 2,
  ERROR_NOTEBOOK: 4,
  ESSAY: 4,
  CONTENT_MASTERY: 3,
  COMMUNITY: 0,
  MATERIALS: 5,
  SECRET: 2,
};

function visibleTitle(record: AchievementView) {
  return record.achievement.isHidden && !record.completed
    ? "Conquista secreta"
    : record.achievement.title;
}

function visibleDescription(record: AchievementView) {
  if (record.achievement.isHidden && !record.completed) {
    return record.achievement.lockedDescription ?? "Continue evoluindo para revelar.";
  }
  return record.completed
    ? record.achievement.description
    : record.achievement.lockedDescription ?? record.achievement.description;
}

function toneFor(record: AchievementView, index: number) {
  if (record.achievement.category === "FIRST_STEPS") {
    return tones[index % tones.length];
  }
  if (record.achievement.category === "QUESTIONS_TOTAL") {
    return tones[index % 2 === 0 ? 0 : 5];
  }
  return tones[categoryToneIndex[record.achievement.category] ?? index % tones.length];
}

export function AchievementGallery({
  achievements,
  totalXp,
}: {
  achievements: AchievementView[];
  totalXp: number;
}) {
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AchievementView | null>(null);

  const unlocked = achievements.filter((record) => record.completed);
  const next = achievements
    .filter((record) => !record.completed && !record.achievement.isHidden)
    .sort((a, b) => b.percentage - a.percentage)[0] ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return achievements.filter((record) => {
      const hidden = record.achievement.isHidden && !record.completed;
      const title = hidden ? "" : record.achievement.title.toLowerCase();
      const description = hidden ? "" : record.achievement.description.toLowerCase();
      const matchesQuery = !needle || title.includes(needle) || description.includes(needle);
      const matchesStatus =
        status === "all" ||
        (status === "unlocked" && record.completed) ||
        (status === "progress" && !record.completed && record.progress > 0) ||
        (status === "locked" && !record.completed);
      return (
        matchesQuery &&
        matchesStatus &&
        (category === "all" || record.achievement.category === category)
      );
    });
  }, [achievements, category, query, status]);

  function changeFilter(update: () => void) {
    update();
  }

  const completion = Math.round((unlocked.length / Math.max(1, achievements.length)) * 100);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <article className="relative min-h-[220px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FF8A18] via-[#FFA51F] to-[#FFE01B] p-6 text-white shadow-[0_28px_58px_-30px_rgba(249,115,22,0.48)]">
          <div className="absolute -right-12 bottom-2 flex h-44 w-44 rotate-[-10deg] items-center justify-center rounded-[38px] bg-white/16 text-white/38">
            <Sparkles className="h-28 w-28" strokeWidth={2.1} />
          </div>
          <div className="relative z-10 max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/80">
              Beta de conquistas
            </p>
            <div className="mt-2 h-0.5 w-8 rounded-full bg-white/45" />
            <h2 className="mt-5 font-display text-4xl font-black leading-tight">
              {unlocked.length}/{achievements.length} emblemas ativos
            </h2>
            <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/88">
              {next
                ? `Proximo marco: ${next.achievement.title} (${next.percentage}%).`
                : "Todos os emblemas beta foram concluidos."}
            </p>
          </div>
          <div className="relative z-10 mt-6 h-2 max-w-xl overflow-hidden rounded-full bg-white/28">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
          </div>
        </article>

        <article className="relative min-h-[220px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6B2CF5] via-[#8A42FF] to-[#A569FF] p-6 text-white shadow-[0_28px_58px_-30px_rgba(124,58,237,0.44)]">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/18 blur-2xl" />
          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/78">
              Progresso
            </p>
            <div className="mt-2 h-0.5 w-8 rounded-full bg-white/35" />
            <p className="mt-6 font-display text-5xl font-black leading-none">
              {completion}%
            </p>
            <p className="mt-3 text-sm font-bold text-white/84">
              {totalXp.toLocaleString("pt-BR")} XP acumulados
            </p>
          </div>
        </article>
      </section>

      <section className="rounded-[24px] border border-slate-100 bg-white p-3 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.24)]">
        <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="ek-input ek-input-with-icon w-full !pl-10"
              placeholder="Buscar conquista"
              value={query}
              onChange={(event) => changeFilter(() => setQuery(event.target.value))}
            />
          </label>
          <select
            className="ek-input"
            value={status}
            onChange={(event) => changeFilter(() => setStatus(event.target.value))}
          >
            <option value="all">Todas</option>
            <option value="unlocked">Desbloqueadas</option>
            <option value="progress">Em progresso</option>
            <option value="locked">Bloqueadas</option>
          </select>
          <select
            className="ek-input"
            value={category}
            onChange={(event) => changeFilter(() => setCategory(event.target.value))}
          >
            <option value="all">Todas as categorias</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2 px-1 text-xs font-bold text-slate-500">
          <Filter className="h-4 w-4 text-blue-600" />
          {filtered.length.toLocaleString("pt-BR")} de {achievements.length} conquistas beta
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((record, index) => {
          const locked = !record.completed;
          const hidden = record.achievement.isHidden && locked;
          const tone = toneFor(record, index);
          return (
            <motion.button
              layout
              type="button"
              key={record.id}
              onClick={() => setSelected(record)}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: Math.min(index * 0.025, 0.24), duration: 0.28 }}
              whileHover={{ y: -4, scale: 1.006 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "group relative min-h-[244px] overflow-hidden rounded-[28px] p-5 text-left shadow-[0_24px_48px_-28px_rgba(15,23,42,0.38)] outline-none transition focus-visible:ring-4 focus-visible:ring-blue-200",
                locked ? "border border-slate-200 text-slate-950" : "border border-white/30 text-white",
              )}
              style={{
                background: locked
                  ? `linear-gradient(135deg, #FFFFFF 0%, ${tone.soft} 100%)`
                  : `linear-gradient(135deg, ${tone.from} 0%, ${tone.via} 54%, ${tone.to} 100%)`,
                boxShadow: locked
                  ? "0 20px 46px -32px rgba(15,23,42,0.28)"
                  : `0 28px 54px -32px ${tone.glow}`,
              }}
            >
              {!locked && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-24 w-20 rotate-12 bg-white/18 blur-sm"
                  animate={{ x: ["0%", "760%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 4.8, ease: "easeInOut" }}
                />
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-[28px] bg-[radial-gradient(circle_at_20%_16%,rgba(255,255,255,0.30),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_48%)]"
              />
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -right-10 bottom-0 flex h-36 w-36 rotate-[-10deg] items-center justify-center rounded-[34px]",
                  locked ? "bg-slate-100 text-slate-300" : "bg-white/18 text-white/42",
                )}
              >
                <AchievementGlyph
                  icon={record.achievement.icon}
                  iconKey={record.achievement.iconKey}
                  category={record.achievement.category}
                  title={record.achievement.title}
                  locked={locked}
                  className="h-24 w-24"
                  strokeWidth={2.05}
                />
              </div>
              {!locked && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-14 -top-12 h-40 w-40 rounded-full bg-white/18 blur-2xl transition-opacity group-hover:opacity-90"
                />
              )}

              <div className="relative z-10 flex items-start justify-between gap-3">
                <AchievementIcon
                  icon={record.achievement.icon}
                  iconKey={record.achievement.iconKey}
                  rarity={record.achievement.rarity}
                  locked={locked}
                  label={record.achievement.iconDescription}
                  category={record.achievement.category}
                  color={record.achievement.color}
                  title={record.achievement.title}
                  className="h-14 w-14"
                />
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                    locked ? "bg-slate-100 text-slate-500" : "bg-white/22 text-white",
                  )}
                >
                  {rarityLabels[record.achievement.rarity]}
                </span>
              </div>

              <div className="relative z-10 mt-6">
                <p className={cn("text-[10px] font-black uppercase tracking-[0.22em]", locked ? "text-blue-600" : "text-white/78")}>
                  {categoryLabels[record.achievement.category] ?? "Conquista"}
                </p>
                <div className={cn("mt-2 h-0.5 w-8 rounded-full", locked ? "bg-blue-200" : "bg-white/35")} />
                <h3 className={cn("mt-4 font-display text-2xl font-black leading-tight", locked ? "text-slate-950" : "text-white")}>
                  {visibleTitle(record)}
                </h3>
                <p className={cn("mt-2 line-clamp-2 max-w-[86%] text-sm font-bold leading-6", locked ? "text-slate-600" : "text-white/88")}>
                  {visibleDescription(record)}
                </p>
              </div>

              <div className="relative z-10 mt-6">
                <div className={cn("mb-2 flex items-center justify-between text-[10px] font-black", locked ? "text-slate-500" : "text-white/86")}>
                  <span>{Math.min(record.progress, record.achievement.target)}/{record.achievement.target}</span>
                  <span>{record.percentage}%</span>
                </div>
                <div className={cn("h-2 overflow-hidden rounded-full", locked ? "bg-slate-200" : "bg-white/24")}>
                  <motion.div
                    className={cn("h-full rounded-full", locked ? "bg-gradient-to-r from-[#2563EB] to-[#FACC15]" : "bg-white")}
                    initial={{ width: 0 }}
                    animate={{ width: `${record.percentage}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.1 }}
                  />
                </div>
              </div>

              <div className="relative z-10 mt-5 flex items-center justify-between">
                <span className={cn("text-xs font-black", locked ? "text-slate-600" : "text-white")}>
                  +{record.achievement.xpReward} XP - {record.achievement.coinReward} moedas
                </span>
                {hidden ? (
                  <Lock className="h-5 w-5 text-slate-400" />
                ) : record.completed ? (
                  <motion.span
                    animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3.6 }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/30"
                  >
                    <Check className="h-4 w-4" />
                  </motion.span>
                ) : (
                  <Sparkles className={cn("h-5 w-5", locked ? "text-slate-400" : "text-white/80")} />
                )}
              </div>
            </motion.button>
          );
        })}
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-[28px] bg-white p-5 shadow-2xl"
              initial={{ scale: 0.94, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
            >
              <div className="flex items-start justify-between gap-3">
                <AchievementIcon
                  icon={selected.achievement.icon}
                  iconKey={selected.achievement.iconKey}
                  rarity={selected.achievement.rarity}
                  locked={!selected.completed}
                  label={selected.achievement.iconDescription}
                  category={selected.achievement.category}
                  color={selected.achievement.color}
                  title={selected.achievement.title}
                  className="h-24 w-24 bg-gradient-to-br from-[#2563EB] to-[#22D3EE]"
                />
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
                {categoryLabels[selected.achievement.category]} - {rarityLabels[selected.achievement.rarity]}
              </p>
              <h2 className="mt-2 font-display text-3xl font-black text-slate-950">
                {visibleTitle(selected)}
              </h2>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
                {visibleDescription(selected)}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Detail label="Progresso" value={`${selected.progress}/${selected.achievement.target}`} />
                <Detail label="Recompensa" value={`${selected.achievement.xpReward} XP`} />
                <Detail label="Moedas" value={String(selected.achievement.coinReward)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
