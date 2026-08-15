import "server-only";

import { OfficialQuestionLanguage } from "@prisma/client";
import { db } from "@/lib/db";
import {
  parseOldExamLanguage,
  selectOldExamLanguageLinks,
  type OldExamLanguage,
} from "@/lib/old-exam-language";
import { toStudentQuestion } from "@/lib/student-question";

export async function loadStudentOldExam(
  examId: string,
  requestedLanguage: OldExamLanguage | null,
) {
  const exam = await db.provaAntiga.findUnique({
    where: { id: examId },
    include: {
      questoes: {
        where: {
          officialLanguage: {
            in: [
              OfficialQuestionLanguage.NOT_APPLICABLE,
              OfficialQuestionLanguage.ENGLISH,
              OfficialQuestionLanguage.SPANISH,
            ],
          },
          questao: { status: "PUBLISHED", reviewState: "APPROVED" },
        },
        include: {
          questao: {
            include: {
              subject: true,
              topic: true,
              vestibular: true,
            },
          },
        },
        orderBy: [{ ordem: "asc" }, { numeroQuestao: "asc" }, { officialLanguage: "asc" }],
      },
    },
  });
  if (!exam) return null;

  const selection = selectOldExamLanguageLinks(exam.questoes, requestedLanguage);
  return {
    exam: {
      id: exam.id,
      slug: exam.slug,
      vestibular: exam.vestibular,
      ano: exam.ano,
      titulo: exam.titulo,
      dia: exam.dia,
    },
    availableLanguages: selection.availableLanguages,
    selectedLanguage: selection.selectedLanguage,
    questions: selection.links.map((link) => ({
      ...toStudentQuestion(link.questao),
      officialLanguage: link.officialLanguage,
      officialGroup: link.officialGroup ?? link.questao.officialGroup,
      officialVariant: link.officialVariant ?? link.questao.officialVariant,
    })),
  };
}

export function requestedOldExamLanguage(value: string | string[] | null | undefined) {
  return parseOldExamLanguage(value);
}
