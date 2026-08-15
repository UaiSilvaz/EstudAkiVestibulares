"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpenText,
  Check,
  Clock3,
  FileQuestion,
  GraduationCap,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };
type Topic = Option & { subjectId: string };
type AreaOption = { value: string; label: string };

type Props = {
  vestibular: { id: string; slug: string; name: string; color: string };
  subjects: Option[];
  topics: Topic[];
  years: number[];
  days: string[];
  areas: AreaOption[];
  total: number;
  initialFilters?: {
    subjectId?: string;
    topicId?: string;
    year?: number;
    day?: string;
    area?: string;
    difficulty?: string;
    scope?: string;
  };
};

const quantities = [10, 20, 30, 50];
const difficulties = [
  { value: "", label: "Mista" },
  { value: "EASY", label: "Fácil" },
  { value: "MEDIUM", label: "Média" },
  { value: "HARD", label: "Difícil" },
];
const scopes = [
  { value: "all", label: "Todas", icon: ListChecks },
  { value: "unanswered", label: "Não respondidas", icon: FileQuestion },
  { value: "errors", label: "Questões erradas", icon: XCircle },
  { value: "favorites", label: "Favoritas", icon: Bookmark },
];

export function QuestionSessionSetup({
  vestibular,
  subjects,
  topics,
  years,
  days,
  areas,
  total,
  initialFilters,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"configure" | "confirm">("configure");
  const [subjectId, setSubjectId] = useState(initialFilters?.subjectId ?? "");
  const [topicId, setTopicId] = useState(initialFilters?.topicId ?? "");
  const [year, setYear] = useState(initialFilters?.year ? String(initialFilters.year) : "");
  const [day, setDay] = useState(initialFilters?.day ?? "");
  const [area, setArea] = useState(initialFilters?.area ?? "");
  const [difficulty, setDifficulty] = useState(initialFilters?.difficulty ?? "");
  const [quantity, setQuantity] = useState(20);
  const [scope, setScope] = useState(initialFilters?.scope ?? "all");

  const availableTopics = useMemo(
    () => topics.filter((topic) => !subjectId || topic.subjectId === subjectId),
    [subjectId, topics],
  );
  const subjectName = subjects.find((item) => item.id === subjectId)?.name ?? "Todas as matérias";
  const topicName = topics.find((item) => item.id === topicId)?.name ?? "Todos os conteúdos";
  const difficultyName =
    difficulties.find((item) => item.value === difficulty)?.label ?? "Mista";
  const areaName = areas.find((item) => item.value === area)?.label ?? "Todas as áreas";
  const scopeName = scopes.find((item) => item.value === scope)?.label ?? "Todas";
  const estimatedMinutes = quantity * 2;

  function reset() {
    setSubjectId("");
    setTopicId("");
    setYear("");
    setDay("");
    setArea("");
    setDifficulty("");
    setQuantity(20);
    setScope("all");
  }

  function start() {
    const params = new URLSearchParams({
      vestibular: vestibular.slug,
      session: "1",
      count: String(quantity),
    });
    if (subjectId) params.set("subject", subjectId);
    if (topicId) params.set("topic", topicId);
    if (year) params.set("year", year);
    if (day) params.set("day", day);
    if (area) params.set("area", area);
    if (difficulty) params.set("difficulty", difficulty);
    if (scope !== "all") params.set("scope", scope);
    router.push(`/questions?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/questions"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Trocar vestibular
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          {total.toLocaleString("pt-BR")} questões disponíveis
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "configure" ? (
          <motion.div
            key="configure"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-5 xl:grid-cols-[1.4fr_0.75fr]"
          >
            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_55px_-30px_rgba(15,23,42,0.32)]">
              <header className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                    <Target className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase text-blue-100">Monte sua lista</p>
                    <h2 className="mt-0.5 text-xl font-black">Escolha como quer praticar</h2>
                  </div>
                </div>
              </header>

              <div className="space-y-6 p-5 md:p-6">
                <SetupSection icon={BookOpenText} title="Conteúdo da lista">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <SetupSelect
                      label="Matéria"
                      value={subjectId}
                      onChange={(value) => {
                        setSubjectId(value);
                        setTopicId("");
                      }}
                      options={subjects}
                      empty="Todas as matérias"
                    />
                    <SetupSelect
                      label="Conteúdo"
                      value={topicId}
                      onChange={setTopicId}
                      options={availableTopics}
                      empty="Todos os conteúdos"
                    />
                    <SetupSelect
                      label="Ano"
                      value={year}
                      onChange={setYear}
                      options={years.map((item) => ({ id: String(item), name: String(item) }))}
                      empty="Todos os anos"
                    />
                    <SetupSelect
                      label="Dia"
                      value={day}
                      onChange={setDay}
                      options={days.map((item) => ({
                        id: item,
                        name: item === "1" || item === "2" ? `${item}º dia` : item,
                      }))}
                      empty="Todos os dias"
                    />
                    <SetupSelect
                      label="Área"
                      value={area}
                      onChange={setArea}
                      options={areas.map((item) => ({ id: item.value, name: item.label }))}
                      empty="Todas as áreas"
                    />
                  </div>
                </SetupSection>

                <SetupSection icon={FileQuestion} title="Quantidade de questões">
                  <div className="grid grid-cols-4 gap-2">
                    {quantities.map((item) => (
                      <ChoiceCard
                        key={item}
                        selected={quantity === item}
                        onClick={() => setQuantity(item)}
                        label={String(item)}
                        detail="questões"
                      />
                    ))}
                  </div>
                </SetupSection>

                <SetupSection icon={Sparkles} title="Dificuldade">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {difficulties.map((item) => (
                      <ChoiceCard
                        key={item.value}
                        selected={difficulty === item.value}
                        onClick={() => setDifficulty(item.value)}
                        label={item.label}
                      />
                    ))}
                  </div>
                </SetupSection>

                <SetupSection icon={ListChecks} title="Tipo de questão">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {scopes.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setScope(item.value)}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left text-sm font-bold transition",
                          scope === item.value
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_12px_24px_-18px_rgba(37,99,235,0.75)]"
                            : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-blue-200",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        {scope === item.value && <Check className="ml-auto h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </SetupSection>

                <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("confirm")}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-[0_15px_30px_-16px_rgba(37,99,235,0.8)] transition hover:-translate-y-0.5"
                  >
                    Revisar seleção
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            <SessionSummary
              vestibular={vestibular.name}
              subject={subjectName}
              topic={topicName}
              year={year || "Todos"}
              day={day ? (day === "1" || day === "2" ? `${day}º dia` : day) : "Todos"}
              area={areaName}
              difficulty={difficultyName}
              quantity={quantity}
              scope={scopeName}
              estimatedMinutes={estimatedMinutes}
            />
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-auto max-w-3xl overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_65px_-32px_rgba(15,23,42,0.38)]"
          >
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 px-6 py-7 text-white md:px-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-black uppercase text-blue-100">Tudo pronto</p>
              <h2 className="mt-1 text-3xl font-black">Confirme sua lista de questões</h2>
            </div>
            <div className="p-6 md:p-8">
              <SessionSummary
                compact
                vestibular={vestibular.name}
                subject={subjectName}
                topic={topicName}
                year={year || "Todos"}
                day={day ? (day === "1" || day === "2" ? `${day}º dia` : day) : "Todos"}
                area={areaName}
                difficulty={difficultyName}
                quantity={quantity}
                scope={scopeName}
                estimatedMinutes={estimatedMinutes}
              />
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setStep("configure")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={start}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-3 text-sm font-black text-white shadow-[0_16px_32px_-16px_rgba(249,115,22,0.8)] transition hover:-translate-y-0.5"
                >
                  Começar questões
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SetupSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpenText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SetupSelect({
  label,
  value,
  onChange,
  options,
  empty,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  empty: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-black uppercase text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">{empty}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </label>
  );
}

function ChoiceCard({
  selected,
  onClick,
  label,
  detail,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  detail?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative min-h-16 rounded-2xl border px-2 py-3 text-center transition",
        selected
          ? "border-blue-500 bg-blue-600 text-white shadow-[0_14px_26px_-16px_rgba(37,99,235,0.85)]"
          : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-200",
      )}
    >
      <span className="block text-sm font-black">{label}</span>
      {detail && <span className={cn("mt-0.5 block text-[10px] font-bold", selected ? "text-blue-100" : "text-slate-400")}>{detail}</span>}
      {selected && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}
    </motion.button>
  );
}

function SessionSummary({
  vestibular,
  subject,
  topic,
  year,
  day,
  area,
  difficulty,
  quantity,
  scope,
  estimatedMinutes,
  compact = false,
}: {
  vestibular: string;
  subject: string;
  topic: string;
  year: string;
  day: string;
  area: string;
  difficulty: string;
  quantity: number;
  scope: string;
  estimatedMinutes: number;
  compact?: boolean;
}) {
  const rows = [
    ["Vestibular", vestibular],
    ["Matéria", subject],
    ["Conteúdo", topic],
    ["Ano", year],
    ["Dia", day],
    ["Área", area],
    ["Dificuldade", difficulty],
    ["Tipo", scope],
  ];

  return (
    <aside className={cn(
      "relative self-start overflow-hidden rounded-[26px] border border-blue-200/70 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-5 text-white shadow-[0_24px_50px_-30px_rgba(37,99,235,0.58)]",
      compact && "rounded-2xl",
    )}>
      <Sparkles className="pointer-events-none absolute -bottom-8 -right-7 h-36 w-36 rotate-[-12deg] text-white/18" />
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/35 bg-white/22 shadow-sm backdrop-blur">
          <Sparkles className="h-5 w-5 text-yellow-200" />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-white/82">Resumo da prática</p>
          <p className="text-lg font-black">{quantity} questões</p>
        </div>
      </div>
      <dl className="mt-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-white/22 pb-2.5 last:border-0">
            <dt className="text-xs font-bold text-white/78">{label}</dt>
            <dd className="text-right text-xs font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/30 bg-white/20 p-3 backdrop-blur">
          <FileQuestion className="h-4 w-4 text-cyan-100" />
          <p className="mt-2 text-xl font-black">{quantity}</p>
          <p className="text-[10px] font-bold text-white/78">questões</p>
        </div>
        <div className="rounded-2xl border border-white/30 bg-white/20 p-3 backdrop-blur">
          <Clock3 className="h-4 w-4 text-yellow-200" />
          <p className="mt-2 text-xl font-black">~{estimatedMinutes} min</p>
          <p className="text-[10px] font-bold text-white/78">tempo estimado</p>
        </div>
      </div>
    </aside>
  );
}
