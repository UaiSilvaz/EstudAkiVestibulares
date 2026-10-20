"use client";

import Link from "next/link";
import { StatTile } from "./visual/stat-tile";

type Variant = "green" | "orange" | "blue" | "red" | "purple" | "yellow" | "pink" | "cyan" | "white";
type MetricIconName = "alertTriangle" | "bookOpen" | "checkCircle" | "clipboardList" | "fileText" | "flame" | "gauge" | "graduationCap" | "lineChart" | "trophy" | "users" | "video";
type Props = {
  href?: string; label: string; value: number | string; hint?: string;
  iconName: MetricIconName; color?: string; variant?: Variant; suffix?: string;
  delay?: number; className?: string;
};

export function MetricCard({ label, value, hint, suffix, className, href }: Props) {
  const card = <StatTile label={label} value={<>{typeof value === "number" ? value.toLocaleString("pt-BR") : value}{suffix && <span className="ml-1 text-sm font-medium text-[color:var(--theme-muted)]">{suffix}</span>}</>} hint={hint} icon={null} accent="blue" className={className} />;
  return href ? <Link href={href} className="block rounded-[14px] transition-colors hover:bg-[color:var(--theme-surface-alt)]" aria-label={`Ver ${label.toLowerCase()}`}>{card}</Link> : card;
}
