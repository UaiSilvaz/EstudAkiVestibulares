"use client";

import {
  Archive,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileJson,
  FileSearch,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Source = {
  id: string;
  vestibular: string;
  year: number | null;
  edition: string;
  examDay: string | null;
  fileType: "INDEX_PAGE" | "EXAM" | "ANSWER_KEY";
  sourceKind: "SEED_PAGE" | "DIRECT_FILE";
  sourceUrl: string;
  sourceDomain: string;
  status: "PENDING" | "APPROVED" | "DOWNLOADED" | "ERROR" | "ARCHIVED";
  notes: string | null;
  approvedAt: string | null;
  updatedAt: string;
  fileCount: number;
};

type FileItem = {
  id: string;
  vestibular: string;
  year: number;
  edition: string;
  examDay: string | null;
  fileType: "INDEX_PAGE" | "EXAM" | "ANSWER_KEY";
  storageUrl: string;
  fileName: string;
  fileSize: number;
  sha256Hash: string;
  downloadStatus: string;
  processingStatus: string;
  answerKeyCount: number;
};

type LogItem = {
  id: string;
  action: string;
  status: string;
  message: string;
  createdAt: string;
};

const emptyForm = {
  vestibular: "ENEM",
  year: new Date().getFullYear(),
  edition: "regular",
  examDay: "",
  fileType: "EXAM" as Source["fileType"],
  sourceKind: "DIRECT_FILE" as Source["sourceKind"],
  sourceUrl: "",
  notes: "",
};

const jsonExample = JSON.stringify(
  [
    {
      vestibular: "ENEM",
      year: 2024,
      edition: "regular",
      exam_day: "1",
      file_type: "prova",
      source_url: "https://download.inep.gov.br/exemplo-prova.pdf",
    },
  ],
  null,
  2,
);

async function responseMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { error?: string; [key: string]: unknown }
    | null;
  if (!response.ok) throw new Error(body?.error || "Operação não concluída.");
  return body ?? {};
}

function sourceStatus(status: Source["status"]) {
  return {
    PENDING: "Pendente",
    APPROVED: "Aprovada",
    DOWNLOADED: "Baixada",
    ERROR: "Com erro",
    ARCHIVED: "Arquivada",
  }[status];
}

export function OfficialSourcesManager({
  initialSources,
  initialFiles,
  initialLogs,
}: {
  initialSources: Source[];
  initialFiles: FileItem[];
  initialLogs: LogItem[];
}) {
  const router = useRouter();
  const { notify } = useFeedback();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [jsonText, setJsonText] = useState(jsonExample);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const answerFiles = initialFiles.filter((file) => file.fileType === "ANSWER_KEY");
  const [answerFileId, setAnswerFileId] = useState(answerFiles[0]?.id ?? "");
  const [answerJson, setAnswerJson] = useState(
    JSON.stringify(
      [{ question_number: 1, correct_alternative: "A", statement: "" }],
      null,
      2,
    ),
  );
  const [answerPreview, setAnswerPreview] = useState<string | null>(null);
  const [downloadReport, setDownloadReport] = useState<string | null>(null);
  const visibleSources = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return initialSources;
    return initialSources.filter((source) =>
      `${source.vestibular} ${source.year ?? ""} ${source.sourceDomain} ${source.status}`
        .toLowerCase()
        .includes(term),
    );
  }, [filter, initialSources]);

  async function mutate(url: string, method: string, body?: unknown, success?: string) {
    setBusy(url);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await responseMessage(response);
      if (success) notify({ tone: "success", title: success, message: "A operação foi registrada no histórico." });
      router.refresh();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operação não concluída.";
      notify({ tone: "error", title: "Operação não concluída", message });
      throw error;
    } finally {
      setBusy(null);
    }
  }

  async function saveSource() {
    const url = editingId
      ? `/api/admin/official-sources/${editingId}`
      : "/api/admin/official-sources";
    await mutate(
      url,
      editingId ? "PATCH" : "POST",
      editingId ? { ...form, action: "edit" } : form,
      editingId ? "Fonte atualizada" : "Fonte cadastrada",
    );
    setEditingId(null);
    setForm(emptyForm);
  }

  function edit(source: Source) {
    setEditingId(source.id);
    setForm({
      vestibular: source.vestibular,
      year: source.year ?? new Date().getFullYear(),
      edition: source.edition,
      examDay: source.examDay ?? "",
      fileType: source.fileType,
      sourceKind: source.sourceKind,
      sourceUrl: source.sourceUrl,
      notes: source.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function importJson(confirm: boolean) {
    try {
      const items = JSON.parse(jsonText) as unknown[];
      const result = await mutate(
        "/api/admin/official-sources/import",
        "POST",
        { items, confirm },
        confirm ? "Fontes importadas" : undefined,
      );
      setJsonPreview(
        confirm
          ? `${String(result.imported ?? 0)} importada(s); ${String(result.duplicates ?? 0)} duplicada(s).`
          : `${String(result.creatable ?? 0)} pronta(s), ${String(result.duplicates ?? 0)} duplicada(s), ${String((result.invalid as unknown[])?.length ?? 0)} inválida(s).`,
      );
    } catch (error) {
      setJsonPreview(error instanceof Error ? error.message : "JSON inválido.");
    }
  }

  async function importAnswers(confirm: boolean) {
    if (!answerFileId) return;
    try {
      const items = JSON.parse(answerJson) as unknown[];
      const result = await mutate(
        `/api/admin/official-files/${answerFileId}/answer-key`,
        "POST",
        { items, confirm },
        confirm ? "Gabarito importado" : undefined,
      );
      setAnswerPreview(
        confirm
          ? `${String(result.imported ?? 0)} resposta(s) importada(s).`
          : `${String(result.valid ?? 0)} válida(s), ${String((result.invalid as unknown[])?.length ?? 0)} inválida(s).`,
      );
    } catch (error) {
      setAnswerPreview(error instanceof Error ? error.message : "Gabarito inválido.");
    }
  }

  async function downloadApproved() {
    try {
      const result = await mutate(
        "/api/admin/official-sources/download-approved",
        "POST",
        undefined,
        "Lote de downloads concluído",
      );
      setDownloadReport(
        `${String(result.analyzed ?? 0)} analisados · ${String(result.downloaded ?? 0)} baixados · ${String(result.duplicates ?? 0)} duplicados · ${String(result.ignored ?? 0)} ignorados · ${String((result.errors as unknown[])?.length ?? 0)} erros`,
      );
    } catch {
      setDownloadReport("Não foi possível concluir o lote.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)] md:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
              {editingId ? "Editar fonte" : "Cadastro controlado"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {editingId ? "Alterar metadados" : "Nova URL oficial"}
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Allowlist ativa
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Vestibular">
            <input className="ek-input" value={form.vestibular} onChange={(event) => setForm({ ...form, vestibular: event.target.value })} />
          </Field>
          <Field label="Ano">
            <input className="ek-input" type="number" disabled={form.sourceKind === "SEED_PAGE"} value={form.year} onChange={(event) => setForm({ ...form, year: Number(event.target.value) })} />
          </Field>
          <Field label="Edição">
            <input className="ek-input" value={form.edition} onChange={(event) => setForm({ ...form, edition: event.target.value })} />
          </Field>
          <Field label="Dia / versão">
            <input className="ek-input" value={form.examDay} onChange={(event) => setForm({ ...form, examDay: event.target.value })} />
          </Field>
          <Field label="Natureza">
            <select className="ek-input" value={form.sourceKind} onChange={(event) => {
              const sourceKind = event.target.value as Source["sourceKind"];
              setForm({ ...form, sourceKind, fileType: sourceKind === "SEED_PAGE" ? "INDEX_PAGE" : "EXAM" });
            }}>
              <option value="DIRECT_FILE">Arquivo direto</option>
              <option value="SEED_PAGE">Página-semente</option>
            </select>
          </Field>
          <Field label="Tipo">
            <select className="ek-input" value={form.fileType} onChange={(event) => setForm({ ...form, fileType: event.target.value as Source["fileType"] })}>
              {form.sourceKind === "SEED_PAGE" ? <option value="INDEX_PAGE">Índice oficial</option> : <>
                <option value="EXAM">Prova</option>
                <option value="ANSWER_KEY">Gabarito</option>
              </>}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="URL oficial">
              <input className="ek-input" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://dominio-oficial/arquivo.pdf" />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Observações">
              <textarea className="ek-input min-h-20" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={Boolean(busy)} onClick={() => void saveSource()} className="ek-button ek-button-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Salvar e reenviar para aprovação" : "Cadastrar como pendente"}
          </button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="ek-button ek-button-ghost">Cancelar</button>}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <JsonPanel
          title="Importar fontes por JSON"
          description="Primeiro visualize o lote; a confirmação apenas cadastra fontes pendentes."
          value={jsonText}
          onChange={setJsonText}
          preview={jsonPreview}
          onPreview={() => void importJson(false)}
          onConfirm={() => void importJson(true)}
        />
        <JsonPanel
          title="Importar gabarito por JSON"
          description="Selecione um PDF de gabarito já baixado. As respostas ficam aguardando revisão."
          value={answerJson}
          onChange={setAnswerJson}
          preview={answerPreview}
          onPreview={() => void importAnswers(false)}
          onConfirm={() => void importAnswers(true)}
          select={
            <select className="ek-input mb-3" value={answerFileId} onChange={(event) => setAnswerFileId(event.target.value)}>
              <option value="">Selecione o arquivo de gabarito</option>
              {answerFiles.map((file) => <option key={file.id} value={file.id}>{file.vestibular} {file.year} · {file.fileName}</option>)}
            </select>
          }
        />
      </section>

      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Fontes cadastradas</h2>
            <p className="text-sm font-semibold text-slate-500">{initialSources.length} fonte(s), sem download automático.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void downloadApproved()}
              className="ek-button ek-button-primary"
            >
              {busy === "/api/admin/official-sources/download-approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar PDFs aprovados
            </button>
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="ek-input pl-9" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filtrar fontes" />
            </label>
          </div>
        </div>
        {downloadReport && <p className="mb-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-800">{downloadReport}</p>}
        <div className="space-y-3">
          {visibleSources.map((source) => (
            <article key={source.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950">{source.vestibular} {source.year ?? "· índice"}</h3>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${source.status === "APPROVED" || source.status === "DOWNLOADED" ? "bg-emerald-50 text-emerald-700" : source.status === "ERROR" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{sourceStatus(source.status)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{source.sourceKind === "SEED_PAGE" ? "Página-semente" : source.fileType === "EXAM" ? "Prova" : "Gabarito"}</span>
                  </div>
                  <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-blue-600">
                    {source.sourceUrl}<ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  {source.notes && <p className="mt-2 text-xs leading-5 text-slate-500">{source.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {source.status === "PENDING" && <button type="button" onClick={() => void mutate(`/api/admin/official-sources/${source.id}`, "PATCH", { action: "approve" }, "Fonte aprovada")} className="ek-button ek-button-primary"><CheckCircle2 className="h-4 w-4" />Aprovar</button>}
                  {source.status === "APPROVED" && source.sourceKind === "SEED_PAGE" && <button type="button" onClick={() => void mutate(`/api/admin/official-sources/${source.id}/discover`, "POST", undefined, "Página analisada")} className="ek-button ek-button-primary"><FileSearch className="h-4 w-4" />Descobrir links</button>}
                  {source.status === "APPROVED" && source.sourceKind === "DIRECT_FILE" && <button type="button" onClick={() => void mutate(`/api/admin/official-sources/${source.id}/download`, "POST", undefined, "Download concluído")} className="ek-button ek-button-primary"><Download className="h-4 w-4" />Baixar PDF</button>}
                  {source.status === "ERROR" && <button type="button" onClick={() => void mutate(`/api/admin/official-sources/${source.id}`, "PATCH", { action: "reopen" }, "Fonte reaberta")} className="ek-button ek-button-ghost"><RefreshCw className="h-4 w-4" />Reabrir</button>}
                  <button type="button" onClick={() => edit(source)} className="ek-button ek-button-ghost"><Edit3 className="h-4 w-4" />Editar</button>
                  {source.status !== "ARCHIVED" && <button type="button" onClick={() => void mutate(`/api/admin/official-sources/${source.id}`, "PATCH", { action: "archive" }, "Fonte arquivada")} className="ek-button ek-button-ghost"><Archive className="h-4 w-4" />Arquivar</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-5">
          <h2 className="text-xl font-black text-slate-950">Arquivos oficiais</h2>
          <div className="mt-4 space-y-2">
            {initialFiles.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum PDF baixado.</p>}
            {initialFiles.map((file) => (
              <div key={file.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-900">{file.vestibular} {file.year} · {file.fileType === "EXAM" ? "Prova" : "Gabarito"}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">{(file.fileSize / 1024 / 1024).toFixed(2)} MB · SHA {file.sha256Hash.slice(0, 12)}… · {file.processingStatus}</p>
                  </div>
                  <a href={file.storageUrl} target="_blank" rel="noreferrer" className="ek-button ek-button-ghost"><Download className="h-4 w-4" />Abrir</a>
                  {file.fileType === "ANSWER_KEY" && (
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(
                          `/api/admin/official-files/${file.id}/extract`,
                          "POST",
                          undefined,
                          "Gabarito extraído",
                        )
                      }
                      className="ek-button ek-button-primary"
                    >
                      <FileSearch className="h-4 w-4" />
                      Extrair respostas
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-100 bg-white p-5">
          <h2 className="text-xl font-black text-slate-950">Log recente</h2>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
            {initialLogs.map((log) => (
              <div key={log.id} className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{log.action} · {log.status} · {new Date(log.createdAt).toLocaleString("pt-BR")}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span>{children}</label>;
}

function JsonPanel({
  title,
  description,
  value,
  onChange,
  preview,
  onPreview,
  onConfirm,
  select,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  preview: string | null;
  onPreview: () => void;
  onConfirm: () => void;
  select?: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5">
      <div className="mb-3 flex items-center gap-2"><FileJson className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-black text-slate-950">{title}</h2></div>
      <p className="mb-3 text-xs font-semibold leading-5 text-slate-500">{description}</p>
      {select}
      <textarea className="ek-input min-h-56 font-mono text-xs" value={value} onChange={(event) => onChange(event.target.value)} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onPreview} className="ek-button ek-button-ghost"><Search className="h-4 w-4" />Visualizar</button>
        <button type="button" onClick={onConfirm} className="ek-button ek-button-primary"><CheckCircle2 className="h-4 w-4" />Confirmar importação</button>
        {preview && <span className="text-xs font-bold text-slate-600">{preview}</span>}
      </div>
    </section>
  );
}
