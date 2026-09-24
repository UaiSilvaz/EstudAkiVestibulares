import type { CSSProperties } from "react";

export const tracks = {
  vestibulares: { name: "Vestibulares", vertical: "vestibular", description: "Seu caminho até a universidade.", brand: "#5868F0", dark: "#414FC5", soft: "#EEF1FF", secondary: "#7B59F3", highlight: "#18B5C5", night: "#93B4FF" },
  enem: { name: "ENEM", vertical: "vestibular", description: "Uma preparação completa para o seu próximo passo.", brand: "#0F8B69", dark: "#09644D", soft: "#EAF8F1", secondary: "#17A27F", highlight: "#D9B53F", night: "#6EE7B7" },
  medicina: { name: "Medicina", vertical: "medicina", description: "Conhecimento e constância para chegar mais longe.", brand: "#137CAF", dark: "#0D5A80", soft: "#EBF7FC", secondary: "#11A58E", highlight: "#4CA2E8", night: "#7DD3FC" },
  oab: { name: "OAB", vertical: "oab", description: "Estratégia para cada etapa da sua aprovação.", brand: "#8C2940", dark: "#681D30", soft: "#FAEDF0", secondary: "#B13D53", highlight: "#C29958", night: "#FCA5A5" },
  policia: { name: "Carreiras policiais", vertical: "policia-civil", description: "Preparação com foco no seu edital.", brand: "#173A68", dark: "#0D274B", soft: "#EAF0F8", secondary: "#284C7C", highlight: "#4B7EE1", night: "#93C5FD" },
  concursos: { name: "Concursos", vertical: "concursos", description: "Seu edital, suas prioridades, seu ritmo.", brand: "#A37311", dark: "#785409", soft: "#FBF4E2", secondary: "#C79225", highlight: "#314968", night: "#FDE68A" },
} as const;

export type TrackId = keyof typeof tracks;
export const trackIds = Object.keys(tracks) as TrackId[];

// ENEM is an exam within the existing vestibular vertical, not a new database vertical.
export function trackForPreparation(preparation?: { vertical: { slug: string }; examSlug: string | null } | null): TrackId {
  const vertical = preparation?.vertical.slug;
  if (vertical === "medicina" || vertical === "oab" || vertical === "concursos") return vertical;
  if (["policia-civil", "policia-militar", "policial", "militares", "militar"].includes(vertical ?? "")) return "policia";
  return preparation?.examSlug === "enem" ? "enem" : "vestibulares";
}

export function trackStyle(id: TrackId, dark = false): CSSProperties {
  const track = tracks[id];
  const brand = dark ? track.night : track.brand;
  const surface = dark ? "#0F1724" : "#FFFFFF";
  const soft = dark ? `color-mix(in srgb, ${track.brand} 18%, ${surface})` : track.soft;
  return {
    "--brand": brand, "--brand-button": track.brand, "--brand-dark": track.dark,
    "--brand-soft": soft, "--secondary": track.secondary, "--highlight": track.highlight,
    "--bg": dark ? "#080D15" : "#F4F6FB", "--surface": surface,
    "--surface-secondary": dark ? "#1C293C" : "#F1F4F8",
    "--text": dark ? "#F1F5F9" : "#101828", "--text-secondary": dark ? "#A9B7CB" : "#667085",
    "--border": dark ? "#2B394D" : "#E4E9F2",
    "--theme-primary": brand, "--theme-primary-dark": track.dark, "--theme-secondary": track.secondary,
    "--theme-accent": track.highlight, "--theme-accent-soft": soft,
    "--theme-background": "var(--bg)", "--theme-surface": surface, "--theme-surface-alt": "var(--surface-secondary)",
    "--theme-text": "var(--text)", "--theme-muted": "var(--text-secondary)", "--theme-border": "var(--border)",
    "--primary": brand, "--ink": "var(--text)", "--muted": "var(--text-secondary)",
    "--background": "var(--bg)", "--foreground": "var(--text)", "--card": surface, "--line": "var(--border)",
    "--theme-radius": "16px", "--theme-card-radius": "20px", "--theme-button-radius": "12px",
    "--theme-shadow": "0 16px 36px -28px #12203935", "--theme-background-image": "none", "--theme-background-opacity": "0",
    "--theme-gradient-sidebar": track.dark, "--theme-gradient-stat": track.brand,
    "--theme-gradient-progress": track.brand, "--theme-gradient-hero": surface, "--theme-gradient-card": surface,
  } as CSSProperties;
}
