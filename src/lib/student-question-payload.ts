import { parseJson } from "./utils";

type StudentAlternative = {
  key: string;
  text: string;
  imageUrl?: string | null;
};

type StudentQuestionImage =
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

export type StudentQuestionPayloadSource = {
  id: string;
  supportText: string | null;
  statement: string;
  year: number;
  exam: string | null;
  difficulty: string;
  subjectId: string;
  vestibularId: string;
  topicId: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  images: string;
  source: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceCitation: string | null;
  sourceAccessedAt: string | null;
  sourceType: string;
  questionNumber: number | null;
  day: string | null;
  officialLanguage: string;
  officialGroup: string | null;
  officialVariant: string | null;
  answerSituation: string;
  alternatives: string;
  subject: { id: string; name: string };
  topic: { id: string; name: string; subjectId: string } | null;
  vestibular: { id: string; name: string; color: string };
  pedagogicalMetadata?: { knowledgeArea: string | null } | null;
};

/**
 * Constrói explicitamente o payload público da questão. Campos editoriais e de
 * correção não são propagados, mesmo quando o objeto de origem contém dados extras.
 */
export function createStudentQuestionPayload(question: StudentQuestionPayloadSource) {
  const hideAlternativeImages =
    question.sourceType === "OFFICIAL" && question.vestibular.name.toLowerCase().includes("enem");
  const alternatives = parseJson<StudentAlternative[]>(question.alternatives, []).map(
    ({ key, text, imageUrl }) => ({
      key,
      text,
      imageUrl: hideAlternativeImages ? null : imageUrl ?? null,
    }),
  );

  return {
    id: question.id,
    supportText: question.supportText,
    statement: question.statement,
    year: question.year,
    exam: question.exam,
    difficulty: question.difficulty,
    subjectId: question.subjectId,
    vestibularId: question.vestibularId,
    topicId: question.topicId,
    videoUrl: question.videoUrl,
    imageUrl: question.imageUrl,
    images: parseJson<StudentQuestionImage[]>(question.images, []),
    source: question.source,
    sourceName: question.sourceName,
    sourceUrl: question.sourceUrl,
    sourceCitation: question.sourceCitation,
    sourceAccessedAt: question.sourceAccessedAt,
    sourceType: question.sourceType,
    questionNumber: question.questionNumber,
    day: question.day,
    officialLanguage: question.officialLanguage,
    officialGroup: question.officialGroup,
    officialVariant: question.officialVariant,
    answerSituation: question.answerSituation,
    knowledgeArea: question.pedagogicalMetadata?.knowledgeArea ?? null,
    alternatives,
    subject: {
      id: question.subject.id,
      name: question.subject.name,
    },
    topic: question.topic
      ? {
          id: question.topic.id,
          name: question.topic.name,
          subjectId: question.topic.subjectId,
        }
      : null,
    vestibular: {
      id: question.vestibular.id,
      name: question.vestibular.name,
      color: question.vestibular.color,
    },
  };
}
