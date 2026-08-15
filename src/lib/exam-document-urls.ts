import { getCanonicalOldExamId } from "@/lib/old-exam-documents";

type ExamDocumentInput = {
  id: string;
  title: string;
  year: number;
  phase: string;
  day: string | null;
  pdfUrl: string | null;
  answerKeyUrl: string | null;
  vestibular: { name: string; slug: string };
};

export function resolveExamDocumentUrls<T extends ExamDocumentInput>(exam: T): T {
  const oldExamId = getCanonicalOldExamId({
    id: exam.id,
    title: exam.title,
    year: exam.year,
    phase: exam.phase,
    day: exam.day,
    vestibular: exam.vestibular,
  });

  if (!oldExamId || !shouldPreferCanonicalOldExamRoute(exam)) return exam;

  return {
    ...exam,
    pdfUrl: `/api/provas-antigas/${oldExamId}/arquivo?tipo=prova`,
    answerKeyUrl: `/api/provas-antigas/${oldExamId}/arquivo?tipo=gabarito`,
  };
}

function shouldPreferCanonicalOldExamRoute(exam: ExamDocumentInput) {
  const vestibular = `${exam.vestibular.slug} ${exam.vestibular.name}`.toLowerCase();
  const examUrl = exam.pdfUrl ?? "";
  const answerKeyUrl = exam.answerKeyUrl ?? "";

  if (!examUrl || !answerKeyUrl) return true;

  if (vestibular.includes("enem")) {
    return exam.year < 2020 && examUrl.includes("download.inep.gov.br/enem/provas_e_gabaritos/");
  }

  if (vestibular.includes("fuvest")) {
    return !examUrl.includes("/wp-content/uploads/") || !answerKeyUrl.includes("/wp-content/uploads/");
  }

  return false;
}

export function mergeExamCatalog<T extends ExamDocumentInput, U extends ExamDocumentInput>(
  databaseExams: T[],
  fallbackExams: U[],
) {
  const seen = new Set<string>();
  const merged: Array<T | U> = [];

  for (const exam of [...databaseExams, ...fallbackExams]) {
    const fingerprint = [
      exam.id,
      exam.vestibular.slug,
      exam.year,
      exam.title,
      exam.phase,
      exam.day ?? "",
    ]
      .join("|")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const titleFingerprint = [
      exam.vestibular.slug,
      exam.year,
      exam.title,
      exam.phase,
      exam.day ?? "",
    ]
      .join("|")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (seen.has(exam.id) || seen.has(fingerprint) || seen.has(titleFingerprint)) continue;
    seen.add(exam.id);
    seen.add(fingerprint);
    seen.add(titleFingerprint);
    merged.push(resolveExamDocumentUrls(exam));
  }

  return merged;
}
