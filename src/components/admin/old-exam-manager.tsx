"use client";

import { Edit3, Eye, FileCheck2, FileSearch, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OldExamRecord } from "@/lib/old-exams";
import { useFeedback } from "@/components/feedback/feedback-provider";

const emptyForm = {
  vestibular: "ENEM", slug: "", ano: new Date().getFullYear(), titulo: "", descricao: "",
  fase: "", dia: "", tipo: "OFICIAL", arquivoProvaUrl: "", arquivoGabaritoUrl: "",
  arquivoProvaPath: "", arquivoGabaritoPath: "", fonteOficial: "", fonteUrl: "",
  totalQuestoes: 0, status: "PENDENTE",
};

export function OldExamManager({ exams }: { exams: OldExamRecord[] }) {
  const router = useRouter();
  const { notify } = useFeedback();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function edit(exam: OldExamRecord) {
    setEditingId(exam.id);
    setForm({
      vestibular: exam.vestibular, slug: exam.slug, ano: exam.ano, titulo: exam.titulo,
      descricao: exam.descricao, fase: exam.fase, dia: exam.dia ?? "", tipo: exam.tipo,
      arquivoProvaUrl: exam.arquivoProvaUrl, arquivoGabaritoUrl: exam.arquivoGabaritoUrl ?? "",
      arquivoProvaPath: exam.arquivoProvaPath, arquivoGabaritoPath: exam.arquivoGabaritoPath ?? "",
      fonteOficial: exam.fonteOficial, fonteUrl: exam.fonteUrl, totalQuestoes: exam.totalQuestoes ?? 0,
      status: exam.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setLoading(true); setMessage("");
    const response = await fetch(editingId ? `/api/admin/provas-antigas/${editingId}` : "/api/admin/provas-antigas", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => null) as { error?: string } | null;
    setLoading(false);
    const resultMessage = response.ok
      ? editingId ? "Prova atualizada." : "Prova cadastrada."
      : body?.error ?? "Não foi possível salvar.";
    setMessage(resultMessage);
    if (response.ok) {
      notify({
        tone: "success",
        title: editingId ? "Prova atualizada" : "Prova cadastrada",
        message: "As informações foram salvas no acervo.",
      });
      setEditingId(null); setForm(emptyForm); router.refresh();
    } else {
      notify({ tone: "error", title: "Prova não salva", message: resultMessage });
    }
  }

  async function process(exam: OldExamRecord) {
    setMessage(`Processando ${exam.titulo}...`);
    const response = await fetch(`/api/admin/provas-antigas/${exam.id}/processar`, { method: "POST" });
    const body = await response.json().catch(() => null) as { error?: string; summary?: { detected: number; valid: number; errors: number } } | null;
    const resultMessage = response.ok
      ? `Extração concluída: ${body?.summary?.detected ?? 0} detectadas, ${body?.summary?.valid ?? 0} válidas, ${body?.summary?.errors ?? 0} com erro.`
      : body?.error ?? "Falha no processamento.";
    setMessage(resultMessage);
    notify({
      tone: response.ok ? "success" : "error",
      title: response.ok ? "Processamento concluído" : "Falha no processamento",
      message: resultMessage,
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)]">
        <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">{editingId ? "Edição" : "Cadastro manual"}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{editingId ? "Editar prova antiga" : "Nova prova antiga"}</h2></div>{editingId && <button className="estudaki-button estudaki-button-ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar</button>}</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Vestibular" value={form.vestibular} onChange={(vestibular) => setForm({ ...form, vestibular })} />
          <Field label="Ano" type="number" value={String(form.ano)} onChange={(ano) => setForm({ ...form, ano: Number(ano) })} />
          <Field label="Identificador" value={form.slug} onChange={(slug) => setForm({ ...form, slug })} placeholder="enem-2026-dia-1" />
          <Field label="Status" value={form.status} onChange={(status) => setForm({ ...form, status })} select={["PENDENTE", "APROVADA", "DISPONIVEL", "EM_PROCESSAMENTO", "COM_ERRO"]} />
          <div className="md:col-span-2"><Field label="Título" value={form.titulo} onChange={(titulo) => setForm({ ...form, titulo })} /></div>
          <Field label="Fase" value={form.fase} onChange={(fase) => setForm({ ...form, fase })} />
          <Field label="Dia / versão" value={form.dia} onChange={(dia) => setForm({ ...form, dia })} />
          <div className="md:col-span-2 xl:col-span-4"><Field label="Descrição" value={form.descricao} onChange={(descricao) => setForm({ ...form, descricao })} textarea /></div>
          <Field label="URL da prova" value={form.arquivoProvaUrl} onChange={(arquivoProvaUrl) => setForm({ ...form, arquivoProvaUrl })} />
          <Field label="Caminho local da prova" value={form.arquivoProvaPath} onChange={(arquivoProvaPath) => setForm({ ...form, arquivoProvaPath })} />
          <Field label="URL do gabarito" value={form.arquivoGabaritoUrl} onChange={(arquivoGabaritoUrl) => setForm({ ...form, arquivoGabaritoUrl })} />
          <Field label="Caminho local do gabarito" value={form.arquivoGabaritoPath} onChange={(arquivoGabaritoPath) => setForm({ ...form, arquivoGabaritoPath })} />
          <Field label="Fonte oficial" value={form.fonteOficial} onChange={(fonteOficial) => setForm({ ...form, fonteOficial })} />
          <div className="md:col-span-2"><Field label="Página oficial" value={form.fonteUrl} onChange={(fonteUrl) => setForm({ ...form, fonteUrl })} /></div>
          <Field label="Total previsto" type="number" value={String(form.totalQuestoes)} onChange={(totalQuestoes) => setForm({ ...form, totalQuestoes: Number(totalQuestoes) })} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={loading} onClick={save} className="estudaki-button estudaki-button-primary"><Plus className="h-4 w-4" />{editingId ? "Salvar alterações" : "Cadastrar prova"}</button>{message && <p className="text-sm font-bold text-slate-600">{message}</p>}</div>
      </section>

      <section className="space-y-3">
        {exams.map((exam) => (
          <article key={exam.id} className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{exam.vestibular} · {exam.ano} · {exam.status.replaceAll("_", " ")}</p><h3 className="mt-1 text-lg font-black text-slate-950">{exam.titulo}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{exam.fase} · {exam.dia ?? "Dia único"} · {exam.questoesVinculadas} vinculadas</p></div>
              <div className="flex flex-wrap gap-2">
                <a href={exam.arquivoProvaUrl} target="_blank" rel="noreferrer" className="estudaki-button estudaki-button-ghost"><Eye className="h-4 w-4" /> Prova</a>
                {exam.arquivoGabaritoUrl && <a href={exam.arquivoGabaritoUrl} target="_blank" rel="noreferrer" className="estudaki-button estudaki-button-ghost"><FileCheck2 className="h-4 w-4" /> Gabarito</a>}
                <button onClick={() => edit(exam)} className="estudaki-button estudaki-button-ghost"><Edit3 className="h-4 w-4" /> Editar</button>
                <a href={`/admin/provas-antigas/${exam.id}/questoes`} className="estudaki-button estudaki-button-ghost"><FileSearch className="h-4 w-4" /> Questões ({exam.questoesVinculadas})</a>
                <button onClick={() => process(exam)} className="estudaki-button estudaki-button-primary"><RefreshCw className="h-4 w-4" />{exam.importacaoStatus === "NAO_INICIADA" ? "Processar" : "Reprocessar"}</button>
                {exam.importacaoRelatorio && <a href={`/api/provas-antigas/${exam.id}/relatorio`} target="_blank" rel="noreferrer" className="estudaki-button estudaki-button-ghost"><FileSearch className="h-4 w-4" /> Relatório</a>}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-4"><Metric label="Detectadas" value={exam.questoesDetectadas} /><Metric label="Válidas" value={exam.questoesValidas} /><Metric label="Com erro" value={exam.questoesComErro} /><Metric label="Imagens" value={exam.imagensDetectadas} /></div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, textarea, select }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; textarea?: boolean; select?: string[] }) {
  const props = { className: "estudaki-input", value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value), placeholder };
  return <label><span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span>{textarea ? <textarea {...props} className="estudaki-input min-h-24" /> : select ? <select {...props}>{select.map((item) => <option key={item}>{item}</option>)}</select> : <input {...props} type={type} />}</label>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-900">{value}</p></div>; }
