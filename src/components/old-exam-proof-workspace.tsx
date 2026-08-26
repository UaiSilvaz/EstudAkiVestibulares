"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  ExternalLink,
  ListChecks,
  Loader2,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { splitQuestionParts } from "@/lib/question-formatting";
import { hasRichTextMarkup } from "@/lib/question-rich-text";
import {
  createOldExamProofDraft,
  oldExamProofVisibleImages,
  oldExamProofStorageKey,
  parseOldExamProofDraft,
  type OldExamProofAnswer,
  type OldExamProofDraft,
  type OldExamProofQuestion,
} from "@/lib/old-exam-proof";
import { QuestionRichText } from "@/components/question-rich-text";
import { cn } from "@/lib/utils";

type ProofResult = {
  questionId: string;
  officialNumber: number;
  selectedAlternative: string | null;
  correct: boolean;
  annulled: boolean;
  correctAlternative: string | null;
  explanation: string;
  alternativeExplanations: Record<string, string>;
  pedagogyComment: string | null;
  authorialResolution: {
    reasoningPath?: unknown;
    steps?: unknown;
    commonError?: string | null;
    studyTip?: string | null;
    keywords?: unknown;
    relatedContent?: unknown;
  } | null;
};

type Submission = {
  submitted: true;
  elapsedSeconds: number;
  answeredCount: number;
  correctCount: number;
  scoredCount: number;
  score: number;
  gainedXp: number;
  results: ProofResult[];
};

type Props = {
  exam: { id: string; titulo: string; vestibular: string; ano: number; dia: string | null };
  questions: OldExamProofQuestion[];
  selectedLanguage: "ENGLISH" | "SPANISH" | null;
  attemptUrl?: string;
  reviewPreview?: boolean;
};

function formatElapsed(totalSeconds: number) {
  const total = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function OldExamProofWorkspace({
  exam,
  questions,
  selectedLanguage,
  attemptUrl,
  reviewPreview = false,
}: Props) {
  const questionIds = useMemo(() => questions.map((question) => question.id), [questions]);
  const storageKey = useMemo(
    () => oldExamProofStorageKey(exam.id, selectedLanguage),
    [exam.id, selectedLanguage],
  );
  const [draft, setDraft] = useState<OldExamProofDraft>(() =>
    createOldExamProofDraft(exam.id, selectedLanguage, questionIds),
  );
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const restored = parseOldExamProofDraft(window.localStorage.getItem(storageKey), {
      examId: exam.id,
      language: selectedLanguage,
      questionIds,
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(restored ?? createOldExamProofDraft(exam.id, selectedLanguage, questionIds));
    setNow(Date.now());
    setHydrated(true);
  }, [exam.id, questionIds, selectedLanguage, storageKey]);

  useEffect(() => {
    if (!hydrated || submission) return;
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, hydrated, storageKey, submission]);

  useEffect(() => {
    if (!hydrated || submission) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hydrated, submission]);

  const activeIndex = Math.max(
    0,
    questions.findIndex((question) => question.id === draft.activeQuestionId),
  );
  const activeQuestion = questions[activeIndex];
  const activeResult = submission?.results.find(
    (result) => result.questionId === activeQuestion?.id,
  );
  const elapsedSeconds = submission
    ? submission.elapsedSeconds
    : hydrated
      ? Math.max(draft.elapsedSeconds, Math.floor((now - draft.startedAt) / 1000))
      : 0;
  const answeredCount = Object.values(draft.answers).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  function navigate(index: number) {
    const target = questions[index];
    if (!target) return;
    setDraft((current) => ({
      ...current,
      elapsedSeconds,
      activeQuestionId: target.id,
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectAnswer(answer: OldExamProofAnswer) {
    if (!activeQuestion || submission) return;
    setDraft((current) => ({
      ...current,
      elapsedSeconds,
      answers: { ...current.answers, [activeQuestion.id]: answer },
    }));
  }

  async function finish() {
    const confirmation = window.confirm(
      unansweredCount > 0
        ? `Finalizar com ${unansweredCount} questão(ões) em branco? A correção será liberada e a tentativa não poderá ser alterada.`
        : "Finalizar a prova? A correção será liberada e a tentativa não poderá ser alterada.",
    );
    if (!confirmation) return;

    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(attemptUrl ?? `/api/provas-antigas/${exam.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          answers: draft.answers,
          elapsedSeconds,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (Submission & { error?: never })
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("submitted" in payload)) {
        setMessage(payload?.error ?? "Não foi possível finalizar a prova.");
        return;
      }
      setSubmission(payload);
      window.localStorage.removeItem(storageKey);
      setMessage(
        reviewPreview
          ? "Prévia finalizada sem registrar tentativa. Gabarito e comentários liberados somente ao administrador."
          : "Prova finalizada. Gabarito e comentários liberados.",
      );
    } catch {
      setMessage("Falha de conexão. Seu cartão-resposta continua salvo neste dispositivo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeQuestion) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        Nenhuma questão publicada está disponível para este caderno.
      </div>
    );
  }

  const hasRichQuestionText =
    hasRichTextMarkup(activeQuestion.statement) || hasRichTextMarkup(activeQuestion.supportText ?? "");
  const parts = hasRichQuestionText
    ? { supportText: activeQuestion.supportText, prompt: activeQuestion.statement }
    : splitQuestionParts(activeQuestion.statement, activeQuestion.supportText);
  const images = oldExamProofVisibleImages(activeQuestion);
  const selectedAnswer = draft.answers[activeQuestion.id];

  return (
    <div className="space-y-4">
      <header className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
            {submission
              ? reviewPreview ? "Prévia administrativa finalizada" : "Tentativa finalizada"
              : reviewPreview ? "Prévia administrativa · respostas protegidas" : "Modo prova · respostas protegidas"}
          </p>
          <p className="mt-1 font-black text-slate-950">
            {answeredCount}/{questions.length} respondidas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="#cartao-resposta"
            className="estudaki-button estudaki-button-ghost xl:hidden"
          >
            <ListChecks className="h-4 w-4" /> Cartão
          </a>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 font-mono text-base font-black text-white">
            <Clock3 className="h-4 w-4" /> {formatElapsed(elapsedSeconds)}
          </span>
          {!submission && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void finish()}
              className="estudaki-button estudaki-button-primary"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Finalizar
            </button>
          )}
        </div>
      </header>

      {submission && (
        <section className="grid gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-4">
          <ResultStat label="Nota" value={`${submission.score.toFixed(1)}%`} />
          <ResultStat label="Acertos" value={`${submission.correctCount}/${submission.scoredCount}`} />
          <ResultStat label="Respondidas" value={`${submission.answeredCount}/${questions.length}`} />
          <ResultStat label="XP" value={`+${submission.gainedXp}`} />
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="order-2 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm xl:order-1">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                Questão {activeQuestion.questionNumber ?? activeIndex + 1} · {activeIndex + 1} de {questions.length}
              </p>
              {reviewPreview && activeQuestion.adminOriginalPageUrl && (
                <a
                  href={activeQuestion.adminOriginalPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-blue-800 underline-offset-4 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Página original
                </a>
              )}
            </div>
          </div>
          <div className="p-5 sm:p-7">
            {parts.supportText && (
              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                <QuestionRichText value={parts.supportText} />
              </div>
            )}
            {images.map((image, index) => (
              <a
                key={`${image.url}-${index}`}
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block overflow-hidden rounded-xl border border-slate-200 bg-white p-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.altText || image.description || `Elemento visual ${index + 1}`}
                  className="mx-auto max-h-[620px] w-auto max-w-full object-contain"
                />
              </a>
            ))}
            <QuestionRichText
              value={parts.prompt}
              className="mt-6 text-base font-semibold leading-8 text-slate-950"
            />

            <div className="mt-7 space-y-3" role="radiogroup" aria-label="Alternativas">
              {activeQuestion.alternatives.map((alternative) => {
                const isSelected = selectedAnswer === alternative.key;
                const isCorrect = Boolean(activeResult && activeResult.correctAlternative === alternative.key);
                const isWrongSelection = Boolean(activeResult && isSelected && !activeResult.correct && !activeResult.annulled);
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={Boolean(submission)}
                    key={alternative.key}
                    onClick={() => selectAnswer(alternative.key as OldExamProofAnswer)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm leading-6 transition",
                      isCorrect
                        ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                        : isWrongSelection
                          ? "border-rose-400 bg-rose-50 text-rose-950"
                          : isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-800 hover:border-blue-300",
                    )}
                  >
                    <strong className="shrink-0">{alternative.key})</strong>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap">
                      {alternative.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={alternative.imageUrl} alt={`Alternativa ${alternative.key}`} className="max-h-64 max-w-full" />
                      ) : (
                        <QuestionRichText value={alternative.text} inline />
                      )}
                    </span>
                    {isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                  </button>
                );
              })}
            </div>

            {activeResult && (
              <section className="mt-7 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <div className="flex items-start gap-3">
                  {activeResult.annulled ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  ) : (
                    <FileCheck2 className="mt-0.5 h-5 w-5 text-blue-700" />
                  )}
                  <div>
                    <h2 className="font-black text-slate-950">
                      {activeResult.annulled
                        ? "Questão anulada"
                        : activeResult.selectedAlternative === null
                          ? `Em branco · correta ${activeResult.correctAlternative}`
                          : activeResult.correct
                            ? "Resposta correta"
                            : `Resposta incorreta · correta ${activeResult.correctAlternative}`}
                    </h2>
                    {activeResult.pedagogyComment && <p className="mt-1 text-sm text-slate-700">{activeResult.pedagogyComment}</p>}
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                  <QuestionRichText value={activeResult.explanation} />
                </div>
                <div className="space-y-2">
                  {Object.entries(activeResult.alternativeExplanations).map(([key, comment]) => (
                    <p key={key} className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">
                      <strong className="text-blue-800">{key})</strong> {comment}
                    </p>
                  ))}
                </div>
                {activeResult.authorialResolution?.commonError && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                    <strong>Erro comum:</strong> {activeResult.authorialResolution.commonError}
                  </p>
                )}
                {activeResult.authorialResolution?.studyTip && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                    <strong>Dica:</strong> {activeResult.authorialResolution.studyTip}
                  </p>
                )}
              </section>
            )}

            <div className="mt-7 flex items-center justify-between gap-3">
              <button type="button" onClick={() => navigate(activeIndex - 1)} disabled={activeIndex === 0} className="estudaki-button estudaki-button-ghost">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button type="button" onClick={() => navigate(activeIndex + 1)} disabled={activeIndex === questions.length - 1} className="estudaki-button estudaki-button-secondary">
                Próxima <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>

        <aside
          id="cartao-resposta"
          className="order-1 scroll-mt-28 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm xl:order-2 xl:sticky xl:top-28"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black text-slate-950">Cartão-resposta</h2>
            <span className="text-xs font-bold text-slate-500">salvo localmente</span>
          </div>
          <div className="mt-4 grid max-h-[66vh] grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-8 xl:grid-cols-5">
            {questions.map((question, index) => {
              const answer = draft.answers[question.id];
              const result = submission?.results.find((item) => item.questionId === question.id);
              return (
                <button
                  type="button"
                  key={question.id}
                  onClick={() => navigate(index)}
                  aria-label={`Questão ${question.questionNumber ?? index + 1}${answer ? `, marcada ${answer}` : ", em branco"}`}
                  className={cn(
                    "min-h-12 rounded-xl border px-1 py-2 text-center text-xs font-black transition",
                    draft.activeQuestionId === question.id && "ring-2 ring-blue-400 ring-offset-2",
                    result?.annulled
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : result?.correct
                        ? "border-emerald-400 bg-emerald-500 text-white"
                        : result && !result.correct
                          ? "border-rose-400 bg-rose-500 text-white"
                          : answer
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600",
                  )}
                >
                  <span className="block">{question.questionNumber ?? index + 1}</span>
                  <span className="block text-[10px] opacity-80">{answer ?? "—"}</span>
                </button>
              );
            })}
          </div>
          {!submission && unansweredCount > 0 && (
            <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
              {unansweredCount} questão(ões) em branco. O gabarito não aparece antes da entrega.
            </p>
          )}
          {message && <p className="mt-4 text-sm font-bold text-slate-700">{message}</p>}
        </aside>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
