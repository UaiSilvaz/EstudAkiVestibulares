import { jornadaSubjects, type JornadaSubjectSlug } from "@/lib/jornada-subjects";

export type JornadaStatus = "available" | "locked" | "completed";
export type JornadaLevel = "Base" | "Essencial" | "Aplicação" | "Estratégia" | "Domínio";

export type JornadaSource = {
  id: string;
  title: string;
  organization: string;
  url: string;
  sourceType: "official_document" | "open_education" | "public_domain" | "reference";
  subject: JornadaSubjectSlug | "geral";
  accessedAt: string;
  licenseName: string;
  licenseStatus: "pending" | "verified" | "needs_human_review";
  allowedUsage: string;
  attributionText: string;
  reviewStatus: "draft" | "reviewed" | "published";
};

export type JornadaFormula = {
  formula: string;
  variables: Array<{ symbol: string; meaning: string; unit?: string }>;
  conditions: string;
  example: string;
  commonMistake: string;
};

export type JornadaActivity = {
  id: string;
  slug: string;
  lessonId: string;
  title: string;
  type: "multiple_choice" | "numeric" | "true_false";
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  options?: Array<{ id: string; text: string }>;
  answer: string;
  explanation: string;
  hint: string;
  sourceIds: string[];
  reviewStatus: "draft" | "reviewed" | "published";
};

export type JornadaLesson = {
  id: string;
  slug: string;
  title: string;
  moduleSlug: string;
  order: number;
  estimatedMinutes: number;
  objectives: string[];
  theory: string[];
  keyTerms: Array<{ term: string; definition: string }>;
  formulas: JornadaFormula[];
  examples: Array<{ title: string; statement: string; solution: string }>;
  commonMistakes: string[];
  application: string;
  summary: string[];
  activityId: string;
  sourceIds: string[];
  reviewStatus: "draft" | "reviewed" | "published";
};

export type JornadaModule = {
  slug: string;
  title: string;
  order: number;
  description: string;
  prerequisites: string[];
  lessons: JornadaLesson[];
};

export type JornadaCourse = {
  slug: string;
  title: string;
  subjectSlug: JornadaSubjectSlug;
  pathSlug: string;
  level: JornadaLevel;
  order: number;
  status: JornadaStatus;
  description: string;
  objectives: string[];
  estimatedHours: number;
  prerequisites: string[];
  certificateTitle: string;
  modules: JornadaModule[];
};

export type JornadaPath = {
  slug: string;
  subjectSlug: JornadaSubjectSlug;
  title: string;
  level: JornadaLevel;
  order: number;
  description: string;
  status: JornadaStatus;
  courseSlugs: string[];
};

const sourceAccessDate = "2026-07-31";

export const jornadaSources: JornadaSource[] = [
  {
    id: "bncc-matematica",
    title: "Base Nacional Comum Curricular - Ensino Médio",
    organization: "Ministério da Educação",
    url: "https://www.gov.br/mec/pt-br/escola-em-tempo-integral/BNCC_EI_EF_110518_versaofinal.pdf",
    sourceType: "official_document",
    subject: "geral",
    accessedAt: sourceAccessDate,
    licenseName: "Documento público governamental",
    licenseStatus: "needs_human_review",
    allowedUsage: "Referência curricular e habilidades; conteúdo Norte Preparatórios escrito de forma original.",
    attributionText: "Referência curricular: Ministério da Educação, BNCC.",
    reviewStatus: "draft",
  },
  {
    id: "openstax-prealgebra",
    title: "Prealgebra 2e",
    organization: "OpenStax",
    url: "https://openstax.org/details/books/prealgebra-2e",
    sourceType: "open_education",
    subject: "matematica",
    accessedAt: sourceAccessDate,
    licenseName: "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
    licenseStatus: "verified",
    allowedUsage: "Referência conceitual aberta; explicações e exercícios Norte Preparatórios autorais.",
    attributionText: "OpenStax, Prealgebra 2e, CC BY 4.0.",
    reviewStatus: "draft",
  },
  {
    id: "wikibooks-fracoes",
    title: "Matemática elementar - frações",
    organization: "Wikibooks",
    url: "https://pt.wikibooks.org/wiki/Matematica_elementar/Frac%C3%A7%C3%B5es",
    sourceType: "open_education",
    subject: "matematica",
    accessedAt: sourceAccessDate,
    licenseName: "Creative Commons Attribution-ShareAlike",
    licenseStatus: "needs_human_review",
    allowedUsage: "Referência complementar; não copiar forma de expressão.",
    attributionText: "Wikibooks, Matemática elementar/Frações.",
    reviewStatus: "draft",
  },
];

function lesson(input: JornadaLesson): JornadaLesson {
  return input;
}

const fracoesLessons: JornadaLesson[] = [
  lesson({
    id: "lesson-fracoes-01",
    slug: "o-que-e-fracao",
    moduleSlug: "sentido-das-fracoes",
    title: "O que uma fração representa",
    order: 1,
    estimatedMinutes: 14,
    objectives: ["Ler numerador e denominador", "Interpretar fração como parte de um todo", "Reconhecer fração em situações reais"],
    theory: [
      "Uma fração compara uma quantidade escolhida com o total de partes iguais. Em 3/5, o denominador 5 indica em quantas partes iguais o todo foi dividido; o numerador 3 indica quantas partes foram consideradas.",
      "A ideia central é a igualdade das partes. Se uma pizza é cortada em pedaços de tamanhos diferentes, dizer que um pedaço vale 1/4 pode ser errado, porque quartos precisam ter o mesmo tamanho.",
      "Fração também pode representar divisão. A escrita 3/5 indica 3 dividido por 5, ou seja, cada unidade foi repartida em cinco partes iguais.",
    ],
    keyTerms: [
      { term: "Numerador", definition: "Número de partes consideradas." },
      { term: "Denominador", definition: "Número de partes iguais em que o todo foi dividido." },
      { term: "Todo", definition: "Quantidade inteira usada como referência." },
    ],
    formulas: [
      {
        formula: "a / b = a dividido por b, com b diferente de 0",
        variables: [
          { symbol: "a", meaning: "numerador" },
          { symbol: "b", meaning: "denominador" },
        ],
        conditions: "Use quando o todo foi separado em partes iguais. O denominador não pode ser zero.",
        example: "3/4 significa 3 partes de um total de 4 partes iguais.",
        commonMistake: "Comparar frações sem garantir que o todo é o mesmo.",
      },
    ],
    examples: [
      {
        title: "Leitura de uma imagem mental",
        statement: "Um reservatório foi dividido em 8 marcas iguais e a água chegou até a quinta marca. Que fração está cheia?",
        solution: "O total tem 8 partes iguais e 5 estão preenchidas. A fração é 5/8.",
      },
    ],
    commonMistakes: ["Achar que denominador maior sempre significa fração maior", "Esquecer que as partes precisam ter o mesmo tamanho"],
    application: "Frações aparecem em receitas, escalas, descontos, medidas de tempo e leitura de gráficos.",
    summary: ["Fração é a relação entre parte e todo.", "Denominador divide o todo; numerador conta as partes.", "Partes iguais são obrigatórias."],
    activityId: "activity-fracoes-01",
    sourceIds: ["bncc-matematica", "openstax-prealgebra"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-02",
    slug: "fracoes-equivalentes",
    moduleSlug: "sentido-das-fracoes",
    title: "Frações equivalentes e simplificação",
    order: 2,
    estimatedMinutes: 16,
    objectives: ["Identificar frações equivalentes", "Simplificar frações", "Usar multiplicação e divisão no numerador e denominador"],
    theory: [
      "Frações equivalentes representam a mesma quantidade escrita de formas diferentes. Se você multiplica ou divide numerador e denominador pelo mesmo número diferente de zero, o valor da fração não muda.",
      "A fração 2/4 é equivalente a 1/2 porque as duas representam metade do todo. Simplificar é escrever a fração equivalente com números menores.",
      "A simplificação ajuda a comparar, calcular e interpretar resultados sem números desnecessariamente grandes.",
    ],
    keyTerms: [
      { term: "Equivalência", definition: "Mesmo valor representado por escritas diferentes." },
      { term: "Simplificar", definition: "Dividir numerador e denominador por um divisor comum." },
    ],
    formulas: [
      {
        formula: "a/b = (a x k)/(b x k)",
        variables: [
          { symbol: "k", meaning: "número diferente de zero usado para criar fração equivalente" },
        ],
        conditions: "Multiplique ou divida os dois termos pelo mesmo valor.",
        example: "3/5 = 6/10, multiplicando numerador e denominador por 2.",
        commonMistake: "Multiplicar apenas o numerador ou apenas o denominador.",
      },
    ],
    examples: [
      {
        title: "Simplificando 18/24",
        statement: "Escreva 18/24 na forma simplificada.",
        solution: "18 e 24 podem ser divididos por 6. Assim, 18/24 = 3/4.",
      },
    ],
    commonMistakes: ["Parar a simplificação antes do final", "Usar divisor que não serve para os dois termos"],
    application: "Simplificar deixa respostas mais claras em provas e reduz erro em cálculos posteriores.",
    summary: ["Equivalentes têm o mesmo valor.", "Sempre altere numerador e denominador juntos.", "Simplificar é procurar divisores comuns."],
    activityId: "activity-fracoes-02",
    sourceIds: ["openstax-prealgebra", "wikibooks-fracoes"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-03",
    slug: "comparar-fracoes",
    moduleSlug: "comparacao-e-decimais",
    title: "Comparação de frações",
    order: 3,
    estimatedMinutes: 16,
    objectives: ["Comparar frações com mesmo denominador", "Comparar frações com denominadores diferentes", "Usar equivalência para decidir maior e menor"],
    theory: [
      "Com denominadores iguais, a comparação é direta: vence o maior numerador, porque as partes têm o mesmo tamanho.",
      "Com denominadores diferentes, transforme as frações em equivalentes com denominador comum ou use multiplicação cruzada.",
      "A comparação deve respeitar o contexto. Em problemas, identifique qual grandeza está sendo comparada antes de calcular.",
    ],
    keyTerms: [
      { term: "Denominador comum", definition: "Mesmo denominador usado para comparar ou somar frações." },
      { term: "Multiplicação cruzada", definition: "Comparação por produtos entre numerador de uma fração e denominador da outra." },
    ],
    formulas: [
      {
        formula: "a/b > c/d quando a x d > c x b",
        variables: [
          { symbol: "a/b", meaning: "primeira fração" },
          { symbol: "c/d", meaning: "segunda fração" },
        ],
        conditions: "Use com denominadores positivos.",
        example: "3/4 > 5/8 porque 3 x 8 = 24 e 5 x 4 = 20.",
        commonMistake: "Comparar apenas numeradores quando os denominadores são diferentes.",
      },
    ],
    examples: [
      {
        title: "Quem é maior: 2/3 ou 3/5?",
        statement: "Compare as frações.",
        solution: "2 x 5 = 10 e 3 x 3 = 9. Como 10 > 9, então 2/3 > 3/5.",
      },
    ],
    commonMistakes: ["Achar que 3/5 é maior que 2/3 porque 5 é maior que 3", "Ignorar denominadores negativos em casos avançados"],
    application: "Comparar frações ajuda em probabilidade, receitas, escalas e porcentagens.",
    summary: ["Mesmo denominador: compare numeradores.", "Denominadores diferentes: use equivalência ou cruzado.", "Interprete antes de calcular."],
    activityId: "activity-fracoes-03",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-04",
    slug: "operacoes-com-fracoes",
    moduleSlug: "operacoes-com-fracoes",
    title: "Soma, subtração, multiplicação e divisão",
    order: 4,
    estimatedMinutes: 22,
    objectives: ["Somar e subtrair frações", "Multiplicar frações", "Dividir por fração usando inverso"],
    theory: [
      "Para somar ou subtrair frações, as partes precisam ter o mesmo tamanho. Por isso usamos denominador comum.",
      "Na multiplicação, multiplicamos numerador por numerador e denominador por denominador. A ideia é calcular uma parte de outra parte.",
      "Dividir por uma fração é multiplicar pelo inverso dela. Isso responde quantos grupos daquele tamanho cabem na quantidade inicial.",
    ],
    keyTerms: [
      { term: "Inverso", definition: "Fração com numerador e denominador trocados." },
      { term: "MMC", definition: "Menor múltiplo comum, útil para denominador comum." },
    ],
    formulas: [
      {
        formula: "a/b + c/b = (a + c)/b",
        variables: [{ symbol: "b", meaning: "denominador comum" }],
        conditions: "Use quando as frações já têm o mesmo denominador.",
        example: "2/7 + 3/7 = 5/7.",
        commonMistake: "Somar denominadores: 2/7 + 3/7 não é 5/14.",
      },
      {
        formula: "(a/b) x (c/d) = (a x c)/(b x d)",
        variables: [{ symbol: "a,b,c,d", meaning: "termos das frações, com b e d diferentes de zero" }],
        conditions: "Use para multiplicar frações.",
        example: "2/3 x 5/4 = 10/12 = 5/6.",
        commonMistake: "Procurar denominador comum na multiplicação sem necessidade.",
      },
    ],
    examples: [
      {
        title: "Soma com denominadores diferentes",
        statement: "Calcule 1/3 + 1/6.",
        solution: "O denominador comum é 6. Então 1/3 = 2/6. Logo, 2/6 + 1/6 = 3/6 = 1/2.",
      },
    ],
    commonMistakes: ["Somar denominadores", "Esquecer de simplificar", "Dividir sem inverter a segunda fração"],
    application: "Operações com frações aparecem em escalas, misturas, tempo, finanças e geometria.",
    summary: ["Soma/subtração pedem denominador comum.", "Multiplicação é direta.", "Divisão usa o inverso da segunda fração."],
    activityId: "activity-fracoes-04",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-05",
    slug: "decimais-e-dizimas",
    moduleSlug: "comparacao-e-decimais",
    title: "Decimais, conversões e dízimas",
    order: 5,
    estimatedMinutes: 18,
    objectives: ["Converter fração em decimal", "Converter decimal finito em fração", "Reconhecer dízima periódica simples"],
    theory: [
      "Todo número decimal nasce de uma divisão. Para converter uma fração em decimal, divida o numerador pelo denominador.",
      "Decimais finitos viram frações com denominador 10, 100, 1000 e assim por diante. Depois, simplifique.",
      "Algumas divisões não acabam e repetem um bloco de algarismos. Isso é uma dízima periódica.",
    ],
    keyTerms: [
      { term: "Decimal finito", definition: "Número decimal que termina." },
      { term: "Dízima periódica", definition: "Decimal infinito com repetição de um bloco." },
    ],
    formulas: [
      {
        formula: "0,25 = 25/100 = 1/4",
        variables: [{ symbol: "25", meaning: "algarismos depois da vírgula lidos como centésimos" }],
        conditions: "Use para decimais finitos.",
        example: "0,4 = 4/10 = 2/5.",
        commonMistake: "Não simplificar a fração obtida.",
      },
    ],
    examples: [
      {
        title: "Convertendo 3/8",
        statement: "Escreva 3/8 em decimal.",
        solution: "3 dividido por 8 = 0,375.",
      },
    ],
    commonMistakes: ["Confundir décimos com centésimos", "Arredondar sem o enunciado pedir", "Trocar vírgula por ponto em resposta final"],
    application: "Decimais aparecem em dinheiro, medidas, porcentagens e calculadoras.",
    summary: ["Fração vira decimal por divisão.", "Decimal finito vira fração decimal.", "Dízima tem repetição."],
    activityId: "activity-fracoes-05",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-06",
    slug: "problemas-com-fracoes",
    moduleSlug: "problemas-e-revisao",
    title: "Problemas com frações e revisão final",
    order: 6,
    estimatedMinutes: 24,
    objectives: ["Traduzir enunciados para frações", "Escolher operação adequada", "Revisar o curso por problemas"],
    theory: [
      "Problemas com frações exigem traduzir palavras em operações. Expressões como 'de', 'restante', 'a mais', 'faltam' e 'total' indicam caminhos diferentes.",
      "Antes de calcular, defina o todo. Muitos erros surgem quando o estudante muda o todo no meio do problema.",
      "Ao finalizar, confira se a resposta faz sentido: uma parte não pode ser maior que o todo, a menos que o contexto permita fração imprópria.",
    ],
    keyTerms: [
      { term: "Todo de referência", definition: "Quantidade inteira usada como base do problema." },
      { term: "Restante", definition: "Parte que sobra após retirar uma fração ou quantidade." },
    ],
    formulas: [
      {
        formula: "parte = fração x total",
        variables: [
          { symbol: "parte", meaning: "quantidade procurada" },
          { symbol: "total", meaning: "todo de referência" },
        ],
        conditions: "Use quando o problema pede uma fração de uma quantidade.",
        example: "3/5 de 40 = 3/5 x 40 = 24.",
        commonMistake: "Multiplicar pelo total errado.",
      },
    ],
    examples: [
      {
        title: "Restante de um trajeto",
        statement: "Uma pessoa percorreu 2/5 de 30 km. Quantos quilômetros faltam?",
        solution: "2/5 de 30 = 12 km percorridos. Faltam 30 - 12 = 18 km.",
      },
    ],
    commonMistakes: ["Não identificar o todo", "Usar soma quando o enunciado pede parte de uma quantidade", "Responder a parte percorrida quando foi pedido o restante"],
    application: "Esse tipo de raciocínio é frequente em ENEM, ETEC e vestibulares por envolver leitura e decisão de estratégia.",
    summary: ["Leia o enunciado procurando o todo.", "Escolha a operação antes de calcular.", "Confira se a resposta é coerente."],
    activityId: "activity-fracoes-06",
    sourceIds: ["bncc-matematica", "openstax-prealgebra"],
    reviewStatus: "draft",
  }),
];

export const jornadaActivities: JornadaActivity[] = [
  {
    id: "activity-fracoes-01",
    slug: "atividade-o-que-e-fracao",
    lessonId: "lesson-fracoes-01",
    title: "Parte de um todo",
    type: "multiple_choice",
    difficulty: "easy",
    prompt: "Um cartaz foi dividido em 6 partes iguais. Quatro partes foram pintadas. Qual fração representa a parte pintada?",
    options: [
      { id: "A", text: "4/6" },
      { id: "B", text: "6/4" },
      { id: "C", text: "2/6" },
      { id: "D", text: "4/10" },
    ],
    answer: "A",
    explanation: "O denominador é 6 porque o todo tem 6 partes iguais. O numerador é 4 porque 4 foram pintadas.",
    hint: "Primeiro identifique o total de partes iguais.",
    sourceIds: ["bncc-matematica"],
    reviewStatus: "draft",
  },
  {
    id: "activity-fracoes-02",
    slug: "atividade-fracoes-equivalentes",
    lessonId: "lesson-fracoes-02",
    title: "Simplificação",
    type: "multiple_choice",
    difficulty: "easy",
    prompt: "A forma simplificada de 15/25 é:",
    options: [
      { id: "A", text: "5/10" },
      { id: "B", text: "3/5" },
      { id: "C", text: "15/5" },
      { id: "D", text: "1/5" },
    ],
    answer: "B",
    explanation: "15 e 25 podem ser divididos por 5. Assim, 15/25 = 3/5.",
    hint: "Procure um divisor comum para 15 e 25.",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  },
  {
    id: "activity-fracoes-03",
    slug: "atividade-comparar-fracoes",
    lessonId: "lesson-fracoes-03",
    title: "Comparação",
    type: "multiple_choice",
    difficulty: "medium",
    prompt: "Qual fração é maior: 5/8 ou 3/4?",
    options: [
      { id: "A", text: "5/8" },
      { id: "B", text: "3/4" },
      { id: "C", text: "São iguais" },
      { id: "D", text: "Não é possível comparar" },
    ],
    answer: "B",
    explanation: "3/4 = 6/8. Como 6/8 é maior que 5/8, então 3/4 é maior.",
    hint: "Transforme 3/4 em uma fração com denominador 8.",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  },
  {
    id: "activity-fracoes-04",
    slug: "atividade-operacoes-fracoes",
    lessonId: "lesson-fracoes-04",
    title: "Operações",
    type: "multiple_choice",
    difficulty: "medium",
    prompt: "Calcule 1/2 + 1/3.",
    options: [
      { id: "A", text: "2/5" },
      { id: "B", text: "1/5" },
      { id: "C", text: "5/6" },
      { id: "D", text: "2/6" },
    ],
    answer: "C",
    explanation: "O denominador comum é 6. Então 1/2 = 3/6 e 1/3 = 2/6. A soma é 5/6.",
    hint: "Use denominador comum antes de somar.",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  },
  {
    id: "activity-fracoes-05",
    slug: "atividade-decimais",
    lessonId: "lesson-fracoes-05",
    title: "Decimal para fração",
    type: "multiple_choice",
    difficulty: "easy",
    prompt: "O decimal 0,75 corresponde a:",
    options: [
      { id: "A", text: "75/10" },
      { id: "B", text: "3/4" },
      { id: "C", text: "7/5" },
      { id: "D", text: "1/75" },
    ],
    answer: "B",
    explanation: "0,75 = 75/100. Simplificando por 25, obtemos 3/4.",
    hint: "Leia 0,75 como setenta e cinco centésimos.",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  },
  {
    id: "activity-fracoes-06",
    slug: "atividade-problemas-fracoes",
    lessonId: "lesson-fracoes-06",
    title: "Problema final",
    type: "multiple_choice",
    difficulty: "medium",
    prompt: "Uma turma tem 36 alunos. Dois terços participaram de uma oficina. Quantos alunos participaram?",
    options: [
      { id: "A", text: "12" },
      { id: "B", text: "18" },
      { id: "C", text: "24" },
      { id: "D", text: "30" },
    ],
    answer: "C",
    explanation: "2/3 de 36 = 2 x 12 = 24. Portanto, 24 alunos participaram.",
    hint: "Calcule uma parte de uma quantidade: fração vezes total.",
    sourceIds: ["bncc-matematica", "openstax-prealgebra"],
    reviewStatus: "draft",
  },
];

const mathFractionsCourse: JornadaCourse = {
  slug: "fracoes-e-decimais",
  title: "Frações e Decimais",
  subjectSlug: "matematica",
  pathSlug: "matematica-basica",
  level: "Base",
  order: 2,
  status: "available",
  description: "Aprenda a interpretar, comparar e calcular com frações e decimais sem decorar regras soltas.",
  objectives: ["Entender fração como parte, divisão e razão", "Operar com frações", "Converter entre fração e decimal", "Resolver problemas autorais"],
  estimatedHours: 2,
  prerequisites: ["Fundamentos Numéricos recomendados"],
  certificateTitle: "Domínio Inicial em Frações e Decimais",
  modules: [
    {
      slug: "sentido-das-fracoes",
      title: "Sentido das frações",
      order: 1,
      description: "Parte-todo, leitura, equivalência e simplificação.",
      prerequisites: [],
      lessons: fracoesLessons.filter((item) => item.moduleSlug === "sentido-das-fracoes"),
    },
    {
      slug: "comparacao-e-decimais",
      title: "Comparação e decimais",
      order: 2,
      description: "Comparar frações e converter escritas.",
      prerequisites: ["sentido-das-fracoes"],
      lessons: fracoesLessons.filter((item) => item.moduleSlug === "comparacao-e-decimais"),
    },
    {
      slug: "operacoes-com-fracoes",
      title: "Operações com frações",
      order: 3,
      description: "Soma, subtração, multiplicação e divisão.",
      prerequisites: ["comparacao-e-decimais"],
      lessons: fracoesLessons.filter((item) => item.moduleSlug === "operacoes-com-fracoes"),
    },
    {
      slug: "problemas-e-revisao",
      title: "Problemas e revisão",
      order: 4,
      description: "Aplicação em enunciados e desafio final.",
      prerequisites: ["operacoes-com-fracoes"],
      lessons: fracoesLessons.filter((item) => item.moduleSlug === "problemas-e-revisao"),
    },
  ],
};

const courseSeed: Array<Omit<JornadaCourse, "modules"> & { moduleCount: number }> = [
  { slug: "fundamentos-numericos", title: "Fundamentos Numéricos", subjectSlug: "matematica", pathSlug: "matematica-basica", level: "Base", order: 1, status: "available", description: "Naturais, inteiros, operações, múltiplos, divisores, MMC e MDC.", objectives: ["Construir base numérica"], estimatedHours: 4, prerequisites: [], certificateTitle: "Base Numérica", moduleCount: 5 },
  { slug: "potencias-e-raizes", title: "Potências e Raízes", subjectSlug: "matematica", pathSlug: "matematica-basica", level: "Base", order: 3, status: "locked", description: "Potenciação, notação científica, radicais e ordem de grandeza.", objectives: ["Operar potências e raízes"], estimatedHours: 3, prerequisites: ["fracoes-e-decimais"], certificateTitle: "Potências e Raízes", moduleCount: 4 },
  { slug: "razao-proporcao", title: "Razão e Proporção", subjectSlug: "matematica", pathSlug: "matematica-basica", level: "Base", order: 4, status: "locked", description: "Regra de três, escalas e grandezas proporcionais.", objectives: ["Resolver proporções"], estimatedHours: 3, prerequisites: ["fracoes-e-decimais"], certificateTitle: "Razão e Proporção", moduleCount: 4 },
  { slug: "porcentagem", title: "Porcentagem", subjectSlug: "matematica", pathSlug: "matematica-basica", level: "Base", order: 5, status: "locked", description: "Aumentos, descontos, variação percentual e juros simples.", objectives: ["Interpretar porcentagens"], estimatedHours: 3, prerequisites: ["razao-proporcao"], certificateTitle: "Porcentagem Aplicada", moduleCount: 4 },
  { slug: "interpretacao-de-texto", title: "Interpretação de Texto", subjectSlug: "linguagens", pathSlug: "leitura-e-linguagens", level: "Base", order: 1, status: "available", description: "Informações explícitas, inferências, finalidade e gênero textual.", objectives: ["Ler com estratégia"], estimatedHours: 4, prerequisites: [], certificateTitle: "Leitura Estratégica", moduleCount: 5 },
  { slug: "redacao-do-zero", title: "Redação do Zero", subjectSlug: "redacao", pathSlug: "redacao-enem", level: "Base", order: 1, status: "available", description: "Tema, tese, parágrafo, argumento e proposta de intervenção.", objectives: ["Montar redação dissertativa"], estimatedHours: 5, prerequisites: [], certificateTitle: "Redação Base", moduleCount: 5 },
  { slug: "fundamentos-para-fisica", title: "Fundamentos para Física", subjectSlug: "fisica", pathSlug: "base-da-fisica", level: "Base", order: 1, status: "available", description: "Unidades, conversões, gráficos, vetores e fórmulas.", objectives: ["Preparar a matemática da física"], estimatedHours: 4, prerequisites: [], certificateTitle: "Base da Física", moduleCount: 4 },
  { slug: "materia-e-estrutura-atomica", title: "Matéria e Estrutura Atômica", subjectSlug: "quimica", pathSlug: "base-da-quimica", level: "Base", order: 1, status: "available", description: "Matéria, misturas, separação, átomos e tabela periódica.", objectives: ["Entender estrutura da matéria"], estimatedHours: 4, prerequisites: [], certificateTitle: "Base da Química", moduleCount: 5 },
  { slug: "citologia", title: "Citologia", subjectSlug: "biologia", pathSlug: "vida-e-celula", level: "Base", order: 1, status: "available", description: "Membrana, organelas, núcleo, metabolismo e divisão celular.", objectives: ["Compreender a célula"], estimatedHours: 5, prerequisites: [], certificateTitle: "Citologia Inicial", moduleCount: 5 },
  { slug: "cartografia-e-mapas", title: "Cartografia e Leitura de Mapas", subjectSlug: "ciencias-humanas", pathSlug: "geografia-e-sociedade", level: "Base", order: 1, status: "available", description: "Orientação, escala, coordenadas, mapas temáticos e território.", objectives: ["Ler mapas e representações"], estimatedHours: 4, prerequisites: [], certificateTitle: "Leitura de Mapas", moduleCount: 4 },
];

export const jornadaCourses: JornadaCourse[] = [
  mathFractionsCourse,
  ...courseSeed.map((item) => ({
    ...item,
    modules: Array.from({ length: item.moduleCount }, (_, index) => ({
      slug: `${item.slug}-modulo-${index + 1}`,
      title: index === 0 ? "Introdução e diagnóstico" : index === item.moduleCount - 1 ? "Aplicação e revisão" : `Módulo ${index + 1}`,
      order: index + 1,
      description: index === 0 ? "Primeiros conceitos e objetivos do curso." : "Conteúdo estruturado para expansão editorial.",
      prerequisites: index === 0 ? [] : [`${item.slug}-modulo-${index}`],
      lessons: [],
    })),
  })),
].sort((a, b) => a.subjectSlug.localeCompare(b.subjectSlug) || a.order - b.order);

export const jornadaPaths: JornadaPath[] = [
  { slug: "matematica-basica", subjectSlug: "matematica", title: "Matemática Básica", level: "Base", order: 1, description: "Fundamentos numéricos, frações, potências, proporção e porcentagem.", status: "available", courseSlugs: ["fundamentos-numericos", "fracoes-e-decimais", "potencias-e-raizes", "razao-proporcao", "porcentagem"] },
  { slug: "leitura-e-linguagens", subjectSlug: "linguagens", title: "Leitura e Linguagens", level: "Base", order: 1, description: "Português, interpretação, literatura, artes e línguas estrangeiras.", status: "available", courseSlugs: ["interpretacao-de-texto"] },
  { slug: "redacao-enem", subjectSlug: "redacao", title: "Redação ENEM", level: "Base", order: 1, description: "Da estrutura ao texto completo com revisão por competências.", status: "available", courseSlugs: ["redacao-do-zero"] },
  { slug: "base-da-fisica", subjectSlug: "fisica", title: "Base da Física", level: "Base", order: 1, description: "Medidas, gráficos, vetores, mecânica e energia.", status: "available", courseSlugs: ["fundamentos-para-fisica"] },
  { slug: "base-da-quimica", subjectSlug: "quimica", title: "Base da Química", level: "Base", order: 1, description: "Matéria, átomos, ligações, cálculos e química ambiental.", status: "available", courseSlugs: ["materia-e-estrutura-atomica"] },
  { slug: "vida-e-celula", subjectSlug: "biologia", title: "Vida e Célula", level: "Base", order: 1, description: "Citologia, genética, ecologia, fisiologia e diversidade.", status: "available", courseSlugs: ["citologia"] },
  { slug: "geografia-e-sociedade", subjectSlug: "ciencias-humanas", title: "Geografia e Sociedade", level: "Base", order: 1, description: "História, geografia, filosofia e sociologia em leitura do mundo.", status: "available", courseSlugs: ["cartografia-e-mapas"] },
];

export const jornadaLevels: JornadaLevel[] = ["Base", "Essencial", "Aplicação", "Estratégia", "Domínio"];

export const jornadaWorlds = jornadaSubjects.map((subject, index) => {
  const subjectCourses = jornadaCourses.filter((course) => course.subjectSlug === subject.slug);
  const modules = subjectCourses.reduce((sum, course) => sum + course.modules.length, 0);
  const lessons = subjectCourses.reduce(
    (sum, course) => sum + course.modules.reduce((moduleSum, courseModule) => moduleSum + courseModule.lessons.length, 0),
    0,
  );
  return {
    ...subject,
    courses: subjectCourses.length,
    modules,
    lessons,
    estimatedHours: subjectCourses.reduce((sum, course) => sum + course.estimatedHours, 0),
    currentLevel: "Base" as JornadaLevel,
    status: index < 7 ? "available" as JornadaStatus : "locked" as JornadaStatus,
  };
});

export function getJornadaPath(subjectSlug: string, pathSlug: string) {
  return jornadaPaths.find((path) => path.subjectSlug === subjectSlug && path.slug === pathSlug) ?? null;
}

export function getJornadaCourse(subjectSlug: string, pathSlug: string, courseSlug: string) {
  return jornadaCourses.find((course) => course.subjectSlug === subjectSlug && course.pathSlug === pathSlug && course.slug === courseSlug) ?? null;
}

export function getJornadaModule(subjectSlug: string, pathSlug: string, courseSlug: string, moduleSlug: string) {
  const course = getJornadaCourse(subjectSlug, pathSlug, courseSlug);
  return course?.modules.find((courseModule) => courseModule.slug === moduleSlug) ?? null;
}

export function getJornadaLesson(lessonSlug: string) {
  for (const course of jornadaCourses) {
    for (const courseModule of course.modules) {
      const found = courseModule.lessons.find((lessonItem) => lessonItem.slug === lessonSlug);
      if (found) return { lesson: found, module: courseModule, course, subject: jornadaSubjects.find((subject) => subject.slug === course.subjectSlug)! };
    }
  }
  return null;
}

export function getJornadaActivity(activitySlug: string) {
  const activity = jornadaActivities.find((item) => item.slug === activitySlug);
  if (!activity) return null;
  const lessonBundle = getJornadaLessonById(activity.lessonId);
  return lessonBundle ? { activity, ...lessonBundle } : null;
}

export function getJornadaActivityById(activityId: string) {
  const activity = jornadaActivities.find((item) => item.id === activityId);
  if (!activity) return null;
  const lessonBundle = getJornadaLessonById(activity.lessonId);
  return lessonBundle ? { activity, ...lessonBundle } : null;
}

export function getJornadaLessonById(lessonId: string) {
  for (const course of jornadaCourses) {
    for (const courseModule of course.modules) {
      const found = courseModule.lessons.find((lessonItem) => lessonItem.id === lessonId);
      if (found) return { lesson: found, module: courseModule, course, subject: jornadaSubjects.find((subject) => subject.slug === course.subjectSlug)! };
    }
  }
  return null;
}

export function courseLessonCount(course: JornadaCourse) {
  return course.modules.reduce((sum, courseModule) => sum + courseModule.lessons.length, 0);
}

export function courseActivityCount(course: JornadaCourse) {
  return course.modules.reduce((sum, courseModule) => sum + courseModule.lessons.filter((lessonItem) => lessonItem.activityId).length, 0);
}
