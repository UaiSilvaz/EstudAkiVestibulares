"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FileText, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { logoForVestibular, loopImageForVestibular } from "@/lib/assets";
import { cn } from "@/lib/utils";

type ExamCard = {
  id: string;
  title: string;
  year: number;
  phase: string;
  day: string | null;
  pdfUrl: string | null;
  answerKeyUrl: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  questionCount: number | null;
  durationMinutes: number | null;
  color: string;
  vestibular: { name: string; slug: string; color: string };
};

export function ExamLibrary({ exams }: { exams: ExamCard[] }) {
  const [search, setSearch] = useState("");
  const [vestibular, setVestibular] = useState("");
  const [phase, setPhase] = useState("");

  const vestibulares = useMemo(
    () => Array.from(new Map(exams.map((exam) => [exam.vestibular.slug, exam.vestibular])).values()),
    [exams],
  );
  const phases = useMemo(() => Array.from(new Set(exams.map((exam) => exam.phase))).sort(), [exams]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exams.filter((exam) => {
      if (vestibular && exam.vestibular.slug !== vestibular) return false;
      if (phase && exam.phase !== phase) return false;
      if (!term) return true;
      return [exam.title, exam.year, exam.phase, exam.day, exam.vestibular.name]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [exams, phase, search, vestibular]);

  return (
    <div>
      <div className="mb-5 grid gap-3 rounded-[28px] border border-slate-100 bg-white p-3 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.16)] md:grid-cols-[1fr_220px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            className="ek-input h-12 pl-11"
            placeholder="Busque por ENEM, FUVEST, ano, fase..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select className="ek-input h-12" value={vestibular} onChange={(event) => setVestibular(event.target.value)}>
          <option value="">Todos vestibulares</option>
          {vestibulares.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="ek-input h-12" value={phase} onChange={(event) => setPhase(event.target.value)}>
          <option value="">Todas as fases</option>
          {phases.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((exam, index) => {
          const accent = exam.color || exam.vestibular.color || "#2563EB";
          const image = exam.imageUrl ?? loopImageForVestibular(exam.vestibular.slug);
          const logo = logoForVestibular(exam.vestibular.slug);

          return (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.25) }}
              className="group relative overflow-hidden rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.22)]"
              style={{ borderTop: `4px solid ${accent}` }}
            >
              <div className="mb-5 flex h-36 items-center justify-center rounded-[24px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5">
                <Image
                  src={image}
                  alt={exam.vestibular.name}
                  width={260}
                  height={150}
                  className="h-24 w-full object-contain drop-shadow-[0_16px_24px_rgba(15,23,42,0.16)] transition group-hover:scale-105"
                  unoptimized
                />
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                  <Image src={logo} alt={exam.vestibular.name} width={42} height={42} className="h-8 w-8 object-contain" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
                    {exam.vestibular.name} - {exam.year}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-xl font-black text-slate-950">{exam.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {exam.phase} - {exam.day ?? "Caderno unico"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Stat label="Questoes" value={exam.questionCount?.toString() ?? "--"} />
                <Stat label="Tempo" value={exam.durationMinutes ? `${exam.durationMinutes}m` : "--"} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge active={!!exam.pdfUrl} label={exam.pdfUrl ? "PDF" : "sem PDF"} />
                <Badge active={!!exam.answerKeyUrl} label={exam.answerKeyUrl ? "gabarito" : "sem gabarito"} />
                <Badge active={!!exam.sourceUrl} label="fonte oficial" />
              </div>

              <Link
                href={`/provas/${exam.id}`}
                className={cn(
                  "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white transition",
                  "shadow-[0_14px_28px_-16px_rgba(15,23,42,0.35)] hover:shadow-[0_18px_36px_-16px_rgba(15,23,42,0.45)]",
                )}
                style={{ background: `linear-gradient(135deg, ${accent}, #22D3EE)` }}
              >
                Abrir no editor
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </motion.div>
          );
        })}
      </section>

      {filtered.length === 0 && (
        <div className="rounded-[28px] border border-slate-100 bg-white p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-black text-slate-700">Nenhuma prova encontrada.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400",
      )}
    >
      {active && <CheckCircle2 className="h-3 w-3" />}
      {label}
    </span>
  );
}
