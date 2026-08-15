export const AUTHORIAL_NOTICE =
  "Questão autoral elaborada para fins educacionais. Não se trata de uma questão oficial do ENEM, do INEP ou do Ministério da Educação.";

export const ENEM_MATRIX_URL =
  "https://download.inep.gov.br/enem/outros_documentos/enem_matriz_referencia.pdf";

export const AREA_CODES = {
  "Linguagens, Códigos e suas Tecnologias": "LC",
  "Ciências Humanas e suas Tecnologias": "CH",
  "Ciências da Natureza e suas Tecnologias": "CN",
  "Matemática e suas Tecnologias": "MT",
} as const;

const MATRIX_SKILL_RANGES: Record<(typeof AREA_CODES)[keyof typeof AREA_CODES], Record<number, [number, number]>> = {
  LC: { 1: [1, 4], 2: [5, 8], 3: [9, 11], 4: [12, 14], 5: [15, 17], 6: [18, 20], 7: [21, 24], 8: [25, 27], 9: [28, 30] },
  CH: { 1: [1, 5], 2: [6, 10], 3: [11, 15], 4: [16, 20], 5: [21, 25], 6: [26, 30] },
  CN: { 1: [1, 4], 2: [5, 7], 3: [8, 12], 4: [13, 16], 5: [17, 19], 6: [20, 23], 7: [24, 27], 8: [28, 30] },
  MT: { 1: [1, 5], 2: [6, 9], 3: [10, 14], 4: [15, 18], 5: [19, 23], 6: [24, 26], 7: [27, 30] },
};

export type EditorialArea = keyof typeof AREA_CODES;
export type EditorialDifficulty = "EASY" | "MEDIUM" | "HARD";
export type AlternativeKey = "A" | "B" | "C" | "D" | "E";

export type EditorialCredits = {
  source: string;
  title: string;
  author: string;
  license: string;
  url: string | null;
  accessedAt: string | null;
};

export type EditorialResource = {
  kind: "none" | "authorial_text" | "hypothetical_table" | "hypothetical_chart" | "authorial_diagram";
  title: string | null;
  content: string | null;
  dataNote: string | null;
  credits: EditorialCredits;
};

export type EditorialAlternative = {
  key: AlternativeKey;
  text: string;
  correct: boolean;
  analysis: string;
};

export type EditorialCalculation = {
  formula: string;
  substitution: string;
  intermediateSteps: string[];
  result: string;
  unit: string | null;
  interpretation: string;
};

export type EditorialQuestion = {
  id: string;
  area: EditorialArea;
  discipline: string;
  primaryContent: string;
  secondaryContent: string | null;
  competency: {
    code: string;
    description: string;
  };
  skill: {
    code: string;
    description: string;
  };
  cognitiveAxes: string[];
  difficulty: EditorialDifficulty;
  estimatedMinutes: number;
  interdisciplinarity: {
    present: boolean;
    areas: string[];
    description: string;
  };
  keywords: string[];
  supportText: string;
  resource: EditorialResource;
  prompt: string;
  alternatives: EditorialAlternative[];
  answer: AlternativeKey;
  solution: {
    relevantInformation: string[];
    concept: string;
    development: string[];
    calculations: EditorialCalculation[];
    answerJustification: string;
    commonErrors: string[];
    efficientStrategy: string;
  };
  expectedReasoning: string[];
  mostLikelyError: string;
  originalityVerification: string;
  notice: string;
};

function compact(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function wordCount(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

export function validateEditorialQuestion(question: EditorialQuestion) {
  const reasons: string[] = [];
  const prefix = AREA_CODES[question.area];
  const expectedKeys: AlternativeKey[] = ["A", "B", "C", "D", "E"];
  const actualKeys = question.alternatives.map((item) => item.key);
  const correct = question.alternatives.filter((item) => item.correct);
  const content = [
    question.supportText,
    question.resource.content ?? "",
    question.prompt,
    ...question.alternatives.map((item) => item.text),
  ].join(" ");

  if (!/^estudaki-enem-autoral-2026-[a-z]{2}-\d{3}$/u.test(question.id)) reasons.push("id_invalido");
  if (!prefix) reasons.push("area_invalida");
  if (!question.competency.code.startsWith(`${prefix}-C`)) reasons.push("competencia_fora_da_area");
  if (!question.skill.code.startsWith(`${prefix}-H`)) reasons.push("habilidade_fora_da_area");
  const competencyNumber = Number(question.competency.code.match(/-C(\d+)$/u)?.[1]);
  const skillNumber = Number(question.skill.code.match(/-H(\d+)$/u)?.[1]);
  const skillRange = prefix ? MATRIX_SKILL_RANGES[prefix][competencyNumber] : undefined;
  if (!skillRange || skillNumber < skillRange[0] || skillNumber > skillRange[1]) reasons.push("habilidade_incompativel_com_competencia");
  if (compact(question.competency.description).length < 45) reasons.push("competencia_sem_descricao");
  if (compact(question.skill.description).length < 45) reasons.push("habilidade_sem_descricao");
  if (compact(question.primaryContent).length < 4 || compact(question.discipline).length < 4) reasons.push("classificacao_incompleta");
  if (!["EASY", "MEDIUM", "HARD"].includes(question.difficulty)) reasons.push("dificuldade_invalida");
  if (!Number.isFinite(question.estimatedMinutes) || question.estimatedMinutes < 2 || question.estimatedMinutes > 8) reasons.push("tempo_invalido");
  if (question.cognitiveAxes.length === 0) reasons.push("eixo_cognitivo_ausente");
  if (question.keywords.length < 5 || new Set(question.keywords.map((item) => item.toLowerCase())).size !== question.keywords.length) reasons.push("palavras_chave_insuficientes_ou_repetidas");
  if (wordCount(question.supportText) < 35) reasons.push("texto_apoio_curto");
  if (wordCount(question.supportText) + wordCount(question.prompt) > 280) reasons.push("enunciado_excessivamente_longo");
  if (compact(question.prompt).length < 120) reasons.push("comando_curto");
  if (question.alternatives.length !== 5 || JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) reasons.push("alternativas_fora_do_padrao");
  if (correct.length !== 1 || correct[0]?.key !== question.answer) reasons.push("gabarito_inconsistente");
  if (new Set(question.alternatives.map((item) => item.text.trim().toLowerCase())).size !== 5) reasons.push("alternativas_duplicadas");
  if (question.alternatives.some((item) => compact(item.text).length < 4)) reasons.push("alternativa_curta");
  if (question.alternatives.some((item) => compact(item.analysis).length < 70)) reasons.push("analise_de_alternativa_curta");
  if (question.solution.relevantInformation.length < 2) reasons.push("informacoes_relevantes_insuficientes");
  if (compact(question.solution.concept).length < 90) reasons.push("conceito_superficial");
  if (question.solution.development.length < 3 || question.solution.development.some((item) => compact(item).length < 50)) reasons.push("desenvolvimento_superficial");
  if (compact(question.solution.answerJustification).length < 100) reasons.push("justificativa_superficial");
  if (question.solution.commonErrors.length < 2) reasons.push("erros_comuns_insuficientes");
  if (compact(question.solution.efficientStrategy).length < 90) reasons.push("estrategia_superficial");
  if (question.expectedReasoning.length < 3) reasons.push("linha_de_raciocinio_incompleta");
  if (compact(question.mostLikelyError).length < 70) reasons.push("erro_provavel_superficial");
  if (compact(question.originalityVerification).length < 100) reasons.push("verificacao_originalidade_superficial");
  if (question.notice !== AUTHORIAL_NOTICE) reasons.push("aviso_autoral_incorreto");
  if (question.interdisciplinarity.present && (question.interdisciplinarity.areas.length === 0 || compact(question.interdisciplinarity.description).length < 50)) reasons.push("interdisciplinaridade_incompleta");
  if (!question.interdisciplinarity.present && question.interdisciplinarity.areas.length !== 0) reasons.push("interdisciplinaridade_inconsistente");
  if (question.resource.kind !== "none" && !compact(question.resource.content)) reasons.push("recurso_sem_conteudo");
  if (question.resource.kind.startsWith("hypothetical") && compact(question.resource.dataNote).length < 35) reasons.push("dado_hipotetico_sem_aviso");
  if (question.resource.credits.source !== "EstudAki" || !/autoral|uso comercial/iu.test(question.resource.credits.license)) reasons.push("credito_autoral_invalido");
  if (question.resource.credits.url !== null || question.resource.credits.accessedAt !== null) reasons.push("recurso_autoral_com_url_externa");
  if (/\b(inep|minist[eé]rio da educa[cç][aã]o|quest[aã]o oficial)\b/iu.test(content)) reasons.push("marca_oficial_no_conteudo");

  const alternativeLengths = question.alternatives.map((item) => wordCount(item.text));
  const shortestAlternative = Math.min(...alternativeLengths);
  const longestAlternative = Math.max(...alternativeLengths);
  if (longestAlternative - shortestAlternative > 14 && longestAlternative > Math.max(5, shortestAlternative) * 2.5) reasons.push("alternativas_desequilibradas");
  if (question.area === "Matemática e suas Tecnologias" && question.solution.calculations.length === 0) reasons.push("matematica_sem_calculo_demonstrado");

  for (const calculation of question.solution.calculations) {
    if (!compact(calculation.formula) || !compact(calculation.substitution) || calculation.intermediateSteps.length === 0 || !compact(calculation.result) || !compact(calculation.interpretation)) {
      reasons.push("calculo_incompleto");
      break;
    }
  }

  return reasons;
}
