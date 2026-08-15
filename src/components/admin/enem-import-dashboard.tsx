"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileCheck2,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type QuestionRow = {
  id: string;
  number: number;
  statement: string;
  status: string;
  reviewState: string;
  extractionReviewState: string | null;
  extractionStatus: string | null;
  answerReviewStatus: string | null;
  answerSituation: string;
  needsHumanReview: boolean;
  confidence: number | null;
};

type Dashboard = {
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
    updatedAt: string;
    examUrl: string;
    keyUrl: string;
    officialExamUrl: string;
    officialKeyUrl: string;
  };
  report: {
    valid: boolean;
    questionCount: number;
    answerCount: number;
    originalCropCount: number;
    errors: string[];
    warnings: string[];
  };
  gate: {
    ready: boolean;
    structural: boolean;
    expected: number;
    imported: number;
    approved: number;
    published: number;
    pending: number;
    errors: number;
    issues: string[];
  };
  questions: QuestionRow[];
};

const filters = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendentes" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "ERROR", label: "Com pendência" },
  { value: "PUBLISHED", label: "Publicadas" },
] as const;

function isApproved(row: QuestionRow) {
  return (
    row.reviewState === "APPROVED" &&
    row.extractionReviewState === "APPROVED" &&
    row.answerReviewStatus === "APPROVED" &&
    !row.needsHumanReview
  );
}
function hasError(row: QuestionRow) {
  return row.reviewState === "HAS_ERROR" || row.extractionStatus === "INVALID";
}

function mutationId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function EnemImportDashboard({ initialDashboard }: { initialDashboard: Dashboard | null }) {
  const router = useRouter();
  const { notify, confirm } = useFeedback();
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("ALL");
  const [search, setSearch] = useState("");
  const [publishing, setPublishing] = useState(false);

  const visibleQuestions = useMemo(() => {
    if (!initialDashboard) return [];
    return initialDashboard.questions.filter((row) => {
      if (search && !String(row.number).includes(search.trim())) return false;
      if (filter === "PENDING") return !isApproved(row) && row.status !== "PUBLISHED";
      if (filter === "APPROVED") return isApproved(row) && row.status !== "PUBLISHED";
      if (filter === "ERROR") return hasError(row);
      if (filter === "PUBLISHED") return row.status === "PUBLISHED";
      return true;
    });
  }, [filter, initialDashboard, search]);

  if (!initialDashboard) {
    return (
      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-black text-amber-950">O piloto ainda não foi importado</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">
              Execute primeiro a extração, o gabarito e a importação controlada. Esta tela não cria registros nem publica outros anos.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { job, gate, report } = initialDashboard;
  const firstPending = initialDashboard.questions.find((row) => !isApproved(row))?.number ?? 91;

  async function publish() {
    const accepted = await confirm({
      title: "Publicar o piloto completo?",
      message:
        "A operação é atômica e exclusiva do ENEM 2022, 2º dia, Caderno 5 Amarelo. O servidor validará novamente relatório estrutural, sequência 91–180 e as 90 aprovações.",
      confirmLabel: "Validar gate e publicar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!accepted) return;
    setPublishing(true);
    try {
      const response = await fetch(`/api/admin/importacoes-enem/${job.id}/publicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: mutationId(),
          confirmation: "PUBLICAR ENEM 2022 DIA 2 CADERNO 5 AMARELO 90/90",
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; issues?: string[] } | null;
      if (!response.ok) throw new Error([body?.error, ...(body?.issues ?? []).slice(0, 3)].filter(Boolean).join(" "));
      notify({
        tone: "success",
        title: "Piloto publicado 90/90",
        message: "A prova e todas as questões passaram pelo gate atômico.",
      });
      router.refresh();
    } catch (error) {
      notify({
        tone: "error",
        title: "Publicação bloqueada",
        message: error instanceof Error ? error.message : "O gate recusou a publicação.",
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="space-y-5">
      <article className="overflow-hidden rounded-[30px] border border-blue-100 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)]">
        <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-amber-50 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                  piloto bloqueante
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-700">
                  {job.status}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                ENEM {job.year} · {job.day}º dia · Caderno {job.bookletNumber} {job.bookletColor}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {job.application} · {job.modality} · atualizado em {new Date(job.updatedAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={job.examUrl} target="_blank" rel="noreferrer" className="ek-button ek-button-ghost">
                <ExternalLink className="h-4 w-4" />Prova oficial
              </a>
              <a href={job.keyUrl} target="_blank" rel="noreferrer" className="ek-button ek-button-ghost">
                <FileCheck2 className="h-4 w-4" />Gabarito oficial
              </a>
              <Link
                href={`/admin/importacoes-enem/${job.id}/revisao/${firstPending}`}
                className="ek-button ek-button-primary"
              >
                Revisar questão {firstPending}
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5 md:p-6">
          <Counter label="Esperadas" value={gate.expected} tone="slate" />
          <Counter label="Importadas" value={gate.imported} tone={gate.imported === 90 ? "blue" : "amber"} />
          <Counter label="Aprovadas" value={gate.approved} tone={gate.approved === 90 ? "emerald" : "amber"} />
          <Counter label="Pendentes" value={gate.pending} tone={gate.pending === 0 ? "emerald" : "rose"} />
          <Counter label="Publicadas" value={gate.published} tone={gate.published === 90 ? "emerald" : "violet"} />
        </div>

        <div className="grid gap-4 border-t border-slate-100 p-5 lg:grid-cols-[1fr_1.2fr] md:p-6">
          <div className="space-y-2">
            <GateRow ok={report.valid && gate.structural} label="Relatório estrutural íntegro" detail={`${report.questionCount}/90 questões · ${report.answerCount}/90 respostas · ${report.originalCropCount}/90 originais`} />
            <GateRow ok={gate.imported === 90} label="Sequência importada" detail="Questões 91–180, sem lacunas" />
            <GateRow ok={gate.approved === 90} label="Revisão humana" detail={`${gate.approved}/90 com os cinco sinais transacionais`} />
            <GateRow ok={gate.errors === 0} label="Pendências por questão" detail={`${gate.errors} questão(ões) com bloqueio estrutural`} />
            <GateRow ok={gate.ready || gate.published === 90} label="Gate final" detail={gate.ready ? "Pronto para publicação atômica" : gate.published === 90 ? "Piloto publicado" : "Ainda bloqueado"} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <h3 className="font-black text-slate-950">Publicação protegida</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Não há publicação parcial. O endpoint aceita somente este piloto e exige 90/90 aprovações, gabaritos aprovados, originais preservados e relatório estrutural sem erro.
                </p>
              </div>
            </div>
            {gate.issues.length > 0 && (
              <ul className="mt-3 max-h-32 space-y-1 overflow-auto rounded-xl bg-white p-3 text-xs font-semibold leading-5 text-rose-700">
                {gate.issues.slice(0, 12).map((issue) => <li key={issue}>• {issue}</li>)}
              </ul>
            )}
            {report.warnings.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-amber-700">{report.warnings.length} aviso(s) no relatório de extração.</p>
            )}
            <button
              type="button"
              disabled={!gate.ready || publishing || gate.published === 90}
              onClick={() => void publish()}
              className="ek-button mt-4 w-full border border-emerald-200 bg-emerald-600 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {gate.published === 90 ? "Piloto publicado 90/90" : "Publicar somente após gate 90/90"}
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-[26px] border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Fila editorial</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">90 questões do piloto</h2>
          </div>
          <label className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value.replace(/\D/g, ""))}
              className="ek-input w-full !pl-10"
              placeholder="Número da questão"
              inputMode="numeric"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-4 py-2 text-xs font-black ${filter === item.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visibleQuestions.map((row) => {
            const approved = isApproved(row);
            const error = hasError(row);
            return (
              <Link
                key={row.id}
                href={`/admin/importacoes-enem/${job.id}/revisao/${row.number}`}
                className={`group rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${error ? "border-rose-200 bg-rose-50" : approved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-950">Questão {row.number}</span>
                  {approved ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : error ? <AlertTriangle className="h-4 w-4 text-rose-700" /> : <CircleDashed className="h-4 w-4 text-amber-700" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{row.statement}</p>
                <p className="mt-2 text-[10px] font-black uppercase text-slate-500">
                  {row.answerSituation === "ANNULLED" ? "Anulada" : row.answerReviewStatus ?? "gabarito pendente"}
                  {row.confidence !== null ? ` · ${Math.round(row.confidence * 100)}%` : ""}
                </p>
              </Link>
            );
          })}
        </div>
        {visibleQuestions.length === 0 && (
          <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">Nenhuma questão neste filtro.</p>
        )}
      </article>
    </section>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: "slate" | "blue" | "amber" | "rose" | "emerald" | "violet" }) {
  const classes = {
    slate: "bg-slate-50 text-slate-800",
    blue: "bg-blue-50 text-blue-800",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-800",
    emerald: "bg-emerald-50 text-emerald-800",
    violet: "bg-violet-50 text-violet-800",
  };
  return <div className={`rounded-2xl p-4 ${classes[tone]}`}><p className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>;
}

function GateRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-3 ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
      <div><p className="text-sm font-black text-slate-900">{label}</p><p className="text-xs font-semibold text-slate-600">{detail}</p></div>
    </div>
  );
}
