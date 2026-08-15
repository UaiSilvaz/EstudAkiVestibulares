import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Library,
  Map,
  PenTool,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { StudyIcon, type StudyIconName } from "@/components/visual/study-icon";
import { cn } from "@/lib/utils";

const loadingMessages = [
  "Analisando seu progresso...",
  "Buscando suas revisoes...",
  "Organizando suas prioridades...",
  "Preparando seu plano de hoje...",
];

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn("ek-skeleton", className)} />;
}

function BrandLoader({
  title = "Preparando seu estudo de hoje...",
  compact = false,
}: {
  title?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_56px_-34px_rgba(37,99,235,0.34)]",
        compact ? "p-5" : "p-6 md:p-8",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"
      />
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#EFF6FF] to-white shadow-[0_18px_28px_-22px_rgba(37,99,235,0.65)] ring-1 ring-blue-100">
            <Image
              src="/brand/estudaki-logo.png"
              alt="EstudAki"
              width={112}
              height={112}
              className="h-12 w-12 object-contain"
              priority
            />
            <span className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-gradient-to-br from-[#FACC15] to-[#F97316] shadow-[0_10px_18px_-10px_rgba(249,115,22,0.8)] ring-2 ring-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              EstudAki
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-[#0F172A] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Voce diz onde quer chegar. A gente organiza o que estudar agora.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 self-start sm:self-center" aria-hidden>
          {(["matematica", "fisica", "quimica", "biologia"] as StudyIconName[]).map((name) => (
            <StudyIcon key={name} name={name} size="xs" />
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-6">
        <div className="h-2 overflow-hidden rounded-full bg-blue-50 ring-1 ring-blue-100">
          <div className="estudaki-loading-progress h-full rounded-full bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#FACC15]" />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {loadingMessages.map((message, index) => (
            <div
              key={message}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-500"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              {message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardLoadingState() {
  return (
    <div className="mx-auto w-full space-y-5" role="status" aria-live="polite" aria-label="Carregando dashboard">
      <BrandLoader />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.22)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="mt-3 h-8 w-64 max-w-full" />
              <SkeletonBlock className="mt-3 h-4 w-80 max-w-full" />
            </div>
            <SkeletonBlock className="h-24 w-24 rounded-full" />
          </div>
          <div className="mt-5 grid gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="grid min-h-20 grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                <SkeletonBlock className="h-11 w-11 rounded-2xl" />
                <div>
                  <SkeletonBlock className="h-4 w-44 max-w-full" />
                  <SkeletonBlock className="mt-2 h-3 w-64 max-w-full" />
                </div>
                <SkeletonBlock className="h-7 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.22)]">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="mt-3 h-8 w-40" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonBlock key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock key={index} className="h-32 rounded-[24px]" />
        ))}
      </section>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

export function PlatformLoadingState() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-label="Carregando area autenticada">
      <BrandLoader title="Abrindo sua area de estudos..." compact />
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden space-y-3 rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.32)] lg:block">
          <SkeletonBlock className="h-10 rounded-xl" />
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} className="h-11 rounded-xl" />
          ))}
        </aside>
        <main className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_55px_-30px_rgba(15,23,42,0.36)]">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-orange-50 px-5 py-6 md:px-8">
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
          </div>
          <div className="mx-auto max-w-[860px] space-y-4 px-5 py-7 md:px-8 md:py-9">
            <SkeletonBlock className="h-72 rounded-[24px]" />
            <SkeletonBlock className="h-14 rounded-2xl" />
            <SkeletonBlock className="h-14 rounded-2xl" />
            <SkeletonBlock className="h-14 rounded-2xl" />
          </div>
        </main>
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

export function QuestionsLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Banco de questoes"
      title="Preparando sua lista inteligente"
      icon={<ClipboardList className="h-5 w-5" />}
      leftRail
      rows={5}
    />
  );
}

export function JourneyLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Jornada EstudAki"
      title="Montando seus mundos e trilhas"
      icon={<Map className="h-5 w-5" />}
      subjectIcons={["matematica", "linguagens", "redacao", "fisica", "quimica", "biologia", "ciencias-humanas"]}
      rows={4}
    />
  );
}

export function SimuladosLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Simulados"
      title="Separando provas e diagnosticos"
      icon={<GraduationCap className="h-5 w-5" />}
      rows={6}
    />
  );
}

export function RedacaoLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Redacao"
      title="Abrindo seu treino de escrita"
      icon={<PenTool className="h-5 w-5" />}
      rows={3}
      writing
    />
  );
}

export function PerformanceLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Desempenho"
      title="Calculando sua evolucao"
      icon={<BarChart3 className="h-5 w-5" />}
      rows={4}
      chart
    />
  );
}

export function ProfileLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Perfil"
      title="Carregando seus dados"
      icon={<UserRound className="h-5 w-5" />}
      rows={4}
    />
  );
}

export function LibraryLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Biblioteca"
      title="Organizando seus materiais"
      icon={<Library className="h-5 w-5" />}
      rows={6}
    />
  );
}

export function ExamsLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Provas"
      title="Buscando provas e simulados"
      icon={<FileText className="h-5 w-5" />}
      rows={6}
    />
  );
}

export function ReviewsLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Revisoes"
      title="Priorizando o que precisa voltar hoje"
      icon={<CheckCircle2 className="h-5 w-5" />}
      rows={5}
    />
  );
}

export function ScheduleLoadingState() {
  return (
    <RoutePageLoadingState
      eyebrow="Cronograma"
      title="Atualizando sua semana de foco"
      icon={<BookOpen className="h-5 w-5" />}
      rows={5}
    />
  );
}

function RoutePageLoadingState({
  eyebrow,
  title,
  icon,
  rows,
  leftRail = false,
  subjectIcons,
  writing = false,
  chart = false,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  rows: number;
  leftRail?: boolean;
  subjectIcons?: StudyIconName[];
  writing?: boolean;
  chart?: boolean;
}) {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-label={`Carregando ${eyebrow}`}>
      <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.28)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
              <h1 className="mt-1 font-display text-2xl font-extrabold text-[#0F172A]">{title}</h1>
            </div>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-blue-50 ring-1 ring-blue-100">
            <div className="estudaki-loading-progress h-full rounded-full bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#FACC15]" />
          </div>
        </div>
        {subjectIcons ? (
          <div className="mt-5 flex flex-wrap gap-2" aria-hidden>
            {subjectIcons.map((name) => (
              <StudyIcon key={name} name={name} size="xs" />
            ))}
          </div>
        ) : null}
      </section>

      <section className={cn("grid gap-5", leftRail && "lg:grid-cols-[300px_minmax(0,1fr)]")}>
        {leftRail ? (
          <aside className="hidden rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.25)] lg:block">
            {Array.from({ length: 8 }, (_, index) => (
              <SkeletonBlock key={index} className="mb-3 h-11 rounded-xl" />
            ))}
          </aside>
        ) : null}
        <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.30)] md:p-7">
          {chart ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonBlock key={index} className="h-28 rounded-[22px]" />
              ))}
              <SkeletonBlock className="h-72 rounded-[24px] md:col-span-4" />
            </div>
          ) : writing ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <SkeletonBlock className="h-8 w-56" />
                <SkeletonBlock className="mt-5 h-72 rounded-[22px]" />
              </div>
              <div className="space-y-3">
                <SkeletonBlock className="h-24 rounded-[22px]" />
                <SkeletonBlock className="h-24 rounded-[22px]" />
                <SkeletonBlock className="h-24 rounded-[22px]" />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="mt-3 h-7 w-52 max-w-full" />
                  <SkeletonBlock className="mt-3 h-3 w-full" />
                  <SkeletonBlock className="mt-2 h-3 w-3/4" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
