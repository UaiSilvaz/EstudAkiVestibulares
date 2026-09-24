"use client";

import { ArrowRight, BookOpen, Clock3, GraduationCap, PlayCircle, Search, Star, UsersRound } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { FastLink } from "@/components/fast-link";
import { cn } from "@/lib/utils";
import type { CourseCardDTO } from "@/lib/courses/types";
import { formatCourseDuration, formatCoursePrice } from "./format";
import { PurchaseModal } from "./purchase-modal";

type Props = {
  courses: CourseCardDTO[];
};

const fallbackCovers = [
  "from-blue-600 via-cyan-500 to-emerald-400",
  "from-orange-500 via-amber-400 to-yellow-300",
  "from-slate-900 via-blue-700 to-cyan-500",
  "from-emerald-600 via-teal-500 to-cyan-300",
];

export function CourseCatalogClient({ courses }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [checkout, setCheckout] = useState<CourseCardDTO | null>(null);
  const categories = useMemo(() => ["Todos", ...Array.from(new Set(courses.map((course) => course.category)))], [courses]);
  const filtered = courses.filter((course) => {
    const haystack = `${course.title} ${course.shortDescription} ${course.category} ${course.level}`.toLowerCase();
    return (category === "Todos" || course.category === category) && haystack.includes(query.toLowerCase());
  });
  const owned = courses.filter((course) => course.statusLabel === "COMPRADO" || course.isFree);
  const continueCourse = courses.find((course) => course.progressPercent > 0) ?? owned[0] ?? courses[0];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[var(--surface)] p-5 shadow-[0_24px_58px_-38px_rgba(37,99,235,0.35)] sm:p-7">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">Cursos Silva Educacional</p>
            <h1 className="mt-2 font-display text-3xl font-black leading-tight text-[var(--text)] sm:text-4xl">
              Cursos, videoaulas e trilhas para manter o ritmo.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--text-secondary)]">
              Encontre sua próxima aula e avance com conteúdo, prática e revisões organizadas para o seu objetivo.
            </p>
          </div>
          {continueCourse && (
            <FastLink href={`/cursos/${continueCourse.slug}`} className="group rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--brand)]">Continuar estudando</p>
              <h2 className="mt-2 text-lg font-black text-[var(--text)]">{continueCourse.title}</h2>
              <div className="mt-4 h-2 rounded-full bg-[var(--surface-secondary)]">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${continueCourse.progressPercent}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-black text-[var(--text-secondary)]">
                <span>{continueCourse.progressPercent}% concluido</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </FastLink>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm md:flex-row md:items-center">
        <label className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl bg-[var(--surface-secondary)] px-4 text-[var(--text-secondary)]">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar curso, categoria ou professor"
            className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "h-11 whitespace-nowrap rounded-full px-4 text-xs font-black transition",
                category === item ? "bg-[var(--brand-button)] text-white shadow-lg shadow-blue-100" : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {owned.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">Meus cursos</p>
              <h2 className="font-display text-xl font-black text-[var(--text)]">Acesso liberado</h2>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {owned.slice(0, 3).map((course) => (
              <FastLink key={course.id} href={`/cursos/${course.slug}`} className="rounded-[22px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 transition hover:-translate-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">{course.statusLabel}</p>
                <h3 className="mt-2 font-black text-[var(--text)]">{course.title}</h3>
                <div className="mt-3 h-2 rounded-full bg-[var(--surface)]">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${course.progressPercent}%` }} />
                </div>
              </FastLink>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((course, index) => (
          <article key={course.id} className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_22px_55px_-42px_rgba(15,23,42,0.38)]">
            <div className={cn("relative min-h-[180px] overflow-hidden bg-gradient-to-br p-5 text-white", fallbackCovers[index % fallbackCovers.length])}>
              {course.thumbnail ? (
                <Image src={course.thumbnail} alt="" fill className="object-cover opacity-35 mix-blend-overlay" sizes="(max-width: 768px) 100vw, 33vw" />
              ) : (
                <GraduationCap className="absolute -right-8 bottom-0 h-36 w-36 rotate-[-10deg] text-white/22" />
              )}
              <div className="relative z-10 flex h-full min-h-[140px] flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-[var(--surface)]/18 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ring-1 ring-white/25">{course.category}</span>
                  <span className="rounded-full bg-slate-950/24 px-3 py-1 text-[10px] font-black uppercase ring-1 ring-white/18">{course.statusLabel}</span>
                </div>
                <div>
                  <h2 className="max-w-sm font-display text-2xl font-black leading-tight">{course.title}</h2>
                  <p className="mt-2 text-xs font-bold text-white/80">{course.teacherName}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <p className="line-clamp-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">{course.shortDescription}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric icon={<Clock3 className="h-4 w-4" />} label={formatCourseDuration(course.totalDurationSeconds)} />
                <Metric icon={<BookOpen className="h-4 w-4" />} label={`${course.lessonCount} aulas`} />
                <Metric icon={<UsersRound className="h-4 w-4" />} label={course.studentsCount.toLocaleString("pt-BR")} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <span>
                  <span className="flex items-center gap-1 text-xs font-black text-amber-500"><Star className="h-3.5 w-3.5 fill-current" /> {course.rating.toFixed(1)}</span>
                  <span className="block text-lg font-black text-[var(--text)]">{formatCoursePrice(course.priceCents)}</span>
                </span>
                {course.statusLabel === "COMPRADO" || course.isFree ? (
                  <FastLink href={`/cursos/${course.slug}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5">
                    <PlayCircle className="h-4 w-4" />
                    Estudar
                  </FastLink>
                ) : (
                  <button type="button" onClick={() => setCheckout(course)} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--brand-button)] px-4 text-sm font-black text-white transition hover:-translate-y-0.5">
                    Comprar
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {filtered.length === 0 && (
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="font-black text-[var(--text)]">Nenhum curso encontrado.</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">Tente outra categoria ou termo de busca.</p>
        </div>
      )}

      {checkout && (
        <PurchaseModal
          courseId={checkout.id}
          courseSlug={checkout.slug}
          title={checkout.title}
          priceCents={checkout.priceCents}
          open
          onClose={() => setCheckout(null)}
        />
      )}
    </div>
  );
}

function Metric({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-secondary)] p-2 text-[var(--text-secondary)]">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--brand)] shadow-sm">{icon}</div>
      <p className="mt-1 truncate text-[10px] font-black uppercase">{label}</p>
    </div>
  );
}
