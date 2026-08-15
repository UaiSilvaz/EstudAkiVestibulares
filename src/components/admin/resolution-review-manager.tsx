"use client";

import { Check, Loader2, Save, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Answer = {
  id: string;
  questionNumber: number;
  correctAlternative: string;
  statement: string | null;
  subject: string | null;
  topic: string | null;
  shortComment: string | null;
  fullResolution: string | null;
  steps: string;
  alternativeComments: string;
  commonError: string | null;
  studyTip: string | null;
  relatedContent: string | null;
  answerReviewStatus: "EXTRACTED" | "CHECKED" | "APPROVED" | "REJECTED";
  resolutionStatus: "NOT_GENERATED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "PUBLISHED";
  generatedByModel: string | null;
  file: {
    id: string;
    vestibular: string;
    year: number;
    edition: string;
    storageUrl: string;
  };
};

async function errorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error || "Operação não concluída.");
  return body;
}

export function ResolutionReviewManager({ initialAnswers }: { initialAnswers: Answer[] }) {
  const router = useRouter();
  const { notify } = useFeedback();
  const [answers, setAnswers] = useState(initialAnswers);
  const [busy, setBusy] = useState<string | null>(null);

  function update(id: string, patch: Partial<Answer>) {
    setAnswers((current) => current.map((answer) => answer.id === id ? { ...answer, ...patch } : answer));
  }

  async function mutate(answer: Answer, action?: "approve" | "reject" | "publish") {
    setBusy(`${answer.id}:${action ?? "save"}`);
    try {
      const response = await fetch(`/api/admin/official-answer-keys/${answer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: answer.statement ?? "",
          subject: answer.subject ?? "",
          topic: answer.topic ?? "",
          correctAlternative: answer.correctAlternative,
          shortComment: answer.shortComment ?? "",
          fullResolution: answer.fullResolution ?? "",
          steps: JSON.parse(answer.steps || "[]"),
          alternativeComments: JSON.parse(answer.alternativeComments || "{}"),
          commonError: answer.commonError ?? "",
          studyTip: answer.studyTip ?? "",
          relatedContent: answer.relatedContent ?? "",
          action,
        }),
      });
      await errorMessage(response);
      notify({
        tone: "success",
        title: action === "publish" ? "Resolução publicada" : action ? "Revisão registrada" : "Alterações salvas",
        message: "O histórico editorial foi atualizado.",
      });
      router.refresh();
    } catch (error) {
      notify({ tone: "error", title: "Operação não concluída", message: error instanceof Error ? error.message : "Erro desconhecido." });
    } finally {
      setBusy(null);
    }
  }

  async function generate(answer: Answer) {
    setBusy(`${answer.id}:generate`);
    try {
      const response = await fetch(`/api/admin/official-answer-keys/${answer.id}/generate`, { method: "POST" });
      await errorMessage(response);
      notify({ tone: "success", title: "Resolução gerada", message: "O texto está em revisão e não foi publicado." });
      router.refresh();
    } catch (error) {
      notify({ tone: "error", title: "IA não executada", message: error instanceof Error ? error.message : "Erro desconhecido." });
    } finally {
      setBusy(null);
    }
  }

  async function generateExam(fileId: string) {
    setBusy(`${fileId}:generate-all`);
    try {
      const response = await fetch(`/api/admin/official-files/${fileId}/generate-resolutions`, { method: "POST" });
      const result = await errorMessage(response) as { generated?: number; errors?: unknown[] };
      notify({
        tone: "success",
        title: "Geração da prova concluída",
        message: `${result.generated ?? 0} resolução(ões) enviada(s) para revisão; ${result.errors?.length ?? 0} erro(s).`,
      });
      router.refresh();
    } catch (error) {
      notify({ tone: "error", title: "IA não executada", message: error instanceof Error ? error.message : "Erro desconhecido." });
    } finally {
      setBusy(null);
    }
  }

  if (!answers.length) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-blue-600" />
        <h2 className="mt-3 text-xl font-black text-slate-950">Nenhuma resolução aguardando revisão</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">Baixe um gabarito oficial e importe suas respostas na página Fontes oficiais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 rounded-[24px] border border-violet-100 bg-white p-4">
        {[...new Map(answers.map((answer) => [answer.file.id, answer.file])).values()].map((file) => (
          <button
            key={file.id}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void generateExam(file.id)}
            className="ek-button ek-button-primary"
          >
            {busy === `${file.id}:generate-all` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar resoluções · {file.vestibular} {file.year} {file.edition}
          </button>
        ))}
      </div>
      {answers.map((answer) => (
        <article key={answer.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">{answer.file.vestibular} · {answer.file.year} · questão {answer.questionNumber}</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Gabarito {answer.correctAlternative}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Gabarito: {answer.answerReviewStatus.replaceAll("_", " ")} · Resolução: {answer.resolutionStatus.replaceAll("_", " ")}{answer.generatedByModel ? ` · ${answer.generatedByModel}` : ""}</p>
            </div>
            <a href={answer.file.storageUrl} target="_blank" rel="noreferrer" className="ek-button ek-button-ghost">Abrir PDF oficial</a>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <EditArea label="Enunciado oficial" value={answer.statement ?? ""} onChange={(statement) => update(answer.id, { statement })} rows={8} />
              <div className="grid grid-cols-2 gap-3">
                <EditField label="Disciplina" value={answer.subject ?? ""} onChange={(subject) => update(answer.id, { subject })} />
                <EditField label="Conteúdo" value={answer.topic ?? ""} onChange={(topic) => update(answer.id, { topic })} />
              </div>
              <EditArea label="Comentário curto" value={answer.shortComment ?? ""} onChange={(shortComment) => update(answer.id, { shortComment })} />
              <EditArea label="Resolução completa" value={answer.fullResolution ?? ""} onChange={(fullResolution) => update(answer.id, { fullResolution })} rows={10} />
            </div>
            <div className="space-y-3">
              <EditArea label="Passo a passo (JSON)" value={answer.steps} onChange={(steps) => update(answer.id, { steps })} rows={6} mono />
              <EditArea label="Comentários das alternativas (JSON)" value={answer.alternativeComments} onChange={(alternativeComments) => update(answer.id, { alternativeComments })} rows={7} mono />
              <EditArea label="Erro comum" value={answer.commonError ?? ""} onChange={(commonError) => update(answer.id, { commonError })} />
              <EditArea label="Dica de estudo" value={answer.studyTip ?? ""} onChange={(studyTip) => update(answer.id, { studyTip })} />
              <EditArea label="Conteúdo relacionado" value={answer.relatedContent ?? ""} onChange={(relatedContent) => update(answer.id, { relatedContent })} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={Boolean(busy)} onClick={() => void mutate(answer)} className="ek-button ek-button-ghost">
              {busy === `${answer.id}:save` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar
            </button>
            <button type="button" disabled={Boolean(busy) || answer.answerReviewStatus !== "APPROVED"} onClick={() => void generate(answer)} className="ek-button ek-button-primary">
              {busy === `${answer.id}:generate` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Gerar resolução com IA
            </button>
            <button type="button" disabled={Boolean(busy) || answer.resolutionStatus !== "IN_REVIEW"} onClick={() => void mutate(answer, "approve")} className="ek-button border border-emerald-200 bg-emerald-50 text-emerald-700">
              <Check className="h-4 w-4" />Aprovar
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void mutate(answer, "reject")} className="ek-button border border-rose-200 bg-rose-50 text-rose-700">
              <X className="h-4 w-4" />Reprovar
            </button>
            <button type="button" disabled={Boolean(busy) || answer.resolutionStatus !== "APPROVED"} onClick={() => void mutate(answer, "publish")} className="ek-button border border-blue-200 bg-blue-50 text-blue-700">
              <Check className="h-4 w-4" />Publicar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span><input className="ek-input" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function EditArea({ label, value, onChange, rows = 4, mono = false }: { label: string; value: string; onChange: (value: string) => void; rows?: number; mono?: boolean }) {
  return <label><span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span><textarea rows={rows} className={`ek-input ${mono ? "font-mono text-xs" : ""}`} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
