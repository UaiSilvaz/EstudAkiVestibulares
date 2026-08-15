export type EssayCompetency = {
  number: number;
  title: string;
  score: number;
  evidence: string;
  suggestion: string;
};

const connectors = [
  "além disso",
  "portanto",
  "contudo",
  "entretanto",
  "desse modo",
  "nesse sentido",
  "por conseguinte",
  "em primeiro lugar",
  "em segundo lugar",
  "dessa forma",
  "todavia",
  "logo",
  "assim",
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function roundScore(value: number) {
  return Math.min(200, Math.max(0, Math.round(value / 40) * 40));
}

export function evaluateEssay(text: string, theme: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const normalized = normalize(clean);
  const words = clean.match(/\p{L}+/gu) ?? [];
  const sentences = clean.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  const paragraphs = text.split(/\n\s*\n|\n/).map((item) => item.trim()).filter(Boolean);
  const themeWords = normalize(theme)
    .split(/\s+/)
    .filter((word) => word.length >= 5);
  const themeMatches = themeWords.filter((word) => normalized.includes(word)).length;
  const connectorMatches = connectors.filter((connector) => normalized.includes(normalize(connector)));
  const punctuationCount = (clean.match(/[,:;.!?]/g) ?? []).length;
  const longSentences = sentences.filter((sentence) => sentence.split(/\s+/).length > 38).length;
  const repeatedWords = words.filter(
    (word, index) => index > 0 && normalize(word) === normalize(words[index - 1]),
  ).length;

  if (words.length < 30) {
    const competencies: EssayCompetency[] = [1, 2, 3, 4, 5].map((number) => ({
      number,
      title: competencyTitle(number),
      score: 0,
      evidence: "Texto curto demais para uma análise consistente.",
      suggestion: "Desenvolva introdução, argumentos e proposta de intervenção antes de corrigir.",
    }));
    return {
      score: 0,
      competencies,
      strengths: [],
      improvements: ["Amplie o texto. Produções muito curtas podem receber nota zero no ENEM."],
      stats: { words: words.length, sentences: sentences.length, paragraphs: paragraphs.length, connectors: 0 },
      warning: "Texto insuficiente para estimativa.",
    };
  }

  const c1Raw =
    80 +
    Math.min(50, punctuationCount * 2) +
    Math.min(40, sentences.length * 3) -
    longSentences * 16 -
    repeatedWords * 8;
  const c2Raw =
    50 +
    Math.min(80, themeMatches * 22) +
    (words.length >= 180 ? 35 : words.length >= 120 ? 20 : 0) +
    (/\b(tese|problema|sociedade|necessario|fundamental)\b/.test(normalized) ? 20 : 0);
  const c3Raw =
    55 +
    Math.min(55, paragraphs.length * 14) +
    (/\b(porque|visto que|uma vez que|devido|consequencia|causa)\b/.test(normalized) ? 45 : 0) +
    (/\b(por exemplo|segundo|dados|pesquisa|historia|filosofo)\b/.test(normalized) ? 35 : 0);
  const c4Raw =
    45 +
    Math.min(110, connectorMatches.length * 22) +
    (sentences.length >= 8 ? 30 : 10);
  const interventionSignals = [
    /\b(governo|estado|escola|ministerio|sociedade|familia|midia|empresas)\b/,
    /\b(deve|precisa|pode|deverao|promover|criar|implementar|realizar|garantir)\b/,
    /\b(por meio|atraves|mediante|com campanhas|com investimentos)\b/,
    /\b(a fim de|para que|com o objetivo|visando)\b/,
    /\b(direitos|respeito|dignidade|cidadania|inclusao)\b/,
  ].filter((pattern) => pattern.test(normalized)).length;
  const scores = [
    roundScore(c1Raw),
    roundScore(c2Raw),
    roundScore(c3Raw),
    roundScore(c4Raw),
    roundScore(35 + interventionSignals * 34),
  ];
  const competencies: EssayCompetency[] = scores.map((score, index) => {
    const number = index + 1;
    return {
      number,
      title: competencyTitle(number),
      score,
      evidence: evidenceFor(number, {
        words: words.length,
        paragraphs: paragraphs.length,
        themeMatches,
        connectors: connectorMatches.length,
        interventionSignals,
        longSentences,
      }),
      suggestion: suggestionFor(number, score),
    };
  });
  const strengths = competencies
    .filter((item) => item.score >= 160)
    .map((item) => `Competência ${item.number}: ${item.title}.`);
  const improvements = competencies
    .filter((item) => item.score < 160)
    .map((item) => `Competência ${item.number}: ${item.suggestion}`);

  return {
    score: scores.reduce((sum, score) => sum + score, 0),
    competencies,
    strengths,
    improvements,
    stats: {
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      connectors: connectorMatches.length,
    },
    warning:
      themeMatches === 0
        ? "Pouca aderência lexical ao tema. Revise se houve fuga ou tangenciamento."
        : null,
  };
}

function competencyTitle(number: number) {
  return [
    "Norma-padrão",
    "Compreensão do tema",
    "Projeto de texto e argumentação",
    "Coesão",
    "Proposta de intervenção",
  ][number - 1];
}

function evidenceFor(
  number: number,
  data: {
    words: number;
    paragraphs: number;
    themeMatches: number;
    connectors: number;
    interventionSignals: number;
    longSentences: number;
  },
) {
  if (number === 1) return `${data.longSentences} período(s) excessivamente longo(s) detectado(s).`;
  if (number === 2) return `${data.themeMatches} termo(s) relevante(s) do tema articulado(s) no texto.`;
  if (number === 3) return `${data.paragraphs} parágrafo(s) e ${data.words} palavras na organização argumentativa.`;
  if (number === 4) return `${data.connectors} conectivo(s) argumentativo(s) diferente(s) identificado(s).`;
  return `${data.interventionSignals}/5 elementos de intervenção identificados.`;
}

function suggestionFor(number: number, score: number) {
  if (score >= 160) return "Mantenha o padrão e revise detalhes.";
  if (number === 1) return "Revise concordância, pontuação e períodos longos.";
  if (number === 2) return "Retome palavras-chave do tema e explicite sua tese.";
  if (number === 3) return "Aprofunde causas, consequências e repertório produtivo.";
  if (number === 4) return "Varie conectivos e articule melhor os parágrafos.";
  return "Inclua agente, ação, meio, finalidade e detalhamento, respeitando os direitos humanos.";
}
