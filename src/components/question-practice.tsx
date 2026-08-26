"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Bookmark,
  Flag,
  ChevronRight,
  CircleX,
  Clock3,
  Filter,
  Flame,
  GraduationCap,
  Layers3,
  ListChecks,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { FastLink } from "./fast-link";
import { CelebrationBurst } from "./visual/celebration-burst";
import { useFeedback } from "./feedback/feedback-provider";
import { QuestionRichText } from "./question-rich-text";
import {
  questionEditionLabel,
  splitQuestionParts,
  splitSupportReference,
} from "@/lib/question-formatting";
import { hasRichTextMarkup, richTextToPlainText } from "@/lib/question-rich-text";
import {
  clearQuestionFilterParams,
  questionBankHref,
  setQuestionFilterParam,
  type QuestionFilterQueryKey,
} from "@/lib/question-filter-url";
import { cn } from "@/lib/utils";

type Alternative = { key: string; text: string; imageUrl?: string | null };
type QuestionImage = {
  url: string;
  altText?: string;
  description?: string;
  order?: number;
  assetType?: string;
  relation?: string;
  width?: number;
  height?: number;
};

type QuestionItem = {
  id: string;
  supportText: string | null;
  statement: string;
  year: number;
  exam?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD" | string;
  subjectId: string;
  vestibularId: string;
  topicId: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  images: Array<QuestionImage | string>;
  source: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceCitation?: string | null;
  sourceAccessedAt?: string | null;
  sourceType?: string;
  questionNumber?: number | null;
  day?: string | null;
  officialLanguage?: string;
  officialGroup?: string | null;
  officialVariant?: string | null;
  answerSituation?: string;
  knowledgeArea?: string | null;
  alternatives: Alternative[];
  subject?: { id: string; name: string } | null;
  topic?: { id: string; name: string; subjectId?: string } | null;
  vestibular?: { id: string; name: string; color: string } | null;
};

type Props = {
  selectedQuestionId?: string;
  selectedVestibularId?: string;
  selectedVestibularName?: string;
  contextualVestibular?: boolean;
  errorMode?: boolean;
  questions: QuestionItem[];
  vestibulares: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  topics: { id: string; name: string; subjectId: string }[];
  years: number[];
  days?: string[];
  areas?: { value: string; label: string }[];
  initialSearch?: string;
  initialDay?: string;
  initialArea?: string;
  pagination?: { page: number; pages: number; total: number; pageSize: number };
  favoriteIds?: string[];
  answeredIds?: string[];
};

type AttemptResult = {
  correct: boolean;
  annulled?: boolean;
  correctAlternative: string | null;
  explanation: string;
  alternativeExplanations: Record<string, string>;
  pedagogyComment: string | null;
  gainedXp: number;
  answerXp?: number;
  leveledUp?: boolean;
  newLeague?: string;
  streak?: number;
  streakUpdated?: boolean;
  achievements?: AchievementResult[];
};

type AchievementResult = {
  id: string;
  slug: string;
  title: string;
  description: string;
  xpReward: number;
  icon?: string | null;
  iconKey?: string | null;
  iconDescription?: string | null;
  rarity?: string | null;
  category?: string | null;
  color?: string | null;
};

type RevealPhase = "loading" | "feedback" | "explanation";

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

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

function FilterField({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
        {label}
      </span>
      {children}
    </label>
  );
}

export function QuestionPractice({
  selectedQuestionId,
  selectedVestibularId,
  selectedVestibularName,
  contextualVestibular = false,
  errorMode = false,
  questions,
  vestibulares,
  subjects,
  topics,
  years,
  days = [],
  areas = [],
  initialSearch = "",
  initialDay,
  initialArea,
  pagination,
  favoriteIds = [],
  answeredIds = [],
}: Props) {
  const router = useRouter();
  const [isFilterPending, startFilterTransition] = useTransition();
  const currentSearchParams = useSearchParams();
  const {
    notify,
    celebrate: celebrateAchievement,
    requestText,
  } = useFeedback();
  const [activeQuestionId, setActiveQuestionId] = useState<string | undefined>(selectedQuestionId);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [eliminated, setEliminated] = useState<Record<string, Set<string>>>({});
  const [result, setResult] = useState<Record<string, AttemptResult>>({});
  const [revealPhase, setRevealPhase] = useState<Record<string, RevealPhase>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [reviewedQuestions, setReviewedQuestions] = useState<Set<string>>(() => new Set());
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>({});
  const [celebration, setCelebration] = useState<{ tick: number; origins: { x: number; y: number }[]; xp: number }>({
    tick: 0,
    origins: [],
    xp: 0,
  });
  const [feedbackFx, setFeedbackFx] = useState<"correct" | "wrong" | null>(null);
  const currentQueryString = currentSearchParams.toString();
  const appliedSearch = currentSearchParams.get("q") ?? initialSearch;
  const [searchDraft, setSearchDraft] = useState(() => ({
    urlValue: appliedSearch,
    value: appliedSearch,
  }));
  const search = searchDraft.urlValue === appliedSearch ? searchDraft.value : appliedSearch;
  const filterVestibular = contextualVestibular
    ? selectedVestibularId ?? ""
    : currentSearchParams.get("vestibular") ?? "";
  const filterSubject = currentSearchParams.get("subject") ?? "";
  const filterTopic = currentSearchParams.get("topic") ?? currentSearchParams.get("content") ?? "";
  const filterYear = currentSearchParams.get("year") ?? "";
  const filterDay = currentSearchParams.get("day") ?? initialDay ?? "";
  const filterArea = currentSearchParams.get("area") ?? initialArea ?? "";
  const filterDifficulty = currentSearchParams.get("difficulty") ?? "";
  const [timeLeft, setTimeLeft] = useState(120);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(favoriteIds));
  const [serverAnswered, setServerAnswered] = useState<Set<string>>(() => new Set(answeredIds));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileFilterQuery, setMobileFilterQuery] = useState(currentQueryString);
  const mobileFilterParams = useMemo(
    () => new URLSearchParams(mobileFilterQuery),
    [mobileFilterQuery],
  );
  const controlParams = mobileFiltersOpen || isFilterPending ? mobileFilterParams : currentSearchParams;
  const controlSearch = mobileFiltersOpen ? controlParams.get("q") ?? "" : search;
  const controlVestibular = contextualVestibular
    ? selectedVestibularId ?? ""
    : controlParams.get("vestibular") ?? "";
  const controlSubject = controlParams.get("subject") ?? "";
  const controlTopic = controlParams.get("topic") ?? controlParams.get("content") ?? "";
  const controlYear = controlParams.get("year") ?? "";
  const controlDay = controlParams.get("day") ?? initialDay ?? "";
  const controlArea = controlParams.get("area") ?? initialArea ?? "";
  const controlDifficulty = controlParams.get("difficulty") ?? "";
  const controlScope = controlParams.get("scope") ?? "";

  const articleRef = useRef<HTMLElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const altRefs = useRef<Record<string, HTMLElement | null>>({});
  const emptyNoticeShown = useRef(false);

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
    if (pagination) return questions;

    const term = appliedSearch.trim().toLowerCase();
    return questions.filter((q) => {
      if (filterVestibular && q.vestibularId !== filterVestibular) return false;
      if (filterSubject && q.subjectId !== filterSubject) return false;
      if (filterTopic && q.topicId !== filterTopic) return false;
      if (filterYear && String(q.year) !== filterYear) return false;
      if (filterDay && q.day !== filterDay) return false;
      if (filterArea && q.knowledgeArea !== filterArea) return false;
      if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
      if (term && !richTextToPlainText(q.statement).toLowerCase().includes(term)) return false;
      return true;
    });
  }, [
    questions,
    pagination,
    appliedSearch,
    filterVestibular,
    filterSubject,
    filterTopic,
    filterYear,
    filterDay,
    filterArea,
    filterDifficulty,
  ]);

  useEffect(() => {
    if (questions.length === 0 && !emptyNoticeShown.current) {
      emptyNoticeShown.current = true;
      notify({
        tone: "warning",
        title: "Nenhuma questão encontrada",
        message: "Ajuste os filtros ou escolha outra lista para continuar estudando.",
      });
    }
    if (questions.length > 0) emptyNoticeShown.current = false;
  }, [notify, questions.length]);

  function showAchievements(achievements: AchievementResult[] | undefined) {
    for (const achievement of achievements ?? []) {
      celebrateAchievement({
        id: achievement.id,
        title: achievement.title,
        message: achievement.description,
        xp: achievement.xpReward,
        badge: "Conquista desbloqueada",
        icon: achievement.icon,
        iconKey: achievement.iconKey ?? achievement.slug,
        iconDescription: achievement.iconDescription,
        rarity: achievement.rarity,
        category: achievement.category,
        color: achievement.color,
        actionLabel: "Continuar estudando",
        onContinue: () => router.refresh(),
      });
    }
  }

  async function addToNotebook(questionId: string) {
    try {
      const response = await fetch(`/api/questions/${questionId}/notebook`, {
        method: "POST",
      });
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Não foi possível adicionar",
          message: await responseError(response, "Tente novamente em alguns instantes."),
        });
        return;
      }
      notify({
        tone: "success",
        title: "Questão adicionada",
        message: "Ela está no seu Caderno de Revisões para você retomar depois.",
      });
    } catch {
      notify({
        tone: "error",
        title: "Falha de conexão",
        message: "Não foi possível atualizar seu Caderno de Revisões.",
      });
    }
  }

  const availableTopics = useMemo(
    () => topics.filter((topic) => !controlSubject || topic.subjectId === controlSubject),
    [topics, controlSubject],
  );
  const controlFilterCount = [
    contextualVestibular ? "" : controlVestibular,
    controlSubject,
    controlTopic,
    controlYear,
    controlDay,
    controlArea,
    controlDifficulty,
    controlScope,
    controlSearch.trim(),
  ].filter(Boolean).length;

  function keepContextualVestibular(params: URLSearchParams) {
    if (!contextualVestibular) return params;

    const vestibularValue = currentSearchParams.get("vestibular") ?? selectedVestibularId ?? "";
    if (vestibularValue) params.set("vestibular", vestibularValue);
    return params;
  }

  function clearFilters() {
    setSearchDraft({ urlValue: appliedSearch, value: "" });

    const params = keepContextualVestibular(clearQuestionFilterParams(controlParams));
    setMobileFilterQuery(params.toString());
    setMobileFiltersOpen(false);
    startFilterTransition(() => {
      router.push(questionBankHref(params));
    });
  }

  function openMobileFilters() {
    setMobileFilterQuery(currentQueryString);
    setMobileFiltersOpen(true);
  }

  async function answer(question: QuestionItem) {
    const selectedAlternative = selected[question.id];
    if (!selectedAlternative || result[question.id] || submitting[question.id]) return;

    setSubmitting((s) => ({ ...s, [question.id]: true }));
    setRevealPhase((phase) => ({ ...phase, [question.id]: "loading" }));
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
        notify({
          tone: "error",
          title: "Resposta não salva",
          message: await responseError(res, "Não foi possível validar sua resposta."),
        });
        setSubmitting((s) => ({ ...s, [question.id]: false }));
        setRevealPhase((phase) => {
          const next = { ...phase };
          delete next[question.id];
          return next;
        });
        return;
      }
      const data = (await res.json()) as AttemptResult;
      setResult((r) => ({ ...r, [question.id]: data }));
      setServerAnswered((current) => new Set(current).add(question.id));
      setRevealPhase((phase) => ({ ...phase, [question.id]: "feedback" }));

      // Build origins for celebration (correct alternative + confirm button)
      const correctEl = data.annulled
        ? null
        : altRefs.current[data.correctAlternative ?? ""];
      const confirmEl = confirmBtnRef.current;
      const origins: { x: number; y: number }[] = [];
      const correctOrigin = elementToViewportPercent(correctEl ?? null);
      const confirmOrigin = elementToViewportPercent(confirmEl ?? null);
      origins.push(correctOrigin);
      origins.push(confirmOrigin);

      setFeedbackFx(data.annulled ? null : data.correct ? "correct" : "wrong");
      if (data.annulled) {
        notify({
          tone: "info",
          title: "Questão anulada",
          message: "Sua escolha foi registrada apenas para estudo, sem correção e sem pontuação.",
        });
      } else if (data.correct) {
        setCelebration((prev) => ({
          tick: prev.tick + 1,
          origins,
          xp: data.gainedXp,
        }));
        notify({
          tone: "success",
          title: "Boa! Você acertou.",
          message: `Resposta salva e +${data.answerXp ?? data.gainedXp} XP conquistados.`,
        });
      } else {
        notify({
          tone: "warning",
          title: "Essa questão merece uma revisão",
          message: "Que tal adicioná-la ao seu Caderno de Revisões?",
          duration: 9000,
          action: {
            label: "Adicionar ao caderno",
            onClick: () => addToNotebook(question.id),
          },
        });
      }
      if (data.leveledUp && data.newLeague) {
        celebrateAchievement({
          id: `league-${data.newLeague}`,
          title: `Liga ${data.newLeague}!`,
          message: "Você subiu de liga. Seu ritmo está levando seus estudos mais longe.",
          xp: data.answerXp ?? data.gainedXp,
          badge: "Nova liga",
          kind: "league",
          league: data.newLeague,
          actionLabel: "Continuar avançando",
          onContinue: () => router.refresh(),
        });
      }
      if (data.streakUpdated && (data.streak ?? 0) > 1) {
        notify({
          tone: "achievement",
          title: `Sequência de ${data.streak} dias mantida!`,
          message: "Você voltou a estudar hoje. A constância está fazendo diferença.",
        });
      }
      showAchievements(data.achievements);

      window.setTimeout(() => {
        setFeedbackFx((current) =>
          current === (data.correct ? "correct" : "wrong") ? null : current,
        );
      }, 1100);
      window.setTimeout(() => {
        setRevealPhase((phase) => (phase[question.id] === "feedback" ? { ...phase, [question.id]: "explanation" } : phase));
      }, 950);
    } catch {
      notify({
        tone: "error",
        title: "Falha ao enviar a resposta",
        message: "Confira sua conexão e tente novamente.",
      });
      setRevealPhase((phase) => {
        const next = { ...phase };
        delete next[question.id];
        return next;
      });
    } finally {
      setSubmitting((s) => ({ ...s, [question.id]: false }));
    }
  }

  function toggleEliminated(questionId: string, key: string) {
    if (result[questionId]) return;

    setEliminated((current) => {
      const nextSet = new Set(current[questionId] ?? []);
      if (nextSet.has(key)) nextSet.delete(key);
      else nextSet.add(key);
      return { ...current, [questionId]: nextSet };
    });

    setSelected((current) => {
      if (current[questionId] !== key) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  async function markReviewed(question: QuestionItem) {
    if (reviewedQuestions.has(question.id) || reviewLoading[question.id]) return;

    setReviewLoading((current) => ({ ...current, [question.id]: true }));
    try {
      const res = await fetch(`/api/questions/${question.id}/review`, {
        method: "POST",
      });
      if (!res.ok) {
        notify({
          tone: "error",
          title: "Revisão não concluída",
          message: await responseError(res, "Não foi possível salvar sua revisão."),
        });
        return;
      }
      const data = (await res.json()) as {
        reviewed: number;
        achievements?: AchievementResult[];
      };
      setReviewedQuestions((current) => {
        const next = new Set(current);
        next.add(question.id);
        return next;
      });
      notify({
        tone: "success",
        title: "Revisão concluída",
        message: data.reviewed
          ? "Seu progresso foi salvo e você recebeu +3 XP."
          : "Essa questão já estava revisada.",
      });
      showAchievements(data.achievements);
    } catch {
      notify({
        tone: "error",
        title: "Falha de conexão",
        message: "Não foi possível concluir a revisão.",
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

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = setQuestionFilterParam(
      controlParams,
      "q",
      controlSearch,
    );
    setMobileFilterQuery(params.toString());
    setMobileFiltersOpen(false);
    startFilterTransition(() => {
      router.push(questionBankHref(params));
    });
  }

  function pageHref(nextPage: number) {
    const params = new URLSearchParams(currentSearchParams.toString());
    params.set("page", String(nextPage));
    return `/questions?${params.toString()}`;
  }

  function applyServerFilter(
    key: Exclude<QuestionFilterQueryKey, "q">,
    value: string,
  ) {
    if (mobileFiltersOpen) {
      setMobileFilterQuery((previous) =>
        setQuestionFilterParam(new URLSearchParams(previous), key, value).toString(),
      );
      return;
    }

    const params = setQuestionFilterParam(controlParams, key, value);
    setMobileFilterQuery(params.toString());
    startFilterTransition(() => {
      router.push(questionBankHref(params));
    });
  }

  function applyMobileFilters() {
    const params = keepContextualVestibular(new URLSearchParams(mobileFilterParams.toString()));
    setMobileFiltersOpen(false);
    startFilterTransition(() => {
      router.push(questionBankHref(params));
    });
  }

  function changeSearch(value: string) {
    if (mobileFiltersOpen) {
      setMobileFilterQuery((previous) =>
        setQuestionFilterParam(new URLSearchParams(previous), "q", value).toString(),
      );
      return;
    }

    setSearchDraft({ urlValue: appliedSearch, value });
  }

  async function toggleFavorite(questionId: string) {
    try {
      const response = await fetch(`/api/questions/${questionId}/favorite`, { method: "POST" });
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Favorito não atualizado",
          message: await responseError(response, "Tente novamente."),
        });
        return;
      }
      const data = (await response.json()) as { favorite: boolean };
      setFavorites((current) => {
        const next = new Set(current);
        if (data.favorite) next.add(questionId);
        else next.delete(questionId);
        return next;
      });
      notify({
        tone: data.favorite ? "success" : "info",
        title: data.favorite ? "Questão favoritada" : "Questão removida dos favoritos",
        message: data.favorite
          ? "Você poderá encontrá-la rapidamente na sua lista."
          : "Sua lista de favoritos foi atualizada.",
      });
    } catch {
      notify({
        tone: "error",
        title: "Falha de conexão",
        message: "Não foi possível atualizar seus favoritos.",
      });
    }
  }

  async function reportQuestion(questionId: string) {
    const details = await requestText({
      title: "Reportar problema na questão",
      message: "Explique o que parece incorreto. Sua observação será enviada para a equipe de conteúdo.",
      placeholder: "Ex.: a imagem não aparece ou o gabarito parece incorreto...",
      confirmLabel: "Enviar para revisão",
      required: true,
    });
    if (!details) return;
    try {
      const response = await fetch(`/api/questions/${questionId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Erro na questão", details }),
      });
      if (!response.ok) {
        notify({
          tone: "error",
          title: "Relato não enviado",
          message: await responseError(response, "Tente novamente em alguns instantes."),
        });
        return;
      }
      notify({
        tone: "success",
        title: "Enviado com sucesso",
        message: "Obrigado. A questão entrou na fila de revisão da equipe.",
      });
    } catch {
      notify({
        tone: "error",
        title: "Falha de conexão",
        message: "Não foi possível enviar o relato agora.",
      });
    }
  }

  if (!activeQuestion) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]">
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
  const currentRevealPhase = revealPhase[activeQuestion.id];
  const eliminatedForQuestion = eliminated[activeQuestion.id] ?? new Set<string>();
  const currentReviewed = reviewedQuestions.has(activeQuestion.id);
  const currentReviewLoading = reviewLoading[activeQuestion.id];
  const isAnswered = !!currentResult;
  const currentResultAnnulled = Boolean(currentResult?.annulled);
  const diff = difficultyStyles[activeQuestion.difficulty] ?? difficultyStyles.MEDIUM;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerColor = timeLeft <= 15 ? "#DC2626" : timeLeft <= 45 ? "#F59E0B" : "#2563EB";
  const activeQuestionIndex = Math.max(
    0,
    filteredQuestions.findIndex((question) => question.id === activeQuestion.id),
  );
  const activeQuestionPosition =
    ((pagination?.page ?? 1) - 1) * (pagination?.pageSize ?? questions.length) +
    activeQuestionIndex +
    1;
  const hasRichQuestionText =
    hasRichTextMarkup(activeQuestion.statement) || hasRichTextMarkup(activeQuestion.supportText ?? "");
  const questionParts = hasRichQuestionText
    ? {
        supportText: activeQuestion.supportText,
        prompt: activeQuestion.statement,
      }
    : splitQuestionParts(
        activeQuestion.statement,
        activeQuestion.supportText,
      );
  const editionLabel = questionEditionLabel({
    exam: activeQuestion.exam,
    vestibularName: activeQuestion.vestibular?.name,
    year: activeQuestion.year,
  });
  const supportDisplay = questionParts.supportText && !hasRichTextMarkup(questionParts.supportText)
    ? splitSupportReference(questionParts.supportText)
    : null;
  const normalizedQuestionImages = activeQuestion.images
    .map<QuestionImage>((image, index) =>
      typeof image === "string" ? { url: image, order: index } : image,
    )
    .filter((image) => Boolean(image.url))
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
  const promptFacsimiles = normalizedQuestionImages.filter(
    (image) => image.assetType === "PROMPT_FACSIMILE" || image.assetType === "prompt_facsimile",
  );
  const usesPromptFacsimile = promptFacsimiles.length > 0;
  const legacyDisplayImages = normalizedQuestionImages.filter(
        (image) =>
          image.assetType !== "ALTERNATIVE_VISUAL" &&
          image.assetType !== "alternative_visual" &&
          image.relation !== "ALTERNATIVE" &&
          image.relation !== "alternative" &&
          image.assetType !== "ORIGINAL_REFERENCE" &&
          image.assetType !== "original_reference" &&
          image.relation !== "ADMIN_REFERENCE" &&
          image.relation !== "admin_reference",
      );
  if (
    !usesPromptFacsimile &&
    activeQuestion.imageUrl &&
    !legacyDisplayImages.some((image) => image.url === activeQuestion.imageUrl)
  ) {
    legacyDisplayImages.unshift({ url: activeQuestion.imageUrl, order: -1 });
  }
  const displayedQuestionImages = usesPromptFacsimile
    ? promptFacsimiles
    : legacyDisplayImages;
  const isAnnulled = activeQuestion.answerSituation === "ANNULLED";
  const selectionHref = "/questions";

  const articleGlowClass =
    feedbackFx === "correct"
      ? "animate-success-glow ring-2 ring-emerald-300/60"
      : feedbackFx === "wrong"
        ? "animate-error-glow ring-2 ring-rose-300/60"
        : "";
  const articleShakeClass = feedbackFx === "wrong" ? "animate-shake" : "";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <CelebrationBurst
        trigger={celebration.tick}
        origins={celebration.origins}
        xp={celebration.xp}
      />

      <div className="order-0 flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
        <FastLink
          href={selectionHref}
          pendingClassName="scale-[0.99] opacity-80"
          pendingLabel={
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Voltando...
            </>
          }
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700 active:scale-[0.99]"
        >
          <ArrowLeft className="h-4 w-4" />
          {contextualVestibular ? "Voltar a vestibulares" : "Voltar"}
        </FastLink>
        <div className="flex items-center gap-2">
          {contextualVestibular && (
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
              <GraduationCap className="h-4 w-4" />
              {selectedVestibularName}
            </div>
          )}
          <button
            type="button"
            onClick={openMobileFilters}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm lg:hidden"
            aria-label="Abrir filtros"
            title="Filtros"
          >
            {isFilterPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {mobileFiltersOpen && (
        <button
          type="button"
          aria-label="Fechar filtros"
          onClick={() => setMobileFiltersOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* No mobile, os filtros aparecem antes da questão e a lista vem depois. */}
      <aside className="contents lg:order-1 lg:block lg:space-y-4">
        <section
          className={cn(
            "order-1 rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.32)] lg:block lg:p-5",
            mobileFiltersOpen
              ? "fixed inset-x-3 bottom-3 top-20 z-50 block overflow-y-auto rounded-[26px]"
              : "hidden",
          )}
        >
          {isFilterPending && (
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 lg:-mx-5 lg:-mt-5">
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando filtros...
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-[0_10px_20px_-12px_rgba(37,99,235,0.8)]">
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-950">Buscar questões</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {pagination?.total.toLocaleString("pt-BR") ?? filteredQuestions.length} disponíveis
                </p>
              </div>
            </div>
            {controlFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                title="Limpar filtros"
                aria-label="Limpar filtros"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 lg:hidden"
              aria-label="Fechar filtros"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <form className="relative" onSubmit={submitSearch}>
              <label htmlFor="question-search" className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">
                Palavra-chave
              </label>
              <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" />
              <input
                id="question-search"
                value={controlSearch}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder="Tema ou trecho"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="submit"
                title="Buscar"
                aria-label="Buscar"
                className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {!contextualVestibular && (
              <FilterField icon={GraduationCap} label="Vestibular">
                <select
                  value={controlVestibular}
                  onChange={(event) => {
                    applyServerFilter("vestibular", event.target.value);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Todos os vestibulares</option>
                  {vestibulares.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </FilterField>
            )}

            <FilterField icon={BookOpenText} label="Matéria">
              <select
                value={controlSubject}
                onChange={(event) => {
                  applyServerFilter("subject", event.target.value);
                }}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todas as matérias</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField icon={Layers3} label="Conteúdo">
              <select
                value={controlTopic}
                onChange={(event) => {
                  applyServerFilter("topic", event.target.value);
                }}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todos os conteúdos</option>
                {availableTopics.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField icon={Layers3} label="Área do conhecimento">
              <select
                value={controlArea}
                onChange={(event) => {
                  applyServerFilter("area", event.target.value);
                }}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todas as áreas</option>
                {areas.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </FilterField>

            <FilterField icon={CalendarDays} label="Ano da prova">
              <select
                value={controlYear}
                onChange={(event) => {
                  applyServerFilter("year", event.target.value);
                }}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todos os anos</option>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </FilterField>

            <FilterField icon={CalendarDays} label="Dia da prova">
              <select
                value={controlDay}
                onChange={(event) => {
                  applyServerFilter("day", event.target.value);
                }}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todos os dias</option>
                {days.map((item) => (
                  <option key={item} value={item}>
                    {item === "1" || item === "2" ? `${item}º dia` : item}
                  </option>
                ))}
              </select>
            </FilterField>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase text-slate-500">Dificuldade</p>
              <div className="grid grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {[
                  { value: "", label: "Todas" },
                  { value: "EASY", label: "Fácil" },
                  { value: "MEDIUM", label: "Média" },
                  { value: "HARD", label: "Difícil" },
                ].map((option) => {
                  const active = controlDifficulty === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        applyServerFilter("difficulty", option.value);
                      }}
                      className={cn(
                        "min-w-0 rounded-md px-1 py-2 text-[11px] font-bold transition",
                        active
                          ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase text-slate-500">Minha lista</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "", label: "Todas" },
                  { value: "unanswered", label: "Não respondidas" },
                  { value: "errors", label: "Erradas" },
                  { value: "favorites", label: "Favoritas" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      applyServerFilter("scope", option.value);
                    }}
                    className={cn(
                      "min-h-10 rounded-xl border px-2 text-[11px] font-bold transition",
                      controlScope === option.value
                        ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {contextualVestibular && selectedVestibularName === "ENEM" && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Somente questões oficiais
              </div>
            )}

            <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={applyMobileFilters}
                disabled={isFilterPending}
                className="inline-flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
              >
                {isFilterPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                Aplicar filtros
              </button>
            </div>
          </div>
        </section>

        <section className="order-3 rounded-[24px] border border-white/80 bg-white p-3 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
              <ListChecks className="h-4 w-4 text-blue-600" />
              Navegação
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {(pagination?.total ?? filteredQuestions.length).toLocaleString("pt-BR")} questões
            </span>
          </div>
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1 thin-scrollbar">
            {filteredQuestions.map((q, idx) => {
              const isActive = q.id === activeQuestion.id;
              const wasDone = serverAnswered.has(q.id);
              const isDone = !!result[q.id] || wasDone;
              const isCorrect = result[q.id]?.correct;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goToQuestion(q.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : isDone
                        ? isCorrect
                          ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
                          : wasDone
                            ? "border-blue-100 bg-blue-50/70 text-blue-800"
                            : "border-rose-100 bg-rose-50/70 text-rose-800"
                        : "border-slate-100 bg-white text-slate-700 hover:border-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      isActive
                        ? "bg-white/30 text-white"
                        : isDone
                          ? isCorrect
                            ? "bg-emerald-100 text-emerald-700"
                            : wasDone
                              ? "bg-blue-100 text-blue-700"
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
                    ) : wasDone ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">
                        feita
                      </span>
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
          {pagination && pagination.pages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 px-2 pt-3 text-[11px] font-black text-slate-500">
              {pagination.page > 1 ? <FastLink className="rounded-md border border-slate-200 px-2.5 py-1.5 hover:border-blue-300 hover:text-blue-700 active:scale-[0.99]" href={pageHref(pagination.page - 1)}>Anterior</FastLink> : <span />}
              <span>{pagination.page}/{pagination.pages}</span>
              {pagination.page < pagination.pages ? <FastLink className="rounded-md border border-slate-200 px-2.5 py-1.5 hover:border-blue-300 hover:text-blue-700 active:scale-[0.99]" href={pageHref(pagination.page + 1)}>Proxima</FastLink> : <span />}
            </div>
          )}
        </section>
      </aside>

      {/* Questão principal */}
      <motion.article
        ref={articleRef}
        key={activeQuestion.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "order-2 relative overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_55px_-30px_rgba(15,23,42,0.36)] lg:order-2",
          articleGlowClass,
          articleShakeClass,
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2563EB_0%,#22D3EE_48%,#FF7A1A_100%)]" />

        <header className="relative border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-orange-50 px-5 pb-4 pt-6 md:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-stretch gap-3">
              <span className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 to-cyan-400" aria-hidden />
              <div>
                <h2 className="font-display text-xl font-extrabold text-slate-950">
                  Questão {activeQuestion.questionNumber ?? activeQuestionPosition}
                </h2>
                <p className="mt-0.5 text-sm font-bold text-blue-700">{editionLabel}</p>
                {activeQuestion.day && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {activeQuestion.day.toLowerCase().includes("dia")
                      ? activeQuestion.day
                      : `${activeQuestion.day}º dia`}
                  </p>
                )}
                {(activeQuestion.officialLanguage === "ENGLISH" ||
                  activeQuestion.officialLanguage === "SPANISH") && (
                  <p className="mt-1 text-xs font-black text-violet-700">
                    Língua estrangeira: {activeQuestion.officialLanguage === "ENGLISH" ? "Inglês" : "Espanhol"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold">
                <Clock3 className="h-3.5 w-3.5" style={{ color: timerColor }} />
                <span style={{ color: timerColor }}>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
              </span>
              <button type="button" onClick={() => void toggleFavorite(activeQuestion.id)} title={favorites.has(activeQuestion.id) ? "Remover dos favoritos" : "Favoritar questão"} aria-label={favorites.has(activeQuestion.id) ? "Remover dos favoritos" : "Favoritar questão"} className={`flex h-9 w-9 items-center justify-center rounded-md border transition ${favorites.has(activeQuestion.id) ? "border-amber-200 bg-amber-50 text-amber-600" : "border-slate-200 bg-white text-slate-500 hover:text-amber-600"}`}>
                <Bookmark className="h-4 w-4" fill={favorites.has(activeQuestion.id) ? "currentColor" : "none"} />
              </button>
              <button type="button" onClick={() => void reportQuestion(activeQuestion.id)} title="Reportar erro" aria-label="Reportar erro na questão" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600">
                <Flag className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold text-slate-500">
            {activeQuestion.sourceType === "OFFICIAL" && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Questão oficial
              </span>
            )}
            {activeQuestion.sourceType === "OFFICIAL" && activeQuestion.sourceUrl && (
              <a
                href={activeQuestion.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 underline-offset-2 hover:underline"
              >
                <BookOpenText className="h-3.5 w-3.5" />
                Página original
              </a>
            )}
            {activeQuestion.subject?.name && <span>{activeQuestion.subject.name}</span>}
            {activeQuestion.topic?.name && <span>{activeQuestion.topic.name}</span>}
            <span className="inline-flex items-center gap-1" style={{ color: diff.text }}>
              <Flame className="h-3.5 w-3.5" />
              {diff.label}
            </span>
            <span className="ml-auto text-slate-400">
              {activeQuestionPosition} de {pagination?.total ?? filteredQuestions.length}
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-[780px] px-5 py-7 md:px-8 md:py-9">
          {!usesPromptFacsimile && questionParts.supportText && (
            <div className="relative">
              <QuestionRichText
                value={supportDisplay?.content ?? questionParts.supportText}
                className="text-pretty text-[15px] font-normal leading-7 text-slate-800 md:text-base md:leading-8"
              />
              {(supportDisplay?.reference || activeQuestion.sourceCitation || activeQuestion.sourceAccessedAt) && (
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  {supportDisplay?.reference}
                  {supportDisplay?.reference && activeQuestion.sourceCitation ? " " : ""}
                  {activeQuestion.sourceCitation}
                  {activeQuestion.sourceAccessedAt
                    ? ` Acesso em: ${activeQuestion.sourceAccessedAt}.`
                    : ""}
                </p>
              )}
            </div>
          )}

          {(() => {
            if (!displayedQuestionImages.length) return null;

            return (
              <div
                className={cn(
                  "relative mx-auto grid max-w-3xl gap-4",
                  !usesPromptFacsimile && questionParts.supportText ? "mt-6" : "",
                )}
              >
                {usesPromptFacsimile && (
                  <p className="text-center text-xs font-bold text-slate-500">
                    Enunciado oficial diagramado · toque para ampliar
                  </p>
                )}
                {displayedQuestionImages.map((image, index) => (
                  <figure
                    key={image.url}
                    className="overflow-hidden rounded-md border border-slate-200 bg-white p-1.5 md:p-2"
                  >
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full cursor-zoom-in"
                      aria-label="Abrir imagem oficial em tamanho original"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.altText || image.description || `Elemento visual ${index + 1} da questão`}
                        className={cn(
                          "mx-auto block h-auto object-contain",
                          usesPromptFacsimile
                            ? "w-full max-w-full"
                            : "max-h-[380px] w-auto max-w-full",
                        )}
                      />
                    </a>
                  </figure>
                ))}
              </div>
            );
          })()}

          {usesPromptFacsimile ? (
            <p className="sr-only">
              {richTextToPlainText(`${questionParts.supportText ?? ""} ${questionParts.prompt}`)}
            </p>
          ) : (
            <QuestionRichText
              value={questionParts.prompt}
              className={cn(
                "relative text-pretty text-base leading-7 text-slate-950 md:text-[17px] md:leading-8",
                questionParts.supportText || activeQuestion.imageUrl || activeQuestion.images.length
                  ? "mt-7 font-semibold"
                  : "font-normal",
              )}
            />
          )}

          {isAnnulled && (
            <div className="relative mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-extrabold">Questão anulada pelo gabarito oficial</p>
              <p>Você pode responder para estudo, mas a escolha não será marcada como certa ou errada e não contará pontos.</p>
            </div>
          )}

          <div className="relative mt-7 space-y-3" role="radiogroup" aria-label="Alternativas da questão">
          {activeQuestion.alternatives.map((alt) => {
            const isSelected = currentSelected === alt.key;
            const shouldShowAlternativeImage = Boolean(alt.imageUrl) && !usesPromptFacsimile;
            const isEliminated = eliminatedForQuestion.has(alt.key);
            const showResult = isAnswered;
            const isAnnulledResult = showResult && Boolean(currentResult.annulled);
            const isCorrectAnswer =
              showResult &&
              !isAnnulledResult &&
              alt.key === currentResult?.correctAlternative;
            const isJustAnsweredCorrect = showResult && isCorrectAnswer;
            const isJustAnsweredWrong = showResult && isSelected && !currentResult.correct && !isAnnulledResult;
            let stateStyles = "border-slate-200 bg-white text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md";
            if (showResult) {
              if (isAnnulledResult && isSelected) {
                stateStyles = "border-amber-400 bg-amber-50 text-amber-950";
              } else if (isAnnulledResult) {
                stateStyles = "border-slate-100 bg-slate-50/60 text-slate-500";
              } else if (isCorrectAnswer) {
                stateStyles = "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-[0_12px_28px_-20px_rgba(16,185,129,0.8)]";
              } else if (isSelected && !currentResult.correct) {
                stateStyles = "border-rose-400 bg-rose-50 text-rose-900 shadow-[0_12px_28px_-20px_rgba(244,63,94,0.75)]";
              } else {
                stateStyles = "border-slate-100 bg-slate-50/60 text-slate-500";
              }
            } else if (isSelected) {
              stateStyles = "border-blue-500 bg-blue-600 text-white shadow-[0_16px_30px_-20px_rgba(37,99,235,0.9)]";
            } else if (isEliminated) {
              stateStyles = "border-slate-200 bg-slate-50 text-slate-400";
            }

            return (
              <motion.div
                key={alt.key}
                ref={(el) => {
                  altRefs.current[alt.key] = el;
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: isEliminated && !showResult ? 0.45 : 1,
                  y: 0,
                  scale: isJustAnsweredCorrect ? [1, 1.01, 1] : isJustAnsweredWrong ? [1, 0.99, 1] : 1,
                }}
                transition={{
                  duration: 0.32,
                  ease: [0.22, 1, 0.36, 1],
                  scale: { duration: 0.45 },
                }}
                className={cn(
                  "group relative flex w-full items-stretch rounded-2xl border text-left text-sm transition-all focus-within:z-10 focus-within:ring-4 focus-within:ring-blue-100",
                  stateStyles,
                  isCorrectAnswer && showResult ? "animate-pulse-green" : "",
                  isJustAnsweredWrong ? "animate-pulse-red" : "",
                )}
              >
                <motion.button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isAnswered || currentSubmitting || isEliminated}
                  onClick={() =>
                    setSelected((s) => ({ ...s, [activeQuestion.id]: alt.key }))
                  }
                  whileTap={!isAnswered && !currentSubmitting && !isEliminated ? { scale: 0.98 } : undefined}
                  className={cn(
                    "relative flex min-h-[58px] flex-1 items-start gap-3 px-2 py-3.5 pr-12 text-left focus:outline-none md:px-3",
                    isEliminated && !showResult ? "cursor-not-allowed" : "",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      showResult && isCorrectAnswer
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : showResult && isSelected && !currentResult.correct && !isAnnulledResult
                          ? "border-rose-500 bg-rose-500 text-white"
                          : isSelected
                            ? "border-white bg-white/20"
                            : "border-slate-300 bg-white",
                    )}
                  >
                    {isSelected && !showResult && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    {showResult && isCorrectAnswer && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {showResult && isSelected && !currentResult.correct && !isAnnulledResult && <XCircle className="h-3.5 w-3.5" />}
                  </span>
                  <span className={cn("w-7 shrink-0 pt-px font-extrabold", isSelected && !showResult ? "text-white" : "text-blue-700")}>
                    {alt.key})
                  </span>
                  <span className={cn("relative flex-1 leading-6", isEliminated && !showResult ? "line-through text-slate-400" : "")}>
                    <QuestionRichText value={alt.text} inline />
                    {shouldShowAlternativeImage && (
                      <span className="mt-3 block overflow-hidden rounded-xl border border-current/10 bg-white/90 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={alt.imageUrl!}
                          alt={`Representação oficial da alternativa ${alt.key}`}
                          className="mx-auto h-auto max-h-40 max-w-full object-contain"
                        />
                      </span>
                    )}
                  </span>
                  <AnimatePresence>
                    {showResult && isCorrectAnswer && (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="text-xs font-bold text-emerald-700">Correta</span>
                      </motion.span>
                    )}
                    {showResult && isSelected && !currentResult.correct && !isAnnulledResult && (
                      <motion.span
                        key="x"
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: [0, -10, 10, -6, 6, 0] }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="text-xs font-bold text-rose-700">Sua resposta</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                <button
                  type="button"
                  onClick={() => toggleEliminated(activeQuestion.id, alt.key)}
                  disabled={showResult || currentSubmitting}
                  aria-label={isEliminated ? `Restaurar alternativa ${alt.key}` : `Eliminar alternativa ${alt.key}`}
                  aria-pressed={isEliminated}
                  title={isEliminated ? "Restaurar alternativa" : "Eliminar alternativa"}
                  className={cn(
                    "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200",
                    isEliminated ? "text-slate-600" : "",
                    isSelected && !showResult ? "text-white/70 hover:bg-white/15 hover:text-white" : "",
                    showResult || currentSubmitting ? "invisible" : "",
                  )}
                >
                  <CircleX className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {currentRevealPhase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative mt-6 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-4 text-sm font-bold text-blue-700"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-5 w-5 animate-spin" />
              Validando sua resposta...
            </motion.div>
          )}
          {isAnswered && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: currentResult.correct ? [0.96, 1.03, 1] : 1,
                x: currentResultAnnulled || currentResult.correct ? 0 : [0, -5, 5, -3, 3, 0],
              }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative mt-7 rounded-3xl border p-5 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.38)]",
                currentResultAnnulled
                  ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white"
                  : currentResult.correct
                    ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white"
                    : "border-rose-300 bg-gradient-to-br from-rose-50 to-white",
              )}
            >
              <div className="relative flex items-center gap-2">
                {currentResult.correct ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: [0, 1.18, 1], rotate: [0, -12, 8, 0] }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </motion.span>
                ) : (
                  <motion.span
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: [0, 1.12, 1], rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <AlertTriangle
                      className={cn(
                        "h-5 w-5",
                        currentResultAnnulled ? "text-amber-600" : "text-rose-600",
                      )}
                    />
                  </motion.span>
                )}
                <h3
                  className={cn(
                    "sr-only",
                    currentResultAnnulled
                      ? "text-amber-900"
                      : currentResult.correct
                        ? "text-emerald-800"
                        : "text-rose-800",
                  )}
                >
                  {currentResultAnnulled
                    ? "Questão anulada."
                    : currentResult.correct
                      ? "Boa! Você acertou."
                      : "Quase lá, revise com calma."}
                </h3>
                <h3
                  className={cn(
                    "text-sm font-bold",
                    currentResultAnnulled
                      ? "text-amber-900"
                      : currentResult.correct
                        ? "text-emerald-800"
                        : "text-rose-800",
                  )}
                >
                  {currentResultAnnulled
                    ? "Questão anulada"
                    : currentResult.correct
                      ? "Resposta correta"
                      : "Resposta incorreta"}
                </h3>
                {!currentResultAnnulled && <motion.span
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
                </motion.span>}
              </div>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-700">
                {currentResultAnnulled
                  ? `Você escolheu a alternativa ${currentSelected}. O item não possui alternativa válida no gabarito oficial e não pontua.`
                  : currentResult.correct
                    ? `Você escolheu a alternativa ${currentSelected}, que é a alternativa correta para essa questão.`
                    : `A alternativa correta é a ${currentResult.correctAlternative}.`}
              </p>
              <AnimatePresence>
                {currentRevealPhase === "explanation" && (
                  <motion.div
                    key="explanation"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="relative mt-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Resolução
                    </p>
                    <QuestionRichText
                      value={currentResult.explanation}
                      className="mt-2 text-sm leading-relaxed text-slate-700"
                    />
                    {currentResult.alternativeExplanations[currentSelected ?? ""] && (
                      <p className="mt-3 border-l-2 border-slate-300 pl-3 text-xs font-semibold leading-5 text-slate-600">
                        Alternativa {currentSelected}:{" "}
                        <QuestionRichText
                          value={currentResult.alternativeExplanations[currentSelected ?? ""]}
                          inline
                        />
                      </p>
                    )}
                    {currentResult.pedagogyComment && (
                      <p className="mt-2 text-xs italic text-slate-500">
                        {currentResult.pedagogyComment}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {errorMode && (
                <button
                  type="button"
                  onClick={() => markReviewed(activeQuestion)}
                  disabled={currentReviewed || currentReviewLoading}
                  className={cn(
                    "relative mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
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
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
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
                "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-all",
                !currentSelected || currentSubmitting
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "shadow-[0_12px_28px_-12px_rgba(37,99,235,0.55)] hover:shadow-[0_16px_34px_-12px_rgba(37,99,235,0.65)]",
              )}
              style={currentSelected && !currentSubmitting ? { background: "#2563EB" } : undefined}
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
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {currentReviewLoading ? "Marcando..." : "Concluir revisão"}
                </button>
              )}
              <motion.button
                type="button"
                onClick={goNext}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(37,99,235,0.8)] transition hover:-translate-y-0.5"
              >
                Próxima questão
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </footer>
        </div>
      </motion.article>
    </div>
  );
}
