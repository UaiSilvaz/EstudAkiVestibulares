"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  FileCheck2,
  Lightbulb,
  Lock,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type {
  JornadaActivity,
  JornadaCourse,
  JornadaLesson,
  JornadaModule,
  JornadaPath,
  JornadaSource,
} from "@/lib/jornada-curriculum";
import {
  courseCompletedLessons,
  courseLessonIds,
  courseProgressPercent,
  emptyJornadaProgress,
  JORNADA_PROGRESS_STORAGE_KEY,
  subjectProgressPercent,
  type JornadaStoredProgress,
} from "@/lib/jornada-progress";
import type { JornadaSubject } from "@/lib/jornada-subjects";
import { cn } from "@/lib/utils";

type World = JornadaSubject & {
  courses: number;
  modules: number;
  lessons: number;
  estimatedHours: number;
  currentLevel: string;
  status: "available" | "locked" | "completed";
};

function readProgress() {
  if (typeof window === "undefined") return emptyJornadaProgress();
  try {
    const raw = window.localStorage.getItem(JORNADA_PROGRESS_STORAGE_KEY);
    if (!raw) return emptyJornadaProgress();
    const parsed = JSON.parse(raw) as JornadaStoredProgress;
    return {
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
      activityAttempts: parsed.activityAttempts && typeof parsed.activityAttempts === "object" ? parsed.activityAttempts : {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return emptyJornadaProgress();
  }
}

function writeProgress(next: JornadaStoredProgress) {
  window.localStorage.setItem(JORNADA_PROGRESS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("jornada-progress"));
}

function useJornadaProgress() {
  const [progress, setProgress] = useState<JornadaStoredProgress>(() => emptyJornadaProgress());

  useEffect(() => {
    const sync = () => setProgress(readProgress());
    sync();
    window.addEventListener("jornada-progress", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("jornada-progress", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const markLesson = (lessonId: string) => {
    const current = readProgress();
    const completedLessons = current.completedLessons.includes(lessonId)
      ? current.completedLessons
      : [...current.completedLessons, lessonId];
    const next = { ...current, completedLessons, updatedAt: new Date().toISOString() };
    writeProgress(next);
    setProgress(next);
  };

  const saveAttempt = (activityId: string, answer: string, correct: boolean) => {
    const current = readProgress();
    const next = {
      ...current,
      activityAttempts: {
        ...current.activityAttempts,
        [activityId]: { answer, correct, completedAt: new Date().toISOString() },
      },
      updatedAt: new Date().toISOString(),
    };
    writeProgress(next);
    setProgress(next);
  };

  const reset = () => {
    const next = emptyJornadaProgress();
    writeProgress(next);
    setProgress(next);
  };

  return { progress, markLesson, saveAttempt, reset };
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

type SubjectIconSize = "xs" | "sm" | "md" | "lg" | "xl";

const subjectIconSizeClass: Record<SubjectIconSize, string> = {
  xs: "h-10 w-10",
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-40 w-40",
};

const subjectIconSizePx: Record<SubjectIconSize, number> = {
  xs: 40,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 160,
};

function SubjectIcon({
  subject,
  size = "md",
  decorative = false,
  className,
}: {
  subject: JornadaSubject;
  size?: SubjectIconSize;
  decorative?: boolean;
  className?: string;
}) {
  if (!subject.icon) {
    return (
      <span
        aria-hidden
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-visible",
          subjectIconSizeClass[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : subject.name}
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-visible", subjectIconSizeClass[size], className)}
    >
      <Image
        src={subject.icon}
        alt=""
        width={subjectIconSizePx[size] * 2}
        height={subjectIconSizePx[size] * 2}
        sizes={`${subjectIconSizePx[size]}px`}
        draggable={false}
        className="pointer-events-none block h-full w-full select-none object-contain"
      />
    </span>
  );
}

function StatusBadge({ status }: { status: JornadaCourse["status"] }) {
  const label = status === "available" ? "Disponivel" : status === "completed" ? "Concluido" : "Em breve";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
        status === "available" && "bg-emerald-100 text-emerald-700",
        status === "completed" && "bg-blue-100 text-blue-700",
        status === "locked" && "bg-slate-100 text-slate-500",
      )}
    >
      {label}
    </span>
  );
}

export function JornadaHomeClient({ worlds, courses }: { worlds: World[]; courses: JornadaCourse[] }) {
  const { progress, reset } = useJornadaProgress();
  const completedLessons = progress.completedLessons.length;
  const totalLessons = courses.reduce((sum, course) => sum + courseLessonIds(course).length, 0);
  const nextCourse = courses.find((course) => course.status === "available" && courseLessonIds(course).length > courseCompletedLessons(course, progress));
  const progressSubject = worlds.find((world) => world.slug === "matematica") ?? worlds[0];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(120deg,#FFFFFF_0%,#EFF6FF_44%,#ECFEFF_100%)] p-5 shadow-[0_24px_55px_-32px_rgba(15,23,42,0.26)] md:p-8">
        <div aria-hidden className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-blue-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              Jornada EstudAki
            </p>
            <h1 className="mt-3 font-display text-3xl font-black leading-tight text-[#0F172A] md:text-5xl">
              Trilhas organizadas para estudar sem se perder.
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Cada materia vira uma sequencia curta: aula, pratica e revisao. Entre, conclua o bloco do dia e volte quando quiser.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {worlds.slice(0, 5).map((world) => (
                <Link
                  key={world.slug}
                  href={`/trilhas/${world.slug}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.86] px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <SubjectIcon subject={world} size="xs" />
                  {world.shortName}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-[26px] bg-white/[0.84] p-4 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.34)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Progresso geral</p>
                <p className="mt-2 text-3xl font-black text-[#0F172A]">{completedLessons}/{totalLessons}</p>
              </div>
              {progressSubject ? <SubjectIcon subject={progressSubject} size="lg" /> : null}
            </div>
            <ProgressBar value={totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0} color="#2563EB" />
            <button type="button" onClick={reset} className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]">
              <RefreshCw className="h-3.5 w-3.5" />
              Reiniciar progresso
            </button>
          </div>
        </div>
      </section>

      {nextCourse && (
        <Link href={`/trilhas/${nextCourse.subjectSlug}/${nextCourse.pathSlug}/${nextCourse.slug}`} className="group flex flex-col gap-4 rounded-[24px] bg-gradient-to-r from-[#FF7A1A] via-[#FACC15] to-[#22D3EE] p-5 text-white shadow-[0_18px_38px_-24px_rgba(249,115,22,0.7)] transition hover:-translate-y-0.5 active:scale-[0.99] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/80">Continue de onde parou</p>
            <h2 className="mt-1 text-xl font-black">{nextCourse.title}</h2>
            <p className="text-sm font-bold text-white/85">{nextCourse.description}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-orange-600">
            Abrir <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {worlds.map((world) => {
          const subjectCourses = courses.filter((course) => course.subjectSlug === world.slug);
          const percent = subjectProgressPercent(subjectCourses, progress);
          return (
            <Link
              key={world.slug}
              href={`/trilhas/${world.slug}`}
              className="group relative overflow-hidden rounded-[24px] border p-5 shadow-[0_14px_36px_-26px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-30px_rgba(15,23,42,0.36)] active:scale-[0.99]"
              style={{
                borderColor: `${world.primaryColor}1A`,
                background: `linear-gradient(135deg, #FFFFFF 0%, ${world.backgroundColor} 100%)`,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl transition group-hover:opacity-45"
                style={{ backgroundColor: world.primaryColor }}
              />
              <div aria-hidden className="pointer-events-none absolute -bottom-9 -right-6 rotate-[-10deg] opacity-[0.24] transition duration-300 group-hover:scale-105 group-hover:opacity-[0.34]">
                <SubjectIcon subject={world} decorative size="xl" />
              </div>
              <div className="relative z-10 flex items-start justify-between gap-4">
                <SubjectIcon subject={world} size="lg" />
                <span className="rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: world.backgroundColor, color: world.primaryColor }}>
                  {world.status === "available" ? "Liberado" : world.currentLevel}
                </span>
              </div>
              <div className="relative z-10">
                <h2 className="mt-4 text-2xl font-black text-[#0F172A]">{world.name}</h2>
                <p className="mt-2 min-h-[48px] max-w-[88%] text-sm font-semibold leading-6 text-slate-600">{world.description}</p>
              </div>
              <div className="relative z-10 mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-500">
                <span className="rounded-2xl bg-slate-50/85 px-2 py-2">{world.courses} cursos</span>
                <span className="rounded-2xl bg-slate-50/85 px-2 py-2">{world.lessons} aulas</span>
                <span className="rounded-2xl bg-slate-50/85 px-2 py-2">{world.estimatedHours}h</span>
              </div>
              <div className="relative z-10 mt-4">
                <div className="mb-2 flex justify-between text-xs font-black text-slate-500">
                  <span>Concluido</span>
                  <span>{percent}%</span>
                </div>
                <ProgressBar value={percent} color={world.primaryColor} />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

export function JornadaSubjectClient({ subject, paths, courses }: { subject: JornadaSubject; paths: JornadaPath[]; courses: JornadaCourse[] }) {
  const { progress } = useJornadaProgress();

  return (
    <div className="space-y-5">
      <Link href="/trilhas" className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.98]">
        <ArrowLeft className="h-4 w-4" />
        Voltar a Jornada
      </Link>
      <section className="rounded-[30px] p-6 md:p-8" style={{ background: `linear-gradient(135deg, ${subject.backgroundColor}, #ffffff)` }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <SubjectIcon subject={subject} size="lg" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: subject.primaryColor }}>Materia</p>
            <h1 className="font-display text-4xl font-black text-[#0F172A]">{subject.name}</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 md:text-base">{subject.description}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#0F172A]">Trilhas</h2>
          <div className="mt-4 space-y-3">
            {paths.map((path) => (
              <div key={path.slug} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-[#0F172A]">{path.title}</h3>
                  <StatusBadge status={path.status} />
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{path.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-3">
          {courses.map((course) => {
            const percent = courseProgressPercent(course, progress);
            return (
              <Link
                key={course.slug}
                href={`/trilhas/${subject.slug}/${course.pathSlug}/${course.slug}`}
                className={cn(
                  "rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99]",
                  course.status === "locked" && "pointer-events-none opacity-65",
                )}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={course.status} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{course.level}</span>
                    </div>
                    <h3 className="mt-2 text-xl font-black text-[#0F172A]">{course.title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{course.description}</p>
                  </div>
                  {course.status === "locked" ? <Lock className="h-6 w-6 text-slate-300" /> : <ArrowRight className="h-6 w-6" style={{ color: subject.primaryColor }} />}
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs font-black text-slate-500">
                    <span>{courseCompletedLessons(course, progress)} de {courseLessonIds(course).length} aulas</span>
                    <span>{percent}%</span>
                  </div>
                  <ProgressBar value={percent} color={subject.primaryColor} />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export function JornadaCourseClient({ subject, course }: { subject: JornadaSubject; course: JornadaCourse }) {
  const { progress } = useJornadaProgress();
  const percent = courseProgressPercent(course, progress);

  return (
    <div className="space-y-5">
      <Link href={`/trilhas/${subject.slug}`} className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.98]">
        <ArrowLeft className="h-4 w-4" />
        Voltar a {subject.name}
      </Link>
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <SubjectIcon subject={subject} size="lg" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: subject.primaryColor }}>{subject.name} - {course.level}</p>
              <h1 className="font-display text-4xl font-black text-[#0F172A]">{course.title}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{course.description}</p>
            </div>
          </div>
          <div className="min-w-48 rounded-3xl p-4" style={{ backgroundColor: subject.backgroundColor }}>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Conclusao</p>
            <p className="text-3xl font-black" style={{ color: subject.primaryColor }}>{percent}%</p>
            <ProgressBar value={percent} color={subject.primaryColor} />
          </div>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {course.modules.map((module) => (
          <Link key={module.slug} href={`/trilhas/${subject.slug}/${course.pathSlug}/${course.slug}/${module.slug}`} className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Modulo {module.order}</p>
                <h2 className="mt-1 text-xl font-black text-[#0F172A]">{module.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{module.description}</p>
              </div>
              <ArrowRight className="h-5 w-5" style={{ color: subject.primaryColor }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {module.lessons.length === 0 ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Conteudo em revisao</span>
              ) : (
                module.lessons.map((lesson) => (
                  <span key={lesson.id} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                    {progress.completedLessons.includes(lesson.id) ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                    Aula {lesson.order}
                  </span>
                ))
              )}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

export function JornadaModuleClient({ subject, course, module }: { subject: JornadaSubject; course: JornadaCourse; module: JornadaModule }) {
  const { progress } = useJornadaProgress();

  return (
    <div className="space-y-5">
      <Link href={`/trilhas/${subject.slug}/${course.pathSlug}/${course.slug}`} className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.98]">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao curso
      </Link>
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-sm md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: subject.primaryColor }}>Modulo {module.order} - {course.title}</p>
        <h1 className="font-display text-4xl font-black text-[#0F172A]">{module.title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 md:text-base">{module.description}</p>
      </section>
      <section className="space-y-3">
        {module.lessons.length === 0 && (
          <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-800">
            Este modulo ja esta estruturado e aguardando producao editorial.
          </div>
        )}
        {module.lessons.map((lesson) => (
          <Link key={lesson.id} href={`/aula/${lesson.slug}`} className="flex flex-col gap-4 rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99] md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black text-white" style={{ backgroundColor: subject.primaryColor }}>{lesson.order}</span>
              <div>
                <h2 className="text-xl font-black text-[#0F172A]">{lesson.title}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{lesson.estimatedMinutes} min - {lesson.objectives.join(" | ")}</p>
              </div>
            </div>
            {progress.completedLessons.includes(lesson.id) ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Concluida</span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"><PlayCircle className="h-4 w-4" /> Comecar</span>
            )}
          </Link>
        ))}
      </section>
    </div>
  );
}

export function JornadaLessonClient({ subject, course, module, lesson, activitySlug, sources }: { subject: JornadaSubject; course: JornadaCourse; module: JornadaModule; lesson: JornadaLesson; activitySlug: string; sources: JornadaSource[] }) {
  const { progress, markLesson } = useJornadaProgress();
  const done = progress.completedLessons.includes(lesson.id);

  return (
    <article className="mx-auto max-w-5xl space-y-5">
      <Link href={`/trilhas/${subject.slug}/${course.pathSlug}/${course.slug}/${module.slug}`} className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.98]">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao modulo
      </Link>
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: subject.primaryColor }}>{subject.name} - {module.title}</p>
            <h1 className="font-display text-4xl font-black text-[#0F172A]">{lesson.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"><Clock3 className="h-3.5 w-3.5" /> {lesson.estimatedMinutes} min</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700"><ShieldCheck className="h-3.5 w-3.5" /> {lesson.reviewStatus}</span>
            </div>
          </div>
          <SubjectIcon subject={subject} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.72fr_0.28fr]">
        <div className="space-y-5">
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-black text-[#0F172A]"><Target className="h-5 w-5" style={{ color: subject.primaryColor }} /> Objetivos</h2>
            <ul className="mt-3 space-y-2">
              {lesson.objectives.map((objective) => (
                <li key={objective} className="flex gap-2 text-sm font-semibold text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {objective}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-black text-[#0F172A]"><BookOpen className="h-5 w-5" style={{ color: subject.primaryColor }} /> Teoria</h2>
            <div className="mt-3 space-y-4 text-base font-semibold leading-8 text-slate-700">
              {lesson.theory.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
          {lesson.formulas.map((formula) => (
            <div key={formula.formula} className="rounded-[24px] border border-blue-100 bg-blue-50/70 p-5">
              <p className="font-mono text-lg font-black text-blue-800">{formula.formula}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{formula.conditions}</p>
              <p className="mt-2 text-sm font-bold text-blue-700">Exemplo: {formula.example}</p>
              <p className="mt-2 text-sm font-bold text-orange-700">Cuidado: {formula.commonMistake}</p>
            </div>
          ))}
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#0F172A]">Exemplos resolvidos</h2>
            <div className="mt-3 space-y-3">
              {lesson.examples.map((example) => (
                <div key={example.title} className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-black text-[#0F172A]">{example.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{example.statement}</p>
                  <p className="mt-2 text-sm font-bold text-emerald-700">{example.solution}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-black text-[#0F172A]"><Lightbulb className="h-5 w-5 text-amber-500" /> Resumo e aplicacao</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{lesson.application}</p>
            <ul className="mt-3 space-y-2">
              {lesson.summary.map((item) => (
                <li key={item} className="flex gap-2 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {item}</li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
            <button type="button" onClick={() => markLesson(lesson.id)} className="ek-button ek-button-primary w-full justify-center">
              {done ? <CheckCircle2 className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}
              {done ? "Aula concluida" : "Marcar concluida"}
            </button>
            <Link href={`/atividade/${activitySlug}`} className="ek-button ek-button-ghost mt-3 w-full justify-center">
              Fazer atividade
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#0F172A]">Fontes</h2>
            <div className="mt-3 space-y-3">
              {sources.map((source) => (
                <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="block rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600 transition hover:bg-blue-50">
                  <span className="block font-black text-blue-700">{source.organization}</span>
                  {source.title}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </article>
  );
}

export function JornadaActivityClient({ subject, lesson, activity }: { subject: JornadaSubject; lesson: JornadaLesson; activity: JornadaActivity }) {
  const { progress, saveAttempt, markLesson } = useJornadaProgress();
  const [selected, setSelected] = useState<string | null>(null);
  const attempt = progress.activityAttempts[activity.id];
  const checked = attempt ?? (selected ? null : undefined);
  const isCorrect = checked?.correct ?? false;

  const choose = (answer: string) => {
    setSelected(answer);
    const correct = answer === activity.answer;
    saveAttempt(activity.id, answer, correct);
    if (correct) markLesson(lesson.id);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/aula/${lesson.slug}`} className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.98]">
        <ArrowLeft className="h-4 w-4" />
        Voltar a aula
      </Link>
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-sm md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: subject.primaryColor }}>{subject.name} - Atividade</p>
        <h1 className="font-display text-3xl font-black text-[#0F172A]">{activity.title}</h1>
        <p className="mt-4 text-lg font-bold leading-8 text-slate-700">{activity.prompt}</p>
      </section>
      <section className="space-y-3">
        {activity.options?.map((option) => {
          const picked = (attempt?.answer ?? selected) === option.id;
          const correctOption = checked && option.id === activity.answer;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => choose(option.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[22px] border bg-white p-4 text-left shadow-sm transition active:scale-[0.99]",
                picked ? "border-blue-300 ring-2 ring-blue-100" : "border-white/80 hover:border-blue-200",
                correctOption && "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100",
                picked && checked && !checked.correct && "border-rose-300 bg-rose-50 ring-2 ring-rose-100",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white" style={{ backgroundColor: correctOption ? "#10B981" : subject.primaryColor }}>{option.id}</span>
              <span className="text-base font-bold text-slate-700">{option.text}</span>
            </button>
          );
        })}
      </section>
      {checked && (
        <section className={cn("rounded-[24px] border p-5", isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50")}>
          <h2 className={cn("text-xl font-black", isCorrect ? "text-emerald-800" : "text-rose-800")}>{isCorrect ? "Resposta correta" : "Ainda nao"}</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{activity.explanation}</p>
          {!isCorrect && <p className="mt-2 text-sm font-bold text-slate-600">Dica: {activity.hint}</p>}
          <Link href={`/aula/${lesson.slug}`} className="ek-button ek-button-primary mt-4">
            Revisar aula
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  );
}

export function JornadaReviewClient({ courses }: { courses: JornadaCourse[] }) {
  const { progress } = useJornadaProgress();
  const pendingLessons = useMemo(() => courses.flatMap((course) => course.modules.flatMap((module) => module.lessons.map((lesson) => ({ course, module, lesson })))).filter((item) => !progress.completedLessons.includes(item.lesson.id)), [courses, progress.completedLessons]);

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-sm md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-700">Revisoes</p>
        <h1 className="font-display text-4xl font-black text-[#0F172A]">Aulas para revisar</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">Lista automatica com o que ainda nao foi concluido na Jornada.</p>
      </section>
      <div className="grid gap-3">
        {pendingLessons.map(({ course, module, lesson }) => (
          <Link key={lesson.id} href={`/aula/${lesson.slug}`} className="rounded-[22px] border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99]">
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">{course.title} - {module.title}</p>
            <h2 className="mt-1 text-lg font-black text-[#0F172A]">{lesson.title}</h2>
          </Link>
        ))}
        {pendingLessons.length === 0 && <p className="rounded-[22px] bg-emerald-50 p-5 text-sm font-black text-emerald-700">Tudo concluido no piloto. Bela sequencia.</p>}
      </div>
    </div>
  );
}

export function JornadaCertificatesClient({ courses }: { courses: JornadaCourse[] }) {
  const { progress } = useJornadaProgress();

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-sm md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-600">Certificados</p>
        <h1 className="font-display text-4xl font-black text-[#0F172A]">Conquistas de curso</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">Finalize todas as aulas de um curso para liberar o certificado.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const percent = courseProgressPercent(course, progress);
          const unlocked = percent === 100 && courseLessonIds(course).length > 0;
          return (
            <div key={course.slug} className={cn("rounded-[24px] border p-5 shadow-sm", unlocked ? "border-amber-200 bg-amber-50" : "border-white/80 bg-white")}>
              <Award className={cn("h-8 w-8", unlocked ? "text-amber-500" : "text-slate-300")} />
              <h2 className="mt-3 text-xl font-black text-[#0F172A]">{course.certificateTitle}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">{course.title}</p>
              <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-500">{unlocked ? "Liberado" : `${percent}% concluido`}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
