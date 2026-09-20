"use client";

import { CheckCircle2, Clock3, Lock, Play, ShoppingCart, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FastLink } from "@/components/fast-link";
import { cn } from "@/lib/utils";

type LessonCourse = {
  productId: string;
  slug: string;
  title: string;
  summary: string;
  discipline: string;
  teacher: string;
  level: string;
  lessons: number;
  duration: string;
  priceCents: number;
  coverTone: "blue" | "orange" | "yellow" | "green" | "navy";
  examples: string[];
};

type Props = {
  courses: LessonCourse[];
  activeName: string;
};

const coverToneClass: Record<LessonCourse["coverTone"], string> = {
  blue: "from-blue-600 via-cyan-500 to-emerald-400",
  orange: "from-orange-600 via-rose-500 to-amber-300",
  yellow: "from-amber-500 via-orange-400 to-yellow-200",
  green: "from-emerald-600 via-teal-500 to-cyan-300",
  navy: "from-slate-900 via-blue-800 to-cyan-600",
};

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function LessonMarketplace({ courses, activeName }: Props) {
  const [selected, setSelected] = useState<LessonCourse | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const featured = useMemo(() => courses[0], [courses]);

  async function addToCart(course: LessonCourse) {
    setAdding(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: course.productId }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event("estudaki:cart-updated"));
        setAdded(true);
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      {featured && (
        <section className="overflow-hidden rounded-[30px] border border-cyan-100 bg-white shadow-[0_28px_70px_-46px_rgba(15,23,42,0.45)]">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className={cn("relative min-h-[320px] overflow-hidden bg-gradient-to-br p-6 text-white sm:p-8", coverToneClass[featured.coverTone])}>
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:44px_44px] opacity-35" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ring-1 ring-white/25">
                    <Sparkles className="h-3.5 w-3.5" />
                    Curso em destaque
                  </p>
                  <h1 className="mt-5 max-w-2xl font-display text-3xl font-black leading-tight sm:text-4xl">
                    {featured.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/82">
                    {featured.summary}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(featured);
                      setAdded(false);
                    }}
                    className="inline-flex h-12 items-center gap-3 rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-xl shadow-slate-950/10 transition hover:-translate-y-0.5"
                  >
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white">
                      <span className="absolute inset-0 animate-ping rounded-full bg-cyan-300 opacity-45" />
                      <Play className="relative h-4 w-4 fill-current" />
                    </span>
                    Assistir aula
                  </button>
                  <span className="inline-flex h-12 items-center gap-2 rounded-full bg-slate-950/28 px-4 text-sm font-black ring-1 ring-white/20">
                    <Lock className="h-4 w-4" />
                    {formatPrice(featured.priceCents)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                Exemplo para {activeName}
              </p>
              <h2 className="mt-2 font-display text-2xl font-black text-slate-950">
                Primeiras aulas do curso
              </h2>
              <div className="mt-5 space-y-3">
                {featured.examples.map((lesson, index) => (
                  <LockedLessonRow
                    key={lesson}
                    title={lesson}
                    index={index}
                    onPlay={() => {
                      setSelected(featured);
                      setAdded(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <article
            key={course.slug}
            className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_22px_55px_-40px_rgba(15,23,42,0.42)]"
          >
            <div className={cn("relative min-h-[170px] bg-gradient-to-br p-5 text-white", coverToneClass[course.coverTone])}>
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-white/18 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ring-1 ring-white/25">
                  {course.discipline}
                </span>
                <span className="rounded-full bg-slate-950/24 px-3 py-1 text-[10px] font-black uppercase ring-1 ring-white/18">
                  Premium
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(course);
                  setAdded(false);
                }}
                aria-label={`Assistir ${course.title}`}
                className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-950 shadow-xl transition hover:scale-105"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-35" />
                <Play className="relative h-5 w-5 fill-current" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-600">
                  {course.level}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase text-cyan-700">
                  <Clock3 className="h-3.5 w-3.5" />
                  {course.duration}
                </span>
              </div>
              <h2 className="mt-4 font-display text-xl font-black leading-tight text-slate-950">
                {course.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                {course.summary}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    {course.lessons} aulas
                  </span>
                  <span className="block text-lg font-black text-slate-950">
                    {formatPrice(course.priceCents)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(course);
                    setAdded(false);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {selected && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-2xl">
            <div className={cn("relative bg-gradient-to-br p-6 text-white", coverToneClass[selected.coverTone])}>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fechar"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-black leading-tight">
                Aula bloqueada
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/82">
                Para assistir {selected.title}, desbloqueie o curso premium.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Incluso no acesso
                </p>
                <div className="mt-3 space-y-2">
                  {["Aulas gravadas", "Material de apoio", "Questoes guiadas", "Certificado"].map((item) => (
                    <p key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {added ? (
                  <FastLink
                    href="/carrinho"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-black text-white shadow-lg shadow-emerald-100"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Ir para o carrinho
                  </FastLink>
                ) : (
                  <button
                    type="button"
                    onClick={() => void addToCart(selected)}
                    disabled={adding}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 disabled:opacity-70"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {adding ? "Adicionando..." : `Comprar ${formatPrice(selected.priceCents)}`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Ver outras aulas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LockedLessonRow({
  title,
  index,
  onPlay,
}: {
  title: string;
  index: number;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm">
        <Play className="h-4 w-4 fill-current transition group-hover:scale-110" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          Aula {String(index + 1).padStart(2, "0")}
        </span>
        <span className="block truncate text-sm font-black text-slate-800">{title}</span>
      </span>
      <Lock className="h-4 w-4 text-amber-500" />
    </button>
  );
}
