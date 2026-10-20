"use client";
import { useState } from "react";
import { canonicalVerticalSlugs, getVerticalTheme, verticalThemeStyle, type StudyVertical } from "@/config/vertical-themes";
import { Brand } from "./brand";
import { useProductAppearance } from "./use-product-appearance";
import { DashboardPreviewContent } from "./dashboard/dashboard-preview-content";
import { Moon, Sun } from "lucide-react";
export function DevThemeLab() {
  const [selected,setSelected] = useState<StudyVertical>("vestibular");
  const {mode,toggleMode} = useProductAppearance();
  return <div className="professional-platform rounded-[20px] p-5 sm:p-8" data-vertical={selected} data-theme-mode={mode} style={verticalThemeStyle(selected,mode)}>
    <div className="mb-8 flex flex-wrap items-center justify-between gap-5"><Brand href="/dashboard" /><div className="flex flex-wrap gap-2"><select aria-label="Preparação da prévia" value={selected} onChange={event=>setSelected(event.target.value as StudyVertical)} className="rounded-lg border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-3 py-2 text-xs">{canonicalVerticalSlugs.map(slug=><option key={slug} value={slug}>{getVerticalTheme(slug).shortName}</option>)}</select><button type="button" onClick={toggleMode} className="product-icon-button" aria-label={mode === "light" ? "Modo escuro" : "Modo claro"}>{mode === "light" ? <Moon /> : <Sun />}</button></div></div>
    <DashboardPreviewContent slug={selected} />
  </div>;
}
