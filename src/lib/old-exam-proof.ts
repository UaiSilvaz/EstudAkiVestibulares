export const OLD_EXAM_PROOF_DRAFT_VERSION = 1 as const;

export type OldExamProofAnswer = "A" | "B" | "C" | "D" | "E" | null;

export type OldExamProofQuestionImage =
  | string
  | {
      url: string;
      altText?: string;
      description?: string;
      order?: number;
      width?: number;
      height?: number;
      assetType?: string;
      relation?: string;
    };

export type OldExamProofQuestion = {
  id: string;
  supportText: string | null;
  statement: string;
  questionNumber?: number | null;
  alternatives: Array<{ key: string; text: string; imageUrl?: string | null }>;
  imageUrl: string | null;
  images: OldExamProofQuestionImage[];
  /** Disponível somente na prévia autenticada do administrador. */
  adminOriginalPageUrl?: string;
};

export type OldExamProofVisibleImage = Exclude<OldExamProofQuestionImage, string>;

export function oldExamProofVisibleImages(
  question: OldExamProofQuestion,
): OldExamProofVisibleImage[] {
  const images = question.images
    .map<OldExamProofVisibleImage>((image, index) =>
      typeof image === "string" ? { url: image, order: index } : image,
    )
    .filter((image) => Boolean(image.url))
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
  const auditOnlyUrls = new Set(
    images
      .filter(
        (image) =>
          image.assetType?.toUpperCase() === "PROMPT_FACSIMILE" ||
          image.assetType?.toUpperCase() === "ORIGINAL_REFERENCE" ||
          image.relation?.toUpperCase() === "ADMIN_REFERENCE",
      )
      .map((image) => image.url),
  );
  const visible = images.filter((image) => !auditOnlyUrls.has(image.url));
  if (
    question.imageUrl &&
    !auditOnlyUrls.has(question.imageUrl) &&
    !visible.some((image) => image.url === question.imageUrl)
  ) {
    visible.unshift({ url: question.imageUrl, order: -1 });
  }
  return visible;
}

/**
 * Payload allowlist do modo prova. A função copia somente o que pode ser
 * exibido antes da entrega e, por isso, descarta gabarito, resoluções e estado
 * oficial da resposta mesmo quando o objeto de origem possui esses campos.
 */
export function toOldExamProofQuestion(
  question: OldExamProofQuestion,
): OldExamProofQuestion {
  return {
    id: question.id,
    supportText: question.supportText,
    statement: question.statement,
    questionNumber: question.questionNumber ?? null,
    alternatives: question.alternatives.map(({ key, text, imageUrl }) => ({
      key,
      text,
      imageUrl: imageUrl ?? null,
    })),
    imageUrl: question.imageUrl,
    images: question.images.map((image) =>
      typeof image === "string"
        ? image
        : {
            url: image.url,
            altText: image.altText,
            description: image.description,
            order: image.order,
            width: image.width,
            height: image.height,
            assetType: image.assetType,
            relation: image.relation,
          },
    ),
  };
}

export type OldExamProofDraft = {
  version: typeof OLD_EXAM_PROOF_DRAFT_VERSION;
  examId: string;
  language: "ENGLISH" | "SPANISH" | null;
  startedAt: number;
  elapsedSeconds: number;
  activeQuestionId: string | null;
  answers: Record<string, OldExamProofAnswer>;
};

const ANSWER_PATTERN = /^[A-E]$/;

export function oldExamProofStorageKey(
  examId: string,
  language: OldExamProofDraft["language"],
) {
  return `estudaki:old-exam-proof:v${OLD_EXAM_PROOF_DRAFT_VERSION}:${examId}:${language ?? "NONE"}`;
}

export function createOldExamProofDraft(
  examId: string,
  language: OldExamProofDraft["language"],
  questionIds: string[],
  now = Date.now(),
): OldExamProofDraft {
  return {
    version: OLD_EXAM_PROOF_DRAFT_VERSION,
    examId,
    language,
    startedAt: now,
    elapsedSeconds: 0,
    activeQuestionId: questionIds[0] ?? null,
    answers: Object.fromEntries(questionIds.map((id) => [id, null])),
  };
}

export function parseOldExamProofDraft(
  raw: string | null,
  expected: {
    examId: string;
    language: OldExamProofDraft["language"];
    questionIds: string[];
  },
): OldExamProofDraft | null {
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<OldExamProofDraft>;
  if (
    candidate.version !== OLD_EXAM_PROOF_DRAFT_VERSION ||
    candidate.examId !== expected.examId ||
    candidate.language !== expected.language ||
    !Number.isFinite(candidate.startedAt) ||
    !Number.isFinite(candidate.elapsedSeconds) ||
    !candidate.answers ||
    typeof candidate.answers !== "object"
  ) {
    return null;
  }

  const allowedIds = new Set(expected.questionIds);
  const rawAnswers = candidate.answers as Record<string, unknown>;
  if (Object.keys(rawAnswers).some((id) => !allowedIds.has(id))) return null;

  const answers: Record<string, OldExamProofAnswer> = {};
  for (const id of expected.questionIds) {
    const answer = rawAnswers[id];
    answers[id] =
      typeof answer === "string" && ANSWER_PATTERN.test(answer)
        ? (answer as Exclude<OldExamProofAnswer, null>)
        : null;
  }

  const activeQuestionId =
    typeof candidate.activeQuestionId === "string" &&
    allowedIds.has(candidate.activeQuestionId)
      ? candidate.activeQuestionId
      : expected.questionIds[0] ?? null;

  return {
    version: OLD_EXAM_PROOF_DRAFT_VERSION,
    examId: expected.examId,
    language: expected.language,
    startedAt: Math.max(0, Math.floor(candidate.startedAt!)),
    elapsedSeconds: Math.max(0, Math.floor(candidate.elapsedSeconds!)),
    activeQuestionId,
    answers,
  };
}

export function validateOldExamProofSubmission(
  answers: unknown,
  questionIds: string[],
) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { ok: false as const, error: "Cartão-resposta inválido." };
  }
  const allowedIds = new Set(questionIds);
  const entries = Object.entries(answers as Record<string, unknown>);
  if (entries.some(([id]) => !allowedIds.has(id))) {
    return { ok: false as const, error: "O cartão-resposta contém questões de outro caderno." };
  }

  const normalized: Record<string, OldExamProofAnswer> = {};
  for (const id of questionIds) {
    const answer = (answers as Record<string, unknown>)[id];
    if (answer !== null && answer !== undefined && (typeof answer !== "string" || !ANSWER_PATTERN.test(answer))) {
      return { ok: false as const, error: "O cartão-resposta contém uma alternativa inválida." };
    }
    normalized[id] = typeof answer === "string" ? (answer as Exclude<OldExamProofAnswer, null>) : null;
  }
  return { ok: true as const, answers: normalized };
}
