export const QUESTION_FILTER_QUERY_KEYS = [
  "q",
  "vestibular",
  "subject",
  "topic",
  "content",
  "year",
  "day",
  "area",
  "difficulty",
  "scope",
] as const;

export type QuestionFilterQueryKey =
  | "q"
  | "vestibular"
  | "subject"
  | "topic"
  | "year"
  | "day"
  | "area"
  | "difficulty"
  | "scope";

type SearchParamsLike = Pick<URLSearchParams, "toString">;

export function setQuestionFilterParam(
  current: SearchParamsLike,
  key: QuestionFilterQueryKey,
  value: string,
) {
  const next = new URLSearchParams(current.toString());
  const normalized = value.trim();

  if (normalized) next.set(key, normalized);
  else next.delete(key);

  if (key === "subject") {
    next.delete("topic");
    next.delete("content");
  }
  if (key === "topic") next.delete("content");
  next.set("page", "1");
  return next;
}

export function clearQuestionFilterParams(current: SearchParamsLike) {
  const next = new URLSearchParams(current.toString());
  for (const key of QUESTION_FILTER_QUERY_KEYS) {
    if (key !== "vestibular") next.delete(key);
  }
  next.delete("page");
  return next;
}

export function questionBankHref(params: SearchParamsLike) {
  const query = params.toString();
  return query ? `/questions?${query}` : "/questions";
}
