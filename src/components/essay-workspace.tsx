"use client";

import {
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  PenLine,
  ScanText,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Competency = {
  number: number;
  title: string;
  score: number;
  evidence: string;
  suggestion: string;
};
type Evaluation = {
  score: number;
  competencies: Competency[];
  strengths: string[];
  improvements: string[];
  stats: { words: number; sentences: number; paragraphs: number; connectors: number };
  warning: string | null;
};
type History = { id: string; theme: string; score: number; createdAt: string };
type OfficialProposal = {
  id: string;
  year: number;
  day: string | null;
  title: string | null;
  theme: string | null;
  promptText: string;
  instructions: string[];
  blocks: Array<{ type: string; content: string; order: number }>;
  assets: Array<{ url: string; altText: string; order: number }>;
  originalPageUrl: string;
};

const themes = [
  "Desafios para democratizar o acesso à educação digital no Brasil",
  "A importância da cultura científica na formação dos jovens",
  "Caminhos para combater a evasão escolar no ensino médio",
];

export function EssayWorkspace({
  history,
  officialProposals,
}: {
  history: History[];
  officialProposals: OfficialProposal[];
}) {
  const { notify } = useFeedback();
  const [themeKey, setThemeKey] = useState(
    officialProposals[0] ? `official:${officialProposals[0].id}` : "practice:0",
  );
  const [text, setText] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const preview = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
  const selectedProposal = useMemo(
    () => officialProposals.find((proposal) => themeKey === `official:${proposal.id}`) ?? null,
    [officialProposals, themeKey],
  );
  const practiceIndex = themeKey.startsWith("practice:")
    ? Number(themeKey.slice("practice:".length))
    : 0;
  const theme = selectedProposal?.theme?.trim() || themes[practiceIndex] || themes[0];

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function scan() {
    if (!file) return;
    setScanning(true);
    notify({ tone: "info", title: "Scanner iniciado", message: "A leitura da escrita pode levar alguns instantes.", duration: 3500 });
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      const result = await worker.recognize(file);
      await worker.terminate();
      const extracted = result.data.text.trim();
      setOcrText(extracted);
      setText(extracted);
      notify({
        tone: extracted ? "success" : "warning",
        title: extracted ? "Texto reconhecido" : "Não foi possível ler a foto",
        message: extracted ? "Revise a transcrição antes de solicitar a correção." : "Tente uma foto mais nítida, reta e bem iluminada.",
      });
    } catch {
      notify({ tone: "error", title: "Falha no scanner", message: "Não foi possível carregar o reconhecimento de texto." });
    } finally {
      setScanning(false);
    }
  }

  async function evaluate() {
    if (text.trim().length < 30) {
      notify({ tone: "warning", title: "Redação incompleta", message: "Digite ou escaneie um texto maior antes de corrigir." });
      return;
    }
    setEvaluating(true);
    const form = new FormData();
    form.set("theme", theme);
    form.set("text", text);
    form.set("ocrText", ocrText);
    if (file) form.set("image", file);
    try {
      const response = await fetch("/api/essays/evaluate", { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as { evaluation?: Evaluation; error?: string } | null;
      if (!response.ok || !data?.evaluation) {
        notify({ tone: "error", title: "Correção não concluída", message: data?.error ?? "Tente novamente." });
        return;
      }
      setEvaluation(data.evaluation);
      notify({ tone: "success", title: "Análise concluída", message: `Estimativa pedagógica: ${data.evaluation.score} pontos.` });
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.3)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><PenLine className="h-5 w-5" /></span>
            <div><h2 className="text-xl font-black text-slate-950">Escrever redação</h2><p className="text-xs font-semibold text-slate-500">Digite ou revise o texto extraído da foto.</p></div>
          </div>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Tema</span>
            <select value={themeKey} onChange={(event) => setThemeKey(event.target.value)} className="ek-input w-full">
              {officialProposals.length > 0 && (
                <optgroup label="Propostas oficiais do ENEM">
                  {officialProposals.map((proposal) => (
                    <option key={proposal.id} value={`official:${proposal.id}`}>
                      ENEM {proposal.year} · {proposal.theme || proposal.title || "Proposta oficial"}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Temas de treino EstudAki">
                {themes.map((item, index) => <option key={item} value={`practice:${index}`}>{item}</option>)}
              </optgroup>
            </select>
          </label>
          {selectedProposal && (
            <article className="mt-4 rounded-[22px] border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                    Proposta oficial · ENEM {selectedProposal.year} · {selectedProposal.day ?? "dia não informado"}
                  </p>
                  <h3 className="mt-2 text-base font-black text-slate-950">
                    {selectedProposal.theme || selectedProposal.title || "Proposta de redação"}
                  </h3>
                </div>
                <a
                  href={selectedProposal.originalPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-800"
                >
                  Consultar original
                </a>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-slate-700">
                {selectedProposal.promptText}
              </p>
              {selectedProposal.instructions.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs font-semibold leading-5 text-slate-600">
                  {selectedProposal.instructions.map((instruction) => <li key={instruction}>• {instruction}</li>)}
                </ul>
              )}
              {selectedProposal.blocks.length > 0 && (
                <details className="mt-3 rounded-2xl border border-blue-100 bg-white p-3">
                  <summary className="cursor-pointer text-xs font-black text-blue-800">Textos motivadores e créditos</summary>
                  <div className="mt-3 space-y-3">
                    {selectedProposal.blocks.map((block, index) => (
                      <p key={`${block.order}-${index}`} className="whitespace-pre-line text-xs font-medium leading-5 text-slate-600">
                        {block.content}
                      </p>
                    ))}
                  </div>
                </details>
              )}
              {selectedProposal.assets.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {selectedProposal.assets.map((asset, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={`${asset.url}-${index}`} src={asset.url} alt={asset.altText} className="max-h-72 w-full rounded-2xl border border-blue-100 bg-white object-contain p-2" />
                  ))}
                </div>
              )}
            </article>
          )}
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={18} className="mt-3 w-full resize-y rounded-[22px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Comece pela introdução, apresente sua tese, desenvolva os argumentos e finalize com uma proposta de intervenção..." />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-400">
            <span>{text.trim() ? text.trim().split(/\s+/).length : 0} palavras</span>
            <span>Estimativa automática, não é nota oficial do Inep.</span>
          </div>
          <button disabled={evaluating} onClick={() => void evaluate()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:opacity-60">
            {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {evaluating ? "Analisando competências..." : "Corrigir redação"}
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 sm:p-6">
            <div className="flex items-center gap-3"><Camera className="h-6 w-6 text-orange-600" /><h2 className="text-xl font-black text-slate-950">Scanner manuscrito</h2></div>
            <label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-orange-200 bg-white p-4 text-center">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Prévia da redação" className="max-h-52 max-w-full rounded-xl object-contain" />
              ) : <><ScanText className="h-9 w-9 text-orange-400" /><span className="mt-2 text-sm font-black text-slate-700">Selecionar foto</span><span className="mt-1 text-xs text-slate-400">JPG, PNG ou WEBP com boa iluminação</span></>}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
            <button disabled={!file || scanning} onClick={() => void scan()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-40">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
              {scanning ? "Reconhecendo escrita..." : "Escanear texto"}
            </button>
          </div>
          <a href="/referencias/cartilha-redacao-enem-2025.pdf" target="_blank" className="flex items-center gap-3 rounded-[22px] border border-blue-100 bg-blue-50 p-4 text-sm font-black text-blue-800"><FileText className="h-5 w-5" /> Abrir Cartilha oficial ENEM 2025</a>
          <div className="rounded-[22px] border border-slate-100 bg-white p-5">
            <h3 className="font-black text-slate-950">Histórico recente</h3>
            <div className="mt-3 space-y-2">
              {history.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">{item.theme}</p><p className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</p></div><span className="text-lg font-black text-blue-700">{item.score}</span></div>)}
              {!history.length && <p className="text-xs font-semibold text-slate-400">Nenhuma redação corrigida ainda.</p>}
            </div>
          </div>
        </div>
      </section>

      {evaluation && (
        <section className="rounded-[30px] border border-blue-100 bg-white p-5 shadow-[0_24px_55px_-34px_rgba(37,99,235,0.4)] sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Estimativa pedagógica</p><h2 className="mt-1 text-4xl font-black text-slate-950">{evaluation.score}<span className="text-lg text-slate-400">/1000</span></h2></div>
            <div className="flex gap-4 text-xs font-bold text-slate-500"><span>{evaluation.stats.paragraphs} parágrafos</span><span>{evaluation.stats.connectors} conectivos</span></div>
          </div>
          {evaluation.warning && <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{evaluation.warning}</p>}
          <div className="mt-6 grid gap-3 lg:grid-cols-5">
            {evaluation.competencies.map((item) => (
              <article key={item.number} className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white">C{item.number}</span><strong className="text-xl text-slate-950">{item.score}</strong></div>
                <h3 className="mt-3 text-sm font-black text-slate-800">{item.title}</h3>
                <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{item.evidence}</p>
                <p className="mt-2 text-xs font-bold leading-5 text-blue-700">{item.suggestion}</p>
              </article>
            ))}
          </div>
          {evaluation.strengths.length > 0 && <div className="mt-5 rounded-[22px] border border-emerald-100 bg-emerald-50 p-5"><h3 className="flex items-center gap-2 font-black text-emerald-800"><CheckCircle2 className="h-5 w-5" /> Pontos fortes</h3><ul className="mt-2 space-y-1 text-sm font-semibold text-emerald-700">{evaluation.strengths.map((item) => <li key={item}>• {item}</li>)}</ul></div>}
        </section>
      )}
    </div>
  );
}
