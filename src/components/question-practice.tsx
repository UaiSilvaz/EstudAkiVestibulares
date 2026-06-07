"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Flame,
  Search,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CelebrationBurst } from "./visual/celebration-burst";
import { cn } from "@/lib/utils";

type Alternative = { key: string; text: string };

type QuestionItem = {
  id: string;
  statement: string;
  year: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | string;
  subjectId: string;
  vestibularId: string;
  topicId: string | null;
  explanation: string;
  pedagogyComment: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  source: string | null;
  correctAlternative: string;
  alternatives: Alternative[];
  subject?: { id: string; name: string } | null;
  topic?: { id: string; name: string } | null;
  vestibular?: { id: string; name: string; color: string } | null;
};

type Props = {
  selectedQuestionId?: string;
  errorMode?: boolean;
  questions: QuestionItem[];
  vestibulares: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
};

type AttemptResult = {
  correct: boolean;
  correctAlternative: string;
  explanation: string;
  pedagogyComment: string | null;
  gainedXp: number;
};

const difficultyStyles: Record<string, { label: string; gradient: string; text: string }> = {
  EASY: {
    label: "Fácil",
    gradient: "linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)",
    text: "#15803D",
  },
  MEDIUM: {
    label: "Média",
    gradient: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
    text: "#B45309",
  },
  HARD: {
    label: "Difícil",
    gradient: "linear-gradient(135deg, #FECDD3 0%, #FB7185 100%)",
    text: "#BE123C",
  },
};

function elementToViewportPercent(el: HTMLElement | null) {
  if (!el) return { x: 50, y: 50 };
  const rect = el.getBoundingClientRect();
  const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
  const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
  return { x, y };
}

export function QuestionPractice({
  selectedQuestionId,
  errorMode = false,
  questions,
  vestibulares,
  subjects,
}: Props) {
  const [activeQuestionId, setActiveQuestionId] = useState<string | undefined>(selectedQuestionId);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, AttemptResult>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [reviewedQuestions, setReviewedQuestions] = useState<Set<string>>(() => new Set());
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>({});
  const [celebration, setCelebration] = useState<{ tick: number; origins: { x: number; y: number }[]; xp: number }>({
    tick: 0,
    origins: [],
    xp: 0,
  });
  const [feedbackFx, setFeedbackFx] = useState<"correct" | "wrong" | null>(null);
  const [search, setSearch] = useState("");
  const [filterVestibular, setFilterVestibular] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(120);

  const articleRef = useRef<HTMLElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const altRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === activeQuestionId) ?? questions[0],
    [activeQuestionId, questions],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(120);
    const t = setInterval(() => {
      setTimeLeft((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [activeQuestionId]);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (filterVestibular && q.vestibularId !== filterVestibular) return false;
      if (filterSubject && q.subjectId !== filterSubject) return false;
      if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
      if (term && !q.statement.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [questions, search, filterVestibular, filterSubject, filterDifficulty]);

  async function answer(question: QuestionItem) {
    const selectedAlternative = selected[question.id];
    if (!selectedAlternative || result[question.id] || submitting[question.id]) return;

    setSubmitting((s) => ({ ...s, [question.id]: true }));
    try {
      const res = await fetch(`/api/questions/${question.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedAlternative,
          timeSpentSeconds: Math.max(0, 120 - timeLeft),
        }),
      });
      if (!res.ok) {
        setSubmitting((s) => ({ ...s, [question.id]: false }));
        return;
      }
      const data = (await res.json()) as AttemptResult;
      setResult((r) => ({ ...r, [question.id]: data }));

      // Build origins for celebration (correct alternative + confirm button)
      const correctEl = altRefs.current[question.correctAlternative];
      const confirmEl = confirmBtnRef.current;
      const origins: { x: number; y: number }[] = [];
      const correctOrigin = elementToViewportPercent(correctEl ?? null);
      const confirmOrigin = elementToViewportPercent(confirmEl ?? null);
      origins.push(correctOrigin);
      origins.push(confirmOrigin);

      setFeedbackFx(data.correct ? "correct" : "wrong");
      if (data.correct) {
        setCelebration((prev) => ({
          tick: prev.tick + 1,
          origins,
          xp: data.gainedXp,
        }));
      }

      window.setTimeout(() => {
        setFeedbackFx((current) => (current === (data.correct ? "correct" : "wrong") ? null : current));
      }, 1100);
    } finally {
      setSubmitting((s) => ({ ...s, [question.id]: false }));
    }
  }

  async function markReviewed(question: QuestionItem) {
    if (reviewedQuestions.has(question.id) || reviewLoading[question.id]) return;

    setReviewLoading((current) => ({ ...current, [question.id]: true }));
    try {
      const res = await fetch(`/api/questions/${question.id}/review`, {
        method: "POST",
      });
      if (!res.ok) return;
      setReviewedQuestions((current) => {
        const next = new Set(current);
        next.add(question.id);
        return next;
      });
    } finally {
      setReviewLoading((current) => ({ ...current, [question.id]: false }));
    }
  }

  function goToQuestion(id: string) {
    setActiveQuestionId(id);
  }

  function goNext() {
    const currentIndex = filteredQuestions.findIndex((q) => q.id === activeQuestion?.id);
    const next = filteredQuestions[currentIndex + 1] ?? filteredQuestions[0];
    if (next) setActiveQuestionId(next.id);
  }

  function goPrev() {
    const currentIndex = filteredQuestions.findIndex((q) => q.id === activeQuestion?.id);
    const prev = filteredQuestions[currentIndex - 1] ?? filteredQuestions[filteredQuestions.length - 1];
    if (prev) setActiveQuestionId(prev.id);
  }

  if (!activeQuestion) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
        <Sparkles className="mx-auto h-10 w-10 text-[#2563EB]" />
        <h3 className="mt-4 text-lg font-bold text-[#0F172A]">Nenhuma questão encontrada</h3>
        <p className="mt-2 text-sm text-slate-500">
          Ajuste os filtros ou escolha outro vestibular para começar a praticar.
        </p>
      </div>
    );
  }

  const currentResult = result[activeQuestion.id];
  const currentSelected = selected[activeQuestion.id];
  const currentSubmitting = submitting[activeQuestion.id];
  const currentReviewed = reviewedQuestions.has(activeQuestion.id);
  const currentReviewLoading = reviewLoading[activeQuestion.id];
  const isAnswered = !!currentResult;
  const diff = difficultyStyles[activeQuestion.difficulty] ?? difficultyStyles.MEDIUM;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerColor = timeLeft <= 15 ? "#DC2626" : timeLeft <= 45 ? "#F59E0B" : "#2563EB";

  const articleGlowClass =
    feedbackFx === "correct"
      ? "animate-success-glow ring-2 ring-emerald-300/60"
      : feedbackFx === "wrong"
        ? "animate-error-glow ring-2 ring-rose-300/60"
        : "";
  const articleShakeClass = feedbackFx === "wrong" ? "animate-shake" : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <CelebrationBurst
        trigger={celebration.tick}
        origins={celebration.origins}
        xp={celebration.xp}
      />

      {/* Sidebar de filtros e lista */}
      <aside className="space-y-4">
        <div
          className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-[0_8px_18px_-8px_rgba(15,23,42,0.25)]"
              style={{ background: "linear-gradient(135deg, #2563EB 0%, #22D3EE 50%, #86EFAC 100%)" }}
            >
              <Filter className="h-4 w-4" />
            </span>
            Filtros
          </div>

          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar no enunciado..."
                className="ek-input w-full pl-9"
              />
            </div>

            <select
              value={filterVestibular}
              onChange={(e) => setFilterVestibular(e.target.value)}
              className="ek-input w-full"
            >
              <option value="">Todos os vestibulares</option>
              {vestibulares.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="ek-input w-full"
            >
              <option value="">Todas as matérias</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              {[
                { value: "", label: "Todas" },
                { value: "EASY", label: "Fácil" },
                { value: "MEDIUM", label: "Média" },
                { value: "HARD", label: "Difícil" },
              ].map((opt) => {
                const active = filterDifficulty === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterDifficulty(opt.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                      active
                        ? "border-transparent text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.5)]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                    style={
                      active
                        ? { background: "linear-gradient(135deg, #2563EB 0%, #22D3EE 100%)" }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {filteredQuestions.length} questões
          </div>
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1 thin-scrollbar">
            {filteredQuestions.map((q, idx) => {
              const isActive = q.id === activeQuestion.id;
              const isDone = !!result[q.id];
              const isCorrect = result[q.id]?.correct;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goToQuestion(q.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition-all",
                    isActive
                      ? "border-transparent text-white shadow-[0_10px_22px_-12px_rgba(37,99,235,0.55)]"
                      : isDone
                        ? isCorrect
                          ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
                          : "border-rose-100 bg-rose-50/70 text-rose-800"
                        : "border-slate-100 bg-white text-slate-700 hover:border-slate-200",
                  )}
                  style={
                    isActive
                      ? { background: "linear-gradient(135deg, #2563EB 0%, #22D3EE 50%, #86EFAC 100%)" }
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      isActive
                        ? "bg-white/30 text-white"
                        : isDone
                          ? isCorrect
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="line-clamp-1 flex-1 text-xs font-medium">
                    {q.vestibular?.name ?? "Questão"} · {q.year}
                  </span>
                  {isDone ? (
                    isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    )
                  ) : null}
                </button>
              );
            })}
            {filteredQuestions.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-slate-400">
                Nenhuma questão corresponde aos filtros.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Questão principal */}
      <motion.article
        ref={articleRef}
        key={activeQuestion.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] md:p-8",
          articleGlowClass,
          articleShakeClass,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #BAE6FD 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #FEF3C7 0%, transparent 70%)" }}
        />

        <header className="relative flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 px-3 py-1 text-xs font-semibold"
            style={{ background: diff.gradient, color: diff.text }}
          >
            <Flame className="h-3.5 w-3.5" />
            {diff.label}
          </span>
          {activeQuestion.vestibular?.name && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {activeQuestion.vestibular.name}
            </span>
          )}
          {activeQuestion.subject?.name && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {activeQuestion.subject.name}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            <Clock3 className="h-3.5 w-3.5" style={{ color: timerColor }} />
            <span style={{ color: timerColor }}>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </span>
        </header>

        <h2 className="relative mt-5 text-lg font-bold leading-relaxed text-[#0F172A] md:text-xl">
          {activeQuestion.statement}
        </h2>

        {activeQuestion.imageUrl && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeQuestion.imageUrl}
              alt="Imagem da questão"
              className="h-auto w-full object-cover"
            />
          </div>
        )}

        <div className="relative mt-6 space-y-3">
          {activeQuestion.alternatives.map((alt) => {
            const isSelected = currentSelected === alt.key;
            const isCorrectAnswer = alt.key === activeQuestion.correctAlternative;
            const showResult = isAnswered;
            const isJustAnsweredCorrect = showResult && isCorrectAnswer;
            const isJustAnsweredWrong = showResult && isSelected && !currentResult.correct;
            let stateStyles = "border-slate-200 bg-white text-[#0F172A] hover:border-slate-300";
            if (showResult) {
              if (isCorrectAnswer) {
                stateStyles = "border-emerald-300 bg-emerald-50 text-emerald-900";
              } else if (isSelected && !currentResult.correct) {
                stateStyles = "border-rose-300 bg-rose-50 text-rose-900";
              } else {
                stateStyles = "border-slate-100 bg-white text-slate-500";
              }
            } else if (isSelected) {
              stateStyles = "border-transparent text-white shadow-[0_10px_22px_-12px_rgba(37,99,235,0.55)]";
            }
            return (
              <motion.button
                key={alt.key}
                ref={(el) => {
                  altRefs.current[alt.key] = el;
                }}
                type="button"
                disabled={isAnswered || currentSubmitting}
                onClick={() =>
                  setSelected((s) => ({ ...s, [activeQuestion.id]: alt.key }))
                }
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isJustAnsweredCorrect ? [1, 1.04, 1] : isJustAnsweredWrong ? [1, 0.98, 1.01, 0.98] : 1,
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                  scale: { duration: 0.6 },
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all",
                  stateStyles,
                )}
                style={
                  isSelected && !showResult
                    ? { background: "linear-gradient(135deg, #2563EB 0%, #22D3EE 100%)" }
                    : undefined
                }
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    showResult && isCorrectAnswer
                      ? "bg-emerald-500 text-white"
                      : showResult && isSelected && !currentResult.correct
                        ? "bg-rose-500 text-white"
                        : isSelected
                          ? "bg-white/30 text-white"
                          : "bg-slate-100 text-slate-700",
                  )}
                >
                  {alt.key}
                </span>
                <span className="flex-1">{alt.text}</span>
                <AnimatePresence>
                  {showResult && isCorrectAnswer && (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </motion.span>
                  )}
                  {showResult && isSelected && !currentResult.correct && (
                    <motion.span
                      key="x"
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: [0, -10, 10, -6, 6, 0] }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <XCircle className="h-5 w-5 text-rose-500" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {isAnswered && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative mt-6 overflow-hidden rounded-2xl border p-5",
                currentResult.correct
                  ? "border-emerald-200 bg-emerald-50/80"
                  : "border-rose-200 bg-rose-50/80",
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-40 blur-3xl"
                style={{
                  background: currentResult.correct
                    ? "radial-gradient(circle, #86EFAC 0%, transparent 70%)"
                    : "radial-gradient(circle, #FDA4AF 0%, transparent 70%)",
                }}
              />
              <div className="relative flex items-center gap-2">
                {currentResult.correct ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </motion.span>
                ) : (
                  <motion.span
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <XCircle className="h-5 w-5 text-rose-600" />
                  </motion.span>
                )}
                <h3
                  className={cn(
                    "text-sm font-bold",
                    currentResult.correct ? "text-emerald-800" : "text-rose-800",
                  )}
                >
                  {currentResult.correct ? "Boa! Você acertou." : "Quase lá, revise com calma."}
                </h3>
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 16 }}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/80 bg-white px-2.5 py-1 text-xs font-bold"
                  style={{
                    background: "linear-gradient(135deg, #FACC15 0%, #F97316 100%)",
                    color: "#7C2D12",
                  }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  +{currentResult.gainedXp} XP
                </motion.span>
              </div>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-700">
                {currentResult.explanation}
              </p>
              {currentResult.pedagogyComment && (
                <p className="relative mt-2 text-xs italic text-slate-500">
                  {currentResult.pedagogyComment}
                </p>
              )}
              {errorMode && (
                <button
                  type="button"
                  onClick={() => markReviewed(activeQuestion)}
                  disabled={currentReviewed || currentReviewLoading}
                  className={cn(
                    "relative mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all",
                    currentReviewed
                      ? "border border-emerald-200 bg-white text-emerald-700"
                      : "bg-[#0F172A] text-white hover:bg-slate-800",
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {currentReviewed
                    ? "Revisado"
                    : currentReviewLoading
                      ? "Marcando..."
                      : "Marcar como revisado"}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!isAnswered ? (
            <motion.button
              ref={confirmBtnRef}
              type="button"
              disabled={!currentSelected || currentSubmitting}
              onClick={() => answer(activeQuestion)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition-all",
                !currentSelected || currentSubmitting
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "shadow-[0_12px_28px_-12px_rgba(37,99,235,0.55)] hover:shadow-[0_16px_34px_-12px_rgba(37,99,235,0.65)]",
              )}
              style={
                currentSelected && !currentSubmitting
                  ? { background: "linear-gradient(135deg, #2563EB 0%, #22D3EE 50%, #86EFAC 100%)" }
                  : undefined
              }
            >
              {currentSubmitting ? "Enviando..." : "Confirmar resposta"}
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {errorMode && !currentReviewed && (
                <button
                  type="button"
                  onClick={() => markReviewed(activeQuestion)}
                  disabled={currentReviewLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {currentReviewLoading ? "Marcando..." : "Concluir revisao"}
                </button>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Voltar ao painel
                <Sparkles className="h-4 w-4" />
              </Link>
            </div>
          )}
        </footer>
      </motion.article>
    </div>
  );
}
