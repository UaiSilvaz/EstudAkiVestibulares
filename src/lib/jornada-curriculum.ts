import { jornadaSubjects, type JornadaSubjectSlug } from "@/lib/jornada-subjects";

export type JornadaStatus = "available" | "locked" | "completed";
export type JornadaLevel = "Base" | "Essencial" | "Aplicacao" | "Estrategia" | "Dominio";

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
    title: "Base Nacional Comum Curricular - Ensino Medio",
    organization: "Ministerio da Educacao",
    url: "https://www.gov.br/mec/pt-br/escola-em-tempo-integral/BNCC_EI_EF_110518_versaofinal.pdf",
    sourceType: "official_document",
    subject: "geral",
    accessedAt: sourceAccessDate,
    licenseName: "Documento publico governamental",
    licenseStatus: "needs_human_review",
    allowedUsage: "Referencia curricular e habilidades; conteudo EstudAki escrito de forma original.",
    attributionText: "Referencia curricular: Ministerio da Educacao, BNCC.",
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
    allowedUsage: "Referencia conceitual aberta; explicacoes e exercicios EstudAki autorais.",
    attributionText: "OpenStax, Prealgebra 2e, CC BY 4.0.",
    reviewStatus: "draft",
  },
  {
    id: "wikibooks-fracoes",
    title: "Matematica elementar - fracoes",
    organization: "Wikibooks",
    url: "https://pt.wikibooks.org/wiki/Matematica_elementar/Frac%C3%A7%C3%B5es",
    sourceType: "open_education",
    subject: "matematica",
    accessedAt: sourceAccessDate,
    licenseName: "Creative Commons Attribution-ShareAlike",
    licenseStatus: "needs_human_review",
    allowedUsage: "Referencia complementar; nao copiar forma de expressao.",
    attributionText: "Wikibooks, Matematica elementar/Fracoes.",
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
    title: "O que uma fracao representa",
    order: 1,
    estimatedMinutes: 14,
    objectives: ["Ler numerador e denominador", "Interpretar fracao como parte de um todo", "Reconhecer fracao em situacoes reais"],
    theory: [
      "Uma fracao compara uma quantidade escolhida com o total de partes iguais. Em 3/5, o denominador 5 indica em quantas partes iguais o todo foi dividido; o numerador 3 indica quantas partes foram consideradas.",
      "A ideia central e igualdade das partes. Se uma pizza e cortada em pedacos de tamanhos diferentes, dizer que um pedaco vale 1/4 pode ser errado, porque quartos precisam ter o mesmo tamanho.",
      "Fracao tambem pode representar divisao. A escrita 3/5 indica 3 dividido por 5, ou seja, cada unidade foi repartida em cinco partes iguais.",
    ],
    keyTerms: [
      { term: "Numerador", definition: "Numero de partes consideradas." },
      { term: "Denominador", definition: "Numero de partes iguais em que o todo foi dividido." },
      { term: "Todo", definition: "Quantidade inteira usada como referencia." },
    ],
    formulas: [
      {
        formula: "a / b = a dividido por b, com b diferente de 0",
        variables: [
          { symbol: "a", meaning: "numerador" },
          { symbol: "b", meaning: "denominador" },
        ],
        conditions: "Use quando o todo foi separado em partes iguais. O denominador nao pode ser zero.",
        example: "3/4 significa 3 partes de um total de 4 partes iguais.",
        commonMistake: "Comparar fracoes sem garantir que o todo e o mesmo.",
      },
    ],
    examples: [
      {
        title: "Leitura de uma imagem mental",
        statement: "Um reservatorio foi dividido em 8 marcas iguais e a agua chegou ate a quinta marca. Que fracao esta cheia?",
        solution: "O total tem 8 partes iguais e 5 estao preenchidas. A fracao e 5/8.",
      },
    ],
    commonMistakes: ["Achar que denominador maior sempre significa fracao maior", "Esquecer que as partes precisam ter o mesmo tamanho"],
    application: "Fracoes aparecem em receitas, escalas, descontos, medidas de tempo e leitura de graficos.",
    summary: ["Fracao e relacao entre parte e todo.", "Denominador divide o todo; numerador conta as partes.", "Partes iguais sao obrigatorias."],
    activityId: "activity-fracoes-01",
    sourceIds: ["bncc-matematica", "openstax-prealgebra"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-02",
    slug: "fracoes-equivalentes",
    moduleSlug: "sentido-das-fracoes",
    title: "Fracoes equivalentes e simplificacao",
    order: 2,
    estimatedMinutes: 16,
    objectives: ["Identificar fracoes equivalentes", "Simplificar fracoes", "Usar multiplicacao e divisao no numerador e denominador"],
    theory: [
      "Fracoes equivalentes representam a mesma quantidade escrita de formas diferentes. Se voce multiplica ou divide numerador e denominador pelo mesmo numero diferente de zero, o valor da fracao nao muda.",
      "A fracao 2/4 e equivalente a 1/2 porque as duas representam metade do todo. Simplificar e escrever a fracao equivalente com numeros menores.",
      "A simplificacao ajuda a comparar, calcular e interpretar resultados sem numeros desnecessariamente grandes.",
    ],
    keyTerms: [
      { term: "Equivalencia", definition: "Mesmo valor representado por escritas diferentes." },
      { term: "Simplificar", definition: "Dividir numerador e denominador por um divisor comum." },
    ],
    formulas: [
      {
        formula: "a/b = (a x k)/(b x k)",
        variables: [
          { symbol: "k", meaning: "numero diferente de zero usado para criar fracao equivalente" },
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
    commonMistakes: ["Parar a simplificacao antes do final", "Usar divisor que nao serve para os dois termos"],
    application: "Simplificar deixa respostas mais claras em provas e reduz erro em calculos posteriores.",
    summary: ["Equivalentes tem o mesmo valor.", "Sempre altere numerador e denominador juntos.", "Simplificar e procurar divisores comuns."],
    activityId: "activity-fracoes-02",
    sourceIds: ["openstax-prealgebra", "wikibooks-fracoes"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-03",
    slug: "comparar-fracoes",
    moduleSlug: "comparacao-e-decimais",
    title: "Comparacao de fracoes",
    order: 3,
    estimatedMinutes: 16,
    objectives: ["Comparar fracoes com mesmo denominador", "Comparar fracoes com denominadores diferentes", "Usar equivalencia para decidir maior e menor"],
    theory: [
      "Com denominadores iguais, a comparacao e direta: vence o maior numerador, porque as partes tem o mesmo tamanho.",
      "Com denominadores diferentes, transforme as fracoes em equivalentes com denominador comum ou use multiplicacao cruzada.",
      "A comparacao deve respeitar o contexto. Em problemas, identifique qual grandeza esta sendo comparada antes de calcular.",
    ],
    keyTerms: [
      { term: "Denominador comum", definition: "Mesmo denominador usado para comparar ou somar fracoes." },
      { term: "Multiplicacao cruzada", definition: "Comparacao por produtos entre numerador de uma fracao e denominador da outra." },
    ],
    formulas: [
      {
        formula: "a/b > c/d quando a x d > c x b",
        variables: [
          { symbol: "a/b", meaning: "primeira fracao" },
          { symbol: "c/d", meaning: "segunda fracao" },
        ],
        conditions: "Use com denominadores positivos.",
        example: "3/4 > 5/8 porque 3 x 8 = 24 e 5 x 4 = 20.",
        commonMistake: "Comparar apenas numeradores quando os denominadores sao diferentes.",
      },
    ],
    examples: [
      {
        title: "Quem e maior: 2/3 ou 3/5?",
        statement: "Compare as fracoes.",
        solution: "2 x 5 = 10 e 3 x 3 = 9. Como 10 > 9, entao 2/3 > 3/5.",
      },
    ],
    commonMistakes: ["Achar que 3/5 e maior que 2/3 porque 5 e maior que 3", "Ignorar denominadores negativos em casos avancados"],
    application: "Comparar fracoes ajuda em probabilidade, receitas, escalas e porcentagens.",
    summary: ["Mesmo denominador: compare numeradores.", "Denominadores diferentes: use equivalencia ou cruzado.", "Interprete antes de calcular."],
    activityId: "activity-fracoes-03",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-04",
    slug: "operacoes-com-fracoes",
    moduleSlug: "operacoes-com-fracoes",
    title: "Soma, subtracao, multiplicacao e divisao",
    order: 4,
    estimatedMinutes: 22,
    objectives: ["Somar e subtrair fracoes", "Multiplicar fracoes", "Dividir por fracao usando inverso"],
    theory: [
      "Para somar ou subtrair fracoes, as partes precisam ter o mesmo tamanho. Por isso usamos denominador comum.",
      "Na multiplicacao, multiplicamos numerador por numerador e denominador por denominador. A ideia e calcular uma parte de outra parte.",
      "Dividir por uma fracao e multiplicar pelo inverso dela. Isso responde quantos grupos daquele tamanho cabem na quantidade inicial.",
    ],
    keyTerms: [
      { term: "Inverso", definition: "Fracao com numerador e denominador trocados." },
      { term: "MMC", definition: "Menor multiplo comum, util para denominador comum." },
    ],
    formulas: [
      {
        formula: "a/b + c/b = (a + c)/b",
        variables: [{ symbol: "b", meaning: "denominador comum" }],
        conditions: "Use quando as fracoes ja tem o mesmo denominador.",
        example: "2/7 + 3/7 = 5/7.",
        commonMistake: "Somar denominadores: 2/7 + 3/7 nao e 5/14.",
      },
      {
        formula: "(a/b) x (c/d) = (a x c)/(b x d)",
        variables: [{ symbol: "a,b,c,d", meaning: "termos das fracoes, com b e d diferentes de zero" }],
        conditions: "Use para multiplicar fracoes.",
        example: "2/3 x 5/4 = 10/12 = 5/6.",
        commonMistake: "Procurar denominador comum na multiplicacao sem necessidade.",
      },
    ],
    examples: [
      {
        title: "Soma com denominadores diferentes",
        statement: "Calcule 1/3 + 1/6.",
        solution: "O denominador comum e 6. Entao 1/3 = 2/6. Logo, 2/6 + 1/6 = 3/6 = 1/2.",
      },
    ],
    commonMistakes: ["Somar denominadores", "Esquecer de simplificar", "Dividir sem inverter a segunda fracao"],
    application: "Operacoes com fracoes aparecem em escalas, misturas, tempo, financas e geometria.",
    summary: ["Soma/subtracao pedem denominador comum.", "Multiplicacao e direta.", "Divisao usa o inverso da segunda fracao."],
    activityId: "activity-fracoes-04",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-05",
    slug: "decimais-e-dizimas",
    moduleSlug: "comparacao-e-decimais",
    title: "Decimais, conversoes e dizimas",
    order: 5,
    estimatedMinutes: 18,
    objectives: ["Converter fracao em decimal", "Converter decimal finito em fracao", "Reconhecer dizima periodica simples"],
    theory: [
      "Todo numero decimal nasce de uma divisao. Para converter uma fracao em decimal, divida o numerador pelo denominador.",
      "Decimais finitos viram fracoes com denominador 10, 100, 1000 e assim por diante. Depois, simplifique.",
      "Algumas divisoes nao acabam e repetem um bloco de algarismos. Isso e uma dizima periodica.",
    ],
    keyTerms: [
      { term: "Decimal finito", definition: "Numero decimal que termina." },
      { term: "Dizima periodica", definition: "Decimal infinito com repeticao de um bloco." },
    ],
    formulas: [
      {
        formula: "0,25 = 25/100 = 1/4",
        variables: [{ symbol: "25", meaning: "algarismos depois da virgula lidos como centesimos" }],
        conditions: "Use para decimais finitos.",
        example: "0,4 = 4/10 = 2/5.",
        commonMistake: "Nao simplificar a fracao obtida.",
      },
    ],
    examples: [
      {
        title: "Convertendo 3/8",
        statement: "Escreva 3/8 em decimal.",
        solution: "3 dividido por 8 = 0,375.",
      },
    ],
    commonMistakes: ["Confundir decimos com centesimos", "Arredondar sem o enunciado pedir", "Trocar virgula por ponto em resposta final"],
    application: "Decimais aparecem em dinheiro, medidas, porcentagens e calculadoras.",
    summary: ["Fracao vira decimal por divisao.", "Decimal finito vira fracao decimal.", "Dizima tem repeticao."],
    activityId: "activity-fracoes-05",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  }),
  lesson({
    id: "lesson-fracoes-06",
    slug: "problemas-com-fracoes",
    moduleSlug: "problemas-e-revisao",
    title: "Problemas com fracoes e revisao final",
    order: 6,
    estimatedMinutes: 24,
    objectives: ["Traduzir enunciados para fracoes", "Escolher operacao adequada", "Revisar o curso por problemas"],
    theory: [
      "Problemas com fracoes exigem traduzir palavras em operacoes. Expressoes como 'de', 'restante', 'a mais', 'faltam' e 'total' indicam caminhos diferentes.",
      "Antes de calcular, defina o todo. Muitos erros surgem quando o estudante muda o todo no meio do problema.",
      "Ao finalizar, confira se a resposta faz sentido: uma parte nao pode ser maior que o todo, a menos que o contexto permita fracao impropria.",
    ],
    keyTerms: [
      { term: "Todo de referencia", definition: "Quantidade inteira usada como base do problema." },
      { term: "Restante", definition: "Parte que sobra apos retirar uma fracao ou quantidade." },
    ],
    formulas: [
      {
        formula: "parte = fracao x total",
        variables: [
          { symbol: "parte", meaning: "quantidade procurada" },
          { symbol: "total", meaning: "todo de referencia" },
        ],
        conditions: "Use quando o problema pede uma fracao de uma quantidade.",
        example: "3/5 de 40 = 3/5 x 40 = 24.",
        commonMistake: "Multiplicar pelo total errado.",
      },
    ],
    examples: [
      {
        title: "Restante de um trajeto",
        statement: "Uma pessoa percorreu 2/5 de 30 km. Quantos quilometros faltam?",
        solution: "2/5 de 30 = 12 km percorridos. Faltam 30 - 12 = 18 km.",
      },
    ],
    commonMistakes: ["Nao identificar o todo", "Usar soma quando o enunciado pede parte de uma quantidade", "Responder a parte percorrida quando foi pedido o restante"],
    application: "Esse tipo de raciocinio e frequente em ENEM, ETEC e vestibulares por envolver leitura e decisao de estrategia.",
    summary: ["Leia o enunciado procurando o todo.", "Escolha a operacao antes de calcular.", "Confira se a resposta e coerente."],
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
    prompt: "Um cartaz foi dividido em 6 partes iguais. Quatro partes foram pintadas. Qual fracao representa a parte pintada?",
    options: [
      { id: "A", text: "4/6" },
      { id: "B", text: "6/4" },
      { id: "C", text: "2/6" },
      { id: "D", text: "4/10" },
    ],
    answer: "A",
    explanation: "O denominador e 6 porque o todo tem 6 partes iguais. O numerador e 4 porque 4 foram pintadas.",
    hint: "Primeiro identifique o total de partes iguais.",
    sourceIds: ["bncc-matematica"],
    reviewStatus: "draft",
  },
  {
    id: "activity-fracoes-02",
    slug: "atividade-fracoes-equivalentes",
    lessonId: "lesson-fracoes-02",
    title: "Simplificacao",
    type: "multiple_choice",
    difficulty: "easy",
    prompt: "A forma simplificada de 15/25 e:",
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
    title: "Comparacao",
    type: "multiple_choice",
    difficulty: "medium",
    prompt: "Qual fracao e maior: 5/8 ou 3/4?",
    options: [
      { id: "A", text: "5/8" },
      { id: "B", text: "3/4" },
      { id: "C", text: "Sao iguais" },
      { id: "D", text: "Nao e possivel comparar" },
    ],
    answer: "B",
    explanation: "3/4 = 6/8. Como 6/8 e maior que 5/8, entao 3/4 e maior.",
    hint: "Transforme 3/4 em uma fracao com denominador 8.",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  },
  {
    id: "activity-fracoes-04",
    slug: "atividade-operacoes-fracoes",
    lessonId: "lesson-fracoes-04",
    title: "Operacoes",
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
    explanation: "O denominador comum e 6. Entao 1/2 = 3/6 e 1/3 = 2/6. A soma e 5/6.",
    hint: "Use denominador comum antes de somar.",
    sourceIds: ["openstax-prealgebra"],
    reviewStatus: "draft",
  },
  {
    id: "activity-fracoes-05",
    slug: "atividade-decimais",
    lessonId: "lesson-fracoes-05",
    title: "Decimal para fracao",
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
    hint: "Leia 0,75 como setenta e cinco centesimos.",
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
    prompt: "Uma turma tem 36 alunos. Dois tercos participaram de uma oficina. Quantos alunos participaram?",
    options: [
      { id: "A", text: "12" },
      { id: "B", text: "18" },
      { id: "C", text: "24" },
      { id: "D", text: "30" },
    ],
    answer: "C",
    explanation: "2/3 de 36 = 2 x 12 = 24. Portanto, 24 alunos participaram.",
    hint: "Calcule uma parte de uma quantidade: fracao vezes total.",
    sourceIds: ["bncc-matematica", "openstax-prealgebra"],
    reviewStatus: "draft",
  },
];

const mathFractionsCourse: JornadaCourse = {
  slug: "fracoes-e-decimais",
  title: "Fracoes e Decimais",
  subjectSlug: "matematica",
  pathSlug: "matematica-basica",
  level: "Base",
  order: 2,
  status: "available",
  description: "Aprenda a interpretar, comparar e calcular com fracoes e decimais sem decorar regras soltas.",
  objectives: ["Entender fracao como parte, divisao e razao", "Operar com fracoes", "Converter entre fracao e decimal", "Resolver problemas autorais"],
  estimatedHours: 2,
  prerequisites: ["Fundamentos Numericos recomendados"],
  certificateTitle: "Dominio Inicial em Fracoes e Decimais",
  modules: [
    {
      slug: "sentido-das-fracoes",
      title: "Sentido das fracoes",
      order: 1,
      description: "Parte-todo, leitura, equivalencia e simplificacao.",
      prerequisites: [],
      lessons: fracoesLessons.filter((item) => item.moduleSlug === "sentido-das-fracoes"),
    },
    {
      slug: "comparacao-e-decimais",
      title: "Comparacao e decimais",
      order: 2,
      description: "Comparar fracoes e converter escritas.",
      prerequisites: ["sentido-das-fracoes"],
      lessons: fracoesLessons.filter((item) => item.moduleSlug === "comparacao-e-decimais"),
    },
    {
      slug: "operacoes-com-fracoes",
      title: "Operacoes com fracoes",
      order: 3,
      description: "Soma, subtracao, multiplicacao e divisao.",
      prerequisites: ["comparacao-e-decimais"],
      lessons: fracoesLessons.filter((item) => item.moduleSlug === "operacoes-com-fracoes"),
    },
    {
      slug: "problemas-e-revisao",
      title: "Problemas e revisao",
      order: 4,
      description: "Aplicacao em enunciados e desafio final.",
      prerequisites: ["operacoes-com-fracoes"],
      lessons: fracoesLessons.filter((item) => item.moduleSlug === "problemas-e-revisao"),
    },
  ],
};

const courseSeed: Array<Omit<JornadaCourse, "modules"> & { moduleCount: number }> = [
  { slug: "fundamentos-numericos", title: "Fundamentos Numericos", subjectSlug: "matematica", pathSlug: "matematica-basica", level: "Base", order: 1, status: "available", description: "Naturais, inteiros, operacoes, multiplos, divisores, MMC e MDC.", objectives: ["Construir base numerica"], estimatedHours: 4, prerequisites: [], certificateTitle: "Base Numerica", moduleCount: 5 },
  { slug: "potencias-e-raizes", title: "Potencias e Raizes", subjectSlug: "matematica", pathSlug: "matematica-basica", level: "Base", order: 3, status: "locked", description: "Potenciacao, notacao cientifica, radicais e ordem de grandeza.", objectives: ["Operar potencias e raizes"], estimatedHours: 3, prerequisites: ["fracoes-e-decimais"], certificateTitle: "Potencias e Raizes", moduleCount: 4 },
  { slug: "razao-proporcao", title: "Razao e Proporcao", subjectSlug: "matematica", pathSlug: "matematica-basica", level: "Base", order: 4, status: "locked", description: "Regra de tres, escalas e grandezas proporcionais.", objectives: ["Resolver proporcoes"], estimatedHours: 3, prerequisites: ["fracoes-e-decimais"], certificateTitle: "Razao e Proporcao", moduleCount: 4 },
  { slug: "porcentagem", title: "Porcentagem", subjectSlug: "matematica", pathSlug: "matematica-basica", level: "Base", order: 5, status: "locked", description: "Aumentos, descontos, variacao percentual e juros simples.", objectives: ["Interpretar porcentagens"], estimatedHours: 3, prerequisites: ["razao-proporcao"], certificateTitle: "Porcentagem Aplicada", moduleCount: 4 },
  { slug: "interpretacao-de-texto", title: "Interpretacao de Texto", subjectSlug: "linguagens", pathSlug: "leitura-e-linguagens", level: "Base", order: 1, status: "available", description: "Informacoes explicitas, inferencias, finalidade e genero textual.", objectives: ["Ler com estrategia"], estimatedHours: 4, prerequisites: [], certificateTitle: "Leitura Estrategica", moduleCount: 5 },
  { slug: "redacao-do-zero", title: "Redacao do Zero", subjectSlug: "redacao", pathSlug: "redacao-enem", level: "Base", order: 1, status: "available", description: "Tema, tese, paragrafo, argumento e proposta de intervencao.", objectives: ["Montar redacao dissertativa"], estimatedHours: 5, prerequisites: [], certificateTitle: "Redacao Base", moduleCount: 5 },
  { slug: "fundamentos-para-fisica", title: "Fundamentos para Fisica", subjectSlug: "fisica", pathSlug: "base-da-fisica", level: "Base", order: 1, status: "available", description: "Unidades, conversoes, graficos, vetores e formulas.", objectives: ["Preparar a matematica da fisica"], estimatedHours: 4, prerequisites: [], certificateTitle: "Base da Fisica", moduleCount: 4 },
  { slug: "materia-e-estrutura-atomica", title: "Materia e Estrutura Atomica", subjectSlug: "quimica", pathSlug: "base-da-quimica", level: "Base", order: 1, status: "available", description: "Materia, misturas, separacao, atomos e tabela periodica.", objectives: ["Entender estrutura da materia"], estimatedHours: 4, prerequisites: [], certificateTitle: "Base da Quimica", moduleCount: 5 },
  { slug: "citologia", title: "Citologia", subjectSlug: "biologia", pathSlug: "vida-e-celula", level: "Base", order: 1, status: "available", description: "Membrana, organelas, nucleo, metabolismo e divisao celular.", objectives: ["Compreender a celula"], estimatedHours: 5, prerequisites: [], certificateTitle: "Citologia Inicial", moduleCount: 5 },
  { slug: "cartografia-e-mapas", title: "Cartografia e Leitura de Mapas", subjectSlug: "ciencias-humanas", pathSlug: "geografia-e-sociedade", level: "Base", order: 1, status: "available", description: "Orientacao, escala, coordenadas, mapas tematicos e territorio.", objectives: ["Ler mapas e representacoes"], estimatedHours: 4, prerequisites: [], certificateTitle: "Leitura de Mapas", moduleCount: 4 },
];

export const jornadaCourses: JornadaCourse[] = [
  mathFractionsCourse,
  ...courseSeed.map((item) => ({
    ...item,
    modules: Array.from({ length: item.moduleCount }, (_, index) => ({
      slug: `${item.slug}-modulo-${index + 1}`,
      title: index === 0 ? "Introducao e diagnostico" : index === item.moduleCount - 1 ? "Aplicacao e revisao" : `Modulo ${index + 1}`,
      order: index + 1,
      description: index === 0 ? "Primeiros conceitos e objetivos do curso." : "Conteudo estruturado para expansao editorial.",
      prerequisites: index === 0 ? [] : [`${item.slug}-modulo-${index}`],
      lessons: [],
    })),
  })),
].sort((a, b) => a.subjectSlug.localeCompare(b.subjectSlug) || a.order - b.order);

export const jornadaPaths: JornadaPath[] = [
  { slug: "matematica-basica", subjectSlug: "matematica", title: "Matematica Basica", level: "Base", order: 1, description: "Fundamentos numericos, fracoes, potencias, proporcao e porcentagem.", status: "available", courseSlugs: ["fundamentos-numericos", "fracoes-e-decimais", "potencias-e-raizes", "razao-proporcao", "porcentagem"] },
  { slug: "leitura-e-linguagens", subjectSlug: "linguagens", title: "Leitura e Linguagens", level: "Base", order: 1, description: "Portugues, interpretacao, literatura, artes e linguas estrangeiras.", status: "available", courseSlugs: ["interpretacao-de-texto"] },
  { slug: "redacao-enem", subjectSlug: "redacao", title: "Redacao ENEM", level: "Base", order: 1, description: "Da estrutura ao texto completo com revisao por competencias.", status: "available", courseSlugs: ["redacao-do-zero"] },
  { slug: "base-da-fisica", subjectSlug: "fisica", title: "Base da Fisica", level: "Base", order: 1, description: "Medidas, graficos, vetores, mecanica e energia.", status: "available", courseSlugs: ["fundamentos-para-fisica"] },
  { slug: "base-da-quimica", subjectSlug: "quimica", title: "Base da Quimica", level: "Base", order: 1, description: "Materia, atomos, ligacoes, calculos e quimica ambiental.", status: "available", courseSlugs: ["materia-e-estrutura-atomica"] },
  { slug: "vida-e-celula", subjectSlug: "biologia", title: "Vida e Celula", level: "Base", order: 1, description: "Citologia, genetica, ecologia, fisiologia e diversidade.", status: "available", courseSlugs: ["citologia"] },
  { slug: "geografia-e-sociedade", subjectSlug: "ciencias-humanas", title: "Geografia e Sociedade", level: "Base", order: 1, description: "Historia, geografia, filosofia e sociologia em leitura do mundo.", status: "available", courseSlugs: ["cartografia-e-mapas"] },
];

export const jornadaLevels: JornadaLevel[] = ["Base", "Essencial", "Aplicacao", "Estrategia", "Dominio"];

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
