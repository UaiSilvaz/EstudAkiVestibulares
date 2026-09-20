import type { AppUser } from "@/lib/roles";
import {
  approvalRoute,
  objectiveForTarget,
  preparationMatrix,
  type ObjectiveOption,
} from "@/lib/platform-data";
import { progressionLabelForObjective, rankProgressForXp } from "@/lib/progression";

export type StudyBlockKind =
  | "lesson"
  | "questions"
  | "review"
  | "flashcards"
  | "essay"
  | "simulation";

export type StudyBlock = {
  id: string;
  kind: StudyBlockKind;
  title: string;
  detail: string;
  durationMinutes: number;
  href: string;
  status: "done" | "active" | "next";
  driver: string;
  impact: string;
  video?: {
    title: string;
    duration: string;
    currentTime: string;
    chapters: Array<{ time: string; title: string }>;
  };
};

export type MasteryRow = {
  id: string;
  subject: string;
  topic: string;
  incidence: "Muito alta" | "Alta" | "Media" | "Baixa";
  mastery: number;
  priority: "Alta" | "Media" | "Baixa";
  nextAction: string;
  href: string;
};

export type ApprovalStage = {
  title: string;
  description: string;
  progress: number;
  status: "done" | "active" | "next";
};

export type ReviewItem = {
  title: string;
  reason: string;
  due: string;
  href: string;
};

export type LawArticle = {
  code: string;
  article: string;
  title: string;
  relatedQuestions: number;
  incidence: "Alta" | "Media" | "Baixa";
  mastery: number;
  lastReview: string;
};

export type EdictTopic = {
  subject: string;
  coverage: number;
  mastery: number;
  questions: number;
  children: Array<{ title: string; status: "Nao iniciado" | "Estudando" | "Revisando" | "Dominado" }>;
};

export type IntelligenceSnapshot = {
  objective: ObjectiveOption;
  targetLabel: string;
  progressionLabel: string;
  currentRank: string;
  nextRank: string | null;
  rankProgress: number;
  today: {
    title: string;
    subtitle: string;
    plannedMinutes: number;
    completedMinutes: number;
    focusScore: number;
    blocks: StudyBlock[];
  };
  approval: {
    generalCoverage: number;
    stages: ApprovalStage[];
  };
  radar: {
    rows: MasteryRow[];
    strongest: MasteryRow[];
    weakest: MasteryRow[];
  };
  reviews: ReviewItem[];
  laws: LawArticle[];
  edict: EdictTopic[];
};

const incidenceByIndex: MasteryRow["incidence"][] = [
  "Muito alta",
  "Alta",
  "Media",
  "Baixa",
];

function questionHref(objective: ObjectiveOption) {
  return objective.vertical === "Vestibulares"
    ? "/questions?vestibular=enem"
    : "/questions";
}

function verticalFocus(objective: ObjectiveOption) {
  if (objective.vertical === "OAB") {
    return {
      mainSubject: "Direito Constitucional",
      weakTopic: "Controle de constitucionalidade",
      supportTopic: "Etica profissional",
      practiceLabel: "20 questoes FGV",
      essayLabel: "Peca e estrutura argumentativa",
    };
  }

  if (objective.vertical === "Policial") {
    return {
      mainSubject: "Direito Penal",
      weakTopic: "Crimes contra a administracao",
      supportTopic: "Portuguese e interpretacao",
      practiceLabel: "20 questoes por banca",
      essayLabel: "Atualidades e discursiva",
    };
  }

  if (objective.vertical === "Concursos") {
    return {
      mainSubject: "Português",
      weakTopic: "Sintaxe e interpretacao",
      supportTopic: "Direito Administrativo",
      practiceLabel: "20 questoes Vunesp",
      essayLabel: "Discursiva objetiva",
    };
  }

  if (objective.vertical === "Militares") {
    return {
      mainSubject: "Matematica",
      weakTopic: "Funcoes e geometria",
      supportTopic: "Portugues",
      practiceLabel: "18 questoes de prova",
      essayLabel: "Revisao de fundamentos",
    };
  }

  return {
    mainSubject: "Matematica",
    weakTopic: "Funcoes exponenciais",
    supportTopic: "Fisica - Eletrodinamica",
    practiceLabel: "20 questoes ENEM",
    essayLabel: "Redacao - repertorio e tese",
  };
}

function buildBlocks(objective: ObjectiveOption): StudyBlock[] {
  const focus = verticalFocus(objective);
  const questions = questionHref(objective);

  return [
    {
      id: "warmup-review",
      kind: "review",
      title: `Revisao - ${focus.supportTopic}`,
      detail: "Retomar os erros recentes antes de abrir conteudo novo.",
      durationMinutes: 20,
      href: "/revisoes",
      status: "done",
      driver: "Erros recentes",
      impact: "+retencao",
    },
    {
      id: "core-lesson",
      kind: "lesson",
      title: `${focus.mainSubject} - ${focus.weakTopic}`,
      detail: "Aula curta com resumo, transcricao e exemplos guiados.",
      durationMinutes: 35,
      href: "/trilhas",
      status: "active",
      driver: "Baixo dominio + alta incidencia",
      impact: "+cobertura",
      video: {
        title: "Video principal",
        duration: "35:00",
        currentTime: "12:40",
        chapters: [
          { time: "00:00", title: "Mapa da aula" },
          { time: "06:20", title: "Conceito central" },
          { time: "18:42", title: "Pegadinha recorrente" },
          { time: "27:10", title: "Exemplo de prova" },
        ],
      },
    },
    {
      id: "smart-questions",
      kind: "questions",
      title: focus.practiceLabel,
      detail: "Lista montada pela prioridade do Radar da Prova.",
      durationMinutes: 30,
      href: questions,
      status: "next",
      driver: "Incidencia x dificuldade",
      impact: "+precisao",
    },
    {
      id: "flashcards",
      kind: "flashcards",
      title: "Flashcards programados",
      detail: "Cartoes que vencem hoje entram antes de novos assuntos.",
      durationMinutes: 15,
      href: "/flashcards",
      status: "next",
      driver: "Memoria espacada",
      impact: "+retencao",
    },
    {
      id: "final-output",
      kind: objective.vertical === "Vestibulares" ? "essay" : "simulation",
      title: focus.essayLabel,
      detail: "Fechamento do bloco com tarefa curta e mensuravel.",
      durationMinutes: 40,
      href: objective.vertical === "Vestibulares" ? "/redacao" : "/simulados",
      status: "next",
      driver: "Ponto de prova",
      impact: "+estrategia",
    },
  ];
}

function priorityFromMastery(mastery: number): MasteryRow["priority"] {
  if (mastery < 50) return "Alta";
  if (mastery < 72) return "Media";
  return "Baixa";
}

function buildRadarRows(objective: ObjectiveOption): MasteryRow[] {
  const focus = verticalFocus(objective);
  const topicSeed =
    objective.vertical === "OAB"
      ? [
          ["Etica", "Prerrogativas da advocacia"],
          ["Constitucional", "Controle de constitucionalidade"],
          ["Civil", "Obrigacoes"],
          ["Processo Civil", "Recursos"],
          ["Penal", "Tipicidade"],
        ]
      : objective.vertical === "Policial"
        ? [
            ["Penal", "Crimes contra a administracao"],
            ["Processo Penal", "Inquerito policial"],
            ["Portugues", "Interpretacao de textos"],
            ["Administrativo", "Atos administrativos"],
            ["Atualidades", "Seguranca publica"],
          ]
        : objective.vertical === "Concursos"
          ? [
              ["Portugues", "Sintaxe"],
              ["Administrativo", "Atos administrativos"],
              ["Constitucional", "Direitos fundamentais"],
              ["Raciocinio Logico", "Proposicoes"],
              ["Informatica", "Seguranca da informacao"],
            ]
          : objective.vertical === "Militares"
            ? [
                ["Matematica", "Funcoes"],
                ["Portugues", "Interpretacao"],
                ["Historia", "Brasil Republica"],
                ["Geografia", "Cartografia"],
                ["Fisica", "Cinematica"],
              ]
            : [
                ["Matematica", focus.weakTopic],
                ["Fisica", "Eletrodinamica"],
                ["Linguagens", "Interpretacao"],
                ["Quimica", "Estequiometria"],
                ["Redacao", "Proposta de intervencao"],
              ];

  return topicSeed.map(([subject, topic], index) => {
    const mastery = [39, 52, 68, 76, 84][index] ?? 62;
    return {
      id: `${subject}-${topic}`.toLowerCase().replace(/\s+/g, "-"),
      subject,
      topic,
      incidence: incidenceByIndex[index % incidenceByIndex.length],
      mastery,
      priority: priorityFromMastery(mastery),
      nextAction:
        mastery < 50
          ? "Aula curta + 12 questoes"
          : mastery < 72
            ? "Lista guiada"
            : "Manutencao leve",
      href: mastery < 50 ? "/estudar" : questionHref(objective),
    } satisfies MasteryRow;
  });
}

function buildEdict(objective: ObjectiveOption): EdictTopic[] {
  if (objective.vertical === "OAB") {
    return [
      {
        subject: "Etica profissional",
        coverage: 82,
        mastery: 74,
        questions: 420,
        children: [
          { title: "Estatuto da OAB", status: "Dominado" },
          { title: "Prerrogativas", status: "Revisando" },
          { title: "Incompatibilidades", status: "Estudando" },
        ],
      },
      {
        subject: "Direito Constitucional",
        coverage: 64,
        mastery: 52,
        questions: 318,
        children: [
          { title: "Direitos fundamentais", status: "Revisando" },
          { title: "Controle constitucional", status: "Estudando" },
          { title: "Organizacao do Estado", status: "Nao iniciado" },
        ],
      },
    ];
  }

  if (objective.vertical === "Policial") {
    return [
      {
        subject: "Direito Penal",
        coverage: 58,
        mastery: 44,
        questions: 286,
        children: [
          { title: "Teoria do crime", status: "Revisando" },
          { title: "Crimes contra a pessoa", status: "Estudando" },
          { title: "Administracao publica", status: "Nao iniciado" },
        ],
      },
      {
        subject: "TAF e etapas",
        coverage: 36,
        mastery: 40,
        questions: 0,
        children: [
          { title: "Corrida", status: "Estudando" },
          { title: "Barra/flexao", status: "Nao iniciado" },
          { title: "Documental", status: "Nao iniciado" },
        ],
      },
    ];
  }

  return preparationMatrix.slice(0, 4).map((subject, index) => ({
    subject: subject.subject,
    coverage: subject.coverage,
    mastery: Math.max(28, subject.coverage - (index + 1) * 5),
    questions: 180 + index * 76,
    children: subject.topics.slice(0, 3).map((topic) => ({
      title: topic.name,
      status: edictStatusFromPreparationStatus(topic.status),
    })),
  }));
}

function edictStatusFromPreparationStatus(
  value: string,
): EdictTopic["children"][number]["status"] {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("concluido")) return "Dominado";
  if (normalized.includes("estudando")) return "Estudando";
  if (normalized.includes("revisao")) return "Revisando";
  return "Nao iniciado";
}

function buildReviews(objective: ObjectiveOption): ReviewItem[] {
  const focus = verticalFocus(objective);
  return [
    {
      title: focus.weakTopic,
      reason: "Errou duas vezes e levou mais tempo que a media.",
      due: "Amanha",
      href: "/revisoes",
    },
    {
      title: focus.supportTopic,
      reason: "Acertou com dificuldade. Revisao curta segura o ganho.",
      due: "7 dias",
      href: "/revisoes",
    },
    {
      title: "Caderno de erros",
      reason: "Padrao de confusao conceitual detectado.",
      due: "Hoje",
      href: "/questions?mode=errors",
    },
  ];
}

function buildLaws(objective: ObjectiveOption): LawArticle[] {
  const police = objective.vertical === "Policial";
  return [
    {
      code: police ? "Codigo Penal" : "Constituicao Federal",
      article: police ? "Art. 312" : "Art. 5",
      title: police ? "Peculato" : "Direitos e garantias fundamentais",
      relatedQuestions: police ? 64 : 183,
      incidence: "Alta",
      mastery: police ? 38 : 61,
      lastReview: "12 dias",
    },
    {
      code: police ? "CPP" : "Estatuto da OAB",
      article: police ? "Art. 4" : "Art. 7",
      title: police ? "Inquerito policial" : "Direitos do advogado",
      relatedQuestions: police ? 91 : 128,
      incidence: "Alta",
      mastery: police ? 52 : 74,
      lastReview: "8 dias",
    },
    {
      code: "Lei 8.112",
      article: "Art. 116",
      title: "Deveres do servidor",
      relatedQuestions: 47,
      incidence: "Media",
      mastery: 69,
      lastReview: "21 dias",
    },
  ];
}

export function buildIntelligenceSnapshot(user: AppUser): IntelligenceSnapshot {
  const objective = objectiveForTarget(user.targetExam);
  const target = user.targetExam ?? objective.title;
  const rank = rankProgressForXp(user.xp, target);
  const blocks = buildBlocks(objective);
  const plannedMinutes = blocks.reduce(
    (sum, block) => sum + block.durationMinutes,
    0,
  );
  const completedMinutes = blocks
    .filter((block) => block.status === "done")
    .reduce((sum, block) => sum + block.durationMinutes, 0);
  const radarRows = buildRadarRows(objective);
  const stages = approvalRoute.map((stage, index) => ({
    ...stage,
    progress:
      index === 0
        ? 100
        : index === 1
          ? Math.max(52, objective.progress)
          : Math.max(0, objective.progress - index * 12),
  }));

  return {
    objective,
    targetLabel: target,
    progressionLabel: progressionLabelForObjective(target),
    currentRank: rank.current.name,
    nextRank: rank.next?.name ?? null,
    rankProgress: Math.round(rank.value),
    today: {
      title: "EstudAki Hoje",
      subtitle: "O menor caminho util entre seu ponto atual e a aprovacao.",
      plannedMinutes,
      completedMinutes,
      focusScore: Math.round((objective.progress + rank.value) / 2),
      blocks,
    },
    approval: {
      generalCoverage: Math.round(
        stages.reduce((sum, item) => sum + item.progress, 0) /
          Math.max(1, stages.length),
      ),
      stages,
    },
    radar: {
      rows: radarRows,
      strongest: [...radarRows].sort((a, b) => b.mastery - a.mastery).slice(0, 2),
      weakest: radarRows.filter((row) => row.priority === "Alta").slice(0, 3),
    },
    reviews: buildReviews(objective),
    laws: buildLaws(objective),
    edict: buildEdict(objective),
  };
}
