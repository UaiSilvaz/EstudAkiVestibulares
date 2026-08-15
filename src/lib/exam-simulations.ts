export type AnswerMap = Record<string, string>;

export function normalizeAnswers(value: Record<string, unknown>): AnswerMap {
  return Object.fromEntries(
    Object.entries(value)
      .map(([question, answer]) => [String(Number(question)), String(answer).trim().toUpperCase()])
      .filter(([question, answer]) => Number(question) > 0 && /^[A-E]$/.test(answer)),
  );
}

export function parseAnswerKey(value: unknown): AnswerMap {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return normalizeAnswers(parsed as Record<string, unknown>);
  } catch {
    const entries = value
      .split(/[\n,;]+/)
      .map((item) => item.trim().match(/^(\d+)\s*[:=\-]\s*([A-E])$/i))
      .filter((item): item is RegExpMatchArray => Boolean(item))
      .map((item) => [item[1], item[2].toUpperCase()]);
    return Object.fromEntries(entries);
  }
}

export function simulationState(exam: { startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (exam.startsAt && now < exam.startsAt) return "SCHEDULED" as const;
  if (exam.endsAt && now > exam.endsAt) return "CLOSED" as const;
  return "OPEN" as const;
}

export function resultIsReleased(resultsAt: Date | null, now = new Date()) {
  return !resultsAt || now >= resultsAt;
}

export function calculateResult(answerKey: AnswerMap, responses: AnswerMap) {
  const questions = Object.keys(answerKey);
  const correctCount = questions.filter((question) => responses[question] === answerKey[question]).length;
  return {
    correctCount,
    total: questions.length,
    score: questions.length ? Number(((correctCount / questions.length) * 100).toFixed(2)) : 0,
  };
}
