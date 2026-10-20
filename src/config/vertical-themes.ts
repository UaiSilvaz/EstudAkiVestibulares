import type { CSSProperties } from "react";

export type StudyVertical =
  | "vestibular"
  | "oab"
  | "concursos"
  | "policia-civil"
  | "policia-militar"
  | "militares"
  | "medicina";

export type LegacyVerticalSlug = "policial" | "militar" | "tecnico";
export type VerticalSlug = StudyVertical | LegacyVerticalSlug;

export type GamificationIntensity = "high" | "medium" | "low";

export type VerticalTheme = {
  id: StudyVertical;
  aliases?: VerticalSlug[];
  name: string;
  shortName: string;
  description: string;
  personality: string;
  subjects: { slug: string; name: string }[];
  exams: { slug: string; name: string }[];
  features: {
    essay: boolean;
    syllabus: boolean;
    gamification: boolean;
  };
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    accentSoft: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  };
  gradients: {
    hero: string;
    card: string;
    progress: string;
    sidebar: string;
    stat: string;
    ambientA: string;
    ambientB: string;
  };
  ui: {
    borderRadius: string;
    cardRadius: string;
    buttonRadius: string;
    shadow: string;
    shadowIntensity: string;
    gamificationIntensity: GamificationIntensity;
    density: "playful" | "balanced" | "focused";
  };
  imagery: {
    heroType: string;
    pattern: string;
    iconStyle: string;
    backgroundImage: string;
    backgroundOpacity: string;
  };
  copy: {
    dashboardKicker: string;
    heroTitle: string;
    heroDescription: string;
    todayPlan: string;
    streakLabel: string;
    progressLabel: string;
    primaryCta: string;
    secondaryCta: string;
  };
};

const schoolSubjects = [
  { slug: "matematica", name: "Matemática" },
  { slug: "linguagens", name: "Linguagens" },
  { slug: "biologia", name: "Biologia" },
  { slug: "quimica", name: "Química" },
  { slug: "fisica", name: "Física" },
  { slug: "ciencias-humanas", name: "Ciências Humanas" },
  { slug: "redacao", name: "Redação" },
];

const legalSubjects = [
  { slug: "etica", name: "Etica profissional" },
  { slug: "direito-constitucional", name: "Direito Constitucional" },
  { slug: "direito-civil", name: "Direito Civil" },
  { slug: "processo-civil", name: "Processo Civil" },
  { slug: "direito-penal", name: "Direito Penal" },
  { slug: "processo-penal", name: "Processo Penal" },
  { slug: "direito-trabalho", name: "Direito do Trabalho" },
  { slug: "direito-administrativo", name: "Direito Administrativo" },
];

const publicSubjects = [
  { slug: "portugues", name: "Português" },
  { slug: "raciocinio-logico", name: "Raciocínio lógico" },
  { slug: "informatica", name: "Informática" },
  { slug: "direito-constitucional", name: "Direito Constitucional" },
  { slug: "direito-administrativo", name: "Direito Administrativo" },
  { slug: "conhecimentos-especificos", name: "Conhecimentos especificos" },
];

const policeSubjects = [
  ...publicSubjects,
  { slug: "direito-penal", name: "Direito Penal" },
  { slug: "processo-penal", name: "Processo Penal" },
  { slug: "legislacao-especial", name: "Legislacao Especial" },
  { slug: "direitos-humanos", name: "Direitos Humanos" },
];

export const verticalThemes = {
  vestibular: {
    id: "vestibular",
    aliases: ["tecnico"],
    name: "Vestibulares",
    shortName: "Vestibulares",
    description: "Seu caminho até a universidade.",
    personality: "energetic",
    subjects: schoolSubjects,
    exams: [
      { slug: "enem", name: "ENEM" },
      { slug: "fuvest", name: "FUVEST" },
      { slug: "unesp", name: "UNESP" },
      { slug: "unicamp", name: "UNICAMP" },
      { slug: "fatec", name: "FATEC" },
      { slug: "etec", name: "ETEC" },
      { slug: "provao-paulista", name: "Provao Paulista" },
    ],
    features: { essay: true, syllabus: false, gamification: true },
    colors: {
      primary: "#2524EB",
      primaryDark: "#141878",
      secondary: "#6C76FF",
      accent: "#4066E8",
      accentSoft: "#EFEEFF",
      background: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceAlt: "#EFEEFF",
      text: "#172033",
      muted: "#626D82",
      border: "#E3E6EE",
      success: "#157553",
      warning: "#946C22",
      danger: "#B33A47",
    },
    gradients: {
      hero: "linear-gradient(125deg, #2524EB, #141878)",
      card: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      progress: "linear-gradient(90deg, #2524EB, #6C76FF)",
      sidebar: "linear-gradient(165deg, #2524EB, #141878)",
      stat: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      ambientA: "transparent",
      ambientB: "transparent",
    },
    ui: {
      borderRadius: "12px",
      cardRadius: "20px",
      buttonRadius: "10px",
      shadow: "0 4px 20px rgba(23,32,51,0.035)",
      shadowIntensity: "subtle",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "floating-icons",
      pattern: "playful-dots",
      iconStyle: "line",
      backgroundImage: "/assets/themes/vestibular/playful-dots.svg",
      backgroundOpacity: "0",
    },
    copy: {
      dashboardKicker: "Seu próximo passo",
      heroTitle: "Vamos evoluir no seu plano.",
      heroDescription: "Seu foco de hoje está pronto para virar progresso real.",
      todayPlan: "Plano do dia",
      streakLabel: "Sequência",
      progressLabel: "Evolução",
      primaryCta: "Começar agora",
      secondaryCta: "Ver plano do dia",
    },
  },
  oab: {
    id: "oab",
    name: "OAB",
    shortName: "OAB",
    description: "Seu caminho até a aprovação na OAB.",
    personality: "serious",
    subjects: legalSubjects,
    exams: [
      { slug: "oab-1-fase", name: "OAB 1a fase" },
      { slug: "oab-2-fase", name: "OAB 2a fase" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#AF2944",
      primaryDark: "#641A30",
      secondary: "#CE5369",
      accent: "#AF2944",
      accentSoft: "#FFF0F2",
      background: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceAlt: "#FFF0F2",
      text: "#172033",
      muted: "#626D82",
      border: "#E3E6EE",
      success: "#157553",
      warning: "#946C22",
      danger: "#B33A47",
    },
    gradients: {
      hero: "linear-gradient(125deg, #AF2944, #641A30)",
      card: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      progress: "linear-gradient(90deg, #AF2944, #CE5369)",
      sidebar: "linear-gradient(165deg, #AF2944, #641A30)",
      stat: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      ambientA: "transparent",
      ambientB: "transparent",
    },
    ui: {
      borderRadius: "12px",
      cardRadius: "20px",
      buttonRadius: "10px",
      shadow: "0 4px 20px rgba(23,32,51,0.035)",
      shadowIntensity: "subtle",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "legal-lines",
      pattern: "legal-pattern",
      iconStyle: "line",
      backgroundImage: "/assets/themes/oab/hero.png",
      backgroundOpacity: "0",
    },
    copy: {
      dashboardKicker: "Próxima ação",
      heroTitle: "Seu caminho até a aprovação na OAB.",
      heroDescription: "Continue avançando no conteúdo essencial para a 1ª fase.",
      todayPlan: "Preparação de hoje",
      streakLabel: "Sequência de estudos",
      progressLabel: "Avanco",
      primaryCta: "Praticar agora",
      secondaryCta: "Ver plano",
    },
  },
  concursos: {
    id: "concursos",
    name: "Concursos públicos",
    shortName: "Concursos",
    description: "Seu edital, suas prioridades, seu ritmo.",
    personality: "focused",
    subjects: publicSubjects,
    exams: [
      { slug: "concursos-publicos", name: "Concurso público" },
      { slug: "concursos-municipais", name: "Concurso municipal" },
      { slug: "concursos-juridicos", name: "Concurso juridico" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#344D83",
      primaryDark: "#1B2B50",
      secondary: "#6176A3",
      accent: "#9A7840",
      accentSoft: "#EEF2FA",
      background: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceAlt: "#EEF2FA",
      text: "#172033",
      muted: "#626D82",
      border: "#E3E6EE",
      success: "#157553",
      warning: "#946C22",
      danger: "#B33A47",
    },
    gradients: {
      hero: "linear-gradient(125deg, #344D83, #1B2B50)",
      card: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      progress: "linear-gradient(90deg, #344D83, #6176A3)",
      sidebar: "linear-gradient(165deg, #344D83, #1B2B50)",
      stat: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      ambientA: "transparent",
      ambientB: "transparent",
    },
    ui: {
      borderRadius: "12px",
      cardRadius: "20px",
      buttonRadius: "10px",
      shadow: "0 4px 20px rgba(23,32,51,0.035)",
      shadowIntensity: "subtle",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "institutional-grid",
      pattern: "strategic-grid",
      iconStyle: "line",
      backgroundImage: "/assets/themes/concursos/institutional-grid.svg",
      backgroundOpacity: "0",
    },
    copy: {
      dashboardKicker: "Próxima prioridade",
      heroTitle: "Organização e estratégia para o edital.",
      heroDescription: "Você possui blocos planejados para manter constância.",
      todayPlan: "Plano de hoje",
      streakLabel: "Constância",
      progressLabel: "Evolução",
      primaryCta: "Resolver questões",
      secondaryCta: "Continuar cronograma",
    },
  },
  "policia-civil": {
    id: "policia-civil",
    aliases: ["policial"],
    name: "Polícia Civil",
    shortName: "Polícia Civil",
    description: "Inteligência, investigação e preparação.",
    personality: "investigative",
    subjects: policeSubjects,
    exams: [
      { slug: "policia-civil", name: "Polícia Civil" },
      { slug: "pc-sp", name: "PC-SP" },
      { slug: "pc-mg", name: "PC-MG" },
      { slug: "pc-pr", name: "PC-PR" },
      { slug: "pc-go", name: "PC-GO" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#343A46",
      primaryDark: "#171B23",
      secondary: "#646D7D",
      accent: "#6C7482",
      accentSoft: "#F0F1F4",
      background: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceAlt: "#F0F1F4",
      text: "#172033",
      muted: "#626D82",
      border: "#E3E6EE",
      success: "#157553",
      warning: "#946C22",
      danger: "#B33A47",
    },
    gradients: {
      hero: "linear-gradient(125deg, #343A46, #171B23)",
      card: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      progress: "linear-gradient(90deg, #343A46, #646D7D)",
      sidebar: "linear-gradient(165deg, #343A46, #171B23)",
      stat: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      ambientA: "transparent",
      ambientB: "transparent",
    },
    ui: {
      borderRadius: "12px",
      cardRadius: "20px",
      buttonRadius: "10px",
      shadow: "0 4px 20px rgba(23,32,51,0.035)",
      shadowIntensity: "subtle",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "investigation-grid",
      pattern: "technical-grid",
      iconStyle: "line",
      backgroundImage: "/assets/themes/policia-civil/hero.png",
      backgroundOpacity: "0",
    },
    copy: {
      dashboardKicker: "Treino de hoje",
      heroTitle: "Preparação Polícia Civil.",
      heroDescription: "Avance mais uma etapa da preparação para Investigador.",
      todayPlan: "Treino de hoje",
      streakLabel: "Constância",
      progressLabel: "Edital coberto",
      primaryCta: "Iniciar treino",
      secondaryCta: "Ver plano",
    },
  },
  "policia-militar": {
    id: "policia-militar",
    name: "Polícia Militar",
    shortName: "PM",
    description: "Disciplina, constância e objetivo.",
    personality: "disciplined",
    subjects: policeSubjects,
    exams: [
      { slug: "policia-militar", name: "Polícia Militar" },
      { slug: "pm-sp", name: "PM-SP" },
      { slug: "pm-mg", name: "PM-MG" },
      { slug: "pm-pr", name: "PM-PR" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#2C3038",
      primaryDark: "#13161B",
      secondary: "#606874",
      accent: "#737B88",
      accentSoft: "#F0F1F3",
      background: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceAlt: "#F0F1F3",
      text: "#172033",
      muted: "#626D82",
      border: "#E3E6EE",
      success: "#157553",
      warning: "#946C22",
      danger: "#B33A47",
    },
    gradients: {
      hero: "linear-gradient(125deg, #2C3038, #13161B)",
      card: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      progress: "linear-gradient(90deg, #2C3038, #606874)",
      sidebar: "linear-gradient(165deg, #2C3038, #13161B)",
      stat: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      ambientA: "transparent",
      ambientB: "transparent",
    },
    ui: {
      borderRadius: "12px",
      cardRadius: "20px",
      buttonRadius: "10px",
      shadow: "0 4px 20px rgba(23,32,51,0.035)",
      shadowIntensity: "subtle",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "tactical-lines",
      pattern: "tactical-lines",
      iconStyle: "line",
      backgroundImage: "/assets/themes/policia-militar/tactical-lines.svg",
      backgroundOpacity: "0",
    },
    copy: {
      dashboardKicker: "Missão de hoje",
      heroTitle: "Conclua seu bloco de treinamento diário.",
      heroDescription: "Complete seu bloco diário e mantenha sua constância.",
      todayPlan: "Missão do dia",
      streakLabel: "Constância",
      progressLabel: "Evolução",
      primaryCta: "Iniciar missão",
      secondaryCta: "Ver plano",
    },
  },
  militares: {
    id: "militares",
    aliases: ["militar"],
    name: "Carreiras militares",
    shortName: "Militares",
    description: "Excelência, disciplina e prestígio.",
    personality: "disciplined",
    subjects: schoolSubjects.filter((subject) => subject.slug !== "redacao"),
    exams: [
      { slug: "esa", name: "ESA" },
      { slug: "espcex", name: "EsPCEx" },
      { slug: "afa", name: "AFA" },
      { slug: "eear", name: "EEAR" },
      { slug: "ime", name: "IME" },
      { slug: "ita", name: "ITA" },
      { slug: "marinha", name: "Marinha" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#394D52",
      primaryDark: "#1A2B30",
      secondary: "#667F85",
      accent: "#8C794F",
      accentSoft: "#EDF3F3",
      background: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceAlt: "#EDF3F3",
      text: "#172033",
      muted: "#626D82",
      border: "#E3E6EE",
      success: "#157553",
      warning: "#946C22",
      danger: "#B33A47",
    },
    gradients: {
      hero: "linear-gradient(125deg, #394D52, #1A2B30)",
      card: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      progress: "linear-gradient(90deg, #394D52, #667F85)",
      sidebar: "linear-gradient(165deg, #394D52, #1A2B30)",
      stat: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      ambientA: "transparent",
      ambientB: "transparent",
    },
    ui: {
      borderRadius: "12px",
      cardRadius: "20px",
      buttonRadius: "10px",
      shadow: "0 4px 20px rgba(23,32,51,0.035)",
      shadowIntensity: "subtle",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "academy-lines",
      pattern: "prestige-grid",
      iconStyle: "line",
      backgroundImage: "/assets/themes/militares/academy-lines.svg",
      backgroundOpacity: "0",
    },
    copy: {
      dashboardKicker: "Treino de hoje",
      heroTitle: "Disciplina academica para sua carreira militar.",
      heroDescription: "Mantenha a rota de estudos com precisão e constância.",
      todayPlan: "Plano de treinamento",
      streakLabel: "Constância",
      progressLabel: "Evolução",
      primaryCta: "Iniciar treino",
      secondaryCta: "Ver plano",
    },
  },
  medicina: {
    id: "medicina",
    name: "Medicina",
    shortName: "Medicina",
    description: "Ciência, precisão e tecnologia.",
    personality: "technical",
    subjects: schoolSubjects,
    exams: [
      { slug: "medicina-enem", name: "Medicina pelo ENEM" },
      { slug: "medicina-fuvest", name: "Medicina FUVEST" },
      { slug: "medicina-unesp", name: "Medicina UNESP" },
      { slug: "medicina-unicamp", name: "Medicina UNICAMP" },
      { slug: "residencia-medica", name: "Residencia medica" },
    ],
    features: { essay: true, syllabus: false, gamification: false },
    colors: {
      primary: "#087C73",
      primaryDark: "#084E50",
      secondary: "#239E94",
      accent: "#087C73",
      accentSoft: "#E9F7F4",
      background: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceAlt: "#E9F7F4",
      text: "#172033",
      muted: "#626D82",
      border: "#E3E6EE",
      success: "#157553",
      warning: "#946C22",
      danger: "#B33A47",
    },
    gradients: {
      hero: "linear-gradient(125deg, #087C73, #084E50)",
      card: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      progress: "linear-gradient(90deg, #087C73, #239E94)",
      sidebar: "linear-gradient(165deg, #087C73, #084E50)",
      stat: "linear-gradient(0deg, #FFFFFF, #FFFFFF)",
      ambientA: "transparent",
      ambientB: "transparent",
    },
    ui: {
      borderRadius: "12px",
      cardRadius: "20px",
      buttonRadius: "10px",
      shadow: "0 4px 20px rgba(23,32,51,0.035)",
      shadowIntensity: "subtle",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "clinical-network",
      pattern: "molecule-lines",
      iconStyle: "line",
      backgroundImage: "/assets/themes/medicina/hero.png",
      backgroundOpacity: "0",
    },
    copy: {
      dashboardKicker: "Seu próximo passo",
      heroTitle: "Precisão científica para sua aprovação.",
      heroDescription: "Avance com foco em desempenho, revisão e diagnóstico.",
      todayPlan: "Plano clinico",
      streakLabel: "Constância",
      progressLabel: "Evolução",
      primaryCta: "Continuar estudo",
      secondaryCta: "Ver plano",
    },
  },
} satisfies Record<StudyVertical, VerticalTheme>;

const aliasMap = new Map<VerticalSlug, StudyVertical>();

for (const [id, theme] of Object.entries(verticalThemes) as Array<[StudyVertical, VerticalTheme]>) {
  aliasMap.set(id, id);
  for (const alias of theme.aliases ?? []) {
    aliasMap.set(alias, id);
  }
}

export const canonicalVerticalSlugs = Object.keys(verticalThemes) as StudyVertical[];

export function normalizeVerticalSlug(slug: string | null | undefined): StudyVertical {
  if (!slug) return "vestibular";
  return aliasMap.get(slug as VerticalSlug) ?? "vestibular";
}

export function getVerticalTheme(slug: string | null | undefined): VerticalTheme {
  const theme = verticalThemes[normalizeVerticalSlug(slug)];
  return {
    ...theme,
    colors: { ...theme.colors, ...norteColors },
    gradients: {
      ...theme.gradients,
      hero: "linear-gradient(125deg, #C94D00, #FF6201)",
      card: "linear-gradient(125deg, #FF6201, #B84000)",
      progress: "linear-gradient(90deg, #FF6201, #FF9B62)",
      sidebar: "linear-gradient(165deg, #FF6201, #C94D00)",
      stat: "linear-gradient(125deg, #FFF4ED, #FFFFFF)",
      ambientA: "rgba(255,98,1,.09)",
      ambientB: "rgba(39,43,49,.07)",
    },
  };
}

export type ThemeMode = "light" | "dark";

const norteColors = {
  primary: "#FF6201",
  primaryDark: "#B84000",
  secondary: "#272B31",
  accent: "#FF6201",
  accentSoft: "#FFF0E7",
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#FFF4ED",
  text: "#101216",
  muted: "#62676F",
  border: "#E4E5E8",
};

export function getVerticalPalette(slug: string | null | undefined, mode: ThemeMode = "light"): VerticalTheme["colors"] {
  const theme = getVerticalTheme(slug);
  if (mode === "light") return theme.colors;
  return {
    ...theme.colors, primary: "#FF6201", primaryDark: "#FF6201", secondary: "#FF9B62",
    background: "#000000", surface: "#0C0C0C", surfaceAlt: "#171717",
    text: "#F5F6F8", muted: "#ADB2B8", border: "#303030",
    accent: "#FF6201", accentSoft: "#25170F", success: "#80D9B6", warning: "#E5C688", danger: "#F49DAE",
  };
}

export function verticalThemeStyle(slug: string | null | undefined, mode: ThemeMode = "light"): CSSProperties {
  const theme = getVerticalTheme(slug);
  const colors = getVerticalPalette(slug, mode);
  const solid = (color: string) => `linear-gradient(0deg, ${color}, ${color})`;
  const neutral = solid(colors.surface);
  const iconSurface = solid(colors.surfaceAlt);
  const hero = mode === "dark" ? solid("#000000") : theme.gradients.hero;
  const sidebar = mode === "dark" ? solid("#000000") : theme.gradients.sidebar;
  const accents = {
    focus: solid(colors.surface), league: neutral,
    heroDark: hero, cardDark: hero,
    statBlue: neutral, statOrange: neutral, statGreen: neutral, statPink: neutral,
    statYellow: neutral, statPurple: neutral, statRed: neutral, statCyan: neutral,
    iconHome: iconSurface, iconPlan: iconSurface, iconLessons: iconSurface,
    iconQuestions: iconSurface, iconMaterials: iconSurface, iconProgress: iconSurface,
    iconCommunity: iconSurface, iconSettings: iconSurface, iconLogout: iconSurface,
    iconAdmin: iconSurface, iconFilter: "none", iconFilterDark: "none",
  };

  return {
    "--brand-blue": "#FF6201",
    "--theme-sidebar-bg": mode === "dark" ? "#000000" : "#FF6201",
    "--theme-sidebar-gradient": sidebar,
    "--theme-hero-bg": hero,
    "--theme-grid-line": "rgba(255,255,255,0.09)",
    "--theme-mode": mode,
    "--theme-action-bg": mode === "dark" ? "#B84000" : "#C94D00",
    "--theme-on-action": "#FFFFFF",
    "--primary": colors.primary,
    "--primary-light": colors.secondary,
    "--secondary": colors.secondary,
    "--accent": colors.accent,
    "--background": colors.background,
    "--foreground": colors.text,
    "--ink": colors.text,
    "--surface": colors.surface,
    "--muted": colors.muted,
    "--border": colors.border,
    "--success": colors.success,
    "--warning": colors.warning,
    "--danger": colors.danger,
    "--theme-primary": colors.primary,
    "--theme-primary-dark": colors.primaryDark,
    "--theme-secondary": colors.secondary,
    "--theme-accent": colors.accent,
    "--theme-accent-soft": colors.accentSoft,
    "--theme-background": colors.background,
    "--theme-surface": colors.surface,
    "--theme-surface-alt": colors.surfaceAlt,
    "--theme-text": colors.text,
    "--theme-muted": colors.muted,
    "--theme-border": colors.border,
    "--theme-success": colors.success,
    "--theme-warning": colors.warning,
    "--theme-danger": colors.danger,
    "--theme-gradient-hero": hero,
    "--theme-gradient-card": "linear-gradient(125deg, #FF6201, #B84000)",
    "--theme-gradient-progress": "linear-gradient(90deg, #FF6201, #FF9B62)",
    "--theme-gradient-sidebar": sidebar,
    "--theme-gradient-stat": theme.gradients.stat,
    "--theme-gradient-focus": accents.focus,
    "--theme-gradient-league": accents.league,
    "--theme-gradient-hero-dark": accents.heroDark,
    "--theme-gradient-card-dark": accents.cardDark,
    "--theme-stat-blue": accents.statBlue,
    "--theme-stat-orange": accents.statOrange,
    "--theme-stat-green": accents.statGreen,
    "--theme-stat-pink": accents.statPink,
    "--theme-stat-yellow": accents.statYellow,
    "--theme-stat-purple": accents.statPurple,
    "--theme-stat-red": accents.statRed,
    "--theme-stat-cyan": accents.statCyan,
    "--theme-icon-home": accents.iconHome,
    "--theme-icon-plan": accents.iconPlan,
    "--theme-icon-lessons": accents.iconLessons,
    "--theme-icon-questions": accents.iconQuestions,
    "--theme-icon-materials": accents.iconMaterials,
    "--theme-icon-progress": accents.iconProgress,
    "--theme-icon-community": accents.iconCommunity,
    "--theme-icon-settings": accents.iconSettings,
    "--theme-icon-logout": accents.iconLogout,
    "--theme-icon-admin": accents.iconAdmin,
    "--theme-sidebar-icon-filter": accents.iconFilter,
    "--theme-sidebar-icon-filter-dark": accents.iconFilterDark,
    "--theme-ambient-a": theme.gradients.ambientA,
    "--theme-ambient-b": theme.gradients.ambientB,
    "--theme-radius": theme.ui.borderRadius,
    "--theme-card-radius": theme.ui.cardRadius,
    "--theme-button-radius": theme.ui.buttonRadius,
    "--theme-shadow": theme.ui.shadow,
    "--theme-background-image": "none",
    "--theme-background-opacity": 0,
  } as CSSProperties;
}
