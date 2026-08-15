"use client";

import {
  AlertTriangle,
  Check,
  CheckCheck,
  Eye,
  FileCheck2,
  FlaskConical,
  Loader2,
  RotateCcw,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Row = {
  id: string;
  examId: string;
  examTitle: string;
  examStatus: string;
  number: number;
  day: string | null;
  subject: string;
  topic: string | null;
  statement: string;
  status: string;
  reviewState: string;
  reviewNotes: string | null;
  needsHumanReview: boolean;
  correctAlternative: string;
  answerStatus: string | null;
  resolutionStatus: string | null;
  imageCount: number;
  alternativeImageCount: number;
  pilotTestPublished: boolean;
  reasons: string[];
  testReasons: string[];
};

type Dashboard = {
  rows: Row[];
  counters: {
    total: number;
    pending: number;
    approved: number;
    errors: number;
    published: number;
    testPublished: number;
    publishable: number;
    testPublishable: number;
  };
  exams: Array<{
    id: string;
    title: string;
    day: string | null;
    status: string;
    total: number;
    errors: number;
    published: number;
    answerFileId: string | null;
    answers: number;
    approvedAnswers: number;
  }>;
};

const filters = [
  { value: "ALL", label: "Todas" },
  { value: "REVIEW", label: "Pendentes" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "PUBLISHED", label: "Publicadas" },
  { value: "ERROR", label: "Com erro" },
] as const;

async function responseBody(response: Response) {
  const body = await response.json().catch(() => null) as {
    error?: string;
    published?: number;
    reverted?: number;
    approved?: number;
    blocked?: Record<string, number>;
  } | null;
  if (!response.ok) throw new Error(body?.error || "Operação não concluída.");
  return body;
}

export function Enem2025PilotReview({
  dashboard,
  showRows = true,
  testModeAvailable,
}: {
  dashboard: Dashboard;
  showRows?: boolean;
  testModeAvailable: boolean;
}) {
  const router = useRouter();
  const { notify, confirm } = useFeedback();
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const visibleRows = useMemo(
    () =>
      dashboard.rows.filter((row) => {
        if (filter === "REVIEW") return row.status === "REVIEW" && row.reviewState === "PENDING_REVIEW";
        if (filter === "APPROVED") return row.status === "REVIEW" && row.reviewState === "APPROVED";
        if (filter === "PUBLISHED") return row.status === "PUBLISHED";
        if (filter === "ERROR") return row.reviewState === "HAS_ERROR";
        return true;
      }),
    [dashboard.rows, filter],
  );

  async function act(
    key: string,
    url: string,
    method: "POST" | "DELETE",
    body: unknown,
    successTitle: string,
  ) {
    setBusy(key);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await responseBody(response);
      notify({
        tone: "success",
        title: successTitle,
        message:
          typeof result?.published === "number"
            ? `${result.published} questão(ões) publicadas.`
            : typeof result?.reverted === "number"
              ? `${result.reverted} questão(ões) voltaram para REVIEW.`
              : typeof result?.approved === "number"
                ? `${result.approved} item(ns) aprovados.`
                : "Fluxo editorial atualizado.",
      });
      router.refresh();
    } catch (error) {
      notify({
        tone: "error",
        title: "Operação bloqueada",
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function approveExam(examId: string) {
    const accepted = await confirm({
      title: "Aprovar esta prova?",
      message: "A prova só será aprovada se o arquivo e todos os itens do gabarito estiverem vinculados e aprovados.",
      confirmLabel: "Aprovar prova",
      cancelLabel: "Cancelar",
    });
    if (accepted) await act(`exam:${examId}`, `/api/admin/provas-antigas/${examId}/approve`, "POST", {}, "Prova aprovada");
  }

  async function approveAnswerKey(fileId: string) {
    const accepted = await confirm({
      title: "Aprovar o gabarito oficial inteiro?",
      message: "O sistema validará novamente a associação das respostas com as 90 questões antes de aprovar.",
      confirmLabel: "Aprovar gabarito",
      cancelLabel: "Cancelar",
    });
    if (accepted) {
      await act(
        `key:${fileId}`,
        `/api/admin/official-files/${fileId}/approve-answer-key`,
        "POST",
        { confirmation: "APROVAR GABARITO OFICIAL" },
        "Gabarito aprovado",
      );
    }
  }

  async function publishApproved() {
    const accepted = await confirm({
      title: "Publicar questões aprovadas do ENEM 2025?",
      message: "Somente questões aprovadas, sem erro, com prova, gabarito e resolução aprovados serão publicadas. As demais continuarão bloqueadas.",
      confirmLabel: "Publicar elegíveis",
      cancelLabel: "Cancelar",
    });
    if (accepted) {
      await act(
        "publish",
        "/api/admin/enem-2025/publish-approved",
        "POST",
        { confirmation: "PUBLICAR QUESTÕES APROVADAS DO ENEM 2025" },
        "Publicação controlada concluída",
      );
    }
  }

  async function publishTest() {
    const accepted = await confirm({
      title: "Publicar piloto temporariamente?",
      message: `Exclusivo para desenvolvimento/localhost. Publicará ${dashboard.counters.testPublishable} questões estruturalmente válidas para teste visual, sem aprová-las editorialmente. É possível desfazer.`,
      confirmLabel: "Publicar para teste",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (accepted) {
      await act(
        "test-publish",
        "/api/admin/enem-2025/pilot-test",
        "POST",
        { confirmation: "PUBLICAR PILOTO ENEM 2025 PARA TESTE" },
        "Piloto visível para teste",
      );
    }
  }

  async function undoTest() {
    const accepted = await confirm({
      title: "Desfazer publicação temporária?",
      message: "Somente as questões marcadas como publicadas pelo modo de teste voltarão para REVIEW.",
      confirmLabel: "Desfazer teste",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (accepted) {
      await act(
        "test-undo",
        "/api/admin/enem-2025/pilot-test",
        "DELETE",
        { confirmation: "DESFAZER PUBLICAÇÃO DE TESTE ENEM 2025" },
        "Publicação de teste desfeita",
      );
    }
  }

  return (
    <section className="mb-6 space-y-5 rounded-[30px] border border-blue-100 bg-white p-5 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.3)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Piloto controlado</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">ENEM 2025 · revisão e publicação</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            As regras abaixo são verificadas novamente pelo servidor. Questões com erro nunca entram na publicação normal nem no modo de teste.
          </p>
        </div>
        {!showRows && (
          <Link href="/admin/provas-antigas/piloto-enem-2025" className="ek-button ek-button-primary">
            <Eye className="h-4 w-4" />Abrir revisão detalhada
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Counter label="Total" value={dashboard.counters.total} />
        <Counter label="Pendentes" value={dashboard.counters.pending} tone="amber" />
        <Counter label="Aprovadas" value={dashboard.counters.approved} tone="blue" />
        <Counter label="Com erro" value={dashboard.counters.errors} tone="rose" />
        <Counter label="Publicadas" value={dashboard.counters.published} tone="emerald" />
        <Counter label="Elegíveis agora" value={dashboard.counters.publishable} tone="violet" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {dashboard.exams.map((exam) => (
          <article key={exam.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">{exam.day} · {exam.status}</p>
                <h3 className="mt-1 font-black text-slate-950">{exam.title}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {exam.total} questões · {exam.errors} com erro · {exam.published} publicadas
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Gabarito: {exam.approvedAnswers}/{exam.answers} aprovado
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {exam.answerFileId && (
                  <button disabled={Boolean(busy)} onClick={() => void approveAnswerKey(exam.answerFileId!)} className="ek-button ek-button-ghost">
                    {busy === `key:${exam.answerFileId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}Aprovar gabarito
                  </button>
                )}
                <button disabled={Boolean(busy) || exam.status === "APROVADA" || exam.status === "DISPONIVEL"} onClick={() => void approveExam(exam.id)} className="ek-button ek-button-primary">
                  {busy === `exam:${exam.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}Aprovar prova
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/revisar-gabaritos" className="ek-button ek-button-ghost"><FileCheck2 className="h-4 w-4" />Revisar gabaritos</Link>
        <Link href="/admin/revisar-resolucoes" className="ek-button ek-button-ghost"><Check className="h-4 w-4" />Revisar resoluções</Link>
        <button disabled={Boolean(busy)} onClick={() => void publishApproved()} className="ek-button border border-emerald-200 bg-emerald-50 text-emerald-700">
          {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}Publicar questões aprovadas do ENEM 2025
        </button>
        {testModeAvailable && dashboard.counters.testPublished === 0 && (
          <button disabled={Boolean(busy)} onClick={() => void publishTest()} className="ek-button border border-violet-200 bg-violet-50 text-violet-700">
            {busy === "test-publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}Publicar piloto ENEM 2025 para teste
          </button>
        )}
        {dashboard.counters.testPublished > 0 && (
          <button disabled={Boolean(busy)} onClick={() => void undoTest()} className="ek-button border border-rose-200 bg-rose-50 text-rose-700">
            {busy === "test-undo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Desfazer publicação de teste
          </button>
        )}
      </div>

      {showRows && (
        <>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            {filters.map((item) => (
              <button key={item.value} onClick={() => setFilter(item.value)} className={`rounded-full px-4 py-2 text-xs font-black ${filter === item.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {visibleRows.map((row) => (
              <article key={row.id} className={`rounded-2xl border p-4 ${row.reviewState === "HAS_ERROR" ? "border-rose-200 bg-rose-50/40" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-950">Questão {row.number}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{row.day}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{row.subject}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{row.status} · {row.reviewState}</span>
                      {row.pilotTestPublished && <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-700">TESTE</span>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">{row.statement}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Gabarito {row.correctAlternative} · {row.imageCount} imagem(ns) no enunciado · {row.alternativeImageCount} nas alternativas
                    </p>
                    {row.reasons.length > 0 ? (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Não aparece para o aluno porque: {row.reasons.join("; ")}.
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">Pronta para publicação controlada.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/admin/questions" className="ek-button ek-button-ghost"><Eye className="h-4 w-4" />Abrir editor</Link>
                    <button
                      disabled={Boolean(busy) || row.reviewState === "HAS_ERROR" || row.reviewState === "APPROVED" || row.status === "PUBLISHED"}
                      onClick={() => void act(`question:${row.id}`, `/api/admin/enem-2025/questions/${row.id}/approve`, "POST", {}, "Questão aprovada")}
                      className="ek-button ek-button-primary"
                    >
                      {busy === `question:${row.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Aprovar questão
                    </button>
                    {row.reviewState === "APPROVED" && row.status !== "PUBLISHED" && (
                      <button
                        disabled={Boolean(busy)}
                        onClick={() => void act(`question:${row.id}`, `/api/admin/enem-2025/questions/${row.id}/approve`, "DELETE", {}, "Questão devolvida para revisão")}
                        className="ek-button ek-button-ghost"
                      >
                        <RotateCcw className="h-4 w-4" />Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Counter({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "amber" | "blue" | "rose" | "emerald" | "violet" }) {
  const styles = {
    slate: "bg-slate-50 text-slate-800",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-800",
    rose: "bg-rose-50 text-rose-800",
    emerald: "bg-emerald-50 text-emerald-800",
    violet: "bg-violet-50 text-violet-800",
  };
  return <div className={`rounded-2xl p-4 ${styles[tone]}`}><p className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}
