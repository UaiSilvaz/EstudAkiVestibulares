import { normalizeTextForFingerprint, sha256Text } from "./text";

export type DedupeAlternativeInput =
  | { key?: string | null; letter?: string | null; text?: string | null; contentPlainText?: string | null }
  | string;

export type DedupeQuestionInput = {
  id: string;
  statement: string;
  supportText?: string | null;
  alternatives?: DedupeAlternativeInput[] | string | null;
  year?: number | null;
  boardName?: string | null;
  sourceName?: string | null;
  exam?: string | null;
};

export type DuplicateKind = "EXACT_DUPLICATE" | "LIKELY_DUPLICATE";

export type DuplicateGroup = {
  kind: DuplicateKind;
  fingerprint: string;
  questionIds: string[];
};

function parseAlternatives(value: DedupeQuestionInput["alternatives"]) {
  if (!value) return [] as DedupeAlternativeInput[];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as DedupeAlternativeInput[]) : [];
  } catch {
    return [];
  }
}

function alternativeText(value: DedupeAlternativeInput) {
  if (typeof value === "string") return value;
  return value.text ?? value.contentPlainText ?? "";
}

export function normalizedQuestionBody(question: DedupeQuestionInput) {
  return [
    normalizeTextForFingerprint(question.supportText),
    normalizeTextForFingerprint(question.statement),
    ...parseAlternatives(question.alternatives).map((item) =>
      normalizeTextForFingerprint(alternativeText(item)),
    ),
  ]
    .filter(Boolean)
    .join("|");
}

export function exactQuestionFingerprint(question: DedupeQuestionInput) {
  return sha256Text(
    [
      normalizeTextForFingerprint(question.boardName ?? question.sourceName),
      question.year ?? "",
      normalizedQuestionBody(question),
    ].join("|"),
  );
}

export function semanticQuestionFingerprint(question: DedupeQuestionInput) {
  return sha256Text(normalizedQuestionBody(question));
}

export function findDuplicateGroups(questions: DedupeQuestionInput[]) {
  const exact = new Map<string, string[]>();
  const semantic = new Map<string, string[]>();

  for (const question of questions) {
    const exactKey = exactQuestionFingerprint(question);
    const semanticKey = semanticQuestionFingerprint(question);
    exact.set(exactKey, [...(exact.get(exactKey) ?? []), question.id]);
    semantic.set(semanticKey, [...(semantic.get(semanticKey) ?? []), question.id]);
  }

  const exactIds = new Set<string>();
  const exactGroups = [...exact.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([fingerprint, questionIds]) => {
      questionIds.forEach((id) => exactIds.add(id));
      return {
        kind: "EXACT_DUPLICATE",
        fingerprint,
        questionIds,
      } satisfies DuplicateGroup;
    });

  const likelyGroups = [...semantic.entries()]
    .filter(([, ids]) => ids.length > 1 && ids.some((id) => !exactIds.has(id)))
    .map(
      ([fingerprint, questionIds]) =>
        ({
          kind: "LIKELY_DUPLICATE",
          fingerprint,
          questionIds,
        }) satisfies DuplicateGroup,
    );

  return [...exactGroups, ...likelyGroups];
}
