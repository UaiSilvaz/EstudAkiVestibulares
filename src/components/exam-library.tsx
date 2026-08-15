"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

type VestibularGroup = {
  slug: string;
  name: string;
  color: string;
  exams: ExamCard[];
  years: number[];
};

export function ExamLibrary({ exams }: { exams: ExamCard[] }) {
  const searchParams = useSearchParams();
  const initialExam = searchParams.get("exam")?.toLowerCase() ?? "";
  const [selectedVestibular, setSelectedVestibular] = useState(initialExam);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const groups = useMemo<VestibularGroup[]>(() => {
    const map = new Map<string, VestibularGroup>();

    exams.forEach((exam) => {
      const current =
        map.get(exam.vestibular.slug) ??
        {
          slug: exam.vestibular.slug,
          name: exam.vestibular.name,
          color: exam.vestibular.color,
          exams: [],
          years: [],
        };

      current.exams.push(exam);
      if (!current.years.includes(exam.year)) current.years.push(exam.year);
      map.set(exam.vestibular.slug, current);
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        exams: group.exams.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title)),
        years: group.years.sort((a, b) => a - b),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exams]);

  const activeGroup = groups.find((group) => group.slug === selectedVestibular) ?? null;
  const yearExams = useMemo(() => {
    if (!activeGroup || selectedYear === null) return [];
    const term = search.trim().toLowerCase();

    return activeGroup.exams.filter((exam) => {
      if (exam.year !== selectedYear) return false;
      if (!term) return true;

      return [exam.title, exam.phase, exam.day, exam.sourceUrl]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [activeGroup, search, selectedYear]);

  function resetToVestibulares() {
    setSelectedVestibular("");
    setSelectedYear(null);
    setSearch("");
  }

  if (!activeGroup) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group, index) => {
          const image = loopImageForVestibular(group.slug);
          const logo = logoForVestibular(group.slug);
          const pdfCount = group.exams.filter((exam) => exam.pdfUrl).length;

          return (
            <motion.button
              key={group.slug}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
              onClick={() => {
                setSelectedVestibular(group.slug);
                setSelectedYear(null);
                setSearch("");
              }}
              className="group relative overflow-hidden rounded-[30px] border border-slate-100 bg-white p-5 text-left shadow-[0_18px_40px_-24px_rgba(15,23,42,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.22)]"
              style={{ borderTop: `4px solid ${group.color}` }}
            >
              <div className="mb-5 flex h-36 items-center justify-center rounded-[24px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5">
                <Image
                  src={image}
                  alt={group.name}
                  width={260}
                  height={150}
                  className="h-24 w-full object-contain drop-shadow-[0_16px_24px_rgba(15,23,42,0.16)] transition group-hover:scale-105"
                  unoptimized
                />
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                  <Image src={logo} alt={group.name} width={42} height={42} className="h-8 w-8 object-contain" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: group.color }}>
                    {group.years[0]} ate {group.years[group.years.length - 1]}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{group.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {group.exams.length} registros, {pdfCount} com PDF direto
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                Ver anos
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </motion.button>
          );
        })}
      </section>
    );
  }

  if (selectedYear === null) {
    return (
      <div>
        <LibraryTrail
          vestibular={activeGroup.name}
          onBack={resetToVestibulares}
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeGroup.years.map((year, index) => {
            const items = activeGroup.exams.filter((exam) => exam.year === year);
            const pdfCount = items.filter((exam) => exam.pdfUrl).length;

            return (
              <motion.button
                key={year}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.18) }}
                onClick={() => setSelectedYear(year)}
                className="group rounded-[26px] border border-slate-100 bg-white p-5 text-left shadow-[0_16px_34px_-26px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: activeGroup.color }}>
                  {items.length} prova(s)
                </p>
                <h2 className="mt-2 text-4xl font-black text-slate-950">{year}</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {pdfCount} PDF(s) direto(s) e {items.filter((exam) => exam.answerKeyUrl).length} gabarito(s)
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black" style={{ color: activeGroup.color }}>
                  Abrir provas
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </motion.button>
            );
          })}
        </section>
      </div>
    );
  }

  return (
    <div>
      <LibraryTrail
        vestibular={activeGroup.name}
        year={selectedYear}
        onBack={() => setSelectedYear(null)}
        onRoot={resetToVestibulares}
      />

      <div className="mb-5 rounded-[28px] border border-slate-100 bg-white p-3 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.16)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            className="ek-input ek-input-with-icon h-12 !pl-11"
            placeholder="Busque por fase, dia, caderno ou fonte..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {yearExams.map((exam, index) => (
          <ExamCardItem key={exam.id} exam={exam} index={index} />
        ))}
      </section>

      {yearExams.length === 0 && (
        <div className="rounded-[28px] border border-slate-100 bg-white p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-black text-slate-700">Nenhuma prova encontrada neste ano.</p>
        </div>
      )}
    </div>
  );
}

function LibraryTrail({
  vestibular,
  year,
  onBack,
  onRoot,
}: {
  vestibular: string;
  year?: number;
  onBack: () => void;
  onRoot?: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <button type="button" onClick={onRoot ?? onBack} className="estudaki-button estudaki-button-ghost h-11 px-4">
        <ArrowLeft className="h-4 w-4" />
        Vestibulares
      </button>
      <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-500">
        {vestibular}
      </span>
      {year ? (
        <>
          <button type="button" onClick={onBack} className="estudaki-button estudaki-button-ghost h-11 px-4">
            Anos
          </button>
          <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700">
            {year}
          </span>
        </>
      ) : null}
    </div>
  );
}

function ExamCardItem({ exam, index }: { exam: ExamCard; index: number }) {
  const accent = exam.color || exam.vestibular.color || "#2563EB";
  const logo = logoForVestibular(exam.vestibular.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.25) }}
      className="group relative overflow-hidden rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.22)]"
      style={{ borderTop: `4px solid ${accent}` }}
    >
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
        <Stat label="Questões" value={exam.questionCount?.toString() ?? "--"} />
        <Stat label="Tempo" value={exam.durationMinutes ? `${exam.durationMinutes}m` : "--"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge active={!!exam.pdfUrl} label={exam.pdfUrl ? "PDF" : "sem PDF direto"} />
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
        <ShieldCheck className="h-4 w-4" />
      </Link>
    </motion.div>
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
