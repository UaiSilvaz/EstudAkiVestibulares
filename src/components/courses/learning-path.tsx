"use client";

import {
  Brain,
  Check,
  Gift,
  GraduationCap,
  Lock,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Zap,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FastLink } from "@/components/fast-link";
import { cn } from "@/lib/utils";
import type { CourseDetailDTO, LearningPathNodeDTO } from "@/lib/courses/types";
import { formatCourseDuration } from "./format";

type Props = {
  course: CourseDetailDTO;
  onPurchase?: () => void;
};

const nodeIcons = {
  VIDEO: Play,
  QUESTIONS: Brain,
  REVIEW: RefreshCcw,
  CHECKPOINT: ShieldCheck,
  SIMULATION: Trophy,
  MATERIAL: BookOpen,
  REWARD: Gift,
  FINAL: GraduationCap,
} as const;

const nodeLabels = {
  VIDEO: "Videoaula",
  QUESTIONS: "Questoes",
  REVIEW: "Revisao",
  CHECKPOINT: "Checkpoint",
  SIMULATION: "Simulado",
  MATERIAL: "Material",
  REWARD: "Recompensa",
  FINAL: "Final",
} as const;

export function LearningPath({ course, onPurchase }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<LearningPathNodeDTO | null>(null);

  async function claimReward(node: LearningPathNodeDTO) {
    if (!node.rewardId) return;
    await fetch(`/api/rewards/${node.rewardId}/claim`, { method: "POST" });
    router.refresh();
    setSelected(null);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,820px)_320px] xl:items-start xl:justify-center">
      <section className="relative overflow-hidden rounded-[30px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-cyan-50 p-4 shadow-[0_24px_60px_-42px_rgba(37,99,235,0.32)] sm:p-6">
        <div className="mb-6 rounded-[24px] border border-white/80 bg-white/86 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">{course.title}</p>
              <h2 className="mt-1 font-display text-2xl font-black text-slate-950">Trilha de aprendizagem</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge icon={<Zap className="h-3.5 w-3.5" />} label={`${course.progressPercent}% concluido`} />
              <Badge icon={<Sparkles className="h-3.5 w-3.5" />} label={`${course.totalLessons} atividades`} />
              <Badge icon={<Trophy className="h-3.5 w-3.5" />} label={`${course.averageAccuracy}% acertos`} />
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-700" style={{ width: `${course.progressPercent}%` }} />
          </div>
        </div>

        <div className="relative mx-auto max-w-[720px] pb-8">
          {course.modules.map((module) => (
            <div key={module.id} className="relative">
              <div className="my-8 overflow-hidden rounded-[26px] border border-white/80 p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${module.color}, #22D3EE)` }}>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/80">{module.eyebrow}</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl font-black">{module.title}</h3>
                    <p className="mt-1 max-w-xl text-sm font-semibold text-white/82">{module.description}</p>
                  </div>
                  <p className="rounded-full bg-white/18 px-3 py-1 text-xs font-black ring-1 ring-white/25">
                    {module.completedCount}/{module.totalCount}
                  </p>
                </div>
              </div>
              <div className="relative">
                <Connector nodes={module.nodes} />
                <div className="space-y-3">
                  {module.nodes.map((node) => (
                    <div key={node.id} className={cn("relative z-10 flex", node.position === "left" && "justify-start", node.position === "center" && "justify-center", node.position === "right" && "justify-end")}>
                      <PathNode node={node} onSelect={() => setSelected(node)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="hidden space-y-4 xl:block">
        <Panel title="Meta diaria">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Atividades" value="2 / 3" />
            <Stat label="XP" value="+250" />
            <Stat label="Sequencia" value="12 dias" />
            <Stat label="Liga" value="Ouro" />
          </div>
        </Panel>
        <Panel title="Proxima recompensa">
          <div className="rounded-2xl bg-amber-50 p-4 text-amber-700">
            <Gift className="h-7 w-7" />
            <p className="mt-2 text-sm font-black">Bau de Estudos</p>
            <p className="text-xs font-semibold">Complete o checkpoint atual para abrir.</p>
          </div>
        </Panel>
      </aside>

      {selected && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-slate-950/35 p-3 backdrop-blur-sm sm:place-items-center">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 p-5 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">{nodeLabels[selected.type]}</p>
              <h3 className="mt-2 font-display text-2xl font-black">{selected.title}</h3>
              <p className="mt-2 text-sm font-semibold text-white/82">{selected.description}</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge icon={<Play className="h-3.5 w-3.5" />} label={formatCourseDuration(selected.durationSeconds)} />
                <Badge icon={<Zap className="h-3.5 w-3.5" />} label={`+${selected.xpReward} XP`} />
                {selected.isFreePreview && <Badge icon={<Sparkles className="h-3.5 w-3.5" />} label="Aula gratis" />}
              </div>
              {selected.lockedReason === "sequence" && <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">Conclua a atividade anterior para desbloquear.</p>}
              {selected.lockedReason === "purchase" && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">Esta aula faz parte de um curso premium.</p>}
              <div className="flex flex-wrap gap-3">
                {selected.lockedReason === "purchase" ? (
                  <button type="button" onClick={onPurchase} className="h-11 rounded-full bg-blue-600 px-4 text-sm font-black text-white">Comprar curso</button>
                ) : selected.rewardId && selected.state !== "locked" && !selected.rewardClaimed ? (
                  <button type="button" onClick={() => void claimReward(selected)} className="h-11 rounded-full bg-amber-500 px-4 text-sm font-black text-white">Abrir recompensa</button>
                ) : (
                  <FastLink href={selected.href} className="inline-flex h-11 items-center rounded-full bg-slate-950 px-4 text-sm font-black text-white">Comecar aula</FastLink>
                )}
                <button type="button" onClick={() => setSelected(null)} className="h-11 rounded-full border border-slate-200 px-4 text-sm font-black text-slate-700">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PathNode({ node, onSelect }: { node: LearningPathNodeDTO; onSelect: () => void }) {
  const Icon = node.state === "locked" ? Lock : node.state === "completed" || node.state === "perfect" ? Check : nodeIcons[node.type];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${node.title}. ${node.state === "locked" ? "Bloqueado" : "Disponivel"}`}
      className={cn(
        "group relative flex w-[min(72vw,210px)] flex-col items-center gap-2 rounded-[24px] border p-3 text-center shadow-sm transition focus:outline-none focus:ring-4 focus:ring-blue-200 active:scale-[0.98] sm:w-56",
        node.state === "locked" && "border-slate-200 bg-slate-100 text-slate-400 opacity-75",
        node.state === "available" && "border-blue-100 bg-white text-blue-700 hover:-translate-y-1 hover:shadow-xl",
        node.state === "current" && "border-cyan-200 bg-white text-blue-700 shadow-[0_0_0_8px_rgba(34,211,238,0.12),0_24px_44px_-28px_rgba(37,99,235,0.55)]",
        (node.state === "completed" || node.state === "perfect") && "border-emerald-100 bg-emerald-50 text-emerald-700",
      )}
    >
      {node.state === "current" && (
        <span className="absolute -top-7 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
          Continue aqui
        </span>
      )}
      <span className={cn("relative flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-lg", node.state === "locked" ? "bg-slate-300" : node.state === "completed" || node.state === "perfect" ? "bg-emerald-500" : "bg-gradient-to-br from-blue-600 to-cyan-400")}>
        {node.state === "current" && <span className="absolute inset-0 animate-ping rounded-3xl bg-cyan-300 opacity-30" />}
        <Icon className="relative h-7 w-7" />
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.14em]">{nodeLabels[node.type]}</span>
      <span className="line-clamp-2 text-sm font-black text-slate-900">{node.title}</span>
      {(node.state === "completed" || node.state === "perfect") && (
        <span className="flex gap-0.5 text-amber-400">
          {Array.from({ length: Math.max(1, node.stars) }).map((_, index) => <Star key={index} className="h-3.5 w-3.5 fill-current" />)}
        </span>
      )}
    </button>
  );
}

function Connector({ nodes }: { nodes: LearningPathNodeDTO[] }) {
  return (
    <div aria-hidden className="absolute inset-x-0 top-6 bottom-6 z-0">
      {nodes.slice(0, -1).map((node, index) => {
        const next = nodes[index + 1];
        const completed = node.state === "completed" || node.state === "perfect";
        const x1 = node.position === "left" ? "24%" : node.position === "right" ? "76%" : "50%";
        const x2 = next.position === "left" ? "24%" : next.position === "right" ? "76%" : "50%";
        return (
          <svg key={node.id} className="absolute left-0 h-28 w-full" style={{ top: `${index * 118 + 70}px` }} viewBox="0 0 100 120" preserveAspectRatio="none">
            <path d={`M ${Number.parseFloat(x1)} 0 C 50 42, 50 78, ${Number.parseFloat(x2)} 120`} fill="none" stroke={completed ? "#22C55E" : "#CBD5E1"} strokeWidth="2.8" strokeLinecap="round" strokeDasharray={completed ? "0" : "6 8"} />
          </svg>
        );
      })}
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 text-xs font-black text-slate-700">{icon}{label}</span>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="font-display text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
