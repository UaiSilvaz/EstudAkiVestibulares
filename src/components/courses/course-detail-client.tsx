"use client";

import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, GraduationCap, RotateCcw, Star, Trophy, UsersRound, Zap } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FastLink } from "@/components/fast-link";
import type { CourseDetailDTO } from "@/lib/courses/types";
import { formatCourseDuration, formatCoursePrice } from "./format";
import { LearningPath } from "./learning-path";
import { PurchaseModal } from "./purchase-modal";

type Props = {
  course: CourseDetailDTO;
  devResetEnabled: boolean;
};

export function CourseDetailClient({ course, devResetEnabled }: Props) {
  const router = useRouter();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function resetDemo() {
    setResetting(true);
    await fetch(`/api/courses/${course.id}/reset-demo`, { method: "POST" });
    setResetting(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <FastLink href="/cursos" className="inline-flex h-10 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50">
        <ArrowLeft className="h-4 w-4" />
        Cursos
      </FastLink>

      <section className="overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_30px_76px_-50px_rgba(15,23,42,0.45)]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative min-h-[380px] overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-500 to-emerald-400 p-6 text-white sm:p-8">
            {course.coverImage ? (
              <Image src={course.coverImage} alt="" fill className="object-cover opacity-24 mix-blend-overlay" sizes="(max-width: 1024px) 100vw, 55vw" priority />
            ) : (
              <GraduationCap className="absolute -right-12 bottom-4 h-56 w-56 rotate-[-10deg] text-white/18" />
            )}
            <div className="relative z-10 flex min-h-[320px] flex-col justify-between">
              <div>
                <p className="inline-flex rounded-full bg-white/18 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ring-1 ring-white/25">{course.category} - {course.level}</p>
                <h1 className="mt-5 max-w-3xl font-display text-4xl font-black leading-tight sm:text-5xl">{course.title}</h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/86">{course.description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {course.hasAccess && course.nextNode ? (
                  <FastLink href={course.nextNode.href} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-blue-700 shadow-xl transition hover:-translate-y-0.5">
                    <BookOpenCheck className="h-4 w-4" />
                    Continuar estudando
                  </FastLink>
                ) : (
                  <button type="button" onClick={() => setCheckoutOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-blue-700 shadow-xl transition hover:-translate-y-0.5">
                    Comprar curso
                  </button>
                )}
                {course.nextNode && !course.hasAccess && (
                  <FastLink href={course.nextNode.href} className="inline-flex h-12 items-center rounded-full bg-slate-950/28 px-5 text-sm font-black text-white ring-1 ring-white/20">
                    Assistir preview
                  </FastLink>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-5 p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Star className="h-5 w-5 fill-current" />} label="Avaliacao" value={course.rating.toFixed(1)} tone="amber" />
              <Stat icon={<UsersRound className="h-5 w-5" />} label="Alunos" value={course.studentsCount.toLocaleString("pt-BR")} tone="blue" />
              <Stat icon={<Clock3 className="h-5 w-5" />} label="Carga" value={formatCourseDuration(course.totalDurationSeconds)} tone="emerald" />
              <Stat icon={<Zap className="h-5 w-5" />} label="Progresso" value={`${course.progressPercent}%`} tone="cyan" />
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Acesso</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{course.hasAccess ? "Liberado" : formatCoursePrice(course.priceCents)}</p>
                </div>
                <Trophy className="h-9 w-9 text-amber-500" />
              </div>
              <div className="mt-4 h-3 rounded-full bg-white">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" style={{ width: `${course.progressPercent}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">{course.completedLessons} de {course.totalLessons} atividades concluidas</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Incluido</p>
              <div className="mt-3 grid gap-2">
                {(course.benefits.length ? course.benefits : ["Videoaulas", "Questoes guiadas", "Checkpoints", "Certificado simulado"]).map((benefit) => (
                  <p key={benefit} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {benefit}
                  </p>
                ))}
              </div>
            </div>
            {devResetEnabled && (
              <button type="button" disabled={resetting} onClick={() => void resetDemo()} className="inline-flex h-11 items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-4 text-xs font-black uppercase tracking-[0.12em] text-rose-700 disabled:opacity-70">
                <RotateCcw className="h-4 w-4" />
                {resetting ? "Resetando..." : "Resetar compra DEV"}
              </button>
            )}
          </div>
        </div>
      </section>

      <LearningPath course={course} onPurchase={() => setCheckoutOpen(true)} />
      <PurchaseModal courseId={course.id} courseSlug={course.slug} title={course.title} priceCents={course.priceCents} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "amber" | "blue" | "emerald" | "cyan" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
  };
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
