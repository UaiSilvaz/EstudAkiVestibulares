"use client";

import { Check, CheckCheck, ExternalLink, Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Answer = {
  id: string;
  questionNumber: number;
  correctAlternative: string;
  answerReviewStatus: "EXTRACTED" | "CHECKED" | "APPROVED" | "REJECTED";
  answerReviewedBy: string | null;
  answerReviewedAt: Date | string | null;
  file: {
    vestibular: string;
    year: number;
    edition: string;
    examDay: string | null;
    storageUrl: string;
  };
};

const statusLabel = {
  EXTRACTED: "Extraído automaticamente",
  CHECKED: "Conferido",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
} as const;

export function AnswerKeyReviewManager({ initialAnswers }: { initialAnswers: Answer[] }) {
  const { notify } = useFeedback();
  const [answers, setAnswers] = useState(initialAnswers);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return answers;
    return answers.filter((answer) =>
      `${answer.file.vestibular} ${answer.file.year} ${answer.file.edition} ${answer.file.examDay ?? ""} ${answer.questionNumber} ${answer.answerReviewStatus}`
        .toLowerCase()
        .includes(term),
    );
  }, [answers, filter]);

  function update(id: string, patch: Partial<Answer>) {
    setAnswers((current) =>
      current.map((answer) => answer.id === id ? { ...answer, ...patch } : answer),
    );
  }

  async function review(answer: Answer, answerAction: "check" | "approve" | "reject") {
    setBusy(answer.id);
    try {
      const response = await fetch(`/api/admin/official-answer-keys/${answer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctAlternative: answer.correctAlternative,
          answerAction,
        }),
      });
      const body = await response.json().catch(() => null) as {
        error?: string;
        answer?: Answer;
      } | null;
      if (!response.ok) throw new Error(body?.error || "Revisão não concluída.");
      if (body?.answer) update(answer.id, body.answer);
      notify({
        tone: "success",
        title: answerAction === "approve" ? "Gabarito aprovado" : answerAction === "reject" ? "Gabarito reprovado" : "Gabarito conferido",
        message: `Questão ${answer.questionNumber} atualizada sem publicação automática.`,
      });
    } catch (error) {
      notify({
        tone: "error",
        title: "Revisão não concluída",
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white p-4">
        <label className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="ek-input pl-10"
            placeholder="Filtrar por prova, ano ou questão"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
        <p className="text-sm font-bold text-slate-600">
          {answers.filter((answer) => answer.answerReviewStatus === "APPROVED").length}/{answers.length} aprovados
        </p>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Prova</th>
                <th className="px-5 py-4">Questão</th>
                <th className="px-5 py-4">Alternativa</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((answer) => (
                <tr key={answer.id}>
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-950">{answer.file.vestibular} {answer.file.year}</p>
                    <p className="text-xs font-semibold text-slate-500">{answer.file.edition} · dia {answer.file.examDay ?? "único"}</p>
                  </td>
                  <td className="px-5 py-4 font-black text-slate-900">{answer.questionNumber}</td>
                  <td className="px-5 py-4">
                    <select
                      className="ek-input w-28"
                      value={answer.correctAlternative}
                      onChange={(event) => update(answer.id, { correctAlternative: event.target.value })}
                    >
                      {["A", "B", "C", "D", "E", "ANULADA"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                      {statusLabel[answer.answerReviewStatus]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <a href={answer.file.storageUrl} target="_blank" rel="noreferrer" className="ek-button ek-button-ghost">
                        <ExternalLink className="h-4 w-4" />PDF
                      </a>
                      <button disabled={Boolean(busy)} onClick={() => void review(answer, "check")} className="ek-button ek-button-ghost">
                        {busy === answer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}Conferido
                      </button>
                      <button disabled={Boolean(busy)} onClick={() => void review(answer, "approve")} className="ek-button border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <Check className="h-4 w-4" />Aprovar
                      </button>
                      <button disabled={Boolean(busy)} onClick={() => void review(answer, "reject")} className="ek-button border border-rose-200 bg-rose-50 text-rose-700">
                        <X className="h-4 w-4" />Reprovar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
