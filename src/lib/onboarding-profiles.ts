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
  { value: "matematica", label: "Matematica", icon: "matematica" },
  { value: "linguagens", label: "Linguagens", icon: "linguagens" },
  { value: "redacao", label: "Redacao", icon: "redacao" },
  { value: "fisica", label: "Fisica", icon: "fisica" },
  { value: "quimica", label: "Quimica", icon: "quimica" },
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
  { value: "portugues", label: "Portugues", icon: "linguagens" },
  { value: "matematica", label: "Matematica", icon: "matematica" },
  { value: "raciocinio-logico", label: "Raciocinio logico", icon: "matematica" },
  { value: "informatica", label: "Informatica", icon: "fisica" },
  { value: "direito-administrativo", label: "Administrativo", icon: "ciencias-humanas" },
  { value: "direito-constitucional", label: "Constitucional", icon: "ciencias-humanas" },
];

const militarSubjects: OnboardingSubjectOption[] = [
  { value: "matematica", label: "Matematica", icon: "matematica" },
  { value: "portugues", label: "Portugues", icon: "linguagens" },
  { value: "historia", label: "Historia", icon: "ciencias-humanas" },
  { value: "geografia", label: "Geografia", icon: "ciencias-humanas" },
  { value: "fisica", label: "Fisica", icon: "fisica" },
  { value: "ingles", label: "Ingles", icon: "linguagens" },
];

export const onboardingProfiles: Record<OnboardingProfileKey, OnboardingProfile> = {
  vestibular: {
    key: "vestibular",
    title: "Vestibulares e ENEM",
    shortTitle: "Vestibular",
    description: "Passar na faculdade certa com provas, redacao e simulados.",
    examLabel: "Provas alvo",
    examHelper: "Escolha as provas que realmente importam para o seu ano.",
    examImpact: "As provas escolhidas definem o repertorio de questoes, simulados e revisoes que entram no plano.",
    choiceDetail: "Prova alvo",
    courseTitle: "Qual curso voce quer?",
    courseHelper: "Digite livremente ou use uma sugestao rapida.",
    courseImpact: "O curso ajuda a dar peso para materias decisivas e deixa suas metas mais concretas.",
    courseLabel: "Curso desejado",
    coursePlaceholder: "Ex: Medicina, Direito, Engenharia",
    targetTitle: "Qual nota/meta voce deseja alcancar?",
    targetHelper: "Pode ser nota, curso, instituicao ou uma frase simples.",
    targetImpact: "A meta vira referencia para calibrar intensidade, ritmo semanal e revisoes.",
    targetPlaceholder: "Ex: 780 no ENEM, passar em Medicina, nota de corte +40",
    difficultTitle: "Quais materias parecem mais dificeis?",
    difficultHelper: "Escolha as areas que precisam de mais atencao agora.",
    difficultImpact: "Essas materias aparecem primeiro no diagnostico e ganham prioridade no plano inicial.",
    defaultExams: ["ENEM"],
    exams: ["ENEM", "FUVEST", "UNESP", "UNICAMP", "FATEC", "ETEC", "Provao Paulista"],
    courseSuggestions: [
      "Medicina",
      "Direito",
      "Engenharia",
      "Psicologia",
      "Administracao",
      "Ciencia da Computacao",
      "Arquitetura",
      "Enfermagem",
      "Tecnico em Informatica",
      "Ainda nao decidi",
    ],
    subjects: vestibularSubjects,
  },
  medicina: {
    key: "medicina",
    title: "Medicina",
    shortTitle: "Medicina",
    description: "Foco em alta concorrencia, nota de corte e revisao pesada.",
    examLabel: "Portas de entrada",
    examHelper: "Escolha as provas e caminhos de Medicina que entram no seu plano.",
    examImpact: "Medicina exige constancia, simulados fortes e revisao de Ciencias da Natureza desde o inicio.",
    choiceDetail: "Caminho alvo",
    courseTitle: "Qual faculdade ou caminho voce quer?",
    courseHelper: "Defina se seu foco e SISU, particular, estadual ou uma instituicao especifica.",
    courseImpact: "A faculdade desejada ajuda a calibrar nota de corte, pressao semanal e simulados.",
    courseLabel: "Faculdade/caminho",
    coursePlaceholder: "Ex: Medicina USP, ENEM/SISU, particular com bolsa",
    targetTitle: "Qual meta te coloca dentro?",
    targetHelper: "Use nota, instituicao ou margem sobre a nota de corte.",
    targetImpact: "A meta de Medicina define um plano mais intenso e revisoes mais frequentes.",
    targetPlaceholder: "Ex: 820 no ENEM, passar em Medicina, +30 da nota de corte",
    difficultTitle: "Onde Medicina mais pesa para voce?",
    difficultHelper: "Marque as areas que precisam virar prioridade real.",
    difficultImpact: "Essas areas entram cedo em ciclos de teoria, questoes e revisao.",
    defaultExams: ["ENEM"],
    exams: ["ENEM", "FUVEST", "UNESP", "UNICAMP", "FAMEMA", "FAMERP", "SISU/ProUni"],
    courseSuggestions: [
      "Medicina pelo ENEM",
      "Medicina USP",
      "Medicina UNESP",
      "Medicina UNICAMP",
      "Medicina particular com bolsa",
      "Medicina ampla concorrencia",
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
    examImpact: "A etapa muda tudo: revisao objetiva na 1a fase e peca/treino escrito na 2a.",
    choiceDetail: "Etapa",
    courseTitle: "Qual area ou etapa juridica?",
    courseHelper: "Escolha a fase ou a area da prova pratica.",
    courseImpact: "A area escolhida muda os treinos, pecas e revisoes juridicas do plano.",
    courseLabel: "Area/etapa",
    coursePlaceholder: "Ex: OAB 1a fase, Direito Civil na 2a fase",
    targetTitle: "Qual resultado voce quer?",
    targetHelper: "Pode ser numero de acertos, fase ou objetivo final.",
    targetImpact: "A meta da OAB define ritmo de questoes, simulados e revisao de lei seca.",
    targetPlaceholder: "Ex: 50 acertos, passar na 2a fase, tirar a carteira da OAB",
    difficultTitle: "Quais disciplinas juridicas pesam mais?",
    difficultHelper: "Marque os blocos que precisam entrar primeiro no estudo.",
    difficultImpact: "Essas disciplinas ganham prioridade em lei seca, questoes e revisao.",
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
    title: "Concursos publicos",
    shortTitle: "Concursos",
    description: "Plano por edital, cargo, banca e disciplina.",
    examLabel: "Concurso ou banca",
    examHelper: "Escolha o concurso, banca ou familia de cargos que voce mira.",
    examImpact: "O edital ou banca define disciplinas, revisoes e volume de questoes.",
    choiceDetail: "Concurso alvo",
    courseTitle: "Qual cargo ou orgao voce quer?",
    courseHelper: "Digite o cargo, orgao ou area de concurso.",
    courseImpact: "O cargo orienta o plano por edital e organiza prioridades de disciplina.",
    courseLabel: "Cargo/orgao",
    coursePlaceholder: "Ex: TJ-SP Escrevente, INSS, Banco do Brasil",
    targetTitle: "Qual classificacao/meta voce busca?",
    targetHelper: "Escreva nota, classificacao, cargo ou prazo.",
    targetImpact: "A meta ajuda a ajustar carga semanal e intensidade de revisao.",
    targetPlaceholder: "Ex: ficar dentro das vagas, 85% da prova, passar no TJ-SP",
    difficultTitle: "Quais disciplinas travam sua nota?",
    difficultHelper: "Escolha os blocos de edital que precisam de reforco.",
    difficultImpact: "Essas disciplinas entram antes no ciclo de questoes e revisoes.",
    defaultExams: ["Concurso Publico"],
    exams: ["Concurso Publico", "TJ-SP", "INSS", "Banco do Brasil", "PRF", "Receita Federal"],
    courseSuggestions: [
      "TJ-SP Escrevente",
      "INSS Tecnico",
      "Banco do Brasil",
      "Analista judiciario",
      "Tecnico administrativo",
      "Area fiscal",
    ],
    subjects: concursosSubjects,
  },
  "policia-civil": {
    key: "policia-civil",
    title: "Policia Civil",
    shortTitle: "Policia Civil",
    description: "Foco por cargo, edital, lei seca e investigacao.",
    examLabel: "Cargo/estado",
    examHelper: "Escolha o cargo ou concurso policial que voce quer acompanhar.",
    examImpact: "O cargo define disciplinas juridicas, portugues, raciocinio e ritmo de simulados.",
    choiceDetail: "Cargo alvo",
    courseTitle: "Qual cargo da Policia Civil?",
    courseHelper: "Digite cargo, estado ou banca.",
    courseImpact: "O cargo muda cobrancas especificas e peso das disciplinas.",
    courseLabel: "Cargo",
    coursePlaceholder: "Ex: Investigador PC-SP, Escrivao, Delegado",
    targetTitle: "Qual meta da prova?",
    targetHelper: "Use cargo, classificacao, percentual ou prazo.",
    targetImpact: "A meta organiza revisao de lei seca, questoes e simulados por edital.",
    targetPlaceholder: "Ex: passar para Investigador, 80% em simulados",
    difficultTitle: "Quais blocos precisam de reforco?",
    difficultHelper: "Marque disciplinas do edital policial.",
    difficultImpact: "Esses blocos entram primeiro no plano de revisao.",
    defaultExams: ["Policia Civil"],
    exams: ["Policia Civil", "PC-SP", "PC-MG", "PC-PR", "Delegado", "Investigador"],
    courseSuggestions: ["Investigador PC-SP", "Escrivao", "Delegado", "Agente policial", "Papiloscopista"],
    subjects: concursosSubjects,
  },
  "policia-militar": {
    key: "policia-militar",
    title: "Policia Militar",
    shortTitle: "Policia Militar",
    description: "Preparacao para soldado, oficial e carreiras estaduais.",
    examLabel: "Cargo/estado",
    examHelper: "Escolha o concurso militar estadual que voce mira.",
    examImpact: "A prova escolhida define portugues, matematica, atualidades e simulados.",
    choiceDetail: "Cargo alvo",
    courseTitle: "Qual cargo da PM?",
    courseHelper: "Digite cargo, estado ou turma.",
    courseImpact: "O cargo muda a profundidade das disciplinas e a rotina de questoes.",
    courseLabel: "Cargo",
    coursePlaceholder: "Ex: PM-SP Soldado, Oficial PM",
    targetTitle: "Qual meta da prova?",
    targetHelper: "Use cargo, percentual ou prazo.",
    targetImpact: "A meta organiza carga, revisoes e simulados de resistencia.",
    targetPlaceholder: "Ex: passar para Soldado PM-SP, 80% em simulados",
    difficultTitle: "Quais materias precisam subir?",
    difficultHelper: "Marque as areas que mais tiram ponto.",
    difficultImpact: "Essas materias ganham prioridade no plano semanal.",
    defaultExams: ["Policia Militar"],
    exams: ["Policia Militar", "PM-SP", "PM-MG", "PM-PR", "Soldado", "Oficial"],
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
    examImpact: "A prova define base teorica, revisao e simulados por disciplina.",
    choiceDetail: "Prova alvo",
    courseTitle: "Qual carreira militar?",
    courseHelper: "Digite escola, prova ou turma.",
    courseImpact: "A carreira escolhida organiza conteudo, semanas e nivel de dificuldade.",
    courseLabel: "Carreira/prova",
    coursePlaceholder: "Ex: ESA 2027, EsPCEx, EEAR",
    targetTitle: "Qual meta voce precisa bater?",
    targetHelper: "Use nota, escola ou resultado esperado.",
    targetImpact: "A meta ajusta intensidade em matematica, portugues e simulados.",
    targetPlaceholder: "Ex: passar na ESA, 80% nos simulados, EsPCEx 2027",
    difficultTitle: "Quais materias precisam de base?",
    difficultHelper: "Marque as areas que precisam de mais treino.",
    difficultImpact: "Essas materias aparecem primeiro em teoria e questoes.",
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
