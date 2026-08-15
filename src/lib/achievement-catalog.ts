export const achievementCategoryCounts = {
  FIRST_STEPS: 20,
  QUESTIONS_TOTAL: 35,
  CORRECT_TOTAL: 35,
  SUBJECT: 156,
  STREAK: 25,
  STUDY_TIME: 20,
  PERFORMANCE: 30,
  SIMULATION: 30,
  EXAM: 25,
  ERROR_NOTEBOOK: 20,
  ESSAY: 25,
  CONTENT_MASTERY: 30,
  COMMUNITY: 15,
  MATERIALS: 15,
  SECRET: 19,
} as const;

export type AchievementCategory = keyof typeof achievementCategoryCounts;
export type AchievementRarity =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC"
  | "SECRET";

export type AchievementCatalogItem = {
  slug: string;
  name: string;
  description: string;
  lockedDescription: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  metric: string;
  target: number;
  requirement: Record<string, unknown>;
  subjectId?: string;
  examId?: string;
  contentId?: string;
  xpReward: number;
  coinReward: number;
  titleReward?: string;
  cosmeticReward?: string;
  icon: string;
  color: string;
  iconKey: string;
  iconDescription: string;
  unlockedIconPath: string;
  lockedIconPath: string;
  isHidden: boolean;
  isRepeatable: boolean;
  order: number;
  criteriaType: string;
  criteriaValue: number;
};

const estudakiColors = ["#2563EB", "#F97316", "#FACC15", "#22C55E", "#22D3EE", "#0F172A"];

const rarityRewards: Record<AchievementRarity, { xp: number; coins: number }> = {
  COMMON: { xp: 20, coins: 5 },
  UNCOMMON: { xp: 45, coins: 12 },
  RARE: { xp: 110, coins: 28 },
  EPIC: { xp: 220, coins: 60 },
  LEGENDARY: { xp: 450, coins: 120 },
  MYTHIC: { xp: 900, coins: 260 },
  SECRET: { xp: 180, coins: 45 },
};

const rarityByMilestone = (value: number): AchievementRarity => {
  if (value >= 5000) return "MYTHIC";
  if (value >= 1000) return "LEGENDARY";
  if (value >= 250) return "EPIC";
  if (value >= 50) return "RARE";
  if (value >= 10) return "UNCOMMON";
  return "COMMON";
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

let order = 0;

function createAchievement(input: {
  category: AchievementCategory;
  name: string;
  description: string;
  lockedDescription?: string;
  metric: string;
  target: number;
  requirement?: Record<string, unknown>;
  rarity?: AchievementRarity;
  icon?: string;
  color?: string;
  iconKey?: string;
  iconDescription?: string;
  subjectId?: string;
  examId?: string;
  contentId?: string;
  hidden?: boolean;
  titleReward?: string;
  cosmeticReward?: string;
}): AchievementCatalogItem {
  order += 1;
  const rarity = input.rarity ?? rarityByMilestone(input.target);
  const reward = rarityRewards[rarity];
  const slug = slugify(input.name);
  const iconKey = input.iconKey ?? `${slug}-estudaki-medal`;

  return {
    slug,
    name: input.name,
    description: input.description,
    lockedDescription:
      input.lockedDescription ??
      (input.hidden ? "Conquista secreta. Continue estudando para revelar." : "Continue evoluindo para desbloquear."),
    category: input.category,
    rarity,
    metric: input.metric,
    target: input.target,
    requirement: input.requirement ?? {},
    subjectId: input.subjectId,
    examId: input.examId,
    contentId: input.contentId,
    xpReward: reward.xp,
    coinReward: reward.coins,
    titleReward: input.titleReward,
    cosmeticReward: input.cosmeticReward,
    icon: input.icon ?? "trophy",
    color: input.color ?? estudakiColors[order % estudakiColors.length],
    iconKey,
    iconDescription:
      input.iconDescription ??
      `Emblema original EstudAki com moldura ${rarity.toLowerCase()}, brilho azul, detalhe laranja e assinatura amarela.`,
    unlockedIconPath: `/achievements/${slug}.svg`,
    lockedIconPath: `/achievements/locked/${slug}.svg`,
    isHidden: input.hidden ?? false,
    isRepeatable: false,
    order,
    criteriaType: input.metric,
    criteriaValue: input.target,
  };
}

const questionMilestones = [
  1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 2500,
  3000, 4000, 5000, 7500, 10000,
];

const questionNames = [
  "Primeira Questao",
  "Cinco no Aquecimento",
  "Dez de Uma Vez",
  "Lista Fechada",
  "Meio Centenario",
  "Setenta e Cinco Passos",
  "Centena Completa",
  "Ritmo de Prova",
  "Duzentas na Conta",
  "Arquivo Vivo",
  "Trinca Centenaria",
  "Quatrocentas Ideias",
  "Maratona dos 500",
  "Setecentas e Cinquenta Trilhas",
  "Mil na Conta",
  "Mil e Meio de Foco",
  "Dois Mil Motivos",
  "Dois Mil e Meio",
  "Tres Mil Degraus",
  "Quatro Mil Respostas",
  "Cinco Mil Passos",
  "Atlas de Questoes",
  "Enciclopedia de Questoes",
];

const firstSteps = [
  ["Primeiro Passo", "Voce resolveu sua primeira questao no EstudAki.", "unique_questions_answered", 1, "sparkles"],
  ["Comecou Bem", "Voce acertou sua primeira questao.", "unique_correct_answers", 1, "target"],
  ["Errar Faz Parte", "Voce revisou pela primeira vez uma questao que errou.", "reviewed_errors", 1, "book-open-check"],
  ["Caderno Aberto", "Voce adicionou sua primeira questao ao caderno de erros.", "error_bookmarked", 1, "clipboard-check"],
  ["Rumo a Aprovacao", "Voce escolheu seu principal vestibular.", "profile_completed", 40, "graduation-cap"],
  ["Identidade de Estudante", "Voce completou seu perfil.", "profile_completed", 100, "award"],
  ["Foto de Guerra", "Voce adicionou uma foto ao perfil.", "profile_photo", 1, "medal"],
  ["Plano Ligado", "Voce configurou horas semanais de estudo.", "study_plan_configured", 1, "calendar-check"],
  ["Primeira Sessao", "Voce concluiu uma sessao de estudo real.", "study_session_count", 1, "flame"],
  ["Primeiro Simulado", "Voce iniciou sua primeira experiencia de prova.", "simulation_count", 1, "clipboard-check"],
  ["Primeiro Material", "Voce abriu o primeiro material de estudo.", "materials_opened", 1, "book-open-check"],
  ["Primeira Redacao", "Voce iniciou sua primeira redacao.", "essay_count", 1, "pen"],
  ["Primeira Revisao", "Voce revisou um ponto fraco pela primeira vez.", "reviewed_errors", 1, "zap"],
  ["Mapa Inicial", "Voce acessou o cronograma de estudos.", "schedule_started", 1, "calendar-check"],
  ["Liga Destravada", "Voce ganhou XP suficiente para mover a barra de liga.", "xp", 50, "trophy"],
  ["Perfil com Meta", "Voce definiu o vestibular principal.", "profile_goal", 1, "graduation-cap"],
  ["Primeira Semana", "Voce registrou atividade valida na semana.", "weekly_unique_questions", 1, "calendar-check"],
  ["Botao Azul Apertado", "Voce praticou pelo primeiro botao de questoes.", "unique_questions_answered", 1, "zap"],
  ["Aluno em Movimento", "Voce combinou estudo e resposta no mesmo dia.", "daily_unique_questions", 3, "rocket"],
  ["EstudAki Ligado", "Voce entrou no ciclo de progresso da plataforma.", "xp", 100, "sparkles"],
] as const;

const subjects = [
  { key: "matematica", name: "Matematica", short: "Numeros", icon: "calculator", color: "#2563EB" },
  { key: "fisica", name: "Fisica", short: "Vetores", icon: "zap", color: "#22D3EE" },
  { key: "quimica", name: "Quimica", short: "Reacoes", icon: "flask", color: "#F97316" },
  { key: "biologia", name: "Biologia", short: "Vida", icon: "leaf", color: "#22C55E" },
  { key: "lingua-portuguesa", name: "Lingua Portuguesa", short: "Palavras", icon: "book-open-check", color: "#2563EB" },
  { key: "literatura", name: "Literatura", short: "Paginas", icon: "book-marked", color: "#FACC15" },
  { key: "historia", name: "Historia", short: "Eras", icon: "scroll", color: "#F97316" },
  { key: "geografia", name: "Geografia", short: "Mapas", icon: "globe", color: "#22C55E" },
  { key: "filosofia", name: "Filosofia", short: "Ideias", icon: "lightbulb", color: "#0F172A" },
  { key: "sociologia", name: "Sociologia", short: "Sociedade", icon: "network", color: "#2563EB" },
  { key: "ingles", name: "Ingles", short: "English", icon: "messages-square", color: "#22D3EE" },
  { key: "espanhol", name: "Espanhol", short: "Espanol", icon: "messages-square", color: "#F97316" },
] as const;

const subjectSteps = [
  ["Primeiro Sinal", 1, "subject_unique_correct"],
  ["Dez Confirmadas", 10, "subject_unique_correct"],
  ["Vinte e Cinco Claras", 25, "subject_unique_correct"],
  ["Marco 50", 50, "subject_unique_correct"],
  ["Cem no Dominio", 100, "subject_unique_correct"],
  ["Duzentas e Cinquenta", 250, "subject_unique_correct"],
  ["Quinhentas no Alvo", 500, "subject_unique_correct"],
  ["Mil de Maestria", 1000, "subject_unique_correct"],
  ["Sequencia de 5", 5, "subject_correct_streak"],
  ["Sequencia de 10", 10, "subject_correct_streak"],
  ["80 por Cento Solido", 80, "subject_accuracy"],
  ["90 por Cento de Elite", 90, "subject_accuracy"],
  ["Todos os Conteudos", 100, "subject_mastery"],
] as const;

function buildAchievementCatalog() {
  const items: AchievementCatalogItem[] = [];

  firstSteps.forEach(([name, description, metric, target, icon], index) => {
    items.push(createAchievement({
      category: "FIRST_STEPS",
      name,
      description,
      metric,
      target,
      icon,
      rarity: index < 10 ? "COMMON" : "UNCOMMON",
      color: estudakiColors[index % estudakiColors.length],
      iconDescription: "Trilha azul do EstudAki com detalhe laranja e pequeno brilho amarelo de inicio.",
    }));
  });

  questionMilestones.forEach((target, index) => {
    items.push(createAchievement({
      category: "QUESTIONS_TOTAL",
      name: questionNames[index],
      description: `Resolva ${target.toLocaleString("pt-BR")} questoes unicas.`,
      metric: "unique_questions_answered",
      target,
      icon: "clipboard-check",
      color: index % 2 === 0 ? "#2563EB" : "#F97316",
      requirement: { uniqueQuestions: true },
    }));
  });
  ([
    ["Sprint 10", "Resolva 10 questoes em uma sessao.", "session_questions", 10],
    ["Sprint 25", "Resolva 25 questoes em uma sessao.", "session_questions", 25],
    ["Sprint 50", "Resolva 50 questoes em uma sessao.", "session_questions", 50],
    ["Dia de 100", "Resolva 100 questoes em um dia.", "daily_unique_questions", 100],
    ["Cinco Materias no Dia", "Resolva questoes de cinco disciplinas no mesmo dia.", "daily_subjects", 5],
    ["ENEM em Uma Semana", "Estude todas as areas do ENEM na mesma semana.", "weekly_enem_areas", 4],
    ["Lista Sem Abandono", "Complete uma lista de questoes sem abandonar.", "completed_question_list", 1],
    ["No Tempo Planejado", "Conclua a sessao dentro do tempo previsto.", "planned_session_completed", 1],
    ["Manha Produtiva", "Resolva questoes pela manha.", "morning_questions", 10],
    ["Noite de Foco", "Resolva questoes a noite.", "night_questions", 10],
    ["Recorde Diario", "Supere seu proprio recorde diario de questoes.", "daily_record", 1],
    ["Doze Disciplinas", "Resolva uma questao de cada disciplina.", "subjects_touched", 12],
  ] as const).forEach(([name, description, metric, target], index) => {
    items.push(createAchievement({
      category: "QUESTIONS_TOTAL",
      name,
      description,
      metric: String(metric),
      target: Number(target),
      icon: "rocket",
      color: estudakiColors[index % estudakiColors.length],
      rarity: index < 4 ? "UNCOMMON" : "RARE",
    }));
  });

  questionMilestones.forEach((target, index) => {
    items.push(createAchievement({
      category: "CORRECT_TOTAL",
      name: [
        "Primeiro Acerto", "Na Mosca", "Dez Cravadas", "Vinte e Cinco Certas", "Cinquenta Certas",
        "Setenta e Cinco no Alvo", "Centena Perfeita", "Precisao 150", "Duzentas Certezas",
        "Colecionador de Acertos", "Trezentas Confirmadas", "Quatrocentas Certezas", "Quinhentas no Gabarito",
        "Setecentos e Cinquenta Acertos", "Mil Certezas", "Mil e Meio no Alvo", "Dois Mil Acertos",
        "Dois Mil e Meio Certos", "Tres Mil Certezas", "Quatro Mil Acertos", "Cinco Mil Gabaritos",
        "Sete Mil e Meio Certos", "Lenda do Gabarito",
      ][index],
      description: `Acerte ${target.toLocaleString("pt-BR")} questoes unicas.`,
      metric: "unique_correct_answers",
      target,
      icon: "target",
      color: index % 2 === 0 ? "#22C55E" : "#FACC15",
      requirement: { uniqueQuestions: true, correctOnly: true },
    }));
  });
  ([
    ["Cinco Seguidas", "Acerte cinco questoes consecutivas.", "correct_streak", 5],
    ["Dez Seguidas", "Acerte dez questoes consecutivas.", "correct_streak", 10],
    ["Difícil Sem Medo", "Acerte cinco questoes dificeis consecutivas.", "hard_correct_streak", 5],
    ["Gabarito Limpo", "Finalize uma lista sem erros.", "perfect_list", 1],
    ["Virada Certa", "Acerte uma questao que ja tinha errado.", "fixed_previous_error", 1],
    ["Acerto Relampago", "Acerte dez questoes no mesmo dia.", "daily_unique_correct", 10],
    ["Trinta Certas no Dia", "Acerte trinta questoes no mesmo dia.", "daily_unique_correct", 30],
    ["Todas as Areas", "Acerte questoes nas quatro areas do ENEM.", "correct_enem_areas", 4],
    ["Sem Chute", "Acerte uma sequencia com tempo consistente.", "steady_corrects", 10],
    ["Aposta no Estudo", "Melhore a media de acertos apos revisao.", "accuracy_improvement", 10],
    ["Cem por Cento Curto", "Faca 100% em uma sessao de 10 questoes.", "perfect_session", 10],
    ["Resposta de Elite", "Acerte uma questao dificil apos revisa-la.", "review_then_correct", 1],
  ] as const).forEach(([name, description, metric, target], index) => {
    items.push(createAchievement({
      category: "CORRECT_TOTAL",
      name,
      description,
      metric: String(metric),
      target: Number(target),
      icon: "zap",
      color: estudakiColors[(index + 2) % estudakiColors.length],
      rarity: index < 4 ? "RARE" : "EPIC",
    }));
  });

  subjects.forEach((subject) => {
    subjectSteps.forEach(([label, target, metric], stepIndex) => {
      items.push(createAchievement({
        category: "SUBJECT",
        name: `${subject.short}: ${label}`,
        description:
          metric === "subject_accuracy"
            ? `Alcance ${target}% de aproveitamento em ${subject.name} com amostra minima.`
            : metric === "subject_mastery"
              ? `Domine os principais conteudos cadastrados de ${subject.name}.`
              : `Avance em ${subject.name} ate o marco ${target}.`,
        metric,
        target,
        icon: subject.icon,
        color: subject.color,
        subjectId: subject.key,
        requirement: {
          subject: subject.key,
          uniqueQuestions: true,
          minQuestions: stepIndex === 10 ? 20 : stepIndex === 11 ? 50 : undefined,
        },
        rarity: stepIndex < 3 ? "COMMON" : stepIndex < 6 ? "UNCOMMON" : stepIndex < 10 ? "RARE" : stepIndex < 12 ? "EPIC" : "LEGENDARY",
      }));
    });
  });

  const streakTargets = [2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 75, 90, 100, 120, 150, 180, 200, 250, 300, 365];
  streakTargets.forEach((target) => {
    items.push(createAchievement({
      category: "STREAK",
      name: target === 365 ? "Lenda da Constancia" : `Sequencia de ${target} Dias`,
      description: `Estude por ${target} dias consecutivos com atividade valida.`,
      metric: "study_streak_days",
      target,
      icon: "flame",
      color: target >= 90 ? "#FACC15" : "#F97316",
      requirement: { timezone: "America/Sao_Paulo", validActivityOnly: true },
    }));
  });
  ([
    ["Chama Recuperada", "Recupere uma sequencia perdida.", "streak_recovered", 1],
    ["De Volta Depois da Pausa", "Volte apos sete dias sem estudar.", "return_after_break", 7],
    ["Segunda a Sexta", "Estude de segunda a sexta.", "weekday_study", 5],
    ["Quatro Finais de Semana", "Estude durante quatro finais de semana.", "weekend_study", 4],
    ["Semana Sem Quebrar", "Complete uma semana sem quebrar a meta diaria.", "daily_goal_week", 7],
  ] as const).forEach(([name, description, metric, target]) => {
    items.push(createAchievement({ category: "STREAK", name, description, metric: String(metric), target: Number(target), icon: "calendar-check", color: "#2563EB", rarity: "RARE" }));
  });

  [
    1, 15, 30, 60, 300, 600, 1500, 3000, 6000, 15000, 30000, 30, 60, 1, 1, 1, 1, 1, 5, 1,
  ].forEach((target, index) => {
    const names = [
      "Relogio Iniciado", "Quinze Minutos Reais", "Meia Hora de Foco", "Hora do Conhecimento",
      "Cinco Horas Mais Perto", "Dez Horas de Base", "Vinte e Cinco Horas", "Cinquenta Horas",
      "Cem Horas Mais Perto", "Duzentas e Cinquenta Horas", "Quinhentas Horas", "Modo Concentracao",
      "Uma Hora Sem Interrupcao", "Tempo Planejado Cumprido", "Antes do Cafe", "Depois do Por do Sol",
      "Sabado de Estudo", "Domingo Produtivo", "Cinco Dias Equilibrados", "Mestre do Relogio",
    ];
    const metrics = [
      "study_session_count", "study_time_minutes", "study_time_minutes", "study_time_minutes",
      "study_time_minutes", "study_time_minutes", "study_time_minutes", "study_time_minutes",
      "study_time_minutes", "study_time_minutes", "study_time_minutes", "focus_session_minutes",
      "focus_session_minutes", "planned_study_time", "early_study", "night_study", "saturday_study",
      "sunday_study", "balanced_study_days", "study_time_record",
    ];
    items.push(createAchievement({
      category: "STUDY_TIME",
      name: names[index],
      description: `${names[index]} registrado com tempo de atividade real.`,
      metric: metrics[index],
      target,
      icon: "clock",
      color: index % 2 ? "#22D3EE" : "#2563EB",
    }));
  });

  const performance = [
    [60, 20], [70, 20], [80, 20], [90, 20], [100, 10], [80, 50], [90, 50], [95, 100],
    [80, 3], [10, 1], [3, 1], [5, 1], [10, 1], [1, 1], [1, 1],
  ];
  const performanceNames = [
    "Mira Ajustada", "Olho de Aguia", "Precisao Firme", "Elite dos 90", "Sessao Perfeita",
    "Oitenta em Cinquenta", "Noventa em Cinquenta", "Quase Perfeito", "Tres Materias Fortes",
    "Virada de Dez Pontos", "Tres Semanas Subindo", "Cinco Dificeis Seguidas", "Dez Dificeis no Dia",
    "Lista Sem Erro", "Aprendeu de Verdade",
  ];
  for (let repeat = 0; repeat < 2; repeat += 1) {
    performance.forEach(([target, min], index) => {
      items.push(createAchievement({
        category: "PERFORMANCE",
        name: repeat ? `${performanceNames[index]} Plus` : performanceNames[index],
        description: repeat ? `Repita o feito de desempenho: ${performanceNames[index]}.` : `Alcance ${target}% com amostra minima de ${min}.`,
        metric: index <= 7 ? "accuracy_percent" : ["multi_subject_accuracy", "accuracy_improvement", "weekly_improvement", "hard_correct_streak", "daily_hard_correct", "perfect_list", "fixed_previous_error"][index - 8],
        target,
        icon: "target",
        color: repeat ? "#FACC15" : "#22C55E",
        rarity: index < 4 ? "UNCOMMON" : index < 10 ? "RARE" : "EPIC",
        requirement: { minQuestions: min },
      }));
    });
  }

  const simulationNames = [
    "Simulacao Iniciada", "Primeiro Simulado Finalizado", "Sem Abandono", "Dentro do Tempo",
    "Antes do Tempo", "Cinco Simulados", "Dez Simulados", "Vinte e Cinco Simulados",
    "Cinquenta Simulados", "Cem Simulados", "Nota 50", "Nota 60", "Nota 70", "Nota 80",
    "Nota 90", "Nota 95", "Nota em Ascensao", "Recorde Pessoal", "Prova de 90 Questoes",
    "Primeiro Dia Vencido", "Segundo Dia Vencido", "Dois Dias ENEM", "ETEC Completa",
    "FATEC Completa", "Erros do Simulado Revisados", "Area Perfeita", "Ritmo Medio Ideal",
    "Nenhuma em Branco", "Tempo Bem Administrado", "Pronto para a Prova",
  ];
  simulationNames.forEach((name, index) => {
    const target = [1, 1, 1, 1, 1, 5, 10, 25, 50, 100, 50, 60, 70, 80, 90, 95][index] ?? 1;
    items.push(createAchievement({
      category: "SIMULATION",
      name,
      description: `${name} em simulados e provas cronometradas.`,
      metric: index >= 10 && index <= 15 ? "simulation_score_percent" : "simulation_count",
      target,
      icon: "clipboard-check",
      color: index % 2 ? "#2563EB" : "#F97316",
      rarity: index < 6 ? "COMMON" : index < 16 ? "RARE" : "EPIC",
    }));
  });

  const exams = ["ENEM", "ETEC", "FATEC", "FUVEST", "UNESP", "UNICAMP", "UERJ"];
  exams.forEach((exam) => {
    [
      [`Jornada ${exam}`, 1],
      [`Especialista ${exam}`, 250],
      [`Veterano ${exam}`, 1000],
    ].forEach(([name, target]) => {
      items.push(createAchievement({
        category: "EXAM",
        name: String(name),
        description: `Resolva ${Number(target).toLocaleString("pt-BR")} questoes do ${exam}.`,
        metric: "exam_unique_questions",
        target: Number(target),
        examId: exam.toLowerCase(),
        icon: "graduation-cap",
        color: exam === "ENEM" ? "#2563EB" : "#F97316",
        requirement: { exam: exam.toLowerCase(), uniqueQuestions: true },
      }));
    });
  });
  [
    "Desafio Paulista", "Trinca de Vestibulares", "Radar Nacional", "Rota da Universidade",
  ].forEach((name, index) => {
    items.push(createAchievement({ category: "EXAM", name, description: `${name}: pratique trajetorias de vestibulares diferentes.`, metric: "exam_variety", target: index + 2, icon: "map", color: "#FACC15", rarity: "EPIC" }));
  });

  [
    "Erro Registrado", "Segunda Chance", "Agora Eu Sei", "Dez Erros Revisados", "Vinte e Cinco Revisoes",
    "Cinquenta Revisoes", "Cem Revisoes", "Duzentas e Cinquenta Revisoes", "Quinhentas Revisoes",
    "Caderno Limpo", "Tres Dias Revisando", "Cinco Erros Viraram Acertos", "Dez Erros Viraram Acertos",
    "Cinquenta Erros Viraram Acertos", "Todas as Disciplinas Revisadas", "Sessao So de Erros",
    "Aproveitamento Recuperado", "Simulado Revisado", "Voltou Depois de Sete Dias", "Semana de Revisoes Fechada",
  ].forEach((name, index) => {
    const target = [1, 1, 1, 10, 25, 50, 100, 250, 500, 1, 3, 5, 10, 50, 12, 1, 10, 1, 7, 1][index];
    items.push(createAchievement({ category: "ERROR_NOTEBOOK", name, description: `${name} no caderno de erros e revisoes.`, metric: index <= 8 ? "reviewed_errors" : "review_goal", target, icon: "book-open-check", color: "#F97316" }));
  });

  [
    "Area de Redacao Aberta", "Tema Escolhido", "Primeiras Linhas", "Texto Completo", "Primeira Correcao",
    "Reescrever e Evoluir", "Cinco Redacoes", "Dez Redacoes", "Vinte e Cinco Redacoes", "Cinquenta Redacoes",
    "Cem Redacoes", "Rumo aos 500", "Rumo aos 600", "Rumo aos 700", "Rumo aos 800", "Rumo aos 900",
    "Nota 960", "Nota 980", "Redacao Mil", "Subiu Cem Pontos", "Tres Redacoes Subindo",
    "Competencia Forte", "Cinco Competencias Maximas", "Tema no Alvo", "Texto com Repertorio",
  ].forEach((name, index) => {
    const targets = [1, 1, 1, 1, 1, 1, 5, 10, 25, 50, 100, 500, 600, 700, 800, 900, 960, 980, 1000, 100, 3, 200, 5, 1, 1];
    items.push(createAchievement({ category: "ESSAY", name, description: `${name} na sua trilha de redacao.`, metric: index >= 11 && index <= 18 ? "essay_score" : "essay_count", target: targets[index], icon: "pen", color: index >= 15 ? "#FACC15" : "#2563EB" }));
  });

  [
    "Primeiro Dominio", "Cinco Conteudos Dominados", "Dez Conteudos Dominados", "Vinte e Cinco Conteudos",
    "Cinquenta Conteudos", "Conteudo Dificil Dominado", "Tres Conteudos em Sequencia", "Todas as Areas Dominadas",
    "Uma Materia Dominada", "Duas Materias Dominadas", "Area ENEM Dominada", "Conteudo Recuperado",
    "Memoria de Longo Prazo", "Prioritarios Fechados", "Plano de Conteudos Fechado",
  ].forEach((name, index) => {
    const target = [1, 5, 10, 25, 50, 1, 3, 4, 1, 2, 1, 1, 30, 1, 1][index];
    items.push(createAchievement({ category: "CONTENT_MASTERY", name, description: `${name}: alcance dominio com pratica, revisao e consistencia.`, metric: "content_mastery_count", target, icon: "brain", color: "#22C55E" }));
    items.push(createAchievement({ category: "CONTENT_MASTERY", name: `${name} Avancado`, description: `Versao avancada de ${name.toLowerCase()} com criterios mais fortes.`, metric: "content_mastery_count", target: target * 2, icon: "gem", color: "#22D3EE", rarity: "EPIC" }));
  });

  [
    "Perfil Completo", "Foto Adicionada", "Objetivo Definido", "Primeiro Progresso Publicado", "Primeira Interacao",
    "Ajudou um Estudante", "Entrou em Desafio", "Concluiu Desafio", "Entrou no Ranking", "Top 100",
    "Top 50", "Top 10", "Seguiu uma Trilha", "Compartilhou Conquista", "Postura Positiva",
  ].forEach((name, index) => {
    items.push(createAchievement({ category: "COMMUNITY", name, description: `${name} dentro da comunidade e perfil EstudAki.`, metric: index < 3 ? "profile_completed" : "community_posts", target: index < 3 ? 100 : 1, icon: "medal", color: "#2563EB" }));
  });

  [
    "Primeiro Material Aberto", "Material Concluido", "Cinco Materiais", "Dez Materiais Concluidos", "Primeira Videoaula",
    "Cinco Videoaulas", "Vinte e Cinco Videoaulas", "Aula Salva", "Aula Express", "Cinco Disciplinas em Aula",
    "Trilha Concluida", "PDF Baixado", "Material Virou Questao", "Aula Sem Abandono", "Aula Revisada",
  ].forEach((name, index) => {
    items.push(createAchievement({ category: "MATERIALS", name, description: `${name} no uso de materiais, videos e aulas.`, metric: index >= 4 && index <= 8 ? "video_completed" : "materials_opened", target: [1, 1, 5, 10, 1, 5, 25, 1, 1, 5, 1, 1, 1, 1, 1][index], icon: "book-marked", color: index % 2 ? "#FACC15" : "#22D3EE" }));
  });

  [
    "Antes do Sol", "De Volta ao Jogo", "Virada Impossivel", "Equilibrio Perfeito", "Sem Medo da Dificil",
    "Exatamente no Limite", "Dia Perfeito", "Silencio Produtivo", "Cafe com Questao", "Quase Meia-Noite",
    "Plano B Funcionou", "Erro Teimoso Vencido", "Quatro Areas no Dia", "Domingo Dourado", "Aula e Gabarito",
    "Foco Sem Notificacao", "Mapa Secreto", "Sprint Surpresa", "Aprovacao no Radar",
  ].forEach((name, index) => {
    items.push(createAchievement({
      category: "SECRET",
      name,
      description: `${name}: voce encontrou um feito especial escondido no EstudAki.`,
      lockedDescription: "Silhueta secreta. Continue explorando o EstudAki.",
      metric: ["early_study", "return_after_break", "fixed_previous_error", "daily_enem_areas", "hard_correct_streak"][index % 5],
      target: [1, 7, 3, 4, 5][index % 5],
      icon: "sparkles",
      color: "#0F172A",
      rarity: "SECRET",
      hidden: true,
      cosmeticReward: `silhueta-${slugify(name)}`,
    }));
  });

  return items;
}

export const achievementCatalog = buildAchievementCatalog();

export const betaAchievementNames = [
  "Primeiro Passo",
  "Comecou Bem",
  "Errar Faz Parte",
  "Caderno Aberto",
  "Rumo a Aprovacao",
  "Plano Ligado",
  "Primeira Sessao",
  "Primeiro Simulado",
  "Primeira Redacao",
  "Perfil com Meta",
  "Primeira Semana",
  "Aluno em Movimento",
  "EstudAki Ligado",
  "Primeira Questao",
  "Cinco no Aquecimento",
  "Dez de Uma Vez",
  "Primeiro Acerto",
  "Cinco Seguidas",
  "Numeros: Primeiro Sinal",
  "Area de Redacao Aberta",
] as const;

export const BETA_ACHIEVEMENT_LIMIT = betaAchievementNames.length;
export const betaAchievementSlugs = betaAchievementNames.map((name) => slugify(name));
export const betaAchievementCatalog = betaAchievementSlugs
  .map((slug) => achievementCatalog.find((item) => item.slug === slug))
  .filter((item): item is AchievementCatalogItem => Boolean(item));

export function achievementCategorySummary() {
  return Object.fromEntries(
    Object.keys(achievementCategoryCounts).map((category) => [
      category,
      achievementCatalog.filter((item) => item.category === category).length,
    ]),
  ) as Record<AchievementCategory, number>;
}
