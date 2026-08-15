"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ListChecks,
  Loader2,
  Map,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { StudyIcon, type StudyIconName } from "@/components/visual/study-icon";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/lib/roles";

type OnboardingState = {
  exams: string[];
  course: string;
  targetScore: string;
  minutesPerDay: number;
  studyDays: number[];
  difficultSubjects: StudyIconName[];
  examDate: string;
};

const storageKey = "estudaki:onboarding:v1";

const exams = ["ENEM", "FUVEST", "UNESP", "UNICAMP", "FATEC", "ETEC", "Provao Paulista"];
const courseSuggestions = [
  "Medicina",
  "Direito",
  "Engenharia",
  "Psicologia",
  "Administracao",
  "Ciencia da Computacao",
  "Arquitetura",
  "Enfermagem",
  "Tecnico em Informatica",
  "Ainda nao decidi",
];
const timeOptions = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1h" },
  { minutes: 120, label: "2h" },
  { minutes: 180, label: "3h" },
  { minutes: 240, label: "4h+" },
];
const weekDays = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sab" },
];
const subjects: Array<{ value: StudyIconName; label: string }> = [
  { value: "matematica", label: "Matematica" },
  { value: "linguagens", label: "Linguagens" },
  { value: "redacao", label: "Redacao" },
  { value: "fisica", label: "Fisica" },
  { value: "quimica", label: "Quimica" },
  { value: "biologia", label: "Biologia" },
  { value: "ciencias-humanas", label: "Humanas" },
];

const journeyPreview = [
  {
    title: "Objetivo",
    detail: "prova, curso e meta",
    icon: Target,
  },
  {
    title: "Diagnostico",
    detail: "base por area",
    icon: ListChecks,
  },
  {
    title: "Plano",
    detail: "semana pronta",
    icon: Map,
  },
];

const initialState: OnboardingState = {
  exams: ["ENEM"],
  course: "",
  targetScore: "",
  minutesPerDay: 90,
  studyDays: [1, 2, 3, 4, 5],
  difficultSubjects: ["matematica"],
  examDate: "",
};

function readInitialOnboarding() {
  if (typeof window === "undefined") return { state: initialState, step: 0 };
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return { state: initialState, step: 0 };

  try {
    const parsed = JSON.parse(saved) as Partial<OnboardingState> & { step?: number };
    return {
      state: { ...initialState, ...parsed },
      step: typeof parsed.step === "number" ? Math.min(Math.max(parsed.step, 0), steps.length - 1) : 0,
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return { state: initialState, step: 0 };
  }
}

export function OnboardingFlow({ user }: { user: AppUser }) {
  const router = useRouter();
  const { notify } = useFeedback();
  const [initial] = useState(() => readInitialOnboarding());
  const [step, setStep] = useState(initial.step);
  const [state, setState] = useState<OnboardingState>(initial.state);
  const [courseQuery, setCourseQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "local" | "saving" | "saved" | "error">("idle");
  const saveStateTimeout = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ ...state, step }));
  }, [state, step]);

  useEffect(() => {
    router.prefetch("/diagnostico");
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    return () => {
      if (saveStateTimeout.current) window.clearTimeout(saveStateTimeout.current);
    };
  }, []);

  const filteredCourses = useMemo(() => {
    const query = courseQuery.trim().toLowerCase();
    if (!query) return courseSuggestions;
    return courseSuggestions.filter((course) => course.toLowerCase().includes(query));
  }, [courseQuery]);

  const weeklyHours = Math.max(1, Math.round((state.minutesPerDay * state.studyDays.length) / 60));
  const currentStep = steps[step];
  const canAdvance = isStepValid(step, state);
  const completion = Math.round(((step + 1) / steps.length) * 100);
  const selectedSubjects = subjects.filter((subject) => state.difficultSubjects.includes(subject.value));
  const saveStateLabel =
    saveState === "saving"
      ? "Salvando no plano..."
      : saveState === "saved"
        ? "Plano salvo"
        : saveState === "error"
          ? "Falha ao salvar"
          : saveState === "local"
            ? "Alteracao salva neste navegador"
            : "Progresso salvo neste navegador";
  const nextActionLabel = step === steps.length - 1 ? "Salvar e abrir diagnostico" : "Continuar";

  function patch(next: Partial<OnboardingState>) {
    markLocalSaved();
    setState((current) => ({ ...current, ...next }));
  }

  function markLocalSaved() {
    setSaveState("local");
    if (saveStateTimeout.current) window.clearTimeout(saveStateTimeout.current);
    saveStateTimeout.current = window.setTimeout(() => setSaveState("idle"), 1200);
  }

  function goToStep(nextStep: number) {
    markLocalSaved();
    setStep(Math.min(Math.max(nextStep, 0), steps.length - 1));
  }

  function toggleListValue<T extends string | number>(values: T[], value: T) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  function next() {
    if (!canAdvance) {
      notify({
        tone: "warning",
        title: "Complete esta etapa",
        message: "Escolha uma opcao para o EstudAki montar seu plano com contexto.",
      });
      return;
    }
    goToStep(step + 1);
  }

  async function finish() {
    if (!canAdvance || saving) return;
    setSaving(true);
    setSaveState("saving");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Nao foi possivel salvar.");
      window.localStorage.removeItem(storageKey);
      setSaveState("saved");
      notify({
        tone: "success",
        title: "Plano inicial pronto",
        message: "Seu objetivo e tempo de estudo foram salvos.",
      });
      router.replace("/diagnostico");
    } catch (error) {
      setSaveState("error");
      notify({
        tone: "error",
        title: "Nao foi possivel salvar",
        message: error instanceof Error ? error.message : "Confira a conexao e tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_24px_56px_-34px_rgba(37,99,235,0.32)] md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-blue-200/35 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              Bem-vindo, {user.name.split(" ")[0]}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-[#0F172A] md:text-4xl">
              Defina sua meta. O EstudAki transforma em plano.
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Este fluxo conecta objetivo, diagnostico e cronograma para voce saber exatamente o que estudar primeiro.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {journeyPreview.map((item, index) => (
                <div
                  key={item.title}
                  className={cn(
                    "flex min-h-20 items-center gap-3 rounded-[22px] border p-3",
                    index === 0
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-slate-100 bg-slate-50/80 text-slate-600",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-wider opacity-70">
                      Passo {index + 1}
                    </span>
                    <span className="block text-sm font-black text-[#0F172A]">{item.title}</span>
                    <span className="block text-xs font-bold opacity-75">{item.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Plano semanal</p>
                <p className="mt-1 font-display text-4xl font-extrabold text-[#0F172A]">{weeklyHours}h</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <CalendarDays className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <dl className="mt-4 grid gap-2 text-xs font-bold text-slate-600">
              <SummaryLine label="Provas" value={state.exams.join(", ")} />
              <SummaryLine label="Curso" value={state.course || "a definir"} />
              <SummaryLine label="Dias" value={`${state.studyDays.length} por semana`} />
            </dl>
          </aside>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="self-start rounded-[26px] border border-white/80 bg-white p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.26)]">
          <div className="mb-4 rounded-[22px] border border-blue-100 bg-blue-50/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                Progresso
              </p>
              <p className="font-display text-xl font-extrabold text-[#0F172A]">{completion}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
          <ol className="space-y-2">
            {steps.map((item, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition",
                      active && "bg-blue-600 text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.85)]",
                      done && !active && "bg-emerald-50 text-emerald-700",
                      !active && !done && "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    <span className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                      active ? "bg-white/22 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400",
                    )}>
                      {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    {item.title}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            {saveStateLabel}
          </div>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Isso ja vira plano
            </p>
            <div className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Preferencias ficam salvas para recalcular seu cronograma depois.
            </div>
            <div className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              Materias dificeis entram como prioridade no diagnostico.
            </div>
          </div>
        </aside>

        <main className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_26px_60px_-34px_rgba(15,23,42,0.34)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-orange-50 px-5 py-5 md:px-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                  <currentStep.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                    Etapa {step + 1} de {steps.length}
                  </p>
                  <h2 className="font-display text-2xl font-extrabold text-[#0F172A]">{currentStep.question}</h2>
                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
                    {currentStep.helper}
                  </p>
                </div>
              </div>
              <div className="min-w-36">
                <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-blue-700">
                  <span>Avanco</span>
                  <span>{completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-[420px] p-5 md:p-7">
            <div className="mb-5 flex items-start gap-3 rounded-[22px] border border-amber-100 bg-amber-50/70 p-4">
              <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                  Como isso muda o plano
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                  {currentStep.impact}
                </p>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <ChoiceGrid>
                    {exams.map((exam) => (
                      <ChoiceButton
                        key={exam}
                        selected={state.exams.includes(exam)}
                        onClick={() => patch({ exams: toggleListValue(state.exams, exam) })}
                        title={exam}
                        detail="Prova alvo"
                      />
                    ))}
                  </ChoiceGrid>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <label className="relative block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Curso desejado</span>
                      <Search className="absolute left-4 top-10 h-4 w-4 text-slate-400" />
                      <input
                        value={state.course || courseQuery}
                        onChange={(event) => {
                          patch({ course: event.target.value });
                          setCourseQuery(event.target.value);
                        }}
                        placeholder="Busque ou digite seu curso"
                        className="ek-input ek-input-with-icon"
                      />
                    </label>
                    <ChoiceGrid compact>
                      {filteredCourses.map((course) => (
                        <ChoiceButton
                          key={course}
                          selected={state.course === course}
                          onClick={() => {
                            patch({ course });
                            setCourseQuery(course);
                          }}
                          title={course}
                        />
                      ))}
                    </ChoiceGrid>
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                        Nota/meta
                      </span>
                      <input
                        value={state.targetScore}
                        onChange={(event) => patch({ targetScore: event.target.value })}
                        placeholder="Ex: 780 no ENEM, passar em Medicina, nota de corte +40"
                        className="ek-input"
                      />
                    </label>
                    <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4">
                      <Target className="h-6 w-6 text-amber-600" />
                      <p className="mt-3 text-sm font-black text-[#0F172A]">Meta clara melhora prioridade.</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                        Se ainda nao souber a nota, escreva o objetivo em palavras.
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <ChoiceGrid>
                    {timeOptions.map((option) => (
                      <ChoiceButton
                        key={option.minutes}
                        selected={state.minutesPerDay === option.minutes}
                        onClick={() => patch({ minutesPerDay: option.minutes })}
                        title={option.label}
                        detail="por dia"
                        icon={<Clock3 className="h-5 w-5" />}
                      />
                    ))}
                  </ChoiceGrid>
                )}

                {step === 4 && (
                  <ChoiceGrid compact>
                    {weekDays.map((day) => (
                      <ChoiceButton
                        key={day.value}
                        selected={state.studyDays.includes(day.value)}
                        onClick={() => patch({ studyDays: toggleListValue(state.studyDays, day.value).sort() })}
                        title={day.label}
                        detail="dia"
                        icon={<CalendarDays className="h-5 w-5" />}
                      />
                    ))}
                  </ChoiceGrid>
                )}

                {step === 5 && (
                  <ChoiceGrid>
                    {subjects.map((subject) => (
                      <ChoiceButton
                        key={subject.value}
                        selected={state.difficultSubjects.includes(subject.value)}
                        onClick={() =>
                          patch({
                            difficultSubjects: toggleListValue(state.difficultSubjects, subject.value) as StudyIconName[],
                          })
                        }
                        title={subject.label}
                        icon={<StudyIcon name={subject.value} size="xs" />}
                      />
                    ))}
                  </ChoiceGrid>
                )}

                {step === 6 && (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5">
                      <Sparkles className="h-8 w-8 text-blue-700" />
                      <h3 className="mt-4 font-display text-3xl font-extrabold text-[#0F172A]">
                        Primeiro plano quase pronto
                      </h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                        Agora falta calibrar sua base por materia. Depois disso, o cronograma nasce com prioridades reais.
                      </p>
                      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                        <Metric label="Provas" value={state.exams.join(", ")} />
                        <Metric label="Tempo" value={`${weeklyHours}h/sem`} />
                        <Metric label="Dificeis" value={String(state.difficultSubjects.length)} />
                      </dl>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {["Objetivo salvo", "Diagnostico guiado", "Plano gerado"].map((label, index) => (
                          <div key={label} className="flex items-center gap-2 text-xs font-black text-slate-700">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                              {index + 1}
                            </span>
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Resumo</p>
                      <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" /> Objetivo: {state.course || "em aberto"}</li>
                        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" /> Meta: {state.targetScore || "ajustar depois"}</li>
                        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" /> {state.studyDays.length} dias de estudo</li>
                        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" /> Prioridade: {selectedSubjects.map((item) => item.label).join(", ") || "ajustar no diagnostico"}</li>
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7">
            <button
              type="button"
              disabled={step === 0 || saving}
              onClick={() => goToStep(step - 1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {!canAdvance ? (
                <p className="text-xs font-bold text-orange-600">
                  Complete esta etapa para continuar.
                </p>
              ) : null}
              {step === steps.length - 1 ? (
                <button
                  type="button"
                  disabled={saving || !canAdvance}
                  onClick={() => void finish()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#FACC15] px-5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(249,115,22,0.75)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}
                  {saving ? "Salvando..." : nextActionLabel}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canAdvance}
                  onClick={next}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#22D3EE] px-5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.75)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {nextActionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}

const steps = [
  {
    title: "Objetivo",
    question: "Qual e seu objetivo?",
    helper: "Escolha as provas que realmente importam para o seu ano.",
    impact: "As provas escolhidas definem o repertorio de questoes, simulados e revisoes que entram no plano.",
    icon: GraduationCap,
  },
  {
    title: "Curso",
    question: "Qual curso voce quer?",
    helper: "Digite livremente ou use uma sugestao rapida.",
    impact: "O curso ajuda a dar peso para materias decisivas e deixa suas metas mais concretas.",
    icon: Search,
  },
  {
    title: "Meta",
    question: "Qual nota/meta voce deseja alcancar?",
    helper: "Pode ser nota, curso, instituicao ou uma frase simples.",
    impact: "A meta vira referencia para calibrar intensidade, ritmo semanal e revisoes.",
    icon: Target,
  },
  {
    title: "Tempo",
    question: "Quanto tempo consegue estudar por dia?",
    helper: "Escolha um ritmo realista. O plano fica melhor quando cabe na sua rotina.",
    impact: "O tempo por dia define a duracao dos blocos e evita um cronograma impossivel de cumprir.",
    icon: Clock3,
  },
  {
    title: "Dias",
    question: "Quais dias voce costuma estudar?",
    helper: "Marque apenas os dias em que voce quer receber blocos de estudo.",
    impact: "Os dias escolhidos distribuem pratica, revisao e trilhas ao longo da semana.",
    icon: CalendarDays,
  },
  {
    title: "Dificuldades",
    question: "Quais materias parecem mais dificeis?",
    helper: "Escolha as areas que precisam de mais atencao agora.",
    impact: "Essas materias aparecem primeiro no diagnostico e ganham prioridade no plano inicial.",
    icon: Sparkles,
  },
  {
    title: "Diagnostico",
    question: "Pronto para descobrir seu ponto de partida?",
    helper: "Revise o resumo e abra o diagnostico inicial.",
    impact: "O diagnostico transforma suas respostas em prioridades concretas para a primeira semana.",
    icon: BookOpenCheck,
  },
];

function isStepValid(step: number, state: OnboardingState) {
  if (step === 0) return state.exams.length > 0;
  if (step === 1) return state.course.trim().length > 1;
  if (step === 2) return state.targetScore.trim().length > 1;
  if (step === 3) return state.minutesPerDay >= 30;
  if (step === 4) return state.studyDays.length > 0;
  if (step === 5) return state.difficultSubjects.length > 0;
  return true;
}

function ChoiceGrid({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3")}>
      {children}
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  title,
  detail,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-[104px] items-center gap-3 rounded-[22px] border p-4 text-left transition active:scale-[0.99]",
        selected
          ? "border-blue-500 bg-gradient-to-br from-blue-50 via-white to-cyan-50 text-blue-800 shadow-[0_18px_32px_-24px_rgba(37,99,235,0.6)] ring-2 ring-blue-100"
          : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm",
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0">
        <span className="block text-base font-black text-[#0F172A]">{title}</span>
        {detail ? <span className="mt-1 block text-xs font-bold text-slate-500">{detail}</span> : null}
      </span>
      {selected ? (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </button>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/75 px-3 py-2">
      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="truncate text-right font-black text-[#0F172A]">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white/70 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-[#0F172A]">{value}</p>
    </div>
  );
}
