import "server-only";
import type {
  Question,
  QuestionPedagogicalMetadata,
  Subject,
  Topic,
  Vestibular,
} from "@prisma/client";
import { createStudentQuestionPayload } from "./student-question-payload";

type StudentQuestionSource = Pick<
  Question,
  | "id"
  | "supportText"
  | "statement"
  | "year"
  | "exam"
  | "difficulty"
  | "subjectId"
  | "vestibularId"
  | "topicId"
  | "videoUrl"
  | "imageUrl"
  | "images"
  | "source"
  | "sourceName"
  | "sourceUrl"
  | "sourceCitation"
  | "sourceAccessedAt"
  | "sourceType"
  | "questionNumber"
  | "day"
  | "officialLanguage"
  | "officialGroup"
  | "officialVariant"
  | "answerSituation"
  | "alternatives"
> & {
  subject: Pick<Subject, "id" | "name">;
  topic: Pick<Topic, "id" | "name" | "subjectId"> | null;
  vestibular: Pick<Vestibular, "id" | "name" | "color">;
  pedagogicalMetadata?: Pick<QuestionPedagogicalMetadata, "knowledgeArea"> | null;
};

/**
 * Allowlist do payload inicial do aluno. Resposta, explicações e metadados
 * editoriais privados só podem sair pela API depois que a tentativa for salva.
 */
export function toStudentQuestion(question: StudentQuestionSource) {
  return createStudentQuestionPayload(question);
}
