"use client";

import { BookOpen, CalendarDays, Clock3, Dna, FlaskConical, Globe2, HeartPulse, Landmark, Scale, Target, Video } from "@/components/visual/aicon-icons";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Atom, BriefcaseBusiness, Calculator, Check, CheckCheck, CircleHelp, Compass, GraduationCap, History, Languages, Loader2, Shield, Sparkles, Swords, type LucideIcon } from "lucide-react";
import { Brand } from "./brand";
import { useProductAppearance } from "./use-product-appearance";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { defaultLearningProfile, type LearningProfileInput } from "@/lib/learning-profile";
import { onboardingProfileKeys, onboardingProfiles, type OnboardingProfileKey } from "@/lib/onboarding-profiles";
import type { AppUser } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { verticalThemeStyle } from "@/config/vertical-themes";

const steps = [
  { label: "Seu objetivo", title: "O que você quer conquistar?", helper: "Escolha a preparação que faz sentido para o seu próximo passo.", icon: Compass },
  { label: "Sua meta", title: "Vamos dar um nome ao seu futuro.", helper: "Escolha suas provas e conte onde você quer chegar.", icon: Target },
  { label: "Seu ritmo", title: "Um plano que cabe na sua vida.", helper: "Consistência começa com uma rotina possível. Você pode ajustar depois.", icon: Clock3 },
  { label: "Seu ponto de partida", title: "Por onde vamos começar?", helper: "Não é um teste. Isso ajuda a escolher os primeiros conteúdos.", icon: Sparkles },
  { label: "Seu plano", title: "O primeiro passo já é seu.", helper: "Confira suas escolhas. Depois, o diagnóstico vai calibrar seu plano.", icon: GraduationCap },
];
const profileIcons: Record<OnboardingProfileKey, LucideIcon> = { vestibular: GraduationCap, medicina: HeartPulse, oab: Scale, concursos: BriefcaseBusiness, "policia-civil": Shield, "policia-militar": Shield, militares: Swords };
const preferences = [{ id: "questions", label: "Resolver questões", icon: CheckCheck }, { id: "video", label: "Assistir aulas", icon: Video }, { id: "reading", label: "Ler e fazer anotações", icon: BookOpen }, { id: "review", label: "Revisar com frequência", icon: CalendarDays }];
const levels = [{ id: "BEGINNER", label: "Estou começando", detail: "Quero construir uma boa base." }, { id: "INTERMEDIATE", label: "Já tenho uma base", detail: "Preciso organizar e praticar." }, { id: "ADVANCED", label: "Estou na reta final", detail: "Quero refinar meu desempenho." }] as const;
const days = ["D", "S", "T", "Q", "Q", "S", "S"];
const fullDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const subjectIcons: Record<string, LucideIcon> = { matematica: Calculator, portugues: Languages, linguagens: Languages, ingles: Languages, historia: History, geografia: Globe2, fisica: Atom, quimica: FlaskConical, biologia: Dna, redacao: BookOpen };
function toggle<T>(values: T[], value: T) { return values.includes(value) ? values.filter(item => item !== value) : [...values, value]; }

export function OnboardingFlow({ user, initial }: { user: AppUser; initial: LearningProfileInput }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { mode } = useProductAppearance();
  const [state, setState] = useState(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const lastSaved = useRef(JSON.stringify(initial));
  const savingRequest = useRef<Promise<void> | null>(null);
  const step = state.currentStep, current = steps[step], profile = onboardingProfiles[state.profile];
  const Icon = current.icon;
  const weeklyMinutes = state.minutesPerDay * state.studyDays.length;
  const canAdvance = step === 1 ? Boolean(state.exams.length && state.course.trim()) : step === 2 ? state.studyDays.length > 0 : step === 3 ? state.learningPreferences.length > 0 : true;
  function patch(values: Partial<LearningProfileInput>) { setState(value => ({ ...value, ...values })); setError(""); }

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step]);
  useEffect(() => {
    const snapshot = JSON.stringify(state);
    if (snapshot === lastSaved.current || finishing) return;
    const timer = window.setTimeout(() => {
      const previous = savingRequest.current;
      savingRequest.current = (async () => {
        await previous;
        setSaved("saving");
        try {
          const response = await fetch("/api/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: snapshot });
          if (!response.ok) throw new Error("save");
          lastSaved.current = snapshot; setSaved("saved");
        } catch { setSaved("error"); }
      })();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, finishing]);

  async function finish() {
    if (finishing) return;
    setFinishing(true); setError("");
    try {
      await savingRequest.current;
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar seu plano.");
      router.push("/diagnostico"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Tente novamente."); setFinishing(false); }
  }

  return <main style={verticalThemeStyle(state.profile, mode)} data-theme-mode={mode} data-vertical={state.profile} className="professional-platform onboarding-page min-h-screen bg-[color:var(--theme-background)] px-4 py-5 text-slate-900 sm:px-8 sm:py-8">
    <header className="mx-auto flex max-w-[960px] items-center justify-between gap-3">
      <Brand href="/" className="estudaki-brand--sm" />
      <span className="flex items-center gap-2 text-xs font-medium text-slate-500"><Shield className="h-4 w-4 text-[color:var(--theme-primary)]" />Sua jornada começa aqui</span>
    </header>
    <div className="mx-auto mt-7 max-w-[840px] sm:mt-10">
      <nav aria-label="Etapas do seu plano" className="mb-6 flex items-center justify-between gap-2">
        {steps.map((item, index) => <button key={item.label} type="button" onClick={() => patch({ currentStep: index })} disabled={index > step || finishing} aria-current={index === step ? "step" : undefined}
          className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-2 text-left text-xs font-semibold disabled:cursor-default", index === step ? "text-[color:var(--theme-primary)]" : "text-slate-400")}>
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px]", index < step ? "border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] text-[color:var(--theme-primary)]" : index === step ? "border-[color:var(--theme-border)] bg-[color:var(--theme-primary)] text-white" : "border-slate-200 bg-white")}>{index < step ? <Check className="h-4 w-4" /> : String(index + 1).padStart(2, "0")}</span>
          <span className="hidden leading-4 sm:block">{item.label}</span>
        </button>)}
      </nav>
      <section className="overflow-hidden rounded-[18px] border border-white bg-white shadow-sm sm:rounded-[18px]">
        <div className="border-b border-slate-100 px-5 pb-6 pt-7 sm:px-10 sm:pb-7 sm:pt-9">
          <div className="mb-5 flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] text-[color:var(--theme-primary)]"><Icon className="h-6 w-6" strokeWidth={1.6} /></span><span className="text-[11px] font-medium text-slate-400">ETAPA {step + 1} DE {steps.length}</span></div>
          <p className="mb-2 text-xs font-semibold text-[color:var(--theme-primary)]">{step === 0 ? user.name.split(" ")[0] + ", este espaço é seu." : current.label}</p>
          <h1 ref={heading} tabIndex={-1} className="font-display text-[28px] font-bold leading-[1.18] tracking-tight outline-none sm:text-[36px]">{current.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{current.helper}</p>
        </div>
        <div className="px-5 py-6 sm:px-10 sm:py-8">
          <AnimatePresence mode="wait"><motion.div key={step} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .16 }}>
            {step === 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {onboardingProfileKeys.map(key => { const item = onboardingProfiles[key]; return <Option key={key} compactMobile icon={profileIcons[key]} title={item.shortTitle} detail={item.description} selected={state.profile === key} onClick={() => patch({ ...defaultLearningProfile(key), currentStep: 0 })} />; })}
            </div>}
            {step === 1 && <div className="space-y-6">
              <fieldset><legend className="mb-3 text-sm font-semibold">{profile.examLabel}</legend><div className="flex flex-wrap gap-2">{profile.exams.map(exam => <button type="button" key={exam} aria-pressed={state.exams.includes(exam)} onClick={() => patch({ exams: toggle(state.exams, exam) })} className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition", state.exams.includes(exam) ? "border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] text-[color:var(--theme-primary)]" : "border-slate-200 text-slate-600 hover:border-[color:var(--theme-border)]")}>{state.exams.includes(exam) && <Check className="h-3.5 w-3.5" />}{exam}</button>)}</div></fieldset>
              <Field label={profile.courseLabel} icon={Landmark}><input value={state.course} maxLength={96} onChange={event => patch({ course: event.target.value })} placeholder={profile.coursePlaceholder} className="welcome-input" /></Field>
              <div className="flex flex-wrap gap-2">{profile.courseSuggestions.slice(0, 5).map(course => <button type="button" key={course} onClick={() => patch({ course })} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 hover:bg-[color:var(--theme-surface-alt)] hover:text-[color:var(--theme-primary)]">{course}</button>)}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sua meta (opcional)" icon={Target}><input value={state.targetScore} maxLength={80} onChange={event => patch({ targetScore: event.target.value })} placeholder={profile.targetPlaceholder} className="welcome-input" /></Field>
                <Field label="Data da prova (se souber)" icon={CalendarDays}><input type="date" value={state.examDate} onChange={event => patch({ examDate: event.target.value })} className="welcome-input" /></Field>
              </div>
            </div>}
            {step === 2 && <div className="space-y-7">
              <fieldset><legend className="mb-3 text-sm font-semibold">Quanto tempo por dia?</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{[30, 60, 90, 120, 180, 240].map(minutes => <button type="button" aria-pressed={state.minutesPerDay === minutes} key={minutes} onClick={() => patch({ minutesPerDay: minutes })} className={cn("rounded-2xl border px-2 py-4 text-sm font-semibold", state.minutesPerDay === minutes ? "border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] text-[color:var(--theme-primary)]" : "border-slate-200 text-slate-600")}><Clock3 className="mx-auto mb-2 h-5 w-5" strokeWidth={1.5} />{minutes < 60 ? minutes + " min" : minutes / 60 + " h"}</button>)}</div></fieldset>
              <fieldset><legend className="mb-3 text-sm font-semibold">Quais dias ficam melhores?</legend><div className="grid grid-cols-7 gap-2">{days.map((label, day) => <button type="button" key={day} aria-label={fullDays[day]} aria-pressed={state.studyDays.includes(day)} onClick={() => patch({ studyDays: toggle(state.studyDays, day).sort() })} className={cn("aspect-square rounded-xl border text-sm font-semibold", state.studyDays.includes(day) ? "border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] text-[color:var(--theme-primary)]" : "border-slate-200 text-slate-500")}>{label}</button>)}</div></fieldset>
              <div className="flex items-start gap-3 rounded-2xl bg-[color:var(--theme-background)] p-4"><CalendarDays className="mt-1 h-5 w-5 shrink-0 text-[color:var(--theme-primary)]" /><div><p className="text-sm font-semibold">{Math.floor(weeklyMinutes / 60)}h{weeklyMinutes % 60 ? " " + weeklyMinutes % 60 + "min" : ""} por semana, no seu ritmo.</p><p className="mt-1 text-xs leading-5 text-slate-500">Seu cronograma vai distribuir os blocos nos {state.studyDays.length} dias escolhidos.</p></div></div>
            </div>}
            {step === 3 && <div className="space-y-7">
              <fieldset><legend className="mb-3 text-sm font-semibold">Como você se sente hoje?</legend><div className="grid gap-2 sm:grid-cols-3">{levels.map(item => <Option key={item.id} title={item.label} detail={item.detail} selected={state.level === item.id} onClick={() => patch({ level: item.id })} />)}</div></fieldset>
              <fieldset><legend className="mb-1 text-sm font-semibold">O que merece mais atenção?</legend><p className="mb-3 text-xs text-slate-500">Pode escolher várias matérias ou deixar para o diagnóstico.</p><div className="flex flex-wrap gap-2">{profile.subjects.map(subject => <button type="button" aria-pressed={state.difficultSubjects.includes(subject.value)} key={subject.value} onClick={() => patch({ difficultSubjects: toggle(state.difficultSubjects, subject.value) })} className={cn("flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm", state.difficultSubjects.includes(subject.value) ? "border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] text-[color:var(--theme-primary)]" : "border-slate-200 text-slate-600")}><SubjectGlyph subject={subject.value} />{subject.label}{state.difficultSubjects.includes(subject.value) && <Check className="h-3.5 w-3.5" />}</button>)}</div></fieldset>
              <fieldset><legend className="mb-3 text-sm font-semibold">Como você gosta de estudar?</legend><div className="grid grid-cols-2 gap-2">{preferences.map(item => <Option key={item.id} icon={item.icon} title={item.label} selected={state.learningPreferences.includes(item.id)} onClick={() => patch({ learningPreferences: toggle(state.learningPreferences, item.id) })} />)}</div></fieldset>
            </div>}
            {step === 4 && <div>
              <div className="mb-6 flex items-center gap-4 rounded-2xl    p-5 professional-neutral"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[color:var(--theme-primary)]"><GraduationCap className="h-8 w-8" strokeWidth={1.5} /></span><div><p className="text-xs font-medium text-[color:var(--theme-primary)]">{profile.title}</p><h2 className="mt-1 text-xl font-bold">{state.course}</h2><p className="mt-1 text-xs text-slate-500">{state.exams.join(" · ")}</p></div></div>
              <dl className="grid gap-5 sm:grid-cols-2"><Summary icon={Target} label="Sua meta" value={state.targetScore || "Definir com o diagnóstico"} /><Summary icon={Clock3} label="Sua rotina" value={state.minutesPerDay + " min/dia · " + state.studyDays.length + " dias/semana"} /><Summary icon={Sparkles} label="Seu ponto de partida" value={levels.find(item => item.id === state.level)!.label} /><Summary icon={CalendarDays} label="Sua prova" value={state.examDate ? new Date(state.examDate + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Data ainda em aberto"} /></dl>
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-slate-100 p-4 text-xs leading-5 text-slate-500"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />Suas escolhas orientam seu plano. O diagnóstico e sua atividade vão ajudar a ajustá-lo ao longo do caminho.</p>
            </div>}
          </motion.div></AnimatePresence>
        </div>
        <footer className="border-t border-slate-100 px-5 py-5 sm:px-10">
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex items-center justify-between gap-3"><button type="button" disabled={!step || finishing} onClick={() => patch({ currentStep: step - 1 })} className="flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-500 disabled:opacity-30"><ArrowLeft className="h-4 w-4" />Voltar</button>
          <button type="button" disabled={!canAdvance || finishing} onClick={() => step === 4 ? void finish() : patch({ currentStep: step + 1 })} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[color:var(--theme-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--theme-primary)] disabled:opacity-40">{finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{step === 4 ? "Criar meu plano" : "Continuar"}{!finishing && (step === 4 ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}</button></div>
          <p role="status" className={cn("mt-3 text-center text-[11px]", saved === "error" ? "text-red-600" : "text-slate-400")}>{saved === "saving" ? "Salvando suas escolhas…" : saved === "saved" ? "Suas escolhas estão salvas na sua conta." : saved === "error" ? "Não foi possível salvar agora. Tente novamente antes de sair." : "Você pode ajustar suas escolhas depois."}</p>
        </footer>
      </section>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400"><BookOpen className="h-3.5 w-3.5" />Um passo de cada vez. Uma conquista por vez.</p>
    </div>
  </main>;
}

function Option({ title, detail, icon: Icon, selected, onClick, compactMobile = false }: { title: string; detail?: string; compactMobile?: boolean; icon?: LucideIcon; selected: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={cn("relative flex h-full flex-col items-start rounded-2xl border p-4 text-left transition sm:p-5", selected ? "border-[color:var(--theme-border)] bg-[#FFF9F2] shadow-sm" : "border-slate-200 bg-white hover:border-[color:var(--theme-border)] hover:bg-[#FFFCF8]")}>
    {Icon && <span className={cn("mb-3 grid h-10 w-10 place-items-center rounded-xl", selected ? "bg-[color:var(--theme-surface-alt)] text-[color:var(--theme-primary)]" : "bg-slate-50 text-slate-500")}><Icon className="h-5 w-5" strokeWidth={1.6} /></span>}
    <span className="pr-4 text-sm font-semibold leading-5 sm:text-base">{title}</span>{detail && <span className={cn("mt-2 text-xs leading-5 text-slate-500", compactMobile && "hidden sm:block")}>{detail}</span>}
    <span className={cn("absolute right-3 top-3 grid h-4 w-4 place-items-center rounded-full border", selected ? "border-[color:var(--theme-border)] bg-[color:var(--theme-primary)] text-white" : "border-slate-200")}>{selected && <Check className="h-3 w-3" />}</span>
  </button>;
}
function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-slate-400" strokeWidth={1.6} />{label}</span>{children}</label>;
}
function Summary({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return <div className="flex items-start gap-3"><Icon className="mt-1 h-5 w-5 shrink-0 text-[color:var(--theme-primary)]" strokeWidth={1.6} /><div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div></div>;
}

function SubjectGlyph({ subject }: { subject: string }) {
  const Icon = subjectIcons[subject] ?? (subject.includes("direito") ? Scale : BookOpen);
  return <Icon className="h-4 w-4" strokeWidth={1.5} />;
}
