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
  { slug: "matematica", name: "Matematica" },
  { slug: "linguagens", name: "Linguagens" },
  { slug: "biologia", name: "Biologia" },
  { slug: "quimica", name: "Quimica" },
  { slug: "fisica", name: "Fisica" },
  { slug: "ciencias-humanas", name: "Ciencias Humanas" },
  { slug: "redacao", name: "Redacao" },
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
  { slug: "portugues", name: "Portugues" },
  { slug: "raciocinio-logico", name: "Raciocinio logico" },
  { slug: "informatica", name: "Informatica" },
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
    description: "Seu caminho ate a universidade.",
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
      primary: "#1463FF",
      primaryDark: "#0B43B8",
      secondary: "#1DAFE1",
      accent: "#FF9418",
      accentSoft: "#FFD21A",
      background: "#F7F9FC",
      surface: "#FFFFFF",
      surfaceAlt: "#EFF6FF",
      text: "#11182D",
      muted: "#64748B",
      border: "#DDE7F4",
      success: "#38D98A",
      warning: "#FF9418",
      danger: "#F832B8",
    },
    gradients: {
      hero: "linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 45%, #ECFEFF 100%)",
      card: "linear-gradient(135deg, #1463FF 0%, #1DAFE1 58%, #38D98A 100%)",
      progress: "linear-gradient(90deg, #1463FF 0%, #1DAFE1 52%, #38D98A 100%)",
      sidebar: "linear-gradient(135deg, #1E73FF 0%, #005CFF 55%, #00C896 100%)",
      stat: "linear-gradient(135deg, #1D9BF0 0%, #18B7F7 52%, #1DD7D0 100%)",
      ambientA: "rgba(34, 211, 238, 0.24)",
      ambientB: "rgba(167, 139, 250, 0.18)",
    },
    ui: {
      borderRadius: "20px",
      cardRadius: "28px",
      buttonRadius: "999px",
      shadow: "0 22px 52px -34px rgba(14,165,233,0.35)",
      shadowIntensity: "colorful",
      gamificationIntensity: "high",
      density: "playful",
    },
    imagery: {
      heroType: "floating-icons",
      pattern: "playful-dots",
      iconStyle: "rounded-vibrant",
      backgroundImage: "/assets/themes/vestibular/playful-dots.svg",
      backgroundOpacity: "0.18",
    },
    copy: {
      dashboardKicker: "Foco de hoje",
      heroTitle: "Vamos evoluir no seu plano.",
      heroDescription: "Seu foco de hoje esta pronto para virar progresso real.",
      todayPlan: "Plano do dia",
      streakLabel: "Sequencia",
      progressLabel: "Evolucao",
      primaryCta: "Comecar agora",
      secondaryCta: "Ver plano do dia",
    },
  },
  oab: {
    id: "oab",
    name: "OAB",
    shortName: "OAB",
    description: "Seu caminho ate a aprovacao na OAB.",
    personality: "serious",
    subjects: legalSubjects,
    exams: [
      { slug: "oab-1-fase", name: "OAB 1a fase" },
      { slug: "oab-2-fase", name: "OAB 2a fase" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#C91835",
      primaryDark: "#690D1E",
      secondary: "#E11D48",
      accent: "#111217",
      accentSoft: "#FFE3E8",
      background: "#FFF7F8",
      surface: "#FFFFFF",
      surfaceAlt: "#FFE9EE",
      text: "#171014",
      muted: "#6E525A",
      border: "#F0B9C4",
      success: "#168A5A",
      warning: "#B45309",
      danger: "#E11D48",
    },
    gradients: {
      hero: "linear-gradient(135deg, #FFFFFF 0%, #FFE9EE 52%, #FFD6DF 100%)",
      card: "linear-gradient(135deg, #FFFFFF 0%, #FFF2F4 52%, #FFE3E8 100%)",
      progress: "linear-gradient(90deg, #C91835 0%, #E11D48 56%, #690D1E 100%)",
      sidebar: "linear-gradient(135deg, #690D1E 0%, #C91835 56%, #E11D48 100%)",
      stat: "linear-gradient(135deg, #9F1239 0%, #C91835 54%, #690D1E 100%)",
      ambientA: "rgba(225, 29, 72, 0.18)",
      ambientB: "rgba(105, 13, 30, 0.10)",
    },
    ui: {
      borderRadius: "16px",
      cardRadius: "22px",
      buttonRadius: "14px",
      shadow: "0 20px 46px -32px rgba(11,31,58,0.34)",
      shadowIntensity: "elegant",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "legal-lines",
      pattern: "legal-pattern",
      iconStyle: "line-gold",
      backgroundImage: "/assets/themes/oab/hero.png",
      backgroundOpacity: "0.10",
    },
    copy: {
      dashboardKicker: "Preparacao de hoje",
      heroTitle: "Seu caminho ate a aprovacao na OAB.",
      heroDescription: "Continue avancando no conteudo essencial para a 1a fase.",
      todayPlan: "Preparacao de hoje",
      streakLabel: "Sequencia de estudos",
      progressLabel: "Avanco",
      primaryCta: "Continuar estudo",
      secondaryCta: "Ver plano",
    },
  },
  concursos: {
    id: "concursos",
    name: "Concursos publicos",
    shortName: "Concursos",
    description: "Seu edital, suas prioridades, seu ritmo.",
    personality: "focused",
    subjects: publicSubjects,
    exams: [
      { slug: "concursos-publicos", name: "Concurso publico" },
      { slug: "concursos-municipais", name: "Concurso municipal" },
      { slug: "concursos-juridicos", name: "Concurso juridico" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#173B65",
      primaryDark: "#102A49",
      secondary: "#245B8F",
      accent: "#D5A72D",
      accentSoft: "#178A8A",
      background: "#F5F7FA",
      surface: "#FFFFFF",
      surfaceAlt: "#EEF4FA",
      text: "#152033",
      muted: "#6C7686",
      border: "#DCE5EE",
      success: "#178A8A",
      warning: "#A87512",
      danger: "#B33A47",
    },
    gradients: {
      hero: "linear-gradient(135deg, #173B65 0%, #245B8F 72%, #178A8A 100%)",
      card: "linear-gradient(135deg, #FFFFFF 0%, #EEF4FA 100%)",
      progress: "linear-gradient(90deg, #173B65 0%, #245B8F 65%, #178A8A 100%)",
      sidebar: "linear-gradient(135deg, #173B65 0%, #245B8F 100%)",
      stat: "linear-gradient(135deg, #173B65 0%, #245B8F 74%, #178A8A 100%)",
      ambientA: "rgba(36, 91, 143, 0.16)",
      ambientB: "rgba(213, 167, 45, 0.14)",
    },
    ui: {
      borderRadius: "16px",
      cardRadius: "22px",
      buttonRadius: "14px",
      shadow: "0 20px 44px -32px rgba(23,59,101,0.30)",
      shadowIntensity: "measured",
      gamificationIntensity: "medium",
      density: "balanced",
    },
    imagery: {
      heroType: "institutional-grid",
      pattern: "strategic-grid",
      iconStyle: "solid-institutional",
      backgroundImage: "/assets/themes/concursos/institutional-grid.svg",
      backgroundOpacity: "0.12",
    },
    copy: {
      dashboardKicker: "Plano de hoje",
      heroTitle: "Organizacao e estrategia para o edital.",
      heroDescription: "Voce possui blocos planejados para manter constancia.",
      todayPlan: "Plano de hoje",
      streakLabel: "Constancia",
      progressLabel: "Evolucao",
      primaryCta: "Resolver questoes",
      secondaryCta: "Continuar cronograma",
    },
  },
  "policia-civil": {
    id: "policia-civil",
    aliases: ["policial"],
    name: "Policia Civil",
    shortName: "Policia Civil",
    description: "Inteligencia, investigacao e preparacao.",
    personality: "investigative",
    subjects: policeSubjects,
    exams: [
      { slug: "policia-civil", name: "Policia Civil" },
      { slug: "pc-sp", name: "PC-SP" },
      { slug: "pc-mg", name: "PC-MG" },
      { slug: "pc-pr", name: "PC-PR" },
      { slug: "pc-go", name: "PC-GO" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#101C2C",
      primaryDark: "#0A121D",
      secondary: "#1D334D",
      accent: "#C7A84A",
      accentSoft: "#60798E",
      background: "#F2F5F7",
      surface: "#FFFFFF",
      surfaceAlt: "#EAF0F4",
      text: "#15202B",
      muted: "#60798E",
      border: "#D6E0E7",
      success: "#2F7D65",
      warning: "#9C741E",
      danger: "#9B2F42",
    },
    gradients: {
      hero: "linear-gradient(135deg, #101C2C 0%, #1D334D 62%, #285A80 100%)",
      card: "linear-gradient(135deg, #FFFFFF 0%, #EAF0F4 100%)",
      progress: "linear-gradient(90deg, #101C2C 0%, #1D334D 62%, #285A80 100%)",
      sidebar: "linear-gradient(135deg, #101C2C 0%, #1D334D 62%, #285A80 100%)",
      stat: "linear-gradient(135deg, #101C2C 0%, #1D334D 62%, #285A80 100%)",
      ambientA: "rgba(40, 90, 128, 0.17)",
      ambientB: "rgba(199, 168, 74, 0.13)",
    },
    ui: {
      borderRadius: "14px",
      cardRadius: "20px",
      buttonRadius: "12px",
      shadow: "0 22px 46px -34px rgba(16,28,44,0.34)",
      shadowIntensity: "technical",
      gamificationIntensity: "low",
      density: "focused",
    },
    imagery: {
      heroType: "investigation-grid",
      pattern: "technical-grid",
      iconStyle: "steel-line",
      backgroundImage: "/assets/themes/policia-civil/hero.png",
      backgroundOpacity: "0.12",
    },
    copy: {
      dashboardKicker: "Treino de hoje",
      heroTitle: "Preparacao Policia Civil.",
      heroDescription: "Avance mais uma etapa da preparacao para Investigador.",
      todayPlan: "Treino de hoje",
      streakLabel: "Constancia",
      progressLabel: "Edital coberto",
      primaryCta: "Iniciar treino",
      secondaryCta: "Ver plano",
    },
  },
  "policia-militar": {
    id: "policia-militar",
    name: "Policia Militar",
    shortName: "PM",
    description: "Disciplina, constancia e objetivo.",
    personality: "disciplined",
    subjects: policeSubjects,
    exams: [
      { slug: "policia-militar", name: "Policia Militar" },
      { slug: "pm-sp", name: "PM-SP" },
      { slug: "pm-mg", name: "PM-MG" },
      { slug: "pm-pr", name: "PM-PR" },
    ],
    features: { essay: false, syllabus: true, gamification: false },
    colors: {
      primary: "#172019",
      primaryDark: "#101712",
      secondary: "#304A36",
      accent: "#C8A84B",
      accentSoft: "#B7A477",
      background: "#F3F4EF",
      surface: "#FFFFFF",
      surfaceAlt: "#EBEEE6",
      text: "#172019",
      muted: "#627061",
      border: "#DCE2D6",
      success: "#3F6F45",
      warning: "#98772D",
      danger: "#A13A3D",
    },
    gradients: {
      hero: "linear-gradient(135deg, #172019 0%, #304A36 58%, #586B45 100%)",
      card: "linear-gradient(135deg, #FFFFFF 0%, #EBEEE6 100%)",
      progress: "linear-gradient(90deg, #172019 0%, #304A36 62%, #C8A84B 100%)",
      sidebar: "linear-gradient(135deg, #172019 0%, #304A36 58%, #586B45 100%)",
      stat: "linear-gradient(135deg, #172019 0%, #304A36 58%, #586B45 100%)",
      ambientA: "rgba(48, 74, 54, 0.18)",
      ambientB: "rgba(200, 168, 75, 0.14)",
    },
    ui: {
      borderRadius: "14px",
      cardRadius: "20px",
      buttonRadius: "12px",
      shadow: "0 22px 46px -34px rgba(23,32,25,0.34)",
      shadowIntensity: "precise",
      gamificationIntensity: "medium",
      density: "focused",
    },
    imagery: {
      heroType: "tactical-lines",
      pattern: "tactical-lines",
      iconStyle: "military-line",
      backgroundImage: "/assets/themes/policia-militar/tactical-lines.svg",
      backgroundOpacity: "0.14",
    },
    copy: {
      dashboardKicker: "Missao de hoje",
      heroTitle: "Conclua seu bloco de treinamento diario.",
      heroDescription: "Complete seu bloco diario e mantenha sua constancia.",
      todayPlan: "Missao do dia",
      streakLabel: "Constancia",
      progressLabel: "Evolucao",
      primaryCta: "Iniciar missao",
      secondaryCta: "Ver plano",
    },
  },
  militares: {
    id: "militares",
    aliases: ["militar"],
    name: "Carreiras militares",
    shortName: "Militares",
    description: "Excelencia, disciplina e prestigio.",
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
      primary: "#101D35",
      primaryDark: "#0B1426",
      secondary: "#273B32",
      accent: "#D2A640",
      accentSoft: "#315F8C",
      background: "#F5F4EE",
      surface: "#FFFFFF",
      surfaceAlt: "#EEF1F2",
      text: "#172033",
      muted: "#66707D",
      border: "#DFE2DB",
      success: "#2E765D",
      warning: "#9B7020",
      danger: "#A23B4A",
    },
    gradients: {
      hero: "linear-gradient(135deg, #101D35 0%, #273B32 52%, #315F8C 100%)",
      card: "linear-gradient(135deg, #FFFFFF 0%, #EEF1F2 100%)",
      progress: "linear-gradient(90deg, #101D35 0%, #315F8C 68%, #D2A640 100%)",
      sidebar: "linear-gradient(135deg, #101D35 0%, #273B32 52%, #315F8C 100%)",
      stat: "linear-gradient(135deg, #101D35 0%, #273B32 52%, #315F8C 100%)",
      ambientA: "rgba(49, 95, 140, 0.16)",
      ambientB: "rgba(210, 166, 64, 0.14)",
    },
    ui: {
      borderRadius: "14px",
      cardRadius: "20px",
      buttonRadius: "12px",
      shadow: "0 22px 46px -34px rgba(16,29,53,0.34)",
      shadowIntensity: "premium",
      gamificationIntensity: "medium",
      density: "focused",
    },
    imagery: {
      heroType: "academy-lines",
      pattern: "prestige-grid",
      iconStyle: "academy-line",
      backgroundImage: "/assets/themes/militares/academy-lines.svg",
      backgroundOpacity: "0.12",
    },
    copy: {
      dashboardKicker: "Treino de hoje",
      heroTitle: "Disciplina academica para sua carreira militar.",
      heroDescription: "Mantenha a rota de estudos com precisao e constancia.",
      todayPlan: "Plano de treinamento",
      streakLabel: "Constancia",
      progressLabel: "Evolucao",
      primaryCta: "Iniciar treino",
      secondaryCta: "Ver plano",
    },
  },
  medicina: {
    id: "medicina",
    name: "Medicina",
    shortName: "Medicina",
    description: "Ciencia, precisao e tecnologia.",
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
      primary: "#067A84",
      primaryDark: "#063B45",
      secondary: "#155E75",
      accent: "#0F9F73",
      accentSoft: "#CDEFE8",
      background: "#F4FAF9",
      surface: "#FFFFFF",
      surfaceAlt: "#E7F5F3",
      text: "#123238",
      muted: "#587178",
      border: "#CBE4E2",
      success: "#0F8A63",
      warning: "#A06D18",
      danger: "#B34155",
    },
    gradients: {
      hero: "linear-gradient(135deg, #FFFFFF 0%, #E7F5F3 50%, #DDF0F5 100%)",
      card: "linear-gradient(135deg, #FFFFFF 0%, #EEF8F7 52%, #E2F4ED 100%)",
      progress: "linear-gradient(90deg, #067A84 0%, #155E75 52%, #0F9F73 100%)",
      sidebar: "linear-gradient(135deg, #063B45 0%, #067A84 56%, #0F9F73 100%)",
      stat: "linear-gradient(135deg, #067A84 0%, #0E7490 48%, #0F9F73 100%)",
      ambientA: "rgba(6, 122, 132, 0.14)",
      ambientB: "rgba(15, 159, 115, 0.12)",
    },
    ui: {
      borderRadius: "16px",
      cardRadius: "22px",
      buttonRadius: "14px",
      shadow: "0 22px 46px -34px rgba(8,127,140,0.32)",
      shadowIntensity: "clinical",
      gamificationIntensity: "medium",
      density: "balanced",
    },
    imagery: {
      heroType: "clinical-network",
      pattern: "molecule-lines",
      iconStyle: "clinical-line",
      backgroundImage: "/assets/themes/medicina/hero.png",
      backgroundOpacity: "0.10",
    },
    copy: {
      dashboardKicker: "Plantao de estudos",
      heroTitle: "Precisao cientifica para sua aprovacao.",
      heroDescription: "Avance com foco em desempenho, revisao e diagnostico.",
      todayPlan: "Plano clinico",
      streakLabel: "Constancia",
      progressLabel: "Evolucao",
      primaryCta: "Continuar estudo",
      secondaryCta: "Ver plano",
    },
  },
} satisfies Record<StudyVertical, VerticalTheme>;

type ThemedAccentGradients = {
  focus: string;
  league: string;
  statBlue: string;
  statOrange: string;
  statGreen: string;
  statPink: string;
  statYellow: string;
  statPurple: string;
  statRed: string;
  statCyan: string;
  heroDark: string;
  cardDark: string;
  iconHome: string;
  iconPlan: string;
  iconLessons: string;
  iconQuestions: string;
  iconMaterials: string;
  iconProgress: string;
  iconCommunity: string;
  iconSettings: string;
  iconLogout: string;
  iconAdmin: string;
  iconFilter: string;
  iconFilterDark: string;
};

const themedAccentGradients: Record<StudyVertical, ThemedAccentGradients> = {
  vestibular: {
    focus: "linear-gradient(135deg, #FF8A18 0%, #FFA51F 50%, #FFE01B 100%)",
    league: "linear-gradient(135deg, #6B2CF5 0%, #8A42FF 52%, #A569FF 100%)",
    statBlue: "linear-gradient(135deg, #1D9BF0 0%, #18B7F7 52%, #1DD7D0 100%)",
    statOrange: "linear-gradient(135deg, #FF8A18 0%, #FFA51F 52%, #FFE01B 100%)",
    statGreen: "linear-gradient(135deg, #36D66E 0%, #42DF85 52%, #5CE6BD 100%)",
    statPink: "linear-gradient(135deg, #F51BA2 0%, #FF35C7 52%, #FF67D8 100%)",
    statYellow: "linear-gradient(135deg, #FF9518 0%, #FFB21E 52%, #FFE01B 100%)",
    statPurple: "linear-gradient(135deg, #6B2CF5 0%, #8A42FF 52%, #A569FF 100%)",
    statRed: "linear-gradient(135deg, #F43F5E 0%, #FF4D86 52%, #FB7185 100%)",
    statCyan: "linear-gradient(135deg, #168CC8 0%, #13A8D8 52%, #22C7DF 100%)",
    heroDark: "linear-gradient(135deg, #0B1B42 0%, #123B90 52%, #0D756A 100%)",
    cardDark: "linear-gradient(135deg, #101C35 0%, #112847 54%, #0D3E48 100%)",
    iconHome: "linear-gradient(135deg, #D9EBFF 0%, #A7D2FF 100%)",
    iconPlan: "linear-gradient(135deg, #FFE4A1 0%, #FFBF56 100%)",
    iconLessons: "linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%)",
    iconQuestions: "linear-gradient(135deg, #BFF1FF 0%, #7DD6FF 100%)",
    iconMaterials: "linear-gradient(135deg, #E4DCFF 0%, #B39FFD 100%)",
    iconProgress: "linear-gradient(135deg, #D0F6DC 0%, #96E8AE 100%)",
    iconCommunity: "linear-gradient(135deg, #FCE7F3 0%, #F9A8D4 100%)",
    iconSettings: "linear-gradient(135deg, #E6E8FF 0%, #C8CBFF 100%)",
    iconLogout: "linear-gradient(135deg, #FFD9DA 0%, #FFA5AA 100%)",
    iconAdmin: "linear-gradient(135deg, #FFE7BD 0%, #FFC46E 100%)",
    iconFilter: "none",
    iconFilterDark: "brightness(1.06) saturate(1.08)",
  },
  oab: {
    focus: "linear-gradient(135deg, #101116 0%, #690D1E 48%, #C91835 100%)",
    league: "linear-gradient(135deg, #101116 0%, #690D1E 54%, #E11D48 100%)",
    statBlue: "linear-gradient(135deg, #111217 0%, #2F333D 58%, #565C67 100%)",
    statOrange: "linear-gradient(135deg, #690D1E 0%, #C91835 58%, #E11D48 100%)",
    statGreen: "linear-gradient(135deg, #14161A 0%, #2F333D 58%, #D7DCE2 100%)",
    statPink: "linear-gradient(135deg, #7A1027 0%, #C91835 58%, #F0526C 100%)",
    statYellow: "linear-gradient(135deg, #101116 0%, #690D1E 58%, #F8FAFC 100%)",
    statPurple: "linear-gradient(135deg, #17191F 0%, #690D1E 58%, #C91835 100%)",
    statRed: "linear-gradient(135deg, #690D1E 0%, #C91835 56%, #E11D48 100%)",
    statCyan: "linear-gradient(135deg, #111217 0%, #2F333D 58%, #C91835 100%)",
    heroDark: "linear-gradient(135deg, #07080C 0%, #1E090F 50%, #690D1E 100%)",
    cardDark: "linear-gradient(135deg, #101116 0%, #1A0D13 54%, #07080C 100%)",
    iconHome: "linear-gradient(135deg, #C91835 0%, #690D1E 100%)",
    iconPlan: "linear-gradient(135deg, #E11D48 0%, #7A1027 100%)",
    iconLessons: "linear-gradient(135deg, #C91835 0%, #101116 100%)",
    iconQuestions: "linear-gradient(135deg, #E11D48 0%, #690D1E 100%)",
    iconMaterials: "linear-gradient(135deg, #A1142D 0%, #2F333D 100%)",
    iconProgress: "linear-gradient(135deg, #690D1E 0%, #C91835 100%)",
    iconCommunity: "linear-gradient(135deg, #E11D48 0%, #690D1E 100%)",
    iconSettings: "linear-gradient(135deg, #2F333D 0%, #C91835 100%)",
    iconLogout: "linear-gradient(135deg, #C91835 0%, #690D1E 100%)",
    iconAdmin: "linear-gradient(135deg, #101116 0%, #C91835 100%)",
    iconFilter: "none",
    iconFilterDark: "none",
  },
  concursos: {
    focus: "linear-gradient(135deg, #173B65 0%, #245B8F 52%, #178A8A 100%)",
    league: "linear-gradient(135deg, #233044 0%, #4B617A 55%, #D5A72D 100%)",
    statBlue: "linear-gradient(135deg, #173B65 0%, #245B8F 58%, #3E7CB1 100%)",
    statOrange: "linear-gradient(135deg, #A87512 0%, #D5A72D 58%, #F3C969 100%)",
    statGreen: "linear-gradient(135deg, #166C6C 0%, #178A8A 58%, #4DB3A9 100%)",
    statPink: "linear-gradient(135deg, #8A3344 0%, #B33A47 58%, #D16A73 100%)",
    statYellow: "linear-gradient(135deg, #8E6615 0%, #D5A72D 58%, #F3C969 100%)",
    statPurple: "linear-gradient(135deg, #30415F 0%, #536B9A 58%, #6F75B7 100%)",
    statRed: "linear-gradient(135deg, #8A3344 0%, #B33A47 58%, #D16A73 100%)",
    statCyan: "linear-gradient(135deg, #1D5C73 0%, #178A8A 58%, #4DB3A9 100%)",
    heroDark: "linear-gradient(135deg, #101B2B 0%, #173B65 58%, #0D5555 100%)",
    cardDark: "linear-gradient(135deg, #121D2B 0%, #182B40 55%, #193D45 100%)",
    iconHome: "linear-gradient(135deg, #DCEAFE 0%, #8CBCE8 100%)",
    iconPlan: "linear-gradient(135deg, #FCE6A6 0%, #D5A72D 100%)",
    iconLessons: "linear-gradient(135deg, #DCE7F1 0%, #7399BB 100%)",
    iconQuestions: "linear-gradient(135deg, #D8F0EF 0%, #69B9B7 100%)",
    iconMaterials: "linear-gradient(135deg, #E6EBF0 0%, #A7B6C4 100%)",
    iconProgress: "linear-gradient(135deg, #D9EEE8 0%, #63B49F 100%)",
    iconCommunity: "linear-gradient(135deg, #F2D8DD 0%, #D16A73 100%)",
    iconSettings: "linear-gradient(135deg, #E5EAF0 0%, #AAB7C5 100%)",
    iconLogout: "linear-gradient(135deg, #F5D0D6 0%, #C95D68 100%)",
    iconAdmin: "linear-gradient(135deg, #F6E2A6 0%, #D5A72D 100%)",
    iconFilter: "saturate(0.9) contrast(1.02)",
    iconFilterDark: "brightness(1.1) saturate(0.82)",
  },
  "policia-civil": {
    focus: "linear-gradient(135deg, #101C2C 0%, #1D334D 56%, #285A80 100%)",
    league: "linear-gradient(135deg, #101C2C 0%, #60798E 55%, #C7A84A 100%)",
    statBlue: "linear-gradient(135deg, #101C2C 0%, #1D334D 60%, #285A80 100%)",
    statOrange: "linear-gradient(135deg, #7C5A17 0%, #C7A84A 58%, #E4CA75 100%)",
    statGreen: "linear-gradient(135deg, #1F5E50 0%, #2F7D65 58%, #74A58D 100%)",
    statPink: "linear-gradient(135deg, #6D2938 0%, #9B2F42 58%, #C56875 100%)",
    statYellow: "linear-gradient(135deg, #7C5A17 0%, #C7A84A 58%, #E4CA75 100%)",
    statPurple: "linear-gradient(135deg, #273144 0%, #4F5B72 58%, #60798E 100%)",
    statRed: "linear-gradient(135deg, #6D2938 0%, #9B2F42 58%, #C56875 100%)",
    statCyan: "linear-gradient(135deg, #1B3D55 0%, #285A80 58%, #60798E 100%)",
    heroDark: "linear-gradient(135deg, #08111D 0%, #12263B 58%, #203F5D 100%)",
    cardDark: "linear-gradient(135deg, #0E1724 0%, #172538 58%, #24394B 100%)",
    iconHome: "linear-gradient(135deg, #DDE7EF 0%, #91A9BB 100%)",
    iconPlan: "linear-gradient(135deg, #EFE1AD 0%, #C7A84A 100%)",
    iconLessons: "linear-gradient(135deg, #D9E3EB 0%, #60798E 100%)",
    iconQuestions: "linear-gradient(135deg, #D1E4EF 0%, #5F91B5 100%)",
    iconMaterials: "linear-gradient(135deg, #E0E5EA 0%, #91A2AF 100%)",
    iconProgress: "linear-gradient(135deg, #D7E8E2 0%, #74A58D 100%)",
    iconCommunity: "linear-gradient(135deg, #E7D2D7 0%, #A85362 100%)",
    iconSettings: "linear-gradient(135deg, #E1E6EB 0%, #9AA8B5 100%)",
    iconLogout: "linear-gradient(135deg, #ECCDD3 0%, #B45A67 100%)",
    iconAdmin: "linear-gradient(135deg, #EFE1AD 0%, #C7A84A 100%)",
    iconFilter: "saturate(0.78) contrast(1.04)",
    iconFilterDark: "brightness(1.12) saturate(0.74)",
  },
  "policia-militar": {
    focus: "linear-gradient(135deg, #172019 0%, #304A36 58%, #586B45 100%)",
    league: "linear-gradient(135deg, #172019 0%, #304A36 55%, #C8A84B 100%)",
    statBlue: "linear-gradient(135deg, #1F3035 0%, #315F72 58%, #668896 100%)",
    statOrange: "linear-gradient(135deg, #7A5C1F 0%, #C8A84B 58%, #D8C078 100%)",
    statGreen: "linear-gradient(135deg, #172019 0%, #304A36 58%, #5F8A5B 100%)",
    statPink: "linear-gradient(135deg, #6E2E36 0%, #A13A3D 58%, #C66D68 100%)",
    statYellow: "linear-gradient(135deg, #7A5C1F 0%, #C8A84B 58%, #D8C078 100%)",
    statPurple: "linear-gradient(135deg, #252A2B 0%, #4A5450 58%, #7C7D65 100%)",
    statRed: "linear-gradient(135deg, #6E2E36 0%, #A13A3D 58%, #C66D68 100%)",
    statCyan: "linear-gradient(135deg, #1E3835 0%, #42716A 58%, #6A9690 100%)",
    heroDark: "linear-gradient(135deg, #0D130F 0%, #223429 58%, #465A3D 100%)",
    cardDark: "linear-gradient(135deg, #111811 0%, #1F2D22 58%, #354237 100%)",
    iconHome: "linear-gradient(135deg, #DEE8D9 0%, #A5B99C 100%)",
    iconPlan: "linear-gradient(135deg, #EFE1AD 0%, #C8A84B 100%)",
    iconLessons: "linear-gradient(135deg, #E0E7DA 0%, #A7B08B 100%)",
    iconQuestions: "linear-gradient(135deg, #DCE8E1 0%, #79A68C 100%)",
    iconMaterials: "linear-gradient(135deg, #E7E4D9 0%, #B9AD86 100%)",
    iconProgress: "linear-gradient(135deg, #D8ECD5 0%, #72B178 100%)",
    iconCommunity: "linear-gradient(135deg, #E7D2D5 0%, #C66D68 100%)",
    iconSettings: "linear-gradient(135deg, #E5E7DF 0%, #A7AEA2 100%)",
    iconLogout: "linear-gradient(135deg, #EBCFD1 0%, #B85B60 100%)",
    iconAdmin: "linear-gradient(135deg, #EFE1AD 0%, #C8A84B 100%)",
    iconFilter: "saturate(0.78) contrast(1.04)",
    iconFilterDark: "brightness(1.12) saturate(0.76)",
  },
  militares: {
    focus: "linear-gradient(135deg, #101D35 0%, #273B32 55%, #315F8C 100%)",
    league: "linear-gradient(135deg, #101D35 0%, #315F8C 55%, #D2A640 100%)",
    statBlue: "linear-gradient(135deg, #101D35 0%, #315F8C 58%, #5B84AD 100%)",
    statOrange: "linear-gradient(135deg, #806019 0%, #D2A640 58%, #ECC767 100%)",
    statGreen: "linear-gradient(135deg, #213F35 0%, #2E765D 58%, #68A58A 100%)",
    statPink: "linear-gradient(135deg, #71303E 0%, #A23B4A 58%, #C86975 100%)",
    statYellow: "linear-gradient(135deg, #806019 0%, #D2A640 58%, #ECC767 100%)",
    statPurple: "linear-gradient(135deg, #19233A 0%, #384A6F 58%, #6D6FA4 100%)",
    statRed: "linear-gradient(135deg, #71303E 0%, #A23B4A 58%, #C86975 100%)",
    statCyan: "linear-gradient(135deg, #163D58 0%, #315F8C 58%, #5B84AD 100%)",
    heroDark: "linear-gradient(135deg, #0A1224 0%, #1E332C 54%, #274E76 100%)",
    cardDark: "linear-gradient(135deg, #101827 0%, #192A27 54%, #203950 100%)",
    iconHome: "linear-gradient(135deg, #DCE6F1 0%, #8AA9C8 100%)",
    iconPlan: "linear-gradient(135deg, #F3E2A8 0%, #D2A640 100%)",
    iconLessons: "linear-gradient(135deg, #DFE6EC 0%, #8E9EB0 100%)",
    iconQuestions: "linear-gradient(135deg, #DDEBF0 0%, #72A1BE 100%)",
    iconMaterials: "linear-gradient(135deg, #E7E3D6 0%, #B8AA7B 100%)",
    iconProgress: "linear-gradient(135deg, #D8E9E0 0%, #68A58A 100%)",
    iconCommunity: "linear-gradient(135deg, #E8D2D7 0%, #C86975 100%)",
    iconSettings: "linear-gradient(135deg, #E5E8EE 0%, #A5ADBA 100%)",
    iconLogout: "linear-gradient(135deg, #EBCFD4 0%, #B85A67 100%)",
    iconAdmin: "linear-gradient(135deg, #F3E2A8 0%, #D2A640 100%)",
    iconFilter: "saturate(0.82) contrast(1.04)",
    iconFilterDark: "brightness(1.12) saturate(0.78)",
  },
  medicina: {
    focus: "linear-gradient(135deg, #063B45 0%, #067A84 54%, #0F9F73 100%)",
    league: "linear-gradient(135deg, #063B45 0%, #155E75 52%, #0F9F73 100%)",
    statBlue: "linear-gradient(135deg, #155E75 0%, #0E7490 54%, #38A8C4 100%)",
    statOrange: "linear-gradient(135deg, #A06D18 0%, #D99C2B 54%, #F2C057 100%)",
    statGreen: "linear-gradient(135deg, #0F8A63 0%, #0F9F73 54%, #54C6A8 100%)",
    statPink: "linear-gradient(135deg, #9E3450 0%, #B34155 54%, #E17B8F 100%)",
    statYellow: "linear-gradient(135deg, #A06D18 0%, #D99C2B 54%, #F2C057 100%)",
    statPurple: "linear-gradient(135deg, #38508E 0%, #5267B3 54%, #7C80C8 100%)",
    statRed: "linear-gradient(135deg, #9E3450 0%, #B34155 54%, #E17B8F 100%)",
    statCyan: "linear-gradient(135deg, #067A84 0%, #0E7490 54%, #54C6D9 100%)",
    heroDark: "linear-gradient(135deg, #042D36 0%, #063B45 50%, #0B5F52 100%)",
    cardDark: "linear-gradient(135deg, #071D24 0%, #10343D 50%, #143B35 100%)",
    iconHome: "linear-gradient(135deg, #067A84 0%, #063B45 100%)",
    iconPlan: "linear-gradient(135deg, #155E75 0%, #067A84 100%)",
    iconLessons: "linear-gradient(135deg, #0F9F73 0%, #067A84 100%)",
    iconQuestions: "linear-gradient(135deg, #0E7490 0%, #063B45 100%)",
    iconMaterials: "linear-gradient(135deg, #155E75 0%, #0E7490 100%)",
    iconProgress: "linear-gradient(135deg, #0F8A63 0%, #0F9F73 100%)",
    iconCommunity: "linear-gradient(135deg, #067A84 0%, #155E75 100%)",
    iconSettings: "linear-gradient(135deg, #284B57 0%, #067A84 100%)",
    iconLogout: "linear-gradient(135deg, #B34155 0%, #7F2436 100%)",
    iconAdmin: "linear-gradient(135deg, #063B45 0%, #0E7490 100%)",
    iconFilter: "saturate(0.95) contrast(1.02)",
    iconFilterDark: "brightness(1.12) saturate(0.9)",
  },
};

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
  return verticalThemes[normalizeVerticalSlug(slug)];
}

export function verticalThemeStyle(slug: string | null | undefined): CSSProperties {
  const theme = getVerticalTheme(slug);
  const accents = themedAccentGradients[theme.id];

  return {
    "--primary": theme.colors.primary,
    "--primary-light": theme.colors.secondary,
    "--secondary": theme.colors.secondary,
    "--accent": theme.colors.accent,
    "--background": theme.colors.background,
    "--foreground": theme.colors.text,
    "--ink": theme.colors.text,
    "--surface": theme.colors.surface,
    "--muted": theme.colors.muted,
    "--border": theme.colors.border,
    "--success": theme.colors.success,
    "--warning": theme.colors.warning,
    "--danger": theme.colors.danger,
    "--theme-primary": theme.colors.primary,
    "--theme-primary-dark": theme.colors.primaryDark,
    "--theme-secondary": theme.colors.secondary,
    "--theme-accent": theme.colors.accent,
    "--theme-accent-soft": theme.colors.accentSoft,
    "--theme-background": theme.colors.background,
    "--theme-surface": theme.colors.surface,
    "--theme-surface-alt": theme.colors.surfaceAlt,
    "--theme-text": theme.colors.text,
    "--theme-muted": theme.colors.muted,
    "--theme-border": theme.colors.border,
    "--theme-success": theme.colors.success,
    "--theme-warning": theme.colors.warning,
    "--theme-danger": theme.colors.danger,
    "--theme-gradient-hero": theme.gradients.hero,
    "--theme-gradient-card": theme.gradients.card,
    "--theme-gradient-progress": theme.gradients.progress,
    "--theme-gradient-sidebar": theme.gradients.sidebar,
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
    "--theme-background-image": `url("${theme.imagery.backgroundImage}")`,
    "--theme-background-opacity": theme.imagery.backgroundOpacity,
  } as CSSProperties;
}
