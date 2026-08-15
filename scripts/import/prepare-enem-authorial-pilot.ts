import { promises as fs } from "node:fs";
import path from "node:path";
import {
  AREA_CODES,
  AUTHORIAL_NOTICE,
  ENEM_MATRIX_URL,
  type EditorialQuestion,
  validateEditorialQuestion,
} from "./enem-authorial-pilot-schema";
import { countBy, questionHash, type BankQuestion } from "./question-bank-core";

const ROOT = process.cwd();
const SOURCE_DIR = path.resolve(ROOT, "data/question-bank/authorial/enem-2026-pilot");
const OUTPUT_FILE = path.resolve(ROOT, "scripts/import/output/enem-autoral-2026-piloto-valid.json");
const MARKDOWN_FILE = path.join(SOURCE_DIR, "lote-editorial.md");
const AUDIT_JSON_FILE = path.join(SOURCE_DIR, "auditoria.json");
const AUDIT_MARKDOWN_FILE = path.join(SOURCE_DIR, "auditoria.md");
const AREA_FILES = ["linguagens.json", "humanas.json", "natureza.json", "matematica.json"];
const OFFICIAL_REFERENCE_FILES = Array.from({ length: 11 }, (_, index) => 2015 + index).map((year) =>
  path.resolve(ROOT, `scripts/import/output/enem-${year}-valid.json`),
);
const LEGACY_AUTHORIAL_FILE = path.resolve(ROOT, "scripts/import/output/banco-extenso-questoes-validas.json");

type OfficialReference = {
  id?: string;
  externalId?: string;
  vestibular?: string;
  enunciado?: string;
  textoApoio?: string | null;
  statement?: string;
  supportText?: string | null;
  alternativas?: Array<{ text?: string }>;
  alternatives?: Array<{ text?: string }>;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function words(value: string) {
  return normalize(value).split(/\s+/u).filter(Boolean);
}

function shingles(value: string, size = 8) {
  const tokens = words(value);
  const result = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    result.add(tokens.slice(index, index + size).join(" "));
  }
  return result;
}

function overlap(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const value of left) if (right.has(value)) matches += 1;
  return matches / Math.min(left.size, right.size);
}

function sharedShingles(left: Set<string>, right: Set<string>) {
  let matches = 0;
  for (const value of left) if (right.has(value)) matches += 1;
  return matches;
}

function questionText(question: EditorialQuestion) {
  return [
    question.supportText,
    question.resource.content ?? "",
    question.prompt,
    ...question.alternatives.map((item) => item.text),
  ].join(" ");
}

function officialText(question: OfficialReference) {
  return [
    question.textoApoio ?? question.supportText ?? "",
    question.enunciado ?? question.statement ?? "",
    ...(question.alternativas ?? question.alternatives ?? []).map((item) => item.text ?? ""),
  ].join(" ");
}

function formatCredits(question: EditorialQuestion) {
  const credits = question.resource.credits;
  return [
    `Fonte: ${credits.source}.`,
    `Título: ${credits.title}.`,
    `Autor: ${credits.author}.`,
    `Licença: ${credits.license}.`,
    "Disponível em: não se aplica — recurso produzido internamente.",
    "Acesso em: não se aplica.",
  ].join("\n");
}

function supportForBank(question: EditorialQuestion) {
  const blocks = [question.supportText.trim()];
  if (question.resource.kind !== "none" && question.resource.content) {
    blocks.push(`${question.resource.title ?? "Recurso autoral"}\n${question.resource.content.trim()}`);
  }
  if (question.resource.dataNote) blocks.push(question.resource.dataNote.trim());
  blocks.push(formatCredits(question));
  blocks.push(AUTHORIAL_NOTICE);
  return blocks.join("\n\n");
}

function explanationForBank(question: EditorialQuestion) {
  const calculations = question.solution.calculations.flatMap((calculation, index) => [
    `Cálculo ${index + 1}: ${calculation.formula}`,
    `Substituição: ${calculation.substitution}`,
    ...calculation.intermediateSteps.map((step) => `Etapa: ${step}`),
    `Resultado: ${calculation.result}${calculation.unit ? ` ${calculation.unit}` : ""}.`,
    `Interpretação: ${calculation.interpretation}`,
  ]);

  return [
    "Informações relevantes:",
    ...question.solution.relevantInformation.map((item) => `- ${item}`),
    "",
    `Conceito ou princípio: ${question.solution.concept}`,
    "",
    "Desenvolvimento do raciocínio:",
    ...question.solution.development.map((item, index) => `${index + 1}. ${item}`),
    ...(calculations.length ? ["", ...calculations] : []),
    "",
    `Justificativa do gabarito: ${question.solution.answerJustification}`,
    "",
    "Erros comuns:",
    ...question.solution.commonErrors.map((item) => `- ${item}`),
    "",
    `Estratégia eficiente: ${question.solution.efficientStrategy}`,
  ].join("\n");
}

function pedagogyForBank(question: EditorialQuestion) {
  const interdisciplinary = question.interdisciplinarity.present
    ? `${question.interdisciplinarity.areas.join(", ")}: ${question.interdisciplinarity.description}`
    : "Não indicada como requisito para a resolução.";
  return [
    `Competência ${question.competency.code}: ${question.competency.description}`,
    `Habilidade ${question.skill.code}: ${question.skill.description}`,
    `Eixos cognitivos: ${question.cognitiveAxes.join(", ")}.`,
    `Tempo estimado: ${question.estimatedMinutes} minutos.`,
    `Interdisciplinaridade: ${interdisciplinary}`,
    `Linha de raciocínio: ${question.expectedReasoning.map((item, index) => `${index + 1}) ${item}`).join(" ")}`,
    `Erro mais provável: ${question.mostLikelyError}`,
    `Verificação de originalidade: ${question.originalityVerification}`,
  ].join("\n");
}

function toBankQuestion(question: EditorialQuestion, questionNumber: number): BankQuestion {
  const alternatives = question.alternatives.map((item) => ({
    key: item.key,
    text: item.text,
    correct: item.correct,
    explanation: item.analysis,
  }));
  const draft: BankQuestion = {
    externalId: question.id,
    vestibular: "ENEM",
    year: 2026,
    exam: "Lote autoral EstudAki 2026 — piloto ENEM",
    phase: "Treinamento autoral",
    day: question.area.startsWith("Linguagens") || question.area.startsWith("Ciências Humanas") ? "1º dia" : "2º dia",
    questionNumber,
    subject: question.discipline,
    topic: question.primaryContent,
    difficulty: question.difficulty,
    sourceType: "AUTHORIAL",
    sourceName: "EstudAki",
    statement: question.prompt,
    supportText: supportForBank(question),
    images: [],
    alternatives,
    correctAlternative: question.answer,
    explanation: explanationForBank(question),
    skill: `${question.skill.code} — ${question.skill.description}`,
    pedagogyComment: pedagogyForBank(question),
    tags: [
      "ENEM",
      "autoral",
      AREA_CODES[question.area],
      question.area,
      question.discipline,
      question.primaryContent,
      ...(question.secondaryContent ? [question.secondaryContent] : []),
      question.competency.code,
      question.skill.code,
      question.difficulty,
      ...question.keywords,
    ],
    status: "REVIEW",
    reviewState: "PENDING_REVIEW",
    reviewNotes: [
      "Questão redigida do zero para o lote piloto autoral ENEM 2026.",
      "Os cadernos de 2022, 2024 e 2025 foram usados somente para métricas agregadas de estilo e complexidade.",
      "Exige revisão editorial humana independente antes de qualquer publicação.",
      `Conteúdo secundário: ${question.secondaryContent ?? "não se aplica"}.`,
      `Matriz de referência consultada em 10/07/2026: ${ENEM_MATRIX_URL}`,
    ].join(" "),
    contentHash: "",
    templateId: `manual-${question.id}`,
  };
  draft.contentHash = questionHash(draft);
  return draft;
}

function markdownQuestion(question: EditorialQuestion, index: number) {
  const difficulty = { EASY: "fácil", MEDIUM: "médio", HARD: "difícil" }[question.difficulty];
  const resource = question.resource.kind === "none"
    ? "Não se aplica. A questão é integralmente textual."
    : `${question.resource.title ?? "Recurso autoral"}\n\n${question.resource.content ?? ""}\n\n${question.resource.dataNote ?? ""}`.trim();
  const calculations = question.solution.calculations.length
    ? question.solution.calculations.map((item, calculationIndex) => [
        `${calculationIndex + 1}. Fórmula: ${item.formula}`,
        `   Substituição: ${item.substitution}`,
        ...item.intermediateSteps.map((step) => `   - ${step}`),
        `   Resultado: ${item.result}${item.unit ? ` ${item.unit}` : ""}.`,
        `   Interpretação: ${item.interpretation}`,
      ].join("\n")).join("\n")
    : "Não há cálculo necessário; a resolução é interpretativa ou conceitual.";

  return [
    `### Questão ${index}`,
    "",
    `**Área do conhecimento:** ${question.area}`,
    `**Disciplina:** ${question.discipline}`,
    `**Conteúdo principal:** ${question.primaryContent}`,
    `**Conteúdo secundário:** ${question.secondaryContent ?? "Não se aplica"}`,
    `**Competência:** ${question.competency.code} — ${question.competency.description}`,
    `**Habilidade:** ${question.skill.code} — ${question.skill.description}`,
    `**Dificuldade:** ${difficulty}`,
    `**Tempo estimado:** ${question.estimatedMinutes} minutos`,
    `**Interdisciplinaridade:** ${question.interdisciplinarity.present ? `${question.interdisciplinarity.areas.join(", ")} — ${question.interdisciplinarity.description}` : "Não é requisito para a resolução"}`,
    `**Palavras-chave:** ${question.keywords.join(", ")}`,
    "",
    "**Texto de apoio:**",
    "",
    question.supportText,
    "",
    "**Imagem, gráfico, tabela ou diagrama:**",
    "",
    resource,
    "",
    "**Créditos:**",
    "",
    formatCredits(question),
    "",
    "**Enunciado:**",
    "",
    question.prompt,
    "",
    ...question.alternatives.flatMap((item) => [`**${item.key})** ${item.text}`, ""]),
    "**Gabarito:**",
    "",
    question.answer,
    "",
    "**Resolução completa:**",
    "",
    "Informações relevantes:",
    ...question.solution.relevantInformation.map((item) => `- ${item}`),
    "",
    `Conceito ou princípio: ${question.solution.concept}`,
    "",
    ...question.solution.development.map((item, developmentIndex) => `${developmentIndex + 1}. ${item}`),
    "",
    calculations,
    "",
    `Justificativa: ${question.solution.answerJustification}`,
    "",
    "**Análise das alternativas:**",
    "",
    ...question.alternatives.map((item) => `- **${item.key}:** ${item.analysis}`),
    "",
    "**Linha de raciocínio esperada:**",
    "",
    ...question.expectedReasoning.map((item, reasoningIndex) => `${reasoningIndex + 1}. ${item}`),
    "",
    "**Erro mais provável:**",
    "",
    question.mostLikelyError,
    "",
    "**Estratégia de resolução:**",
    "",
    question.solution.efficientStrategy,
    "",
    "**Verificação de originalidade:**",
    "",
    question.originalityVerification,
    "",
    `> ${question.notice}`,
  ].join("\n");
}

async function loadQuestions() {
  const groups = await Promise.all(
    AREA_FILES.map(async (file) => JSON.parse(await fs.readFile(path.join(SOURCE_DIR, file), "utf8")) as EditorialQuestion[]),
  );
  return groups.flat();
}

async function loadOfficialReferences() {
  const officialGroups = await Promise.all(
    OFFICIAL_REFERENCE_FILES.map(async (file) => {
      const year = path.basename(file).match(/\d{4}/u)?.[0] ?? "desconhecido";
      const rows = JSON.parse(await fs.readFile(file, "utf8")) as OfficialReference[];
      return rows.map((row) => ({ referenceType: `oficial-${year}`, row }));
    }),
  );
  const legacy = (JSON.parse(await fs.readFile(LEGACY_AUTHORIAL_FILE, "utf8")) as OfficialReference[])
    .filter((row) => row.vestibular === "ENEM")
    .map((row) => ({ referenceType: "autoral-legado", row }));
  return [...officialGroups.flat(), ...legacy];
}

async function main() {
  const questions = await loadQuestions();
  const officialReferences = await loadOfficialReferences();
  const validationIssues = questions.flatMap((question) => {
    const reasons = validateEditorialQuestion(question);
    return reasons.length ? [{ id: question.id, reasons }] : [];
  });
  const duplicateIds = questions.length - new Set(questions.map((question) => question.id)).size;
  const answerDistribution = countBy(questions, (question) => question.answer);
  const difficultyDistribution = countBy(questions, (question) => question.difficulty);
  const areaDistribution = countBy(questions, (question) => question.area);
  const resourceCount = questions.filter((question) => question.resource.kind !== "none").length;

  const officialShingles = officialReferences.map((reference) => ({
    id: reference.row.id ?? reference.row.externalId ?? "sem-id",
    referenceType: reference.referenceType,
    shingles: shingles(officialText(reference.row)),
  }));
  const originalityChecks = questions.map((question) => {
    const candidateShingles = shingles(questionText(question));
    const closest = officialShingles.reduce(
      (best, reference) => {
        const score = overlap(candidateShingles, reference.shingles);
        const shared = sharedShingles(candidateShingles, reference.shingles);
        return score > best.score
          ? { id: reference.id, referenceType: reference.referenceType, score, shared }
          : best;
      },
      { id: "nenhuma", referenceType: "nenhuma", score: 0, shared: 0 },
    );
    return {
      id: question.id,
      closestReference: closest.id,
      referenceType: closest.referenceType,
      sharedEightWordShingles: closest.shared,
      eightWordShingleOverlap: Number(closest.score.toFixed(4)),
    };
  });
  const pairwiseSimilarity = questions.flatMap((question, index) => {
    const left = shingles(questionText(question));
    return questions.slice(index + 1).map((other) => {
      const right = shingles(questionText(other));
      return {
        left: question.id,
        right: other.id,
        eightWordShingleOverlap: Number(overlap(left, right).toFixed(4)),
      };
    });
  });

  const distributionIssues: string[] = [];
  if (questions.length !== 20) distributionIssues.push("lote_deve_conter_20_questoes");
  for (const area of Object.keys(AREA_CODES) as Array<keyof typeof AREA_CODES>) {
    const areaQuestions = questions.filter((question) => question.area === area);
    if (areaDistribution[area] !== 5) distributionIssues.push(`area_${AREA_CODES[area]}_deve_conter_5`);
    for (const key of ["A", "B", "C", "D", "E"]) {
      if (areaQuestions.filter((question) => question.answer === key).length !== 1) {
        distributionIssues.push(`area_${AREA_CODES[area]}_deve_conter_um_gabarito_${key}`);
      }
    }
    const areaDifficulties = countBy(areaQuestions, (question) => question.difficulty);
    const expected = area === "Ciências Humanas e suas Tecnologias" || area === "Ciências da Natureza e suas Tecnologias"
      ? { EASY: 1, MEDIUM: 2, HARD: 2 }
      : { EASY: 1, MEDIUM: 3, HARD: 1 };
    if (
      areaDifficulties.EASY !== expected.EASY ||
      areaDifficulties.MEDIUM !== expected.MEDIUM ||
      areaDifficulties.HARD !== expected.HARD
    ) {
      distributionIssues.push(`distribuicao_de_dificuldade_invalida_em_${AREA_CODES[area]}`);
    }
  }
  for (const key of ["A", "B", "C", "D", "E"]) if (answerDistribution[key] !== 4) distributionIssues.push(`gabarito_${key}_deve_aparecer_4_vezes`);
  if (difficultyDistribution.EASY !== 4 || difficultyDistribution.MEDIUM !== 10 || difficultyDistribution.HARD !== 6) distributionIssues.push("dificuldade_deve_ser_4_facil_10_media_6_dificil");
  if (resourceCount !== 6) distributionIssues.push("lote_deve_conter_6_recursos_autorais");
  const suspiciousOriginality = originalityChecks.filter(
    (item) => item.eightWordShingleOverlap >= 0.035 && item.sharedEightWordShingles >= 4,
  );
  const suspiciousInternalSimilarity = pairwiseSimilarity.filter((item) => item.eightWordShingleOverlap >= 0.12);

  const audit = {
    generatedAt: new Date().toISOString(),
    sourceFiles: AREA_FILES,
    referencePolicy: "Os PDFs oficiais foram usados apenas para métricas agregadas de forma, extensão e complexidade.",
    matrixReference: { url: ENEM_MATRIX_URL, accessedAt: "2026-07-10" },
    questions: questions.length,
    duplicateIds,
    validationIssues,
    distributionIssues,
    distributions: { area: areaDistribution, difficulty: difficultyDistribution, answer: answerDistribution },
    authorialResources: resourceCount,
    externalResources: questions.filter((question) => question.resource.credits.url !== null).length,
    hypotheticalResources: questions.filter((question) => question.resource.kind.startsWith("hypothetical")).length,
    originality: {
      threshold: { overlap: 0.035, minimumSharedEightWordShingles: 4, internalOverlap: 0.12 },
      suspicious: suspiciousOriginality,
      suspiciousInternalSimilarity,
      checks: originalityChecks,
    },
    safeToPrepare:
      !duplicateIds &&
      validationIssues.length === 0 &&
      distributionIssues.length === 0 &&
      suspiciousOriginality.length === 0 &&
      suspiciousInternalSimilarity.length === 0,
  };

  await fs.writeFile(AUDIT_JSON_FILE, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  if (!audit.safeToPrepare) {
    console.error(JSON.stringify(audit, null, 2));
    throw new Error("O lote editorial não passou na validação rigorosa.");
  }

  const bankQuestions = questions.map((question, index) => toBankQuestion(question, index + 1));
  const markdown = [
    "# Lote piloto autoral ENEM 2026 — EstudAki",
    "",
    "Material editorial para revisão. Nenhuma questão deste arquivo deve ser apresentada como oficial.",
    "",
    ...questions.map((question, index) => markdownQuestion(question, index + 1)),
    "",
  ].join("\n\n");
  const auditMarkdown = [
    "# Auditoria do lote piloto autoral ENEM 2026",
    "",
    `- Questões: ${audit.questions}`,
    `- Duplicidades de ID: ${audit.duplicateIds}`,
    `- Problemas de validação: ${audit.validationIssues.length}`,
    `- Problemas de distribuição: ${audit.distributionIssues.length}`,
    `- Recursos externos: ${audit.externalResources}`,
    `- Sobreposição suspeita com questões oficiais ou autorais legadas: ${audit.originality.suspicious.length}`,
    `- Similaridade interna suspeita: ${audit.originality.suspiciousInternalSimilarity.length}`,
    `- Estado: ${audit.safeToPrepare ? "APTO PARA IMPORTAÇÃO EM REVISÃO" : "BLOQUEADO"}`,
    "",
    "## Distribuição",
    "",
    `- Áreas: ${JSON.stringify(audit.distributions.area)}`,
    `- Dificuldade: ${JSON.stringify(audit.distributions.difficulty)}`,
    `- Gabaritos: ${JSON.stringify(audit.distributions.answer)}`,
    "",
    "A aprovação técnica deste relatório não substitui revisão editorial humana independente nem autoriza publicação automática.",
    "",
  ].join("\n");

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(bankQuestions, null, 2)}\n`, "utf8");
  await fs.writeFile(MARKDOWN_FILE, markdown, "utf8");
  await fs.writeFile(AUDIT_MARKDOWN_FILE, auditMarkdown, "utf8");
  console.log(JSON.stringify({ output: OUTPUT_FILE, markdown: MARKDOWN_FILE, audit: AUDIT_JSON_FILE, ...audit }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
