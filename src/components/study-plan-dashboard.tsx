"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Check,
  Clock3,
  Compass,
  GraduationCap,
  RotateCcw,
  Settings2,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Task = {
  id: string;
  scheduledFor: string;
  type: string;
  title: string;
  description: string;
  durationMinutes: number;
  actionHref: string;
  completedAt: string | null;
};

type Props = {
  tasks: Task[];
  profile?: {
    targetExam: string | null;
    weeklyHours: number | null;
  };
  preference: {
    availableDays: number[];
    minutesPerDay: number;
    examDate: string | null;
  };
  diagnostics: {
    pendingErrors: number;
    weeklyMinutes: number;
  };
};

const weekDays = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

function taskTypeLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("review")) return "Revisao";
  if (normalized.includes("error")) return "Caderno de erros";
  if (normalized.includes("question")) return "Questoes";
  if (normalized.includes("lesson")) return "Trilha";
  if (normalized.includes("essay")) return "Redacao";
  return type.replace(/_/g, " ");
}

export function StudyPlanDashboard({ tasks, profile, preference, diagnostics }: Props) {
  const router = useRouter();
  const { notify } = useFeedback();
  const [days, setDays] = useState(preference.availableDays);
  const [minutes, setMinutes] = useState(preference.minutesPerDay);
  const [examDate, setExamDate] = useState(preference.examDate?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(
    () => new Set(tasks.filter((task) => task.completedAt).map((task) => task.id)),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const key = new Date(task.scheduledFor).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });
      map.set(key, [...(map.get(key) ?? []), task]);
    }
    return Array.from(map.entries());
  }, [tasks]);
  const completion = tasks.length
    ? Math.round((localCompleted.size / tasks.length) * 100)
    : 0;
  const weeklyHours = Math.max(1, Math.round((minutes * days.length) / 60));
  const selectedDaysLabel = weekDays
    .filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(", ");
  const planInputs = [
    {
      title: "Objetivo",
      value: profile?.targetExam ?? "ENEM",
      detail: "vem do onboarding",
      href: "/onboarding",
      icon: GraduationCap,
    },
    {
      title: "Diagnostico",
      value: `${diagnostics.pendingErrors} erro(s) pendentes`,
      detail: "define prioridades",
      href: "/diagnostico",
      icon: BarChart3,
    },
    {
      title: "Rotina",
      value: `${weeklyHours}h/sem`,
      detail: selectedDaysLabel || "dias a definir",
      href: "/onboarding",
      icon: CalendarDays,
    },
  ];

  async function regenerate() {
    if (!days.length) {
      notify({
        tone: "warning",
        title: "Escolha ao menos um dia",
        message: "O plano precisa de um dia disponível na semana.",
      });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableDays: days,
          minutesPerDay: minutes,
          examDate: examDate || null,
        }),
      });
      if (!response.ok) throw new Error();
      notify({
        tone: "success",
        title: "Cronograma atualizado",
        message: "O plano foi recalculado com seus erros, lacunas e tempo disponível.",
      });
      router.refresh();
    } catch {
      notify({
        tone: "error",
        title: "Plano não atualizado",
        message: "Não foi possível recalcular o cronograma agora.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    const completed = !localCompleted.has(task.id);
    setLocalCompleted((current) => {
      const next = new Set(current);
      if (completed) next.add(task.id);
      else next.delete(task.id);
      return next;
    });
    const response = await fetch("/api/study-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, completed }),
    });
    if (!response.ok) {
      setLocalCompleted((current) => {
        const next = new Set(current);
        if (completed) next.delete(task.id);
        else next.add(task.id);
        return next;
      });
      notify({ tone: "error", title: "Progresso não salvo", message: "Tente novamente." });
      return;
    }
    notify({
      tone: completed ? "success" : "info",
      title: completed ? "Bloco concluído" : "Bloco reaberto",
      message: completed ? "Seu cronograma e desempenho foram atualizados." : "A tarefa voltou ao plano.",
      duration: 3200,
    });
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.26)] sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              <Compass className="h-4 w-4" />
              Plano conectado
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-[#0F172A]">
              Do onboarding ao bloco de estudo
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Este cronograma combina sua meta, sua base inicial e o tempo que voce disse ter disponivel.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[560px]">
            {planInputs.map((item, index) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-[22px] border border-slate-100 bg-slate-50/80 p-3 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Passo {index + 1}
                  </span>
                </div>
                <p className="mt-3 text-xs font-black uppercase tracking-wider text-blue-700">{item.title}</p>
                <p className="mt-1 line-clamp-2 min-h-9 text-sm font-extrabold leading-5 text-[#0F172A]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <div className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-6 text-white shadow-[0_24px_55px_-30px_rgba(37,99,235,0.7)]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/75">
            Plano adaptativo
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-5xl font-black">{completion}%</p>
              <p className="mt-1 text-sm font-bold text-white/80">da semana concluída</p>
            </div>
            <Target className="h-14 w-14 text-white/35" />
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-400"
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Tempo semanal" value={`${Math.round(diagnostics.weeklyMinutes / 60)}h`} />
            <Metric label="Erros pendentes" value={String(diagnostics.pendingErrors)} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/24 bg-white/16 p-3 backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/70">Base do plano</p>
            <p className="mt-1 text-sm font-black leading-5 text-white">
              {profile?.targetExam ?? "ENEM"} · {selectedDaysLabel || "dias a definir"} · {minutes} min/dia
            </p>
          </div>
          {diagnostics.pendingErrors > 0 && (
            <Link
              href="/questions?vestibular=enem&mode=errors"
              className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5"
            >
              <BookOpenCheck className="h-4 w-4" />
              Abrir Caderno de Erros
            </Link>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/onboarding"
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/24 bg-white/12 px-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-white/20"
            >
              Rever objetivo
            </Link>
            <Link
              href="/diagnostico"
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/24 bg-white/12 px-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-white/20"
            >
              Diagnostico
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.32)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-black text-slate-950">Seu tempo disponível</h2>
              <p className="text-xs font-semibold text-slate-500">Altere e regenere o plano em segundos.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 rounded-[22px] border border-orange-100 bg-orange-50/70 p-3 sm:grid-cols-3">
            <SmallPlanMetric label="Dias" value={String(days.length)} />
            <SmallPlanMetric label="Por dia" value={`${minutes}min`} />
            <SmallPlanMetric label="Semana" value={`${weeklyHours}h`} />
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Dias de estudo
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((day) => {
                const selected = days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      setDays((current) =>
                        selected
                          ? current.filter((item) => item !== day.value)
                          : [...current, day.value].sort(),
                      )
                    }
                    className={`min-h-10 rounded-xl text-xs font-black transition ${
                      selected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-500 hover:border-blue-300"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                Minutos por dia
              </span>
              <input
                type="number"
                min={30}
                max={300}
                step={15}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="ek-input w-full"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                Data da prova
              </span>
              <input
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                className="ek-input w-full"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void regenerate()}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <RotateCcw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
            {saving ? "Recalculando..." : "Regenerar cronograma"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {grouped.map(([date, dayTasks]) => {
          const dayMinutes = dayTasks.reduce((sum, task) => sum + task.durationMinutes, 0);
          const dayCompleted = dayTasks.filter((task) => localCompleted.has(task.id)).length;

          return (
          <div key={date}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-black capitalize text-slate-700">{date}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{dayTasks.length} bloco(s)</span>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">{dayMinutes} min</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  {dayCompleted}/{dayTasks.length} concluidos
                </span>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {dayTasks.map((task) => {
                const completed = localCompleted.has(task.id);
                return (
                  <motion.article
                    key={task.id}
                    layout
                    className={`flex items-start gap-3 rounded-[22px] border p-4 shadow-sm transition ${
                      completed
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void toggleTask(task)}
                      aria-label={completed ? "Reabrir tarefa" : "Concluir tarefa"}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                        completed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-300 hover:border-blue-400 hover:text-blue-600"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-700">
                          {taskTypeLabel(task.type)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Clock3 className="h-3 w-3" />
                          {task.durationMinutes} min
                        </span>
                        {completed ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                            Concluido
                          </span>
                        ) : null}
                      </div>
                      <h3 className={`mt-2 font-black ${completed ? "text-emerald-800 line-through" : "text-slate-950"}`}>
                        {task.title}
                      </h3>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{task.description}</p>
                      {!completed && (
                        <Link
                          href={task.actionHref}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:text-blue-900"
                        >
                          Comecar agora
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
          );
        })}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur">
      <p className="text-[9px] font-black uppercase tracking-wider text-white/70">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function SmallPlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">{value}</p>
    </div>
  );
}
