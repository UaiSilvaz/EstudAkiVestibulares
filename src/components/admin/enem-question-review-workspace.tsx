"use client";

/* eslint-disable @next/next/no-img-element -- imagens extraídas têm dimensões e URLs dinâmicas preservadas do PDF oficial. */

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileImage,
  FileText,
  History,
  Loader2,
  Minus,
  MonitorSmartphone,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Alternative = {
  id: string;
  key: string;
  order: number;
  text: string;
  imageUrl: string | null;
  correct: boolean;
  sourcePdfPage: number | null;
  consolidatedPdfPage: number | null;
  confidence: number | null;
};

type ReviewData = {
  job: {
    id: string;
    pilotId: string;
    status: string;
    year: number;
    day: number;
    application: string;
    modality: string;
    bookletNumber: number;
    bookletColor: string;
    expected: number;
    imported: number;
    approved: number;
    published: number;
    examUrl: string;
    officialExamUrl: string;
    answerKeyUrl: string;
    officialAnswerKeyUrl: string;
  };
  link: {
    number: number;
    order: number;
    page: number | null;
    pageStart: number | null;
    pageEnd: number | null;
    needsHumanReview: boolean;
  };
  question: {
    id: string;
    year: number;
    day: string | null;
    number: number | null;
    exam: string | null;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    subjectId: string;
    subject: string;
    topicId: string | null;
    topic: string | null;
    statement: string;
    supportText: string;
    skill: string;
    reviewState: string;
    reviewNotes: string;
    status: string;
    answerSituation: string;
    correctAlternative: string;
    sourceUrl: string | null;
    sourceCitation: string | null;
    updatedAt: string;
  };
  alternatives: Alternative[];
  blocks: Array<{
    id: string;
    type: string;
    order: number;
    content: string;
    assetUrl: string | null;
    sourcePdfPage: number;
    consolidatedPdfPage: number;
    confidence: number;
    normalizedRegion: { x: number; y: number; width: number; height: number };
  }>;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    description: string | null;
    order: number;
    width: number | null;
    height: number | null;
    assetType: string;
    relation: string;
    alternativeKey: string | null;
    sourcePdfPage: number | null;
    consolidatedPdfPage: number | null;
  }>;
  extraction: {
    id: string;
    status: string;
    reviewStatus: string;
    officialNumber: number;
    officialOrder: number;
    officialPdfPageStart: number;
    officialPdfPageEnd: number;
    consolidatedPdfPageStart: number;
    consolidatedPdfPageEnd: number;
    originalPageUrl: string;
    answerSituation: string;
    confidence: {
      text: number;
      alternatives: number;
      images: number;
      answer: number;
      classification: number;
      overall: number;
    };
    flags: Record<string, unknown>;
    sourceMetadata: Record<string, unknown>;
  };
  answerKey: {
    id: string;
    questionNumber: number;
    correctAlternative: string;
    answerSituation: string;
    reviewStatus: string;
    reviewedBy: string | null;
    reviewedAt: string | null;
    sourceUrl: string | null;
    sourceSha256: string | null;
    sourcePdfPage: number | null;
    validationStatus: string | null;
  };
  revisions: Array<{
    id: string;
    action: string;
    actor: string;
    notes: string | null;
    createdAt: string;
  }>;
  issues: string[];
};

type Editable = {
  statement: string;
  supportText: string;
  alternatives: Array<{ key: string; text: string; imageUrl: string | null }>;
  subjectId: string;
  topicId: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  skill: string;
  reviewNotes: string;
};

const checklist = [
  ["statementComplete", "Enunciado e textos completos"],
  ["elementOrderCorrect", "Ordem dos elementos igual à página oficial"],
  ["alternativesComplete", "Alternativas A–E completas"],
  ["imagesLegible", "Imagens legíveis e sem recorte indevido"],
  ["officialAnswerVerified", "Gabarito conferido no PDF oficial"],
  ["numberYearDayVerified", "Número, ano, dia e caderno conferidos"],
  ["studentAnswerFlowVerified", "Resposta e correção funcionam no EstudAki"],
  ["mobileVerified", "Prévia mobile adequada"],
  ["originalPageVerified", "Página original consultada"],
  ["noMixedContent", "Nenhum conteúdo de outra questão misturado"],
] as const;

function editableOf(data: ReviewData): Editable {
  return {
    statement: data.question.statement,
    supportText: data.question.supportText,
    alternatives: data.alternatives.map(({ key, text, imageUrl }) => ({ key, text, imageUrl })),
    subjectId: data.question.subjectId,
    topicId: data.question.topicId ?? "",
    difficulty: data.question.difficulty,
    skill: data.question.skill,
    reviewNotes: data.question.reviewNotes,
  };
}

function requestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function responseJson(response: Response) {
  const body = (await response.json().catch(() => null)) as (ReviewData & {
    error?: string;
    issues?: string[];
  }) | null;
  if (!response.ok) {
    throw new Error([body?.error, ...(body?.issues ?? [])].filter(Boolean).join(" ") || "Operação não concluída.");
  }
  return body;
}

export function EnemQuestionReviewWorkspace({
  initialData,
  subjects,
  topics,
}: {
  initialData: ReviewData;
  subjects: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string; subjectId: string }>;
}) {
  const router = useRouter();
  const { notify, confirm } = useFeedback();
  const [data, setData] = useState(initialData);
  const [editable, setEditable] = useState(() => editableOf(initialData));
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [viewer, setViewer] = useState<"FACSIMILE" | "OFFICIAL" | "CONSOLIDATED">("FACSIMILE");
  const [zoom, setZoom] = useState(100);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [busy, setBusy] = useState<"SAVE" | "APPROVE" | "REOPEN" | null>(null);

  const filteredTopics = useMemo(
    () => topics.filter((topic) => topic.subjectId === editable.subjectId),
    [editable.subjectId, topics],
  );
  const originals = data.images.filter((image) => image.relation === "ADMIN_REFERENCE");
  const facsimiles = data.images.filter((image) => image.assetType === "PROMPT_FACSIMILE");
  const studentImages = data.images.filter((image) => image.relation !== "ADMIN_REFERENCE");
  const number = data.link.number;
  const allChecked = checklist.every(([key]) => checks[key]);
  const persistedEditable = editableOf(data);
  const unsavedContentChanges = JSON.stringify({ ...editable, reviewNotes: undefined }) !==
    JSON.stringify({ ...persistedEditable, reviewNotes: undefined });
  const hasUnsavedChanges = JSON.stringify(editable) !== JSON.stringify(persistedEditable);
  const approved =
    data.question.reviewState === "APPROVED" &&
    data.extraction.reviewStatus === "APPROVED" &&
    data.answerKey.reviewStatus === "APPROVED" &&
    !data.link.needsHumanReview;
  const officialViewerUrl = `${data.job.examUrl}#page=${data.extraction.officialPdfPageStart}&zoom=${zoom}`;
  const consolidatedViewerUrl = `/api/admin/importacoes-enem/${data.job.id}/arquivo?kind=consolidated#page=${data.extraction.consolidatedPdfPageStart}&zoom=${zoom}`;

  function replaceFromResponse(body: ReviewData | null) {
    if (!body?.question || !body.extraction) return;
    setData(body);
    setEditable(editableOf(body));
  }

  function updateAlternative(index: number, field: "text" | "imageUrl", value: string) {
    setEditable((current) => ({
      ...current,
      alternatives: current.alternatives.map((alternative, alternativeIndex) =>
        alternativeIndex === index
          ? { ...alternative, [field]: value || (field === "imageUrl" ? null : "") }
          : alternative,
      ),
    }));
  }

  async function save() {
    const accepted = approved
      ? await confirm({
          title: "Editar e reabrir a questão?",
          message: "A alteração será auditada e desfará a aprovação até uma nova conferência integral.",
          confirmLabel: "Salvar e reabrir",
          cancelLabel: "Cancelar",
        })
      : true;
    if (!accepted) return;
    setBusy("SAVE");
    try {
      const response = await fetch(
        `/api/admin/importacoes-enem/${data.job.id}/questoes/${number}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: requestId(),
            expectedUpdatedAt: data.question.updatedAt,
            ...editable,
            topicId: editable.topicId || null,
          }),
        },
      );
      const body = await responseJson(response);
      replaceFromResponse(body);
      setChecks({});
      notify({
        tone: "success",
        title: "Correção salva e auditada",
        message: "A questão voltou para pendente e exige nova aprovação.",
      });
      router.refresh();
    } catch (error) {
      notify({ tone: "error", title: "Alteração não salva", message: error instanceof Error ? error.message : "Erro desconhecido." });
    } finally {
      setBusy(null);
    }
  }

  async function review(action: "APPROVE" | "REOPEN") {
    if (action === "APPROVE" && unsavedContentChanges) {
      notify({
        tone: "error",
        title: "Há conteúdo ainda não salvo",
        message: "Salve a correção, confira novamente a versão persistida e só então aprove.",
      });
      return;
    }
    if (action === "APPROVE" && !allChecked) {
      notify({ tone: "error", title: "Conferência incompleta", message: "Marque os dez itens depois de verificá-los de fato." });
      return;
    }
    if (action === "REOPEN") {
      const accepted = await confirm({
        title: "Reabrir esta questão?",
        message: "Os cinco sinais de aprovação serão desfeitos coerentemente e o gate voltará a ficar bloqueado.",
        confirmLabel: "Reabrir",
        cancelLabel: "Cancelar",
      });
      if (!accepted) return;
    }
    setBusy(action);
    try {
      const response = await fetch(
        `/api/admin/importacoes-enem/${data.job.id}/questoes/${number}/revisao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            requestId: requestId(),
            notes: editable.reviewNotes,
            checklist: Object.fromEntries(checklist.map(([key]) => [key, checks[key] === true])),
          }),
        },
      );
      const body = await responseJson(response);
      replaceFromResponse(body);
      setChecks({});
      notify({
        tone: "success",
        title: action === "APPROVE" ? `Questão ${number} aprovada` : `Questão ${number} reaberta`,
        message: action === "APPROVE" ? "Os cinco sinais foram registrados na mesma transação." : "A fila e o gate foram atualizados.",
      });
      if (action === "APPROVE") {
        if (number < 180) router.push(`/admin/importacoes-enem/${data.job.id}/revisao/${number + 1}`);
        else router.push("/admin/importacoes-enem");
      } else {
        router.refresh();
      }
    } catch (error) {
      notify({ tone: "error", title: "Revisão bloqueada", message: error instanceof Error ? error.message : "Erro desconhecido." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/importacoes-enem" className="inline-flex items-center gap-2 text-xs font-black text-blue-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />Voltar ao painel do piloto
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-slate-950">Questão {number}</h1>
            <StatusBadge approved={approved} hasIssues={data.issues.length > 0} />
            {data.question.answerSituation === "ANNULLED" && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">ANULADA OFICIALMENTE</span>}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            ENEM 2022 · 2º dia · Caderno 5 Amarelo · página oficial {data.extraction.officialPdfPageStart} · consolidada {data.extraction.consolidatedPdfPageStart}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link aria-disabled={number <= 91} href={number > 91 ? `/admin/importacoes-enem/${data.job.id}/revisao/${number - 1}` : "#"} className={`ek-button ek-button-ghost ${number <= 91 ? "pointer-events-none opacity-40" : ""}`}>
            <ChevronLeft className="h-4 w-4" />Anterior
          </Link>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{number - 90}/90</span>
          <Link aria-disabled={number >= 180} href={number < 180 ? `/admin/importacoes-enem/${data.job.id}/revisao/${number + 1}` : "#"} className={`ek-button ek-button-ghost ${number >= 180 ? "pointer-events-none opacity-40" : ""}`}>
            Próxima<ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {data.issues.length > 0 && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" /><div><p className="font-black text-rose-950">Aprovação bloqueada</p><ul className="mt-1 space-y-1 text-sm font-semibold text-rose-800">{data.issues.map((issue) => <li key={issue}>• {issue}</li>)}</ul></div></div>
        </div>
      )}

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.05fr)_minmax(520px,0.95fr)]">
        <section className="min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-900 p-3">
            <div className="flex flex-wrap gap-2">
              <ViewerButton active={viewer === "FACSIMILE"} onClick={() => setViewer("FACSIMILE")} icon={<FileImage className="h-4 w-4" />} label="Fac-símile" />
              <ViewerButton active={viewer === "OFFICIAL"} onClick={() => setViewer("OFFICIAL")} icon={<FileText className="h-4 w-4" />} label="PDF oficial" />
              <ViewerButton active={viewer === "CONSOLIDATED"} onClick={() => setViewer("CONSOLIDATED")} icon={<FileText className="h-4 w-4" />} label="PDF consolidado" />
            </div>
            <div className="flex items-center gap-2 text-white">
              <button type="button" aria-label="Reduzir zoom" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="rounded-lg bg-white/10 p-2"><Minus className="h-4 w-4" /></button>
              <span className="w-12 text-center text-xs font-black">{zoom}%</span>
              <button type="button" aria-label="Aumentar zoom" onClick={() => setZoom((value) => Math.min(200, value + 10))} className="rounded-lg bg-white/10 p-2"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="min-h-[55vh] overflow-auto bg-slate-800 p-3 md:p-5 2xl:h-[calc(100vh-14rem)]">
            {viewer === "FACSIMILE" ? (
              <div className="mx-auto space-y-4" style={{ width: `${zoom}%`, minWidth: zoom > 100 ? "720px" : undefined }}>
                {(originals.length ? originals : facsimiles).map((image) => (
                  <figure key={image.id} className="overflow-hidden rounded-xl bg-white p-2 shadow-2xl">
                    <img src={image.url} alt={image.altText ?? `Recorte original da questão ${number}`} className="h-auto w-full" />
                    <figcaption className="border-t border-slate-100 px-2 pt-2 text-[10px] font-bold text-slate-500">
                      Página oficial {image.sourcePdfPage} · consolidada {image.consolidatedPdfPage} · {image.width}×{image.height}px
                    </figcaption>
                  </figure>
                ))}
                {!originals.length && !facsimiles.length && <p className="rounded-xl bg-rose-50 p-4 font-bold text-rose-700">Recorte original ausente.</p>}
              </div>
            ) : (
              <iframe
                key={`${viewer}-${zoom}-${number}`}
                title={viewer === "OFFICIAL" ? "PDF oficial do ENEM" : "PDF consolidado do banco"}
                src={viewer === "OFFICIAL" ? officialViewerUrl : consolidatedViewerUrl}
                className="h-full min-h-[65vh] w-full rounded-xl bg-white"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/10 bg-slate-900 p-3">
            <a href={`${data.job.officialExamUrl}#page=${data.extraction.officialPdfPageStart}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-cyan-300 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Abrir fonte oficial no Inep</a>
            <a href={data.extraction.originalPageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-amber-300 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Página original registrada</a>
          </div>
        </section>

        <section className="min-w-0 space-y-4">
          <ConfidencePanel confidence={data.extraction.confidence} />

          <article className="rounded-[24px] border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Extração ordenada</p><h2 className="mt-1 text-lg font-black text-slate-950">Blocos preservados da fonte</h2></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{data.blocks.length} blocos</span>
            </div>
            <div className="mt-4 space-y-2">
              {data.blocks.map((block) => (
                <div key={block.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase text-slate-500"><span className="rounded-full bg-white px-2 py-1">{block.order + 1} · {block.type}</span><span>p. {block.sourcePdfPage}</span><span>{Math.round(block.confidence * 100)}%</span></div>
                  {block.assetUrl ? <img src={block.assetUrl} alt={block.content} className="max-h-72 w-full object-contain" /> : <p className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-700">{block.content}</p>}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-blue-100 bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Edição auditada</p><h2 className="mt-1 text-lg font-black text-slate-950">Conteúdo que o aluno recebe</h2></div><button type="button" onClick={() => setMobilePreview((value) => !value)} className="ek-button ek-button-ghost"><MonitorSmartphone className="h-4 w-4" />{mobilePreview ? "Voltar ao editor" : "Prévia mobile"}</button></div>
            {mobilePreview ? (
              <MobilePreview data={data} editable={editable} studentImages={studentImages} />
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <EditField label="Disciplina"><select className="ek-input w-full" value={editable.subjectId} onChange={(event) => setEditable((current) => ({ ...current, subjectId: event.target.value, topicId: "" }))}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></EditField>
                  <EditField label="Conteúdo"><select className="ek-input w-full" value={editable.topicId} onChange={(event) => setEditable((current) => ({ ...current, topicId: event.target.value }))}><option value="">Sem conteúdo específico</option>{filteredTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></EditField>
                  <EditField label="Dificuldade"><select className="ek-input w-full" value={editable.difficulty} onChange={(event) => setEditable((current) => ({ ...current, difficulty: event.target.value as Editable["difficulty"] }))}><option value="EASY">Fácil</option><option value="MEDIUM">Média</option><option value="HARD">Difícil</option></select></EditField>
                  <EditField label="Habilidade"><input className="ek-input w-full" value={editable.skill} onChange={(event) => setEditable((current) => ({ ...current, skill: event.target.value }))} /></EditField>
                </div>
                <EditArea label="Texto de apoio" value={editable.supportText} onChange={(supportText) => setEditable((current) => ({ ...current, supportText }))} rows={8} />
                <EditArea label="Enunciado / comando" value={editable.statement} onChange={(statement) => setEditable((current) => ({ ...current, statement }))} rows={5} />
                {studentImages.filter((image) => image.relation === "STATEMENT").length > 0 && <div className="grid gap-2 sm:grid-cols-2">{studentImages.filter((image) => image.relation === "STATEMENT").map((image) => <div key={image.id} className="rounded-xl border border-slate-200 p-2"><img src={image.url} alt={image.altText ?? "Imagem do enunciado"} className="max-h-64 w-full object-contain" /><p className="mt-1 text-[10px] font-bold text-slate-500">{image.width}×{image.height}px · p. {image.sourcePdfPage}</p></div>)}</div>}
                <div className="space-y-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Alternativas</p>{editable.alternatives.map((alternative, index) => (
                  <div key={alternative.key} className={`rounded-xl border p-3 ${data.question.answerSituation !== "ANNULLED" && alternative.key === data.question.correctAlternative ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                    <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{alternative.key}</span><textarea rows={3} className="ek-input w-full" value={alternative.text} onChange={(event) => updateAlternative(index, "text", event.target.value)} /></div>
                    {alternative.imageUrl && <img src={alternative.imageUrl} alt={`Imagem da alternativa ${alternative.key}`} className="mx-auto mt-3 max-h-52 max-w-full object-contain" />}
                    <label className="mt-2 block text-[10px] font-black uppercase text-slate-500">URL canônica da imagem<input className="ek-input mt-1 w-full" value={alternative.imageUrl ?? ""} onChange={(event) => updateAlternative(index, "imageUrl", event.target.value)} /></label>
                  </div>
                ))}</div>
                <EditArea label="Observação da revisão" value={editable.reviewNotes} onChange={(reviewNotes) => setEditable((current) => ({ ...current, reviewNotes }))} rows={3} />
                <button type="button" disabled={Boolean(busy) || !hasUnsavedChanges} onClick={() => void save()} className="ek-button ek-button-primary disabled:cursor-not-allowed disabled:opacity-50">{busy === "SAVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar correções e reabrir</button>
              </div>
            )}
          </article>

          <article className={`rounded-[24px] border p-4 md:p-5 ${data.question.answerSituation === "ANNULLED" ? "border-violet-200 bg-violet-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-start gap-3"><ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${data.question.answerSituation === "ANNULLED" ? "text-violet-700" : "text-emerald-700"}`} /><div><p className="text-[10px] font-black uppercase tracking-wider opacity-70">Gabarito oficial relacionado</p><h2 className="mt-1 text-lg font-black text-slate-950">{data.question.answerSituation === "ANNULLED" ? "Questão 175 anulada" : `Alternativa ${data.answerKey.correctAlternative}`}</h2><p className="mt-1 text-xs font-semibold text-slate-600">{data.answerKey.validationStatus} · PDF p. {data.answerKey.sourcePdfPage} · {data.answerKey.reviewStatus}</p><a href={data.answerKey.sourceUrl ?? data.job.officialAnswerKeyUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Consultar gabarito no Inep</a></div></div>
          </article>

          <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 md:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800">Checklist bloqueante</p>
            <h2 className="mt-1 text-lg font-black text-amber-950">Confirme somente depois da inspeção real</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{checklist.map(([key, label]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-3 text-sm font-bold leading-5 text-slate-700"><input type="checkbox" checked={checks[key] === true} onChange={(event) => setChecks((current) => ({ ...current, [key]: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-emerald-600" /><span>{label}</span></label>)}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!approved ? <button type="button" disabled={Boolean(busy) || !allChecked || data.issues.length > 0 || unsavedContentChanges} onClick={() => void review("APPROVE")} className="ek-button border border-emerald-200 bg-emerald-600 text-white disabled:cursor-not-allowed disabled:opacity-50">{busy === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Aprovar e avançar</button> : <button type="button" disabled={Boolean(busy)} onClick={() => void review("REOPEN")} className="ek-button border border-rose-200 bg-rose-50 text-rose-700">{busy === "REOPEN" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Reabrir questão</button>}
              <Link href={number < 180 ? `/admin/importacoes-enem/${data.job.id}/revisao/${number + 1}` : "/admin/importacoes-enem"} className="ek-button ek-button-ghost">Pular sem aprovar<ChevronRight className="h-4 w-4" /></Link>
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex items-center gap-2"><History className="h-4 w-4 text-slate-500" /><h2 className="font-black text-slate-950">Histórico de revisão</h2></div>
            <div className="mt-3 space-y-2">{data.revisions.map((revision) => <div key={revision.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-700">{revision.action}</span><span className="text-[10px] font-bold text-slate-500">{new Date(revision.createdAt).toLocaleString("pt-BR")} · {revision.actor}</span></div>{revision.notes && <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{revision.notes}</p>}</div>)}</div>
          </article>
        </section>
      </div>
    </div>
  );
}

function ViewerButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${active ? "bg-white text-slate-950" : "bg-white/10 text-white hover:bg-white/15"}`}>{icon}{label}</button>;
}

function StatusBadge({ approved, hasIssues }: { approved: boolean; hasIssues: boolean }) {
  if (approved) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Aprovada</span>;
  if (hasIssues) return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800"><AlertTriangle className="h-3.5 w-3.5" />Com pendência</span>;
  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Pendente</span>;
}

function ConfidencePanel({ confidence }: { confidence: ReviewData["extraction"]["confidence"] }) {
  const rows = [["Texto", confidence.text], ["Alternativas", confidence.alternatives], ["Imagens", confidence.images], ["Gabarito", confidence.answer], ["Classificação", confidence.classification], ["Geral", confidence.overall]] as const;
  return <article className="rounded-[24px] border border-slate-200 bg-white p-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{rows.map(([label, value]) => <div key={label} className={`rounded-xl p-3 ${value >= 0.9 ? "bg-emerald-50 text-emerald-800" : value >= 0.75 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}><p className="text-[9px] font-black uppercase tracking-wider opacity-70">{label}</p><p className="mt-1 text-xl font-black">{Math.round(value * 100)}%</p></div>)}</div></article>;
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function EditArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span><textarea rows={rows} className="ek-input w-full whitespace-pre-wrap" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function MobilePreview({ data, editable, studentImages }: { data: ReviewData; editable: Editable; studentImages: ReviewData["images"] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [corrected, setCorrected] = useState(false);
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-slate-100 p-3">
      <div className="mx-auto w-full max-w-[390px] rounded-[28px] border-[8px] border-slate-900 bg-white p-4 shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">ENEM 2022 · Questão {data.link.number}</p>
        {editable.supportText && <p className="mt-3 whitespace-pre-line text-sm font-medium leading-6 text-slate-700">{editable.supportText}</p>}
        {studentImages.filter((image) => image.relation === "STATEMENT").map((image) => <img key={image.id} src={image.url} alt={image.altText ?? "Imagem da questão"} className="my-3 max-h-72 w-full object-contain" />)}
        <p className="mt-3 whitespace-pre-line text-sm font-bold leading-6 text-slate-950">{editable.statement}</p>
        <div className="mt-4 space-y-2">
          {editable.alternatives.map((alternative) => {
            const correct = data.question.answerSituation !== "ANNULLED" && alternative.key === data.question.correctAlternative;
            const selectedRow = selected === alternative.key;
            const tone = corrected && correct
              ? "border-emerald-400 bg-emerald-50"
              : corrected && selectedRow && !correct
                ? "border-rose-400 bg-rose-50"
                : selectedRow
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200";
            return (
              <button
                type="button"
                key={alternative.key}
                disabled={corrected}
                onClick={() => setSelected(alternative.key)}
                className={`flex w-full gap-2 rounded-xl border p-3 text-left text-sm font-semibold text-slate-700 ${tone}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black">{alternative.key}</span>
                <span className="min-w-0 flex-1">{alternative.text}{alternative.imageUrl && <img src={alternative.imageUrl} alt={`Imagem da alternativa ${alternative.key}`} className="mt-2 max-h-40 w-full object-contain" />}</span>
              </button>
            );
          })}
        </div>
        {!corrected ? (
          <button type="button" disabled={!selected} onClick={() => setCorrected(true)} className="ek-button ek-button-primary mt-4 w-full disabled:opacity-50">Corrigir resposta na prévia</button>
        ) : (
          <div className={`mt-4 rounded-xl p-3 text-xs font-black ${data.question.answerSituation === "ANNULLED" ? "bg-violet-50 text-violet-800" : selected === data.question.correctAlternative ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {data.question.answerSituation === "ANNULLED"
              ? "Questão anulada no gabarito oficial: não pontua como erro."
              : selected === data.question.correctAlternative
                ? "Resposta correta."
                : `Resposta incorreta. Gabarito oficial: ${data.question.correctAlternative}.`}
            <button type="button" onClick={() => { setSelected(null); setCorrected(false); }} className="mt-2 block underline">Testar novamente</button>
          </div>
        )}
      </div>
    </div>
  );
}
