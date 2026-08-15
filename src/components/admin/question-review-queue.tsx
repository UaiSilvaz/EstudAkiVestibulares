"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Video,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { ImageDropZone } from "@/components/admin/image-drop-zone";

type Option = { id: string; name: string; subjectId?: string; logo?: string | null; color?: string | null };
type Alternative = { key: string; text: string; imageUrl?: string | null };
type ImageItem = { url: string; description?: string; altText?: string; order?: number };

type QuestionItem = {
  id: string;
  vestibularId: string;
  subjectId: string;
  topicId: string | null;
  year: number;
  exam: string | null;
  phase: string | null;
  day: string | null;
  questionNumber: number | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  statement: string;
  supportText: string | null;
  alternatives: string;
  alternativeExplanations: string;
  correctAlternative: string;
  explanation: string;
  videoUrl: string | null;
  pedagogyComment: string | null;
  skill: string | null;
  imageUrl: string | null;
  images: string;
  tags: string;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceCitation: string | null;
  sourceAccessedAt: string | null;
  sourceType: "OFFICIAL" | "WEB_PUBLIC" | "LICENSE_REQUIRED" | "AUTHORIAL";
  reviewState: "PENDING_REVIEW" | "APPROVED" | "HAS_ERROR";
  reviewNotes: string | null;
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
  vestibular: Option;
  subject: Option;
  topic: Option | null;
  _count: { reports: number };
};

const emptyFilters = {
  search: "",
  vestibularId: "",
  subjectId: "",
  topicId: "",
  year: "",
  difficulty: "",
  sourceType: "",
  reviewState: "",
  status: "",
};

const difficultyOptions = [
  { value: "EASY", label: "Fácil" },
  { value: "MEDIUM", label: "Média" },
  { value: "HARD", label: "Difícil" },
];

const sourceTypeOptions = [
  { value: "OFFICIAL", label: "Oficial" },
  { value: "WEB_PUBLIC", label: "Web pública" },
  { value: "LICENSE_REQUIRED", label: "Licenciável" },
  { value: "AUTHORIAL", label: "Autoral" },
];

const reviewStateOptions = [
  { value: "PENDING_REVIEW", label: "Pendente" },
  { value: "APPROVED", label: "Aprovada" },
  { value: "HAS_ERROR", label: "Com erro" },
];

const statusOptions = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "REVIEW", label: "Revisão" },
  { value: "PUBLISHED", label: "Publicada" },
  { value: "ARCHIVED", label: "Arquivada" },
];

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyTags(value: string) {
  return JSON.stringify(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
}

function tagsText(item: QuestionItem) {
  return parseJson<string[]>(item.tags, []).join(", ");
}

function alternativesOf(item: QuestionItem) {
  return parseJson<Alternative[]>(item.alternatives, []);
}

function explanationsOf(item: QuestionItem) {
  return parseJson<Record<string, string>>(item.alternativeExplanations, {});
}

function imagesOf(item: QuestionItem) {
  const parsed = parseJson<Array<ImageItem | string>>(item.images, []);
  const images = parsed
    .map((image, index) =>
      typeof image === "string" ? { url: image, order: index } : image,
    )
    .filter((image) => Boolean(image.url));
  if (item.imageUrl && !images.some((image) => image.url === item.imageUrl)) {
    images.unshift({ url: item.imageUrl, order: -1 });
  }
  return images;
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "Operação não concluída.";
  } catch {
    return "Operação não concluída.";
  }
}

export function QuestionReviewQueue({
  vestibulares,
  subjects,
  topics,
  yearsByVestibular,
}: {
  vestibulares: Option[];
  subjects: Option[];
  topics: Option[];
  yearsByVestibular: Record<string, Array<{ year: number; count: number }>>;
}) {
  const { notify, confirm: confirmAction } = useFeedback();
  const [filters, setFilters] = useState(emptyFilters);
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<string, File[]>>({});
  const [alternativeImageFiles, setAlternativeImageFiles] = useState<Record<string, File[]>>({});
  const [removeImages, setRemoveImages] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredTopics = useMemo(
    () => topics.filter((topic) => !filters.subjectId || topic.subjectId === filters.subjectId),
    [filters.subjectId, topics],
  );
  const selectedVestibular = useMemo(
    () => vestibulares.find((item) => item.id === filters.vestibularId) ?? null,
    [filters.vestibularId, vestibulares],
  );
  const availableYears = selectedVestibular ? yearsByVestibular[selectedVestibular.id] ?? [] : [];
  const canShowQuestions = Boolean(filters.vestibularId && filters.year);

  const load = useCallback(async () => {
    if (!canShowQuestions) {
      setItems([]);
      setTotal(0);
      setPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const response = await fetch(`/api/admin/questions?${params.toString()}`);
    if (!response.ok) {
      const error = await readErrorMessage(response);
      setMessage({ type: "error", text: error });
      notify({ tone: "error", title: "Questões não carregadas", message: error });
      setLoading(false);
      return;
    }
    const data = (await response.json()) as {
      items: QuestionItem[];
      page: number;
      pages: number;
      total: number;
    };
    setItems(data.items);
    setPages(data.pages);
    setTotal(data.total);
    setLoading(false);
  }, [canShowQuestions, filters, notify, page]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  function updateLocal(id: string, patch: Partial<QuestionItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateAlternatives(item: QuestionItem, alternatives: Alternative[]) {
    updateLocal(item.id, { alternatives: JSON.stringify(alternatives) });
  }

  function updateAlternativeText(item: QuestionItem, key: string, text: string) {
    updateAlternatives(
      item,
      alternativesOf(item).map((alternative) => (alternative.key === key ? { ...alternative, text } : alternative)),
    );
  }

  function updateAlternativeImage(item: QuestionItem, key: string, imageUrl: string) {
    updateAlternatives(
      item,
      alternativesOf(item).map((alternative) =>
        alternative.key === key ? { ...alternative, imageUrl: imageUrl || null } : alternative,
      ),
    );
  }

  function updateAlternativeExplanation(item: QuestionItem, key: string, text: string) {
    const explanations = explanationsOf(item);
    updateLocal(item.id, {
      alternativeExplanations: JSON.stringify({ ...explanations, [key]: text }),
    });
  }

  function removeQuestionImage(item: QuestionItem, url: string) {
    const remaining = imagesOf(item).filter((image) => image.url !== url);
    updateLocal(item.id, {
      images: JSON.stringify(remaining),
      imageUrl: remaining[0]?.url ?? null,
    });
  }

  function addAlternative(item: QuestionItem) {
    const alternatives = alternativesOf(item);
    const key = letters[alternatives.length];
    if (!key) return;
    updateAlternatives(item, [...alternatives, { key, text: "", imageUrl: null }]);
  }

  function removeAlternative(item: QuestionItem, key: string) {
    const previousAlternatives = alternativesOf(item);
    const survivors = previousAlternatives.filter((alternative) => alternative.key !== key);
    const alternatives = survivors.map((alternative, index) => ({
      ...alternative,
      key: letters[index],
    }));
    const explanations = explanationsOf(item);
    const nextExplanations = Object.fromEntries(
      survivors.map((alternative, index) => [
        letters[index],
        explanations[alternative.key] ?? "",
      ]),
    );
    const correctIndex = survivors.findIndex(
      (alternative) => alternative.key === item.correctAlternative,
    );
    setAlternativeImageFiles((current) => {
      const retained = Object.fromEntries(
        Object.entries(current).filter(([fileKey]) => !fileKey.startsWith(`${item.id}:`)),
      );
      survivors.forEach((alternative, index) => {
        const files = current[`${item.id}:${alternative.key}`];
        if (files?.length) retained[`${item.id}:${letters[index]}`] = files;
      });
      return retained;
    });
    updateLocal(item.id, {
      alternatives: JSON.stringify(alternatives),
      alternativeExplanations: JSON.stringify(nextExplanations),
      correctAlternative:
        correctIndex >= 0 ? letters[correctIndex] : alternatives[0]?.key ?? "A",
    });
  }

  async function save(item: QuestionItem) {
    setSavingId(item.id);
    setMessage(null);

    const formData = new FormData();
    formData.set("id", item.id);
    formData.set("vestibularId", item.vestibularId);
    formData.set("subjectId", item.subjectId);
    formData.set("topicId", item.topicId ?? "");
    formData.set("year", String(item.year));
    formData.set("exam", item.exam ?? "");
    formData.set("phase", item.phase ?? "");
    formData.set("day", item.day ?? "");
    formData.set("questionNumber", item.questionNumber ? String(item.questionNumber) : "");
    formData.set("difficulty", item.difficulty);
    formData.set("supportText", item.supportText ?? "");
    formData.set("statement", item.statement);
    formData.set("alternatives", item.alternatives);
    formData.set("alternativeExplanations", item.alternativeExplanations || "{}");
    formData.set("correctAlternative", item.correctAlternative);
    formData.set("explanation", item.explanation);
    formData.set("videoUrl", item.videoUrl ?? "");
    formData.set("pedagogyComment", item.pedagogyComment ?? "");
    formData.set("skill", item.skill ?? "");
    formData.set("tags", item.tags || "[]");
    formData.set("sourceName", item.sourceName ?? "");
    formData.set("sourceUrl", item.sourceUrl ?? "");
    formData.set("sourceCitation", item.sourceCitation ?? "");
    formData.set("sourceAccessedAt", item.sourceAccessedAt ?? "");
    formData.set("sourceType", item.sourceType);
    formData.set("reviewState", item.reviewState);
    formData.set("reviewNotes", item.reviewNotes ?? "");
    formData.set("status", item.status);
    formData.set("imageUrl", removeImages[item.id] ? "" : item.imageUrl ?? "");
    formData.set("storedImages", removeImages[item.id] ? "[]" : JSON.stringify(imagesOf(item)));
    formData.set("removeImage", removeImages[item.id] ? "true" : "false");
    const questionImageFiles = imageFiles[item.id] ?? [];
    questionImageFiles.forEach((file) => formData.append("images", file));
    alternativesOf(item).forEach((alternative) => {
      const alternativeFile = alternativeImageFiles[`${item.id}:${alternative.key}`]?.[0];
      if (alternativeFile) formData.set(`alternativeImage_${alternative.key}`, alternativeFile);
    });

    const response = await fetch("/api/admin/questions", { method: "PATCH", body: formData });
    setSavingId(null);

    if (!response.ok) {
      const error = await readErrorMessage(response);
      setMessage({ type: "error", text: error });
      notify({ tone: "error", title: "Alteração não salva", message: error });
      return;
    }

    setMessage({ type: "success", text: "Questão atualizada." });
    const uploadedImages = questionImageFiles.length +
      alternativesOf(item).filter(
        (alternative) => (alternativeImageFiles[`${item.id}:${alternative.key}`]?.length ?? 0) > 0,
      ).length;
    notify({
      tone: "success",
      title: item.status === "PUBLISHED" ? "Alteração publicada" : "Questão atualizada",
      message: uploadedImages
        ? `${uploadedImages} imagem(ns) enviada(s) com sucesso.`
        : "Todas as alterações foram salvas.",
    });
    setImageFiles((current) => ({ ...current, [item.id]: [] }));
    setAlternativeImageFiles((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${item.id}:`)),
      ),
    );
    setRemoveImages((current) => ({ ...current, [item.id]: false }));
    await load();
  }

  async function deleteQuestion(item: QuestionItem) {
    const confirmed = await confirmAction({
      title: "Excluir esta questão?",
      message: "Essa ação remove a questão, alternativas, imagens e registros vinculados. Não é possível desfazer.",
      confirmLabel: "Excluir definitivamente",
      cancelLabel: "Manter questão",
      tone: "danger",
    });
    if (!confirmed) return;
    setDeletingId(item.id);
    const response = await fetch(`/api/admin/questions?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    setDeletingId(null);

    if (!response.ok) {
      const error = await readErrorMessage(response);
      setMessage({ type: "error", text: error });
      notify({ tone: "error", title: "Questão não excluída", message: error });
      return;
    }

    setItems((current) => current.filter((question) => question.id !== item.id));
    setTotal((current) => Math.max(0, current - 1));
    setMessage({ type: "success", text: "Questão excluída." });
    notify({
      tone: "success",
      title: "Questão excluída",
      message: "O banco de questões foi atualizado.",
    });
  }

  function selectVestibular(id: string) {
    setOpenId(null);
    setPage(1);
    setFilters({ ...emptyFilters, vestibularId: id });
  }

  function selectYear(year: number) {
    setOpenId(null);
    setPage(1);
    setFilters((current) => ({ ...current, year: String(year) }));
  }

  function backToVestibulares() {
    setOpenId(null);
    setPage(1);
    setFilters(emptyFilters);
  }

  function backToYears() {
    setOpenId(null);
    setPage(1);
    setFilters((current) => ({ ...current, year: "" }));
  }

  return (
    <section className="mb-6 rounded-[8px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Banco administrável</p>
          <h2 className="font-display text-2xl font-black text-[#0F172A]">Questões cadastradas</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {selectedVestibular && filters.year
              ? `${total.toLocaleString("pt-BR")} questão(ões) em ${selectedVestibular.name} ${filters.year}.`
              : "Escolha um vestibular e um ano para revisar, editar imagens e adicionar resoluções."}
          </p>
        </div>
        {message && (
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>

      {!selectedVestibular && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {vestibulares.map((vestibular) => {
            const years = yearsByVestibular[vestibular.id] ?? [];
            const count = years.reduce((sum, item) => sum + item.count, 0);
            const initials = vestibular.name
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 3)
              .toUpperCase();

            return (
              <button
                key={vestibular.id}
                type="button"
                onClick={() => selectVestibular(vestibular.id)}
                className="group flex min-h-28 items-center gap-4 rounded-[8px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:scale-[0.99]"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-slate-100 bg-slate-50">
                  {vestibular.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={vestibular.logo} alt={vestibular.name} className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-sm font-black text-blue-700">{initials}</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-black text-slate-950">{vestibular.name}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">
                    {count.toLocaleString("pt-BR")} questões em {years.length} ano(s)
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedVestibular && !filters.year && (
        <div className="mt-5 rounded-[8px] border border-blue-100 bg-blue-50/40 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={backToVestibulares} className="ek-button ek-button-ghost">
              <ArrowLeft className="h-4 w-4" />
              Voltar aos vestibulares
            </button>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                {selectedVestibular.name}
              </p>
              <p className="text-sm font-bold text-slate-600">Selecione o ano para abrir as questões.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {availableYears.map((item) => (
              <button
                key={item.year}
                type="button"
                onClick={() => selectYear(item.year)}
                className="rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md active:scale-[0.99]"
              >
                <span className="block text-lg font-black text-slate-950">{item.year}</span>
                <span className="text-xs font-bold text-slate-500">{item.count.toLocaleString("pt-BR")} questões</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedVestibular && filters.year && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={backToYears} className="ek-button ek-button-ghost">
            <ArrowLeft className="h-4 w-4" />
            Trocar ano
          </button>
          <button type="button" onClick={backToVestibulares} className="ek-button ek-button-ghost">
            Voltar aos vestibulares
          </button>
        </div>
      )}

      {selectedVestibular && (
        <details className="mt-5 rounded-[8px] border border-slate-200 bg-slate-50/60 p-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-slate-700">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            Buscar questoes e filtros
            <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
          </summary>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="ek-input ek-input-with-icon w-full !pl-11"
            placeholder="Buscar enunciado, prova ou fonte"
            value={filters.search}
            onChange={(event) => {
              setPage(1);
              setFilters({ ...filters, search: event.target.value });
            }}
          />
        </label>
        <FilterSelect
          value={filters.vestibularId}
          onChange={(value) => {
            setPage(1);
            setFilters({ ...filters, vestibularId: value });
          }}
          empty="Todos os vestibulares"
          options={vestibulares.map((item) => ({ value: item.id, label: item.name }))}
        />
        <FilterSelect
          value={filters.subjectId}
          onChange={(value) => {
            setPage(1);
            setFilters({ ...filters, subjectId: value, topicId: "" });
          }}
          empty="Todas as matérias"
          options={subjects.map((item) => ({ value: item.id, label: item.name }))}
        />
        <FilterSelect
          value={filters.topicId}
          onChange={(value) => {
            setPage(1);
            setFilters({ ...filters, topicId: value });
          }}
          empty="Todos os conteúdos"
          options={filteredTopics.map((item) => ({ value: item.id, label: item.name }))}
        />
        <input
          className="ek-input w-full"
          type="number"
          placeholder="Ano"
          value={filters.year}
          onChange={(event) => {
            setPage(1);
            setFilters({ ...filters, year: event.target.value });
          }}
        />
        <FilterSelect
          value={filters.difficulty}
          onChange={(value) => {
            setPage(1);
            setFilters({ ...filters, difficulty: value });
          }}
          empty="Todas as dificuldades"
          options={difficultyOptions}
        />
        <FilterSelect
          value={filters.sourceType}
          onChange={(value) => {
            setPage(1);
            setFilters({ ...filters, sourceType: value });
          }}
          empty="Todas as fontes"
          options={sourceTypeOptions}
        />
        <FilterSelect
          value={filters.reviewState}
          onChange={(value) => {
            setPage(1);
            setFilters({ ...filters, reviewState: value });
          }}
          empty="Toda revisão"
          options={reviewStateOptions}
        />
        <FilterSelect
          value={filters.status}
          onChange={(value) => {
            setPage(1);
            setFilters({ ...filters, status: value });
          }}
          empty="Todos os status"
          options={statusOptions}
        />
          </div>
        </details>
      )}

      {canShowQuestions && (
        <>
          <div className="mt-5 space-y-2">
        {loading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-[8px] bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
            Nenhuma questão corresponde aos filtros.
          </p>
        ) : (
          items.map((item) => {
            const open = openId === item.id;
            const alternatives = alternativesOf(item);
            const explanations = explanationsOf(item);
            const questionImageFiles = imageFiles[item.id] ?? [];
            const markedForRemoval = removeImages[item.id];
            const questionImages = markedForRemoval ? [] : imagesOf(item);

            return (
              <article key={item.id} className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
                <button type="button" onClick={() => setOpenId(open ? null : item.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${
                      item.reviewState === "HAS_ERROR"
                        ? "bg-rose-100 text-rose-600"
                        : item.reviewState === "APPROVED"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {item.reviewState === "HAS_ERROR" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                      {item.vestibular.name} - {item.year} - {item.subject.name} - {item.topic?.name ?? "Sem conteúdo"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-700">{item.statement}</p>
                  </div>
                  <div className="hidden text-right md:block">
                    <p className="text-xs font-black text-slate-600">{item.status}</p>
                    <p className="text-[10px] font-bold text-slate-400">{item._count.reports} denuncia(s)</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="grid gap-4 border-t border-slate-100 bg-slate-50/60 p-4 xl:grid-cols-[1fr_360px]">
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <EditField label="Ano">
                          <input className="ek-input w-full" type="number" value={item.year} onChange={(event) => updateLocal(item.id, { year: Number(event.target.value) })} />
                        </EditField>
                        <EditField label="Número">
                          <input className="ek-input w-full" type="number" value={item.questionNumber ?? ""} onChange={(event) => updateLocal(item.id, { questionNumber: Number(event.target.value) || null })} />
                        </EditField>
                        <EditField label="Dificuldade">
                          <FilterSelect value={item.difficulty} onChange={(value) => updateLocal(item.id, { difficulty: value as QuestionItem["difficulty"] })} empty="Dificuldade" options={difficultyOptions} />
                        </EditField>
                        <EditField label="Status">
                          <FilterSelect value={item.status} onChange={(value) => updateLocal(item.id, { status: value as QuestionItem["status"] })} empty="Status" options={statusOptions} />
                        </EditField>
                        <EditField label="Vestibular">
                          <FilterSelect value={item.vestibularId} onChange={(value) => updateLocal(item.id, { vestibularId: value })} empty="Vestibular" options={vestibulares.map((option) => ({ value: option.id, label: option.name }))} />
                        </EditField>
                        <EditField label="Matéria">
                          <FilterSelect value={item.subjectId} onChange={(value) => updateLocal(item.id, { subjectId: value, topicId: null })} empty="Matéria" options={subjects.map((option) => ({ value: option.id, label: option.name }))} />
                        </EditField>
                        <EditField label="Conteúdo">
                          <FilterSelect value={item.topicId ?? ""} onChange={(value) => updateLocal(item.id, { topicId: value || null })} empty="Conteúdo" options={topics.filter((option) => option.subjectId === item.subjectId).map((option) => ({ value: option.id, label: option.name }))} />
                        </EditField>
                        <EditField label="Revisão">
                          <FilterSelect value={item.reviewState} onChange={(value) => updateLocal(item.id, { reviewState: value as QuestionItem["reviewState"] })} empty="Revisão" options={reviewStateOptions} />
                        </EditField>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <EditField label="Prova">
                          <input className="ek-input w-full" value={item.exam ?? ""} onChange={(event) => updateLocal(item.id, { exam: event.target.value })} />
                        </EditField>
                        <EditField label="Fase">
                          <input className="ek-input w-full" value={item.phase ?? ""} onChange={(event) => updateLocal(item.id, { phase: event.target.value })} />
                        </EditField>
                        <EditField label="Dia">
                          <input className="ek-input w-full" value={item.day ?? ""} onChange={(event) => updateLocal(item.id, { day: event.target.value })} />
                        </EditField>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <EditArea label="Texto de apoio" value={item.supportText ?? ""} onChange={(value) => updateLocal(item.id, { supportText: value })} />
                        <EditArea label="Enunciado" value={item.statement} onChange={(value) => updateLocal(item.id, { statement: value })} />
                      </div>

                      <div className="rounded-[8px] border border-slate-200 bg-white p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Alternativas</span>
                          <button type="button" onClick={() => addAlternative(item)} className="inline-flex items-center gap-1.5 rounded-[8px] border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-700">
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                          </button>
                        </div>
                        <div className="space-y-3">
                          {alternatives.map((alternative) => (
                            <div key={alternative.key} className={`rounded-[8px] border p-3 ${item.correctAlternative === alternative.key ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
                              <div className="flex items-center gap-2">
                                <input type="radio" name={`correct-${item.id}`} checked={item.correctAlternative === alternative.key} onChange={() => updateLocal(item.id, { correctAlternative: alternative.key })} />
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-slate-200 text-xs font-black text-slate-700">{alternative.key}</span>
                                <input className="ek-input w-full" value={alternative.text} onChange={(event) => updateAlternativeText(item, alternative.key, event.target.value)} />
                                {alternatives.length > 2 && (
                                  <button type="button" onClick={() => removeAlternative(item, alternative.key)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remover alternativa ${alternative.key}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                              <textarea
                                className="ek-input mt-2 min-h-20 w-full"
                                placeholder={`Comentário da alternativa ${alternative.key}`}
                                value={explanations[alternative.key] ?? ""}
                                onChange={(event) => updateAlternativeExplanation(item, alternative.key, event.target.value)}
                              />
                              <div className="mt-2">
                                <input
                                  className="ek-input mb-2 w-full"
                                  placeholder={`URL da imagem da alternativa ${alternative.key}`}
                                  value={alternative.imageUrl ?? ""}
                                  onChange={(event) => updateAlternativeImage(item, alternative.key, event.target.value)}
                                />
                                <ImageDropZone
                                  files={alternativeImageFiles[`${item.id}:${alternative.key}`] ?? []}
                                  onFilesChange={(files) =>
                                    setAlternativeImageFiles((current) => ({
                                      ...current,
                                      [`${item.id}:${alternative.key}`]: files,
                                    }))
                                  }
                                  existingImages={
                                    alternative.imageUrl &&
                                    !(alternativeImageFiles[`${item.id}:${alternative.key}`]?.length)
                                      ? [{
                                          url: alternative.imageUrl,
                                          altText: `Imagem da alternativa ${alternative.key}`,
                                        }]
                                      : []
                                  }
                                  onRemoveExisting={() =>
                                    updateAlternativeImage(item, alternative.key, "")
                                  }
                                  label={`Imagem da alternativa ${alternative.key}`}
                                  compact
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <EditArea label="Resolução" value={item.explanation} onChange={(value) => updateLocal(item.id, { explanation: value })} />
                        <EditArea label="Comentário pedagógico" value={item.pedagogyComment ?? ""} onChange={(value) => updateLocal(item.id, { pedagogyComment: value })} />
                      </div>

                      <EditField label="Resolucao em video">
                        <input
                          className="ek-input w-full"
                          placeholder="URL do YouTube, Vimeo ou aula hospedada"
                          value={item.videoUrl ?? ""}
                          onChange={(event) => updateLocal(item.id, { videoUrl: event.target.value || null })}
                        />
                      </EditField>

                      <div className="grid gap-3 md:grid-cols-2">
                        <EditArea label="Observação da revisão" value={item.reviewNotes ?? ""} onChange={(value) => updateLocal(item.id, { reviewNotes: value })} />
                        <EditArea label="Habilidade" value={item.skill ?? ""} onChange={(value) => updateLocal(item.id, { skill: value })} />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <EditField label="Fonte">
                          <input className="ek-input w-full" value={item.sourceName ?? ""} onChange={(event) => updateLocal(item.id, { sourceName: event.target.value })} />
                        </EditField>
                        <EditField label="Tipo da fonte">
                          <FilterSelect value={item.sourceType} onChange={(value) => updateLocal(item.id, { sourceType: value as QuestionItem["sourceType"] })} empty="Tipo da fonte" options={sourceTypeOptions} />
                        </EditField>
                        <EditField label="URL da fonte">
                          <input className="ek-input w-full" value={item.sourceUrl ?? ""} onChange={(event) => updateLocal(item.id, { sourceUrl: event.target.value })} />
                        </EditField>
                        <EditField label="Acesso em">
                          <input className="ek-input w-full" value={item.sourceAccessedAt ?? ""} onChange={(event) => updateLocal(item.id, { sourceAccessedAt: event.target.value })} />
                        </EditField>
                        <EditArea label="Referência / citação" value={item.sourceCitation ?? ""} onChange={(value) => updateLocal(item.id, { sourceCitation: value })} />
                        <EditField label="Tags">
                          <input className="ek-input w-full" value={tagsText(item)} onChange={(event) => updateLocal(item.id, { tags: stringifyTags(event.target.value) })} />
                        </EditField>
                      </div>

                      <div className="rounded-[8px] border border-slate-200 bg-white p-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Imagens do enunciado
                        </span>
                        <ImageDropZone
                          files={questionImageFiles}
                          onFilesChange={(files) => {
                            setRemoveImages((current) => ({ ...current, [item.id]: false }));
                            setImageFiles((current) => ({ ...current, [item.id]: files }));
                          }}
                          existingImages={questionImages}
                          onRemoveExisting={(url) => removeQuestionImage(item, url)}
                          label="Cole ou arraste mais imagens"
                          description="Ctrl+V, arrastar e soltar ou selecionar. Você pode manter várias imagens."
                          multiple
                          compact
                        />
                        {(questionImages.length > 0 || questionImageFiles.length > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveImages((current) => ({ ...current, [item.id]: true }));
                              setImageFiles((current) => ({ ...current, [item.id]: [] }));
                            }}
                            className="mt-3 inline-flex items-center justify-center gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover todas
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                        <button type="button" disabled={savingId === item.id} onClick={() => void save(item)} className="ek-button ek-button-primary">
                          {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {savingId === item.id ? "Salvando..." : "Salvar alterações"}
                        </button>
                        <button type="button" disabled={deletingId === item.id} onClick={() => void deleteQuestion(item)} className="ek-button border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                          {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Excluir
                        </button>
                      </div>
                    </div>

                    <QuestionPreview item={item} imagePreviews={questionImages.map((image) => image.url)} />
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

          <div className="mt-5 flex items-center justify-between">
        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="ek-button ek-button-ghost">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span className="text-xs font-black text-slate-500">
          Página {page} de {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="ek-button ek-button-ghost">
          Próxima
          <ChevronRight className="h-4 w-4" />
        </button>
          </div>
        </>
      )}
    </section>
  );
}

function QuestionPreview({ item, imagePreviews }: { item: QuestionItem; imagePreviews: string[] }) {
  const alternatives = alternativesOf(item);

  return (
    <aside className="h-fit rounded-[8px] border border-blue-100 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(37,99,235,0.35)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-blue-50 text-blue-600">
          <Eye className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Previa</p>
          <p className="text-sm font-black text-slate-900">{item.vestibular?.name ?? "Questão"} - {item.year}</p>
        </div>
      </div>
      {item.supportText && <p className="mb-3 whitespace-pre-line rounded-[8px] bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">{item.supportText}</p>}
      {imagePreviews.length > 0 && (
        <div className="mb-3 grid gap-2">
          {imagePreviews.map((imagePreview, index) => (
            <div key={imagePreview} className="overflow-hidden rounded-[8px] border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt={`Imagem ${index + 1} da questão`}
                className="max-h-64 w-full object-contain"
              />
            </div>
          ))}
        </div>
      )}
      <p className="whitespace-pre-line text-sm font-bold leading-6 text-slate-900">{item.statement}</p>
      <div className="mt-4 space-y-2">
        {alternatives.map((alternative) => (
          <div key={alternative.key} className={`flex gap-2 rounded-[8px] border p-2 text-xs font-semibold ${alternative.key === item.correctAlternative ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black">{alternative.key}</span>
            <span className="flex-1">
              {alternative.text}
              {alternative.imageUrl && (
                <span className="mt-2 block overflow-hidden rounded-[8px] border border-slate-200 bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={alternative.imageUrl} alt={`Imagem da alternativa ${alternative.key}`} className="mx-auto max-h-28 max-w-full object-contain" />
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-[8px] bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Resolução</p>
        <p className="mt-1 line-clamp-6 whitespace-pre-line text-xs font-semibold leading-5 text-slate-600">{item.explanation}</p>
      </div>
      {item.videoUrl && (
        <a
          href={item.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
        >
          <Video className="h-4 w-4" />
          Abrir resolucao em video
        </a>
      )}
      {(item.sourceCitation || item.sourceAccessedAt) && (
        <p className="mt-3 text-[10px] leading-4 text-slate-400">
          {item.sourceCitation}
          {item.sourceAccessedAt ? ` Acesso em: ${item.sourceAccessedAt}.` : ""}
        </p>
      )}
    </aside>
  );
}

function FilterSelect({
  value,
  onChange,
  empty,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  empty: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select className="ek-input w-full" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{empty}</option>
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function EditArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <textarea className="ek-input min-h-28 w-full" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
