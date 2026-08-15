import { createHash } from "node:crypto";

export type BankDifficulty = "EASY" | "MEDIUM" | "HARD";
export type BankSourceType = "OFFICIAL" | "WEB_PUBLIC" | "LICENSE_REQUIRED" | "AUTHORIAL";
export type BankReviewState = "PENDING_REVIEW" | "APPROVED" | "HAS_ERROR";

export type BankAlternative = {
  key: "A" | "B" | "C" | "D" | "E";
  text: string;
  correct: boolean;
  explanation: string;
};

export type BankQuestion = {
  externalId: string;
  vestibular: string;
  year: number;
  exam?: string;
  phase?: string;
  day?: string;
  questionNumber?: number;
  subject: string;
  topic: string;
  difficulty: BankDifficulty;
  sourceType: BankSourceType;
  sourceName: string;
  sourceUrl?: string;
  statement: string;
  supportText?: string;
  images: Array<{ url: string; description: string; order: number }>;
  alternatives: BankAlternative[];
  correctAlternative: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  skill: string;
  pedagogyComment: string;
  tags: string[];
  status: "REVIEW";
  reviewState: BankReviewState;
  reviewNotes: string;
  contentHash: string;
  templateId: string;
};

export type ValidationIssue = {
  externalId: string;
  reasons: string[];
};

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function questionHash(input: Pick<BankQuestion, "vestibular" | "statement" | "supportText" | "alternatives">) {
  const canonical = [
    normalizeText(input.vestibular),
    normalizeText(input.supportText ?? ""),
    normalizeText(input.statement),
    ...input.alternatives.map((item) => normalizeText(item.text)),
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export function validateQuestion(question: BankQuestion): string[] {
  const reasons: string[] = [];
  const correct = question.alternatives.filter((item) => item.correct);
  const uniqueAlternatives = new Set(question.alternatives.map((item) => normalizeText(item.text)));

  if (question.statement.trim().length < 120) reasons.push("enunciado_curto");
  if (question.alternatives.length !== 5) reasons.push("quantidade_alternativas_invalida");
  if (uniqueAlternatives.size !== question.alternatives.length) reasons.push("alternativas_duplicadas");
  if (correct.length !== 1) reasons.push("quantidade_respostas_corretas_invalida");
  if (correct[0]?.key !== question.correctAlternative) reasons.push("gabarito_inconsistente");
  if (question.alternatives.some((item) => item.text.trim().length < 4)) reasons.push("alternativa_curta");
  if (question.alternatives.some((item) => item.explanation.trim().length < 35)) reasons.push("explicacao_alternativa_curta");
  if (question.explanation.trim().length < 220) reasons.push("explicacao_geral_curta");
  if (question.skill.trim().length < 25) reasons.push("habilidade_ausente");
  if (question.pedagogyComment.trim().length < 60) reasons.push("observacao_pedagogica_curta");
  if (!question.vestibular || !question.subject || !question.topic) reasons.push("classificacao_incompleta");
  if (!question.sourceName || !question.sourceType) reasons.push("fonte_incompleta");
  if (question.status !== "REVIEW" || question.reviewState !== "PENDING_REVIEW") reasons.push("status_inseguro");
  if (question.sourceType === "AUTHORIAL" && question.sourceName !== "EstudAki") reasons.push("fonte_autoral_invalida");
  if (question.sourceType === "AUTHORIAL" && /\b(inep|fuvest|vunesp|comvest)\b/i.test(question.sourceName)) reasons.push("autoral_marcada_como_oficial");

  return reasons;
}

export function assignCorrectAlternative(
  options: Array<{ text: string; explanation: string }>,
  correctIndex: number,
  rotation: number,
): Pick<BankQuestion, "alternatives" | "correctAlternative"> {
  const letters = ["A", "B", "C", "D", "E"] as const;
  const normalizedRotation = ((rotation % 5) + 5) % 5;
  const rotated = options.map((_, index) => options[(index - normalizedRotation + 5) % 5]);
  const rotatedCorrectIndex = (correctIndex + normalizedRotation) % 5;
  const alternatives = rotated.map((item, index) => ({
    key: letters[index],
    text: item.text,
    correct: index === rotatedCorrectIndex,
    explanation: item.explanation,
  }));
  return { alternatives, correctAlternative: letters[rotatedCorrectIndex] };
}

export function difficultyForIndex(index: number): BankDifficulty {
  const slot = index % 10;
  if (slot < 2) return "EASY";
  if (slot < 7) return "MEDIUM";
  return "HARD";
}

export function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const value = key(item);
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}
