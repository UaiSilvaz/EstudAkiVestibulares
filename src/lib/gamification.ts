import {
  Award,
  BookMarked,
  BookOpenCheck,
  Brain,
  CalendarCheck,
  Crown,
  Flame,
  Gem,
  GraduationCap,
  Lightbulb,
  Leaf,
  Medal,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const leagueTrack = [
  { name: "Bronze", min: 0, color: "#D0925B", reward: "Primeiros passos" },
  { name: "Prata", min: 1000, color: "#94A3B8", reward: "Ritmo consistente" },
  { name: "Ouro", min: 2500, color: "#FACC15", reward: "Meta diaria forte" },
  { name: "Platina", min: 4500, color: "#60A5FA", reward: "Simulados avancados" },
  { name: "Esmeralda", min: 7000, color: "#22C55E", reward: "Dominio por assunto" },
  { name: "Diamante", min: 10000, color: "#67E8F9", reward: "Elite EstudAki" },
];

export type AchievementMetric =
  | "login"
  | "xp"
  | "streak"
  | "daily"
  | "errors"
  | "simulations"
  | "accuracy"
  | "ranking"
  | "materials"
  | "videos"
  | "writing"
  | "focus"
  | "league";

export type AchievementColor =
  | "blue"
  | "orange"
  | "cyan"
  | "pink"
  | "purple"
  | "silver"
  | "yellow"
  | "green";

export type Achievement = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: AchievementColor;
  target: number;
  metric: AchievementMetric;
  rarity?: "comum" | "raro" | "epico" | "lendario" | "mitico";
};

const baseAchievementCatalog: Achievement[] = [
  {
    slug: "primeiro-passo",
    title: "Primeiro passo",
    description: "Entrou na plataforma e iniciou sua jornada.",
    icon: Star,
    color: "blue",
    target: 1,
    metric: "login",
    rarity: "comum",
  },
  {
    slug: "streak-7",
    title: "Fogo de 7 dias",
    description: "Mantenha uma sequencia semanal de estudos.",
    icon: Flame,
    color: "orange",
    target: 7,
    metric: "streak",
    rarity: "raro",
  },
  {
    slug: "meta-diaria",
    title: "Meta batida",
    description: "Complete uma meta diaria inteira.",
    icon: Target,
    color: "cyan",
    target: 10,
    metric: "daily",
    rarity: "comum",
  },
  {
    slug: "caderno-erros",
    title: "Cacador de erros",
    description: "Revise erros e transforme falhas em XP.",
    icon: BookOpenCheck,
    color: "pink",
    target: 5,
    metric: "errors",
    rarity: "raro",
  },
  {
    slug: "simulado",
    title: "Modo prova",
    description: "Complete simulados cronometrados.",
    icon: CalendarCheck,
    color: "purple",
    target: 3,
    metric: "simulations",
    rarity: "raro",
  },
  {
    slug: "liga-bronze",
    title: "Liga Bronze",
    description: "Comece sua jornada na trilha EstudAki.",
    icon: Shield,
    color: "orange",
    target: 0,
    metric: "league",
    rarity: "comum",
  },
  {
    slug: "liga-prata",
    title: "Liga Prata",
    description: "Alcance 1.000 XP e desbloqueie seu primeiro emblema.",
    icon: Shield,
    color: "silver",
    target: 1000,
    metric: "league",
    rarity: "raro",
  },
  {
    slug: "liga-ouro",
    title: "Liga Ouro",
    description: "Cruze 2.500 XP com constancia.",
    icon: Crown,
    color: "yellow",
    target: 2500,
    metric: "league",
    rarity: "epico",
  },
  {
    slug: "liga-platina",
    title: "Liga Platina",
    description: "Mostre dominio e mantenha uma rotina forte.",
    icon: Star,
    color: "blue",
    target: 4500,
    metric: "league",
    rarity: "epico",
  },
  {
    slug: "liga-esmeralda",
    title: "Liga Esmeralda",
    description: "Transforme estudo consistente em dominio por assunto.",
    icon: Leaf,
    color: "green",
    target: 7000,
    metric: "league",
    rarity: "lendario",
  },
  {
    slug: "liga-diamante",
    title: "Liga Diamante",
    description: "Chegue ao topo da trilha EstudAki.",
    icon: Gem,
    color: "cyan",
    target: 10000,
    metric: "league",
    rarity: "mitico",
  },
  {
    slug: "mente-afiada",
    title: "Mente afiada",
    description: "Evolua seu acerto ponderado semana a semana.",
    icon: Brain,
    color: "green",
    target: 75,
    metric: "accuracy",
    rarity: "epico",
  },
  {
    slug: "top-ranking",
    title: "Top da liga",
    description: "Suba no ranking e mantenha seu lugar.",
    icon: Trophy,
    color: "orange",
    target: 1,
    metric: "ranking",
    rarity: "lendario",
  },
  {
    slug: "xp-rapido",
    title: "Combo de XP",
    description: "Acumule XP respondendo varias questoes.",
    icon: Zap,
    color: "blue",
    target: 500,
    metric: "xp",
    rarity: "raro",
  },
  {
    slug: "colecionador",
    title: "Colecionador",
    description: "Desbloqueie multiplos emblemas de estudo.",
    icon: Medal,
    color: "purple",
    target: 6,
    metric: "xp",
    rarity: "epico",
  },
];

const themes: Array<{
  title: string;
  description: string;
  metric: AchievementMetric;
  icon: LucideIcon;
  color: AchievementColor;
}> = [
  { title: "Sprint de Algebra", description: "Resolva blocos de matematica sem perder o ritmo.", metric: "daily", icon: Target, color: "cyan" },
  { title: "Dominio de Geometria", description: "Avance em listas com figuras, areas e volumes.", metric: "xp", icon: Award, color: "blue" },
  { title: "Mestre da Redacao", description: "Treine repertorio, tese e proposta de intervencao.", metric: "writing", icon: BookMarked, color: "pink" },
  { title: "Caderno Limpo", description: "Revise pendencias ate transformar erro em acerto.", metric: "errors", icon: BookOpenCheck, color: "green" },
  { title: "Relogio de Prova", description: "Complete simulados dentro do tempo planejado.", metric: "simulations", icon: CalendarCheck, color: "purple" },
  { title: "Foco Profundo", description: "Mantenha uma sequencia de estudo sem quebrar.", metric: "streak", icon: Flame, color: "orange" },
  { title: "Mapa Mental", description: "Passe por revisoes teoricas e conecte assuntos.", metric: "materials", icon: Brain, color: "purple" },
  { title: "Express Turbo", description: "Use aulas curtas para revisar conteudo em minutos.", metric: "videos", icon: Rocket, color: "blue" },
  { title: "Acerto Cirurgico", description: "Suba sua precisao ponderada nas listas.", metric: "accuracy", icon: Zap, color: "green" },
  { title: "Liga em Movimento", description: "Acumule XP para abrir novos degraus da trilha.", metric: "league", icon: Trophy, color: "yellow" },
  { title: "Biologia Viva", description: "Passe por celulas, ecologia e genetica com consistencia.", metric: "xp", icon: Sparkles, color: "green" },
  { title: "Quimica Afinada", description: "Treine estequiometria, atomistica e solucoes.", metric: "daily", icon: Lightbulb, color: "orange" },
  { title: "Fisica no Controle", description: "Derrote cinetica, energia e eletricidade por etapa.", metric: "xp", icon: Zap, color: "cyan" },
  { title: "Historia sem Poeira", description: "Revise processos historicos com leitura ativa.", metric: "materials", icon: BookMarked, color: "yellow" },
  { title: "Geografia de Elite", description: "Conecte mapas, clima, economia e urbanizacao.", metric: "accuracy", icon: GraduationCap, color: "blue" },
  { title: "Literatura Lendaria", description: "Identifique escolas literarias e interpretacao.", metric: "daily", icon: Star, color: "purple" },
  { title: "Gramatica Ninja", description: "Treine sintaxe, concordancia e interpretacao fina.", metric: "errors", icon: Brain, color: "pink" },
  { title: "Ingles sem Travar", description: "Ganhe velocidade em leitura e contexto.", metric: "daily", icon: Rocket, color: "cyan" },
  { title: "Filosofia Clara", description: "Domine autores, conceitos e argumentacao.", metric: "materials", icon: Lightbulb, color: "silver" },
  { title: "Sociologia Ativa", description: "Ligue teoria social ao mundo real.", metric: "accuracy", icon: Award, color: "green" },
  { title: "ETEC Mode", description: "Treine vestibulinhos com atencao total.", metric: "simulations", icon: Shield, color: "blue" },
  { title: "FATEC Flow", description: "Pegue ritmo para provas objetivas e tecnologia.", metric: "xp", icon: Rocket, color: "cyan" },
  { title: "FUVEST Focus", description: "Construa base forte para questoes densas.", metric: "accuracy", icon: Crown, color: "yellow" },
  { title: "UNICAMP Pulse", description: "Resolva problemas interdisciplinares com calma.", metric: "daily", icon: Sparkles, color: "purple" },
  { title: "UNESP Arena", description: "Treine repertorio amplo e resposta rapida.", metric: "simulations", icon: Trophy, color: "orange" },
  { title: "ENEM Maratona", description: "Controle tempo, leitura e resistencia.", metric: "streak", icon: Flame, color: "orange" },
  { title: "Gabarito Frio", description: "Revise alternativas com precisao e paciencia.", metric: "errors", icon: Target, color: "blue" },
  { title: "Sem Chute", description: "Reduza erros bobos antes da prova.", metric: "accuracy", icon: Shield, color: "green" },
  { title: "Combo de Revisao", description: "Misture questoes, teoria e flashcards.", metric: "materials", icon: BookOpenCheck, color: "pink" },
  { title: "Modo Diamante", description: "Sustente uma rotina de alto desempenho.", metric: "xp", icon: Gem, color: "cyan" },
  { title: "Streak Blindado", description: "Proteja sua sequencia mesmo em dias corridos.", metric: "streak", icon: Shield, color: "silver" },
  { title: "Lista Perfeita", description: "Complete metas pequenas com acabamento limpo.", metric: "daily", icon: Target, color: "green" },
  { title: "Revisao Relampago", description: "Use sessoes curtas para fixar pontos fracos.", metric: "videos", icon: Zap, color: "yellow" },
  { title: "Batalha de Assuntos", description: "Passe por materias diferentes sem cair de rendimento.", metric: "xp", icon: Award, color: "purple" },
  { title: "Boss Final", description: "Encare um desafio acumulado de alto impacto.", metric: "simulations", icon: Crown, color: "orange" },
  { title: "Questao Rara", description: "Resolva itens dificeis e mantenha a calma.", metric: "accuracy", icon: Gem, color: "pink" },
  { title: "Plano Semanal", description: "Siga o cronograma e avance em blocos.", metric: "focus", icon: CalendarCheck, color: "blue" },
  { title: "XP de Mestre", description: "Some experiencia com constancia real.", metric: "xp", icon: Medal, color: "yellow" },
  { title: "Aula Salva", description: "Revise conteudos express e volte quando precisar.", metric: "videos", icon: Star, color: "cyan" },
  { title: "Resumo Forte", description: "Aproveite materiais para encurtar a revisao.", metric: "materials", icon: BookMarked, color: "green" },
  { title: "Ranking Quente", description: "Suba posicoes mantendo constancia.", metric: "ranking", icon: Trophy, color: "orange" },
  { title: "Zero Pendencia", description: "Ataque os erros ate a lista ficar leve.", metric: "errors", icon: Shield, color: "pink" },
  { title: "Leitura Rapida", description: "Ganhe velocidade sem perder interpretacao.", metric: "daily", icon: Rocket, color: "blue" },
  { title: "Prova Antiga", description: "Reviva provas oficiais e aprenda o estilo da banca.", metric: "simulations", icon: GraduationCap, color: "purple" },
  { title: "Esmeralda Viva", description: "Mostre dominio consistente em multiplas frentes.", metric: "league", icon: Leaf, color: "green" },
  { title: "Diamante Calmo", description: "Mantenha alto desempenho sem pressa.", metric: "league", icon: Gem, color: "cyan" },
  { title: "Sequencia Solar", description: "Transforme estudo diario em habito automatico.", metric: "streak", icon: Flame, color: "yellow" },
  { title: "Precisao Azul", description: "Acerte mais com menos tentativas desperdicadas.", metric: "accuracy", icon: Target, color: "blue" },
  { title: "Biblioteca Aberta", description: "Passe por cadernos, resumos e mapas de estudo.", metric: "materials", icon: BookMarked, color: "silver" },
  { title: "Ritual de Aprovacao", description: "Some pequenas vitorias ate virar rotina.", metric: "focus", icon: Sparkles, color: "purple" },
];

const rarityByTier: Achievement["rarity"][] = [
  "comum",
  "comum",
  "raro",
  "raro",
  "epico",
  "epico",
  "lendario",
  "lendario",
  "mitico",
  "mitico",
];

const targetBase: Record<AchievementMetric, number> = {
  login: 1,
  xp: 260,
  streak: 3,
  daily: 5,
  errors: 3,
  simulations: 1,
  accuracy: 55,
  ranking: 1,
  materials: 4,
  videos: 3,
  writing: 1,
  focus: 4,
  league: 800,
};

function generatedTarget(metric: AchievementMetric, tier: number) {
  if (metric === "ranking") return 1;
  if (metric === "accuracy") return Math.min(98, targetBase.accuracy + tier * 4);
  if (metric === "league") return Math.min(10000, targetBase.league * (tier + 1));
  return targetBase[metric] * (tier + 1);
}

const generatedAchievementCatalog: Achievement[] = Array.from({ length: 500 }, (_, index) => {
  const theme = themes[index % themes.length];
  const tier = Math.floor(index / themes.length);
  const stage = tier + 1;

  return {
    slug: `extra-${stage}-${index + 1}-${theme.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: `${theme.title} ${stage}`,
    description: `${theme.description} Nivel ${stage} da colecao.`,
    icon: theme.icon,
    color: theme.color,
    target: generatedTarget(theme.metric, tier),
    metric: theme.metric,
    rarity: rarityByTier[tier] ?? "mitico",
  };
});

export const achievementCatalog: Achievement[] = [
  ...baseAchievementCatalog,
  ...generatedAchievementCatalog,
];

export function nextLeagueForXp(xp: number) {
  return leagueTrack.find((league) => xp < league.min) ?? null;
}

export function leagueProgressForXp(xp: number) {
  const currentIndex = Math.max(0, leagueTrack.findIndex((league, index) => {
    const next = leagueTrack[index + 1];
    return xp >= league.min && (!next || xp < next.min);
  }));
  const current = leagueTrack[currentIndex] ?? leagueTrack[0];
  const next = leagueTrack[currentIndex + 1] ?? null;
  if (!next) return { current, next, value: 100, remaining: 0 };
  const value = ((xp - current.min) / (next.min - current.min)) * 100;
  return {
    current,
    next,
    value: Math.max(0, Math.min(100, value)),
    remaining: Math.max(0, next.min - xp),
  };
}
