export type QuestionParts = {
  supportText: string | null;
  prompt: string;
};

const promptMarker =
  /(^|[.!?]\s+|\n+)(Com base|Tomando como base|De acordo|Considerando|Nesse contexto|Nessa situação|Nessas condições|Nas condições apresentadas|A partir|Dessa forma|Assim|Caso|Após essas mudanças|Em qual|Em quais|Em relação|Qual|Quais|Quantos|Quantas|Quanto|Quanta|O que|A quantidade|O número|O valor|A medida|A razão|A expressão|A probabilidade|A porcentagem|A alternativa|A opção|O objetivo|Um motivo|Uma consequência|Uma característica|Essa situação|Esse processo|Essa prática|Esse fenômeno|Para que|Para atingir|O limite|A estimativa)\b/g;

const commandTerms =
  /\b(é|são|será|deverá|corresponde|representa|indica|consiste|encontra-se|pode ser|deve ser|mais se aproxima)\b/i;

export function formatQuestionText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\s*•\s*/g, "\n• ")
    .replace(/\s+(Fonte:|Disponível em:|Acesso em:)/gi, "\n$1")
    .replace(
      /([.!?])\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}(?:,|\s))/g,
      "$1\n\n$2",
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitQuestionParts(
  statement: string,
  explicitSupportText?: string | null,
): QuestionParts {
  const prompt = formatQuestionText(statement);
  const explicitSupport = explicitSupportText
    ? formatQuestionText(explicitSupportText)
    : null;

  if (explicitSupport) return { supportText: explicitSupport, prompt };

  const matches = Array.from(prompt.matchAll(promptMarker)).map((match) => ({
    index: (match.index ?? 0) + (match[1]?.length ?? 0),
  }));
  const minimumIndex = Math.max(90, Math.floor(prompt.length * 0.3));
  const marker = matches
    .filter((match) => match.index >= minimumIndex)
    .at(-1);

  if (marker?.index) {
    const supportText = prompt.slice(0, marker.index).trim();
    const questionPrompt = prompt.slice(marker.index).trim();
    if (
      supportText.length >= 80 &&
      questionPrompt.length >= 25 &&
      questionPrompt.length <= 700
    ) {
      return { supportText, prompt: questionPrompt };
    }
  }

  const sentenceStarts = Array.from(
    prompt.matchAll(/[.!?]\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g),
  );
  const finalSentence = sentenceStarts.at(-1);
  if (finalSentence?.index) {
    const start = finalSentence.index + finalSentence[0].length - 1;
    const supportText = prompt.slice(0, start).trim();
    const questionPrompt = prompt.slice(start).trim();
    if (
      start >= prompt.length * 0.58 &&
      supportText.length >= 120 &&
      questionPrompt.length >= 20 &&
      questionPrompt.length <= 420 &&
      commandTerms.test(questionPrompt)
    ) {
      return { supportText, prompt: questionPrompt };
    }
  }

  return { supportText: null, prompt };
}

export function questionEditionLabel({
  exam,
  vestibularName,
  year,
}: {
  exam?: string | null;
  vestibularName?: string | null;
  year: number;
}) {
  const raw = formatQuestionText(exam || `${vestibularName ?? "Questão"} ${year}`);
  const pplBeforeYear = raw.match(/^ENEM\s+PPL\s+(\d{4})$/i);
  if (pplBeforeYear) return `ENEM ${pplBeforeYear[1]} PPL`;
  return raw;
}

export function splitSupportReference(value: string) {
  const formatted = formatQuestionText(value);
  const paragraphs = formatted.split(/\n{2,}/);
  const last = paragraphs.at(-1)?.trim() ?? "";
  const looksLikeReference =
    paragraphs.length > 1 &&
    /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}(?:,|\s)/.test(last) &&
    /\b(?:19|20)\d{2}\b/.test(last) &&
    last.length <= 360;

  return looksLikeReference
    ? {
        content: paragraphs.slice(0, -1).join("\n\n").trim(),
        reference: last,
      }
    : { content: formatted, reference: null };
}
