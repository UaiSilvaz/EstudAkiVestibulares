import {
  Award,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileText,
  GraduationCap,
  Landmark,
  Scale,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";
import { progressionKindForObjective } from "@/lib/progression";

export type PreparationVertical =
  "Vestibulares" | "OAB" | "Concursos" | "Policial" | "Militares";

export type ObjectiveOption = {
  id: string;
  vertical: PreparationVertical;
  title: string;
  subtitle: string;
  examDateLabel: string;
  progress: number;
  href: string;
  icon: LucideIcon;
};

export type PlatformCourse = {
  slug: string;
  title: string;
  vertical: PreparationVertical;
  objective: string;
  discipline: string;
  teacher: string;
  level: "Base" | "Intermediário" | "Avançado" | "Reta final";
  lessons: number;
  duration: string;
  progress?: number;
  coverTone: "blue" | "orange" | "yellow" | "green" | "navy";
  summary: string;
};

export type ApprovalRouteStep = {
  title: string;
  description: string;
  status: "done" | "active" | "next";
  progress: number;
};

export type PreparationMatrixSubject = {
  subject: string;
  coverage: number;
  status: "Em dia" | "Atenção" | "Revisar" | "Não iniciado";
  topics: Array<{
    name: string;
    progress: number;
    status: "concluído" | "estudando" | "revisão pendente" | "não iniciado";
  }>;
};

export const objectiveOptions: ObjectiveOption[] = [
  {
    id: "enem-2026",
    vertical: "Vestibulares",
    title: "ENEM 2026",
    subtitle: "Ciência da Computação - USP",
    examDateLabel: "74 dias para a prova",
    progress: 72,
    href: "/dashboard",
    icon: GraduationCap,
  },
  {
    id: "medicina-2027",
    vertical: "Vestibulares",
    title: "Vestibulares - Medicina",
    subtitle: "Fuvest, Unicamp, Unesp e ENEM",
    examDateLabel: "Rota de alta concorrencia",
    progress: 54,
    href: "/preparacao",
    icon: GraduationCap,
  },
  {
    id: "oab-1-fase",
    vertical: "OAB",
    title: "OAB - 1ª fase",
    subtitle: "Disciplinas jurídicas e questões",
    examDateLabel: "Plano em estruturação",
    progress: 38,
    href: "/questions",
    icon: Scale,
  },
  {
    id: "tj-sp",
    vertical: "Concursos",
    title: "TJ-SP Escrevente",
    subtitle: "Banca Vunesp - edital previsto",
    examDateLabel: "Conteúdo 46% mapeado",
    progress: 46,
    href: "/cronograma",
    icon: Landmark,
  },
  {
    id: "pc-sp",
    vertical: "Policial",
    title: "Policia Civil SP",
    subtitle: "Delegado, investigador e escrivao",
    examDateLabel: "Edital monitorado",
    progress: 34,
    href: "/cronograma",
    icon: ShieldCheck,
  },
  {
    id: "esa-2027",
    vertical: "Militares",
    title: "ESA 2027",
    subtitle: "Matemática, Português e História",
    examDateLabel: "Rota inicial criada",
    progress: 29,
    href: "/trilhas",
    icon: ShieldCheck,
  },
];

function normalizeTarget(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function objectiveForTarget(target: string | null | undefined) {
  const normalized = normalizeTarget(target);

  if (!normalized) return objectiveOptions[0];

  const directMatch = objectiveOptions.find((objective) =>
    normalizeTarget(`${objective.title} ${objective.subtitle} ${objective.id}`)
      .includes(normalized),
  );
  if (directMatch) return directMatch;

  const kind = progressionKindForObjective(target);
  const byKind: Record<string, string> = {
    vestibular: normalized.includes("medicina") ? "medicina-2027" : "enem-2026",
    juridica: "oab-1-fase",
    concurso: "tj-sp",
    policial: "pc-sp",
    militar: "esa-2027",
    default: "enem-2026",
  };

  return (
    objectiveOptions.find((objective) => objective.id === byKind[kind]) ??
    objectiveOptions[0]
  );
}

export const platformCourses: PlatformCourse[] = [
  {
    slug: "enem-matematica-estrategica",
    title: "Matemática Estratégica para ENEM",
    vertical: "Vestibulares",
    objective: "ENEM 2026",
    discipline: "Matemática",
    teacher: "Prof. Rafael Nogueira",
    level: "Intermediário",
    lessons: 84,
    duration: "42h",
    progress: 72,
    coverTone: "blue",
    summary:
      "Funções, geometria, estatística e resolução orientada por prioridade TRI.",
  },
  {
    slug: "redacao-alta-performance",
    title: "Redação de Alta Performance",
    vertical: "Vestibulares",
    objective: "ENEM e vestibulares",
    discipline: "Redação",
    teacher: "Profa. Marina Alves",
    level: "Reta final",
    lessons: 36,
    duration: "18h",
    progress: 41,
    coverTone: "orange",
    summary:
      "Competências, repertório, correções guiadas e treino por eixo temático.",
  },
  {
    slug: "oab-constitucional-questoes",
    title: "Direito Constitucional por Questões",
    vertical: "OAB",
    objective: "OAB - 1ª fase",
    discipline: "Constitucional",
    teacher: "Prof. André Moraes",
    level: "Base",
    lessons: 52,
    duration: "26h",
    coverTone: "yellow",
    summary:
      "Teoria objetiva com ciclos de questões, revisão e jurisprudência essencial.",
  },
  {
    slug: "concursos-portugues-bancas",
    title: "Português para Bancas",
    vertical: "Concursos",
    objective: "Tribunais e área administrativa",
    discipline: "Português",
    teacher: "Profa. Camila Rocha",
    level: "Avançado",
    lessons: 68,
    duration: "34h",
    coverTone: "green",
    summary:
      "Interpretação, gramática e padrões de cobrança por banca organizados em rota.",
  },
  {
    slug: "policia-civil-portugues-direito",
    title: "Policia Civil: Portugues, Direito e Atualidades",
    vertical: "Policial",
    objective: "Policia Civil SP",
    discipline: "Conhecimentos gerais",
    teacher: "Prof. Diego Martins",
    level: "Intermediário",
    lessons: 64,
    duration: "32h",
    progress: 18,
    coverTone: "navy",
    summary:
      "Rota por cargo com portugues, direito constitucional, administrativo, penal e simulados por banca.",
  },
  {
    slug: "esa-matematica-fundamentos",
    title: "ESA - Matemática de Fundamentos",
    vertical: "Militares",
    objective: "ESA 2027",
    discipline: "Matemática",
    teacher: "Prof. Bruno Reis",
    level: "Base",
    lessons: 76,
    duration: "38h",
    coverTone: "blue",
    summary:
      "Base algébrica, funções, geometria plana e treino progressivo para militares.",
  },
];

export const approvalRoute: ApprovalRouteStep[] = [
  {
    title: "Fundamentos",
    description: "Base teórica e diagnóstico inicial",
    status: "done",
    progress: 100,
  },
  {
    title: "Intermediário",
    description: "Assuntos recorrentes e listas guiadas",
    status: "active",
    progress: 68,
  },
  {
    title: "Avançado",
    description: "Questões difíceis e combinação de habilidades",
    status: "next",
    progress: 22,
  },
  {
    title: "Simulados",
    description: "Provas completas com análise de tempo",
    status: "next",
    progress: 0,
  },
  {
    title: "Reta final",
    description: "Revisão, caderno de erros e prioridades finais",
    status: "next",
    progress: 0,
  },
];

export const verticalQuickFilters = [
  { label: "Vestibulares", icon: GraduationCap },
  { label: "OAB", icon: Scale },
  { label: "Concursos", icon: Building2 },
  { label: "Policial", icon: ShieldCheck },
  { label: "Militares", icon: ShieldCheck },
] as const;

export const commandMenuPreview = [
  {
    label: "Começar meus estudos",
    href: "/estudar",
    icon: BookOpenCheck,
  },
  {
    label: "Abrir Radar da Prova",
    href: "/radar",
    icon: Target,
  },
  {
    label: "Ver Edital Inteligente",
    href: "/edital",
    icon: FileText,
  },
  {
    label: "Estudar leis",
    href: "/leis",
    icon: Scale,
  },
  {
    label: "Questões recomendadas",
    href: "/questions?vestibular=enem",
    icon: ClipboardList,
  },
  {
    label: "Abrir caderno de erros",
    href: "/questions?vestibular=enem&mode=errors",
    icon: FileText,
  },
  { label: "Ver desempenho", href: "/performance", icon: Target },
] as const;

export const verticalPositioning = [
  {
    title: "Vestibulares",
    description: "ENEM, Fuvest, Unesp, Unicamp, ETEC, FATEC e Medicina.",
    icon: GraduationCap,
  },
  {
    title: "OAB",
    description: "1ª fase, 2ª fase, disciplinas jurídicas, peças e simulados.",
    icon: Scale,
  },
  {
    title: "Concursos",
    description:
      "Tribunais, fiscal, administrativo, bancario, saude e carreiras publicas.",
    icon: Banknote,
  },
  {
    title: "Policial",
    description:
      "Policia Civil, PM, guarda municipal, delegado, investigador e escrivao.",
    icon: ShieldCheck,
  },
  {
    title: "Militares",
    description: "ESA, EsPCEx, AFA, EEAr, EPCAR, Colégio Naval, IME e ITA.",
    icon: Award,
  },
] as const;

export const preparationSignals = [
  { label: "Objetivo ativo", value: "ENEM 2026", icon: Target },
  { label: "Plano em dia", value: "72%", icon: BadgeCheck },
  { label: "Questões resolvidas", value: "482", icon: ClipboardList },
  { label: "Carga semanal", value: "11h", icon: BriefcaseBusiness },
] as const;

export const preparationMatrix: PreparationMatrixSubject[] = [
  {
    subject: "Matemática",
    coverage: 68,
    status: "Atenção",
    topics: [
      { name: "Funções", progress: 84, status: "concluído" },
      { name: "Geometria", progress: 61, status: "estudando" },
      { name: "Probabilidade", progress: 48, status: "revisão pendente" },
      { name: "Matemática financeira", progress: 80, status: "concluído" },
    ],
  },
  {
    subject: "Física",
    coverage: 54,
    status: "Revisar",
    topics: [
      { name: "Cinemática", progress: 72, status: "revisão pendente" },
      { name: "Eletrodinâmica", progress: 42, status: "estudando" },
      { name: "Termologia", progress: 35, status: "não iniciado" },
    ],
  },
  {
    subject: "Química",
    coverage: 63,
    status: "Atenção",
    topics: [
      { name: "Estequiometria", progress: 58, status: "estudando" },
      { name: "Ligações químicas", progress: 78, status: "concluído" },
      { name: "Química orgânica", progress: 44, status: "não iniciado" },
    ],
  },
  {
    subject: "Linguagens",
    coverage: 76,
    status: "Em dia",
    topics: [
      { name: "Interpretação", progress: 82, status: "concluído" },
      { name: "Literatura", progress: 66, status: "estudando" },
      { name: "Gramática aplicada", progress: 71, status: "concluído" },
    ],
  },
];

export const preparationEvents = [
  {
    date: "08/11/2026",
    title: "ENEM - 1º dia",
    detail: "Linguagens, Humanas e Redação",
  },
  {
    date: "15/11/2026",
    title: "ENEM - 2º dia",
    detail: "Matemática e Natureza",
  },
  {
    date: "30/09/2026",
    title: "Simulado completo",
    detail: "Modelo TRI e análise por área",
  },
] as const;
