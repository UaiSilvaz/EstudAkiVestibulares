export type OnboardingProfileKey =
  | "vestibular"
  | "medicina"
  | "oab"
  | "concursos"
  | "policia-civil"
  | "policia-militar"
  | "militares";

export type OnboardingSubjectOption = {
  value: string;
  label: string;
  icon: string;
};

export type OnboardingProfile = {
  key: OnboardingProfileKey;
  title: string;
  shortTitle: string;
  description: string;
  examLabel: string;
  examHelper: string;
  examImpact: string;
  choiceDetail: string;
  courseTitle: string;
  courseHelper: string;
  courseImpact: string;
  courseLabel: string;
  coursePlaceholder: string;
  targetTitle: string;
  targetHelper: string;
  targetImpact: string;
  targetPlaceholder: string;
  difficultTitle: string;
  difficultHelper: string;
  difficultImpact: string;
  defaultExams: string[];
  exams: string[];
  courseSuggestions: string[];
  subjects: OnboardingSubjectOption[];
};

const vestibularSubjects: OnboardingSubjectOption[] = [
  { value: "matematica", label: "Matemática", icon: "matematica" },
  { value: "linguagens", label: "Linguagens", icon: "linguagens" },
  { value: "redacao", label: "Redação", icon: "redacao" },
  { value: "fisica", label: "Física", icon: "fisica" },
  { value: "quimica", label: "Química", icon: "quimica" },
  { value: "biologia", label: "Biologia", icon: "biologia" },
  { value: "ciencias-humanas", label: "Humanas", icon: "ciencias-humanas" },
];

const direitoSubjects: OnboardingSubjectOption[] = [
  { value: "direito-constitucional", label: "Constitucional", icon: "ciencias-humanas" },
  { value: "direito-administrativo", label: "Administrativo", icon: "ciencias-humanas" },
  { value: "direito-civil", label: "Civil", icon: "linguagens" },
  { value: "direito-penal", label: "Penal", icon: "ciencias-humanas" },
  { value: "processo-civil", label: "Processo Civil", icon: "redacao" },
  { value: "etica-oab", label: "Etica OAB", icon: "redacao" },
];

const concursosSubjects: OnboardingSubjectOption[] = [
  { value: "portugues", label: "Português", icon: "linguagens" },
  { value: "matematica", label: "Matemática", icon: "matematica" },
  { value: "raciocinio-logico", label: "Raciocínio lógico", icon: "matematica" },
  { value: "informatica", label: "Informática", icon: "fisica" },
  { value: "direito-administrativo", label: "Administrativo", icon: "ciencias-humanas" },
  { value: "direito-constitucional", label: "Constitucional", icon: "ciencias-humanas" },
];

const militarSubjects: OnboardingSubjectOption[] = [
  { value: "matematica", label: "Matemática", icon: "matematica" },
  { value: "portugues", label: "Português", icon: "linguagens" },
  { value: "historia", label: "História", icon: "ciencias-humanas" },
  { value: "geografia", label: "Geografia", icon: "ciencias-humanas" },
  { value: "fisica", label: "Física", icon: "fisica" },
  { value: "ingles", label: "Inglês", icon: "linguagens" },
];

export const onboardingProfiles: Record<OnboardingProfileKey, OnboardingProfile> = {
  vestibular: {
    key: "vestibular",
    title: "Vestibulares e ENEM",
    shortTitle: "Vestibular",
    description: "Passar na faculdade certa com provas, redação e simulados.",
    examLabel: "Provas alvo",
    examHelper: "Escolha as provas que realmente importam para o seu ano.",
    examImpact: "As provas escolhidas definem o repertório de questões, simulados e revisões que entram no plano.",
    choiceDetail: "Prova alvo",
    courseTitle: "Qual curso você quer?",
    courseHelper: "Digite livremente ou use uma sugestao rápida.",
    courseImpact: "O curso ajuda a dar peso para matérias decisivas e deixa suas metas mais concretas.",
    courseLabel: "Curso desejado",
    coursePlaceholder: "Ex: Medicina, Direito, Engenharia",
    targetTitle: "Qual nota/meta você deseja alcançar?",
    targetHelper: "Pode ser nota, curso, instituição ou uma frase simples.",
    targetImpact: "A meta vira referência para calibrar intensidade, ritmo semanal e revisões.",
    targetPlaceholder: "Ex: 780 no ENEM, passar em Medicina, nota de corte +40",
    difficultTitle: "Quais matérias parecem mais difíceis?",
    difficultHelper: "Escolha as Áreas que precisam de mais atenção agora.",
    difficultImpact: "Essas matérias aparecem primeiro no diagnóstico e ganham prioridade no plano inicial.",
    defaultExams: ["ENEM"],
    exams: ["ENEM", "FUVEST", "UNESP", "UNICAMP", "FATEC", "ETEC", "Provao Paulista"],
    courseSuggestions: [
      "Medicina",
      "Direito",
      "Engenharia",
      "Psicologia",
      "Administração",
      "Ciência da Computacao",
      "Arquitetura",
      "Enfermagem",
      "Técnico em Informática",
      "Ainda não decidi",
    ],
    subjects: vestibularSubjects,
  },
  medicina: {
    key: "medicina",
    title: "Medicina",
    shortTitle: "Medicina",
    description: "Foco em alta concorrência, nota de corte e revisão pesada.",
    examLabel: "Portas de entrada",
    examHelper: "Escolha as provas e caminhos de Medicina que entram no seu plano.",
    examImpact: "Medicina exige constância, simulados fortes e revisão de Ciências da Natureza desde o início.",
    choiceDetail: "Caminho alvo",
    courseTitle: "Qual faculdade ou caminho você quer?",
    courseHelper: "Defina se seu foco e SISU, particular, estadual ou uma instituição específica.",
    courseImpact: "A faculdade desejada ajuda a calibrar nota de corte, pressão semanal e simulados.",
    courseLabel: "Faculdade/caminho",
    coursePlaceholder: "Ex: Medicina USP, ENEM/SISU, particular com bolsa",
    targetTitle: "Qual meta te coloca dentro?",
    targetHelper: "Use nota, instituição ou margem sobre a nota de corte.",
    targetImpact: "A meta de Medicina define um plano mais intenso e revisões mais frequentes.",
    targetPlaceholder: "Ex: 820 no ENEM, passar em Medicina, +30 da nota de corte",
    difficultTitle: "Onde Medicina mais pesa para você?",
    difficultHelper: "Marque as Áreas que precisam virar prioridade real.",
    difficultImpact: "Essas Áreas entram cedo em ciclos de teoria, questões e revisão.",
    defaultExams: ["ENEM"],
    exams: ["ENEM", "FUVEST", "UNESP", "UNICAMP", "FAMEMA", "FAMERP", "SISU/ProUni"],
    courseSuggestions: [
      "Medicina pelo ENEM",
      "Medicina USP",
      "Medicina UNESP",
      "Medicina UNICAMP",
      "Medicina particular com bolsa",
      "Medicina ampla concorrência",
    ],
    subjects: vestibularSubjects,
  },
  oab: {
    key: "oab",
    title: "OAB",
    shortTitle: "OAB",
    description: "Passar na Ordem e conquistar a carteira profissional.",
    examLabel: "Etapa da OAB",
    examHelper: "Escolha se seu plano e para a 1a fase, 2a fase ou ciclo completo.",
    examImpact: "A etapa muda tudo: revisão objetiva na 1ª fase e peça/treino escrito na 2ª.",
    choiceDetail: "Etapa",
    courseTitle: "Qual área ou etapa jurídica?",
    courseHelper: "Escolha a fase ou a Área da prova prática.",
    courseImpact: "A área escolhida muda os treinos, peças e revisões jurídicas do plano.",
    courseLabel: "Area/etapa",
    coursePlaceholder: "Ex: OAB 1a fase, Direito Civil na 2a fase",
    targetTitle: "Qual resultado você quer?",
    targetHelper: "Pode ser número de acertos, fase ou objetivo final.",
    targetImpact: "A meta da OAB define ritmo de questões, simulados e revisão de lei seca.",
    targetPlaceholder: "Ex: 50 acertos, passar na 2a fase, tirar a carteira da OAB",
    difficultTitle: "Quais disciplinas jurídicas pesam mais?",
    difficultHelper: "Marque os blocos que precisam entrar primeiro no estudo.",
    difficultImpact: "Essas disciplinas ganham prioridade em lei seca, questões e revisão.",
    defaultExams: ["OAB 1a fase"],
    exams: ["OAB 1a fase", "OAB 2a fase", "OAB ciclo completo"],
    courseSuggestions: [
      "OAB 1a fase",
      "Direito Civil",
      "Direito Penal",
      "Direito do Trabalho",
      "Direito Constitucional",
      "Direito Administrativo",
      "Etica profissional",
    ],
    subjects: direitoSubjects,
  },
  concursos: {
    key: "concursos",
    title: "Concursos públicos",
    shortTitle: "Concursos",
    description: "Plano por edital, cargo, banca e disciplina.",
    examLabel: "Concurso ou banca",
    examHelper: "Escolha o concurso, banca ou família de cargos que você mira.",
    examImpact: "O edital ou banca define disciplinas, revisões e volume de questões.",
    choiceDetail: "Concurso alvo",
    courseTitle: "Qual cargo ou Órgão você quer?",
    courseHelper: "Digite o cargo, Órgão ou Área de concurso.",
    courseImpact: "O cargo orienta o plano por edital e organiza prioridades de disciplina.",
    courseLabel: "Cargo/orgao",
    coursePlaceholder: "Ex: TJ-SP Escrevente, INSS, Banco do Brasil",
    targetTitle: "Qual classificação/meta você busca?",
    targetHelper: "Escreva nota, classificação, cargo ou prazo.",
    targetImpact: "A meta ajuda a ajustar carga semanal e intensidade de revisão.",
    targetPlaceholder: "Ex: ficar dentro das vagas, 85% da prova, passar no TJ-SP",
    difficultTitle: "Quais disciplinas travam sua nota?",
    difficultHelper: "Escolha os blocos de edital que precisam de reforço.",
    difficultImpact: "Essas disciplinas entram antes no ciclo de questões e revisões.",
    defaultExams: ["Concurso Público"],
    exams: ["Concurso Público", "TJ-SP", "INSS", "Banco do Brasil", "PRF", "Receita Federal"],
    courseSuggestions: [
      "TJ-SP Escrevente",
      "INSS Técnico",
      "Banco do Brasil",
      "Analista judiciario",
      "Técnico administrativo",
      "Área fiscal",
    ],
    subjects: concursosSubjects,
  },
  "policia-civil": {
    key: "policia-civil",
    title: "Polícia Civil",
    shortTitle: "Polícia Civil",
    description: "Foco por cargo, edital, lei seca e investigação.",
    examLabel: "Cargo/estado",
    examHelper: "Escolha o cargo ou concurso policial que você quer acompanhar.",
    examImpact: "O cargo define disciplinas jurídicas, português, raciocínio e ritmo de simulados.",
    choiceDetail: "Cargo alvo",
    courseTitle: "Qual cargo da Polícia Civil?",
    courseHelper: "Digite cargo, estado ou banca.",
    courseImpact: "O cargo muda cobranças específicas e o peso das disciplinas.",
    courseLabel: "Cargo",
    coursePlaceholder: "Ex: Investigador PC-SP, Escrivão, Delegado",
    targetTitle: "Qual meta da prova?",
    targetHelper: "Use cargo, classificação, percentual ou prazo.",
    targetImpact: "A meta organiza revisão de lei seca, questões e simulados por edital.",
    targetPlaceholder: "Ex: passar para Investigador, 80% em simulados",
    difficultTitle: "Quais blocos precisam de reforço?",
    difficultHelper: "Marque disciplinas do edital policial.",
    difficultImpact: "Esses blocos entram primeiro no plano de revisão.",
    defaultExams: ["Polícia Civil"],
    exams: ["Polícia Civil", "PC-SP", "PC-MG", "PC-PR", "Delegado", "Investigador"],
    courseSuggestions: ["Investigador PC-SP", "Escrivão", "Delegado", "Agente policial", "Papiloscopista"],
    subjects: concursosSubjects,
  },
  "policia-militar": {
    key: "policia-militar",
    title: "Polícia Militar",
    shortTitle: "Polícia Militar",
    description: "Preparação para soldado, oficial e carreiras estaduais.",
    examLabel: "Cargo/estado",
    examHelper: "Escolha o concurso militar estadual que você mira.",
    examImpact: "A prova escolhida define português, matemática, atualidades e simulados.",
    choiceDetail: "Cargo alvo",
    courseTitle: "Qual cargo da PM?",
    courseHelper: "Digite cargo, estado ou turma.",
    courseImpact: "O cargo muda a profundidade das disciplinas e a rotina de questões.",
    courseLabel: "Cargo",
    coursePlaceholder: "Ex: PM-SP Soldado, Oficial PM",
    targetTitle: "Qual meta da prova?",
    targetHelper: "Use cargo, percentual ou prazo.",
    targetImpact: "A meta organiza carga, revisões e simulados de resistência.",
    targetPlaceholder: "Ex: passar para Soldado PM-SP, 80% em simulados",
    difficultTitle: "Quais matérias precisam subir?",
    difficultHelper: "Marque as Áreas que mais tiram ponto.",
    difficultImpact: "Essas matérias ganham prioridade no plano semanal.",
    defaultExams: ["Polícia Militar"],
    exams: ["Polícia Militar", "PM-SP", "PM-MG", "PM-PR", "Soldado", "Oficial"],
    courseSuggestions: ["PM-SP Soldado", "Oficial PM", "Soldado 2a classe", "Aluno oficial"],
    subjects: concursosSubjects,
  },
  militares: {
    key: "militares",
    title: "Carreiras militares",
    shortTitle: "Militares",
    description: "ESA, EsPCEx e provas militares com base forte.",
    examLabel: "Prova militar",
    examHelper: "Escolha a escola ou prova militar que orienta seu plano.",
    examImpact: "A prova define base teórica, revisão e simulados por disciplina.",
    choiceDetail: "Prova alvo",
    courseTitle: "Qual carreira militar?",
    courseHelper: "Digite escola, prova ou turma.",
    courseImpact: "A carreira escolhida organiza conteúdo, semanas e nível de dificuldade.",
    courseLabel: "Carreira/prova",
    coursePlaceholder: "Ex: ESA 2027, EsPCEx, EEAR",
    targetTitle: "Qual meta você precisa bater?",
    targetHelper: "Use nota, escola ou resultado esperado.",
    targetImpact: "A meta ajusta intensidade em matemática, português e simulados.",
    targetPlaceholder: "Ex: passar na ESA, 80% nos simulados, EsPCEx 2027",
    difficultTitle: "Quais matérias precisam de base?",
    difficultHelper: "Marque as Áreas que precisam de mais treino.",
    difficultImpact: "Essas matérias aparecem primeiro em teoria e questões.",
    defaultExams: ["Carreiras Militares"],
    exams: ["Carreiras Militares", "ESA", "EsPCEx", "EEAR", "AFA", "Colegio Naval"],
    courseSuggestions: ["ESA 2027", "EsPCEx", "EEAR", "AFA", "Colegio Naval", "EAM"],
    subjects: militarSubjects,
  },
};

export const onboardingProfileKeys = Object.keys(onboardingProfiles) as OnboardingProfileKey[];

export function normalizeOnboardingProfile(value: unknown): OnboardingProfileKey {
  return typeof value === "string" && value in onboardingProfiles
    ? (value as OnboardingProfileKey)
    : "vestibular";
}

export function allowedOnboardingExams() {
  return new Set(Object.values(onboardingProfiles).flatMap((profile) => profile.exams));
}

export function allowedOnboardingSubjects() {
  return new Set(Object.values(onboardingProfiles).flatMap((profile) => profile.subjects.map((subject) => subject.value)));
}
