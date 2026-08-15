import "server-only";

import { QuestionImportJobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  selectOldExamLanguageLinks,
  type OldExamLanguage,
} from "@/lib/old-exam-language";
import { toStudentQuestion } from "@/lib/student-question";

const PREVIEWABLE_JOB_STATUSES = new Set<QuestionImportJobStatus>([
  QuestionImportJobStatus.WAITING_REVIEW,
  QuestionImportJobStatus.READY_TO_PUBLISH,
]);

export async function loadEnemReviewPreview(
  jobId: string,
  requestedLanguage: OldExamLanguage | null,
) {
  const job = await db.questionImportJob.findUnique({
    where: { id: jobId },
    include: {
      provaAntiga: {
        select: { id: true, slug: true, vestibular: true, ano: true, titulo: true, dia: true },
      },
      extractions: {
        orderBy: [{ officialOrder: "asc" }, { officialLanguage: "asc" }],
        include: {
          question: {
            include: {
              subject: true,
              topic: true,
              vestibular: true,
              pedagogicalMetadata: { select: { knowledgeArea: true } },
            },
          },
        },
      },
    },
  });
  if (
    !job ||
    !PREVIEWABLE_JOB_STATUSES.has(job.status) ||
    job.extractions.length !== job.expectedQuestionCount
  ) {
    return null;
  }

  const links = job.extractions.map((extraction) => ({
    numeroQuestao: extraction.officialNumber,
    ordem: extraction.officialOrder,
    officialLanguage: extraction.officialLanguage,
    extraction,
  }));
  const selection = selectOldExamLanguageLinks(links, requestedLanguage);

  return {
    job: {
      id: job.id,
      pilotId: job.pilotId,
      status: job.status,
      expectedQuestionCount: job.expectedQuestionCount,
      sourceJsonSha256: job.sourceJsonSha256,
    },
    exam: job.provaAntiga,
    availableLanguages: selection.availableLanguages,
    selectedLanguage: selection.selectedLanguage,
    questions: selection.links.map(({ extraction }) => ({
      ...toStudentQuestion(extraction.question),
      officialLanguage: extraction.officialLanguage,
      officialGroup: extraction.officialGroup ?? extraction.question.officialGroup,
      officialVariant: extraction.officialVariant ?? extraction.question.officialVariant,
      adminOriginalPageUrl: extraction.originalPageUrl,
      sourceId: extraction.sourceId,
    })),
  };
}
