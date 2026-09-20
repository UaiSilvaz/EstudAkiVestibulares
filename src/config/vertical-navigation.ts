import type { StudyVertical } from "@/config/vertical-themes";

export type NavigationChildConfig = {
  href: string;
  label: string;
  exact?: boolean;
  badge?: string;
};

export type NavigationItemConfig = {
  id: string;
  label: string;
  icon: string;
  href?: string;
  exact?: boolean;
  children?: NavigationChildConfig[];
};

const sharedNavigation: NavigationItemConfig[] = [
  { id: "home", label: "Inicio", icon: "home", href: "/dashboard" },
  {
    id: "plan",
    label: "Meu Plano",
    icon: "plan",
    children: [
      { href: "/trilhas", label: "Jornada" },
      { href: "/cronograma", label: "Cronograma" },
      { href: "/diagnostico", label: "Diagnostico" },
    ],
  },
  {
    id: "study",
    label: "Estudar",
    icon: "lessons",
    children: [
      { href: "/cursos", label: "Meus Cursos", badge: "Novo" },
      { href: "/materials", label: "Materiais" },
      { href: "/flashcards", label: "Flashcards" },
    ],
  },
  {
    id: "practice",
    label: "Praticar",
    icon: "questions",
    children: [
      { href: "/questions", label: "Questoes" },
      { href: "/simulados", label: "Simulados" },
      { href: "/redacao", label: "Redacao" },
      { href: "/caderno-de-erros", label: "Caderno de Erros" },
    ],
  },
  {
    id: "progress",
    label: "Progresso",
    icon: "progress",
    children: [
      { href: "/performance", label: "Desempenho" },
      { href: "/radar", label: "Estatisticas" },
      { href: "/conquistas", label: "Conquistas" },
      { href: "/ranking", label: "Ranking" },
    ],
  },
  { id: "community", label: "Comunidade", icon: "community", href: "/community" },
];

export const verticalNavigationConfig = {
  vestibular: sharedNavigation,
  oab: sharedNavigation.map((item) =>
    item.id === "practice"
      ? {
          ...item,
          children: [
            { href: "/questions", label: "Questoes OAB" },
            { href: "/simulados", label: "Simulados OAB" },
            { href: "/redacao", label: "Redacao" },
            { href: "/caderno-de-erros", label: "Caderno de Erros" },
          ],
        }
      : item,
  ),
  concursos: sharedNavigation,
  "policia-civil": sharedNavigation,
  "policia-militar": sharedNavigation.map((item) =>
    item.id === "plan" ? { ...item, label: "Missao" } : item,
  ),
  militares: sharedNavigation.map((item) =>
    item.id === "plan" ? { ...item, label: "Treinamento" } : item,
  ),
  medicina: sharedNavigation,
} satisfies Record<StudyVertical, NavigationItemConfig[]>;

export function getVerticalNavigation(vertical: StudyVertical) {
  return verticalNavigationConfig[vertical] ?? verticalNavigationConfig.vestibular;
}
