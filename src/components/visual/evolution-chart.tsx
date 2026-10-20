"use client";
import { useId } from "react";

type Props = { data: Array<number | null>; labels?: string[]; height?: number; gradientFrom?: string; gradientTo?: string };
export function EvolutionChart({ data, labels, height = 200, gradientFrom = "var(--theme-primary, #2524EB)", gradientTo = "var(--theme-secondary, #6C76FF)" }: Props) {
  const id = useId().replace(/:/g, "");
  const width = 480, inset = 15, stepX = (width - inset * 2) / Math.max(1, data.length - 1);
  const points = data.map((value, index) => value === null || !Number.isFinite(value) ? null : {
    x: data.length === 1 ? width / 2 : inset + index * stepX,
    y: height - inset - Math.max(0, Math.min(100, value)) / 100 * (height - inset * 2), value, index,
  });
  const path = points.map((point, index) => point ? (points[index - 1] ? "L" : "M") + " " + point.x + " " + point.y : "").join(" ");
  if (!points.some(Boolean)) return <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl bg-slate-50 p-5 text-center"><p className="text-sm font-semibold text-slate-600">Sua evolução começa com a primeira resposta.</p><p className="mt-2 text-xs text-slate-400">O gráfico aparecerá conforme você praticar.</p></div>;
  return <div className="w-full">
    <svg viewBox={"0 0 " + width + " " + height} role="img" aria-label="Precisão diária: porcentagem de acertos nas respostas registradas" className="h-auto w-full">
      <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="0"><stop stopColor={gradientFrom} /><stop offset="100%" stopColor={gradientTo} /></linearGradient></defs>
      {[0, 25, 50, 75, 100].map(value => <line key={value} x1={inset} x2={width - inset} y1={height - inset - value / 100 * (height - inset * 2)} y2={height - inset - value / 100 * (height - inset * 2)} stroke="var(--theme-border, #E3E6EE)" strokeDasharray="3 5" />)}
      <path d={path} fill="none" stroke={"url(#" + id + ")"} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => point ? <g key={index}><title>{(labels?.[index] ?? "Dia " + (index + 1)) + ": " + point.value + "% de acertos"}</title><circle cx={point.x} cy={point.y} r={5} fill="var(--theme-surface, #fff)" stroke={gradientFrom} strokeWidth={2} /><text x={point.x} y={Math.max(12, point.y - 13)} textAnchor="middle" fill="var(--theme-muted, #626D82)" fontSize={11}>{point.value}%</text></g> : null)}
    </svg>
    {labels && <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400">{labels.map((label, index) => <span key={index}>{label}</span>)}</div>}
    <p className="mt-3 text-center text-[11px] text-slate-400">Precisão nas questões · dias sem respostas ficam sem medição.</p>
  </div>;
}
