"use client";

import { CheckCircle2, FileCheck2, FileText, Filter, Pencil, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { OldExamRecord } from "@/lib/old-exams";

export function OldExamLibrary({ exams }: { exams: OldExamRecord[] }) {
  const [vestibular, setVestibular] = useState("TODOS");
  const [year, setYear] = useState("TODOS");
  const vestibulares = useMemo(() => Array.from(new Set(exams.map((exam) => exam.vestibular))).sort(), [exams]);
  const years = useMemo(() => Array.from(new Set(exams.filter((exam) => vestibular === "TODOS" || exam.vestibular === vestibular).map((exam) => exam.ano))).sort((a, b) => b - a), [exams, vestibular]);
  const filtered = exams.filter((exam) => (vestibular === "TODOS" || exam.vestibular === vestibular) && (year === "TODOS" || exam.ano === Number(year)));

  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-[28px] border border-slate-100 bg-white p-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.2)] sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Filter className="h-5 w-5" /></div>
        <FilterField label="Vestibular" value={vestibular} onChange={(value) => { setVestibular(value); setYear("TODOS"); }} options={["TODOS", ...vestibulares]} />
        <FilterField label="Ano" value={year} onChange={setYear} options={["TODOS", ...years.map(String)]} />
        <p className="pb-2 text-sm font-bold text-slate-500 sm:text-right">{filtered.length} prova(s) oficial(is)</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((exam) => (
          <article key={exam.id} className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-[0_20px_44px_-30px_rgba(15,23,42,0.25)]">
            <div className="h-2 bg-gradient-to-r from-blue-600 via-cyan-400 to-orange-400" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">{exam.vestibular} · {exam.ano}</p>
                  <h2 className="mt-2 text-xl font-black leading-tight text-slate-950">{exam.titulo}</h2>
                </div>
                <StatusBadge status={exam.status} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{exam.descricao}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Fase" value={exam.fase} />
                <MiniStat label="Questões" value={exam.totalQuestoes?.toString() ?? "—"} />
                <MiniStat label="Online" value={String(exam.questoesDisponiveis ?? 0)} />
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link href={`/provas-antigas/${exam.id}`} className="estudaki-button estudaki-button-primary justify-center"><FileText className="h-4 w-4" /> Abrir prova</Link>
                {exam.arquivoGabaritoUrl ? (
                  <Link href={`/provas-antigas/${exam.id}?documento=gabarito`} className="estudaki-button estudaki-button-ghost justify-center"><FileCheck2 className="h-4 w-4" /> Ver gabarito</Link>
                ) : <span className="estudaki-button estudaki-button-ghost justify-center opacity-50">Sem gabarito</span>}
              </div>
              <Link href={`/provas-antigas/${exam.id}/editor`} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
                <Pencil className="h-4 w-4" /> Editar, riscar e anotar
              </Link>
              {(exam.questoesDisponiveis ?? 0) > 0 ? (
                <Link href={`/provas-antigas/${exam.id}/resolver`} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"><PlayCircle className="h-4 w-4" /> Resolver online</Link>
              ) : (
                <div className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-400"><PlayCircle className="h-4 w-4" /> Online após revisão</div>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function FilterField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="min-w-0"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><select className="estudaki-input w-full" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option === "TODOS" ? "Todos" : option}</option>)}</select></label>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-2"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-xs font-black text-slate-800">{value}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const available = status === "DISPONIVEL";
  const approved = status === "APROVADA";
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${available ? "bg-emerald-50 text-emerald-700" : approved ? "bg-blue-50 text-blue-700" : status === "EM_PROCESSAMENTO" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{(available || approved) && <CheckCircle2 className="h-3 w-3" />}{available ? "Disponível" : approved ? "Prova aprovada" : status === "EM_PROCESSAMENTO" ? "Processando" : "Pendente"}</span>;
}
