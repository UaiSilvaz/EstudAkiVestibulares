import {
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  FileText,
  ImageIcon,
  Send,
  SquarePen,
  Tags,
} from "lucide-react";
import Link from "next/link";
import type {
  EnemCorpusBookletProgress,
  EnemCorpusGateKey,
  EnemCorpusProgress,
} from "@/lib/enem-corpus-progress";

const gateMeta: Array<{
  key: EnemCorpusGateKey;
  label: string;
  icon: typeof FileText;
}> = [
  { key: "structure", label: "Estrutura", icon: FileText },
  { key: "answerKey", label: "Gabarito", icon: FileCheck2 },
  { key: "pedagogy", label: "Classificação", icon: Tags },
  { key: "resolution", label: "Resolução", icon: BookOpenCheck },
  { key: "essay", label: "Redação", icon: SquarePen },
  { key: "visualReview", label: "Revisão visual", icon: ImageIcon },
  { key: "publication", label: "Publicação", icon: Send },
];

export function EnemCorpusProgressPanel({
  progress,
}: {
  progress: EnemCorpusProgress;
}) {
  const years = Array.from(
    new Set(progress.booklets.map((booklet) => booklet.year)),
  );

  return (
    <section className="mb-6 overflow-hidden rounded-[30px] border border-violet-100 bg-white shadow-[0_24px_64px_-44px_rgba(30,41,59,0.46)]">
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
              Progresso global verificável
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              ENEM {progress.firstYear}–{progress.lastYear} ·{" "}
              {progress.totalBooklets} cadernos
            </h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              O percentual só chega a 100% quando todos os gates obrigatórios
              estiverem concluídos. Publicar questões sem resolução, revisão
              visual ou redação aplicável não completa o caderno.
            </p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-white px-5 py-3 text-right shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">
              Conclusão real
            </p>
            <p className="mt-1 text-4xl font-black text-violet-800">
              {progress.percentage}%
            </p>
          </div>
        </div>
        <div
          className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Conclusão global do corpus ENEM"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percentage}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 transition-[width]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-black text-slate-600">
          <span>
            {progress.completeBooklets}/{progress.totalBooklets} totalmente
            prontos
          </span>
          <span>
            {progress.representedBooklets}/{progress.totalBooklets} com job
          </span>
          <span>
            {progress.publishedBooklets}/{progress.totalBooklets} publicados
          </span>
          <span>
            {progress.passedGates}/{progress.totalGates} gates concluídos
          </span>
          {progress.trackedJobs > progress.representedBooklets && (
            <span>
              {progress.trackedJobs} jobs rastreados, incluindo versões
              substituídas
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 md:p-6">
        {gateMeta.map(({ key, label, icon: Icon }) => {
          const gate = progress.gateSummary[key];
          const complete = gate.passed === gate.total;
          return (
            <div
              key={key}
              className={`rounded-2xl border p-4 ${
                complete
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Icon
                  className={`h-4 w-4 ${complete ? "text-emerald-700" : "text-amber-700"}`}
                />
                <span className="text-xs font-black text-slate-700">
                  {gate.passed}/{gate.total}
                </span>
              </div>
              <p className="mt-2 text-sm font-black text-slate-950">{label}</p>
            </div>
          );
        })}
      </div>

      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
              Matriz canônica
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              Dois cadernos por ano
            </h3>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Completo
            </span>
            <span className="flex items-center gap-1">
              <CircleDashed className="h-3.5 w-3.5 text-amber-600" />
              Pendente
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {years.map((year) => (
            <div
              key={year}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <p className="font-black text-slate-950">{year}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {progress.booklets
                  .filter((booklet) => booklet.year === year)
                  .map((booklet) => (
                    <BookletBadge key={booklet.day} booklet={booklet} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookletBadge({ booklet }: { booklet: EnemCorpusBookletProgress }) {
  const classes = booklet.complete
    ? "border-emerald-200 bg-emerald-100 text-emerald-900"
    : booklet.jobId
      ? "border-amber-200 bg-amber-100 text-amber-900"
      : "border-slate-200 bg-white text-slate-500";
  const contents = (
    <>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-black uppercase">
          Dia {booklet.day}
        </span>
        {booklet.complete ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <CircleDashed className="h-3.5 w-3.5" />
        )}
      </div>
      <p className="mt-1 text-sm font-black">{booklet.percentage}%</p>
      <p className="text-[9px] font-bold opacity-75">
        {booklet.passedGates}/{booklet.totalGates} gates
      </p>
    </>
  );
  const className = `rounded-xl border px-2 py-2 ${classes}`;
  const title = booklet.issues.join(" · ");
  return booklet.jobId && booklet.jobStatus !== "PUBLISHED" ? (
    <Link
      href={`/admin/importacoes-enem/${booklet.jobId}/preview`}
      className={`${className} transition hover:-translate-y-0.5 hover:shadow-sm`}
      title={`${title}${title ? " · " : ""}Abrir prévia administrativa`}
    >
      {contents}
    </Link>
  ) : (
    <div className={className} title={title}>
      {contents}
    </div>
  );
}
