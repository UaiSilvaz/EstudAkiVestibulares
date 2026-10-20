"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { progressionTracks, rankProgressForXp } from "@/lib/progression";

type LeagueBadgeProps = {
  league: string; xp?: number; size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean; className?: string;
};
const tiers = ["Bronze", "Prata", "Ouro", "Platina", "Esmeralda", "Diamante"];
const palettes = [
  { ink: "#9a400c", border: "#dc762c", surface: "#ffd5ac" },
  { ink: "#475569", border: "#8194ad", surface: "#dce5f0" },
  { ink: "#925600", border: "#e5a600", surface: "#ffe278" },
  { ink: "#3730a3", border: "#6366f1", surface: "#c7d2fe" },
  { ink: "#006644", border: "#00a970", surface: "#92efc3" },
  { ink: "#00628e", border: "#00a9d6", surface: "#95e7fa" },
];
const sizes = { sm: 34, md: 48, lg: 64, xl: 88 };

function RankArtwork({ tier }: { tier: number }) {
  const id = useId().replace(/:/g, "");
  const p = palettes[tier];
  const frame = "M50 4C58 4 62 8 68 14L86 32C92 38 96 42 96 50S92 62 86 68L68 86C62 92 58 96 50 96S38 92 32 86L14 68C8 62 4 58 4 50S8 38 14 32L32 14C38 8 42 4 50 4Z";
  return <svg viewBox="0 0 100 100" className="norte-rank-artwork" focusable="false" aria-hidden="true">
    <defs>
      <mask id={id + "-brand"} maskUnits="userSpaceOnUse" x="24" y="22" width="52" height="60" style={{ maskType: "alpha" }}><image href="/assets/norte-design/03_App_Favicon/norte_icone_256x256.png" x="24" y="22" width="52" height="60" preserveAspectRatio="xMidYMid meet" /></mask>
    </defs>
    <path d={frame} fill={p.surface} stroke={p.border} strokeWidth="2" />
    <path d={frame} transform="translate(50 50) scale(.84) translate(-50 -50)" fill="none" stroke={p.border} strokeWidth="1.2" />
    <rect x="24" y="22" width="52" height="60" fill={p.ink} mask={"url(#" + id + "-brand)"} />
  </svg>;
}

export function LeagueBadge({ league, xp, size = "md", showLabel = true, className }: LeagueBadgeProps) {
  const namedIndex = Object.values(progressionTracks).map(track => track.findIndex(rank => rank.name === league)).find(index => index >= 0) ?? 0;
  const tier = xp === undefined ? namedIndex : tiers.indexOf(rankProgressForXp(xp).current.name);
  return <span className={cn("league-badge inline-flex items-center gap-3 text-[color:var(--theme-text)]", className)}>
    <span aria-hidden="true" className="norte-rank-emblem" style={{ width: sizes[size], height: sizes[size] }}><RankArtwork tier={tier} /></span>
    {showLabel && <span className="text-sm font-semibold">{league}</span>}
  </span>;
}
