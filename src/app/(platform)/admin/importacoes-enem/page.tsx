import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { EnemCorpusProgressPanel } from "@/components/admin/enem-corpus-progress";
import { EnemImportDashboard } from "@/components/admin/enem-import-dashboard";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnemCorpusProgress } from "@/lib/enem-corpus-progress";
import {
  calculatePilotGate,
  ENEM_2022_DAY_2_PILOT_ID,
  isExactPilotJob,
  pilotJobInclude,
  validationReportOf,
} from "@/lib/enem-import-admin";

export const dynamic = "force-dynamic";

export default async function EnemImportsPage() {
  const user = await requireManager();
  if (user.role !== Role.ADMIN) redirect("/admin");

  const [job, corpusProgress] = await Promise.all([
    db.questionImportJob.findUnique({
      where: { pilotId: ENEM_2022_DAY_2_PILOT_ID },
      include: pilotJobInclude,
    }),
    getEnemCorpusProgress(),
  ]);

  const dashboard = job && isExactPilotJob(job)
    ? await (async () => {
        const [gate, links] = await Promise.all([
          calculatePilotGate(job),
          db.provaAntigaQuestao.findMany({
            where: { provaAntigaId: job.provaAntigaId },
            orderBy: { numeroQuestao: "asc" },
            select: {
              numeroQuestao: true,
              needsHumanReview: true,
              extractionConfidence: true,
              questao: {
                select: {
                  id: true,
                  statement: true,
                  status: true,
                  reviewState: true,
                  answerSituation: true,
                  structuredExtraction: {
                    select: {
                      reviewStatus: true,
                      extractionStatus: true,
                      confidenceOverall: true,
                    },
                  },
                  officialAnswerKey: {
                    select: { answerReviewStatus: true },
                  },
                },
              },
            },
          }),
        ]);
        const report = validationReportOf(job.validationReport);
        return {
          job: {
            id: job.id,
            pilotId: job.pilotId,
            status: job.status,
            year: job.year,
            day: job.day,
            application: job.application,
            modality: job.modality,
            bookletNumber: job.bookletNumber,
            bookletColor: job.bookletColor,
            expected: job.expectedQuestionCount,
            imported: job.importedQuestionCount,
            approved: job.approvedQuestionCount,
            published: job.publishedQuestionCount,
            updatedAt: job.updatedAt.toISOString(),
            examUrl: job.examFile.storageUrl,
            keyUrl: job.answerKeyFile.storageUrl,
            officialExamUrl: job.examFile.originalUrl,
            officialKeyUrl: job.answerKeyFile.originalUrl,
          },
          report: {
            valid: report.valid === true,
            questionCount: Number(report.questionCount ?? 0),
            answerCount: Number(report.answerCount ?? 0),
            originalCropCount: Number(report.originalCropCount ?? 0),
            errors: Array.isArray(report.errors) ? report.errors.map(String) : [],
            warnings: Array.isArray(report.warnings) ? report.warnings.map(String) : [],
          },
          gate,
          questions: links.map((link) => ({
            id: link.questao.id,
            number: link.numeroQuestao,
            statement: link.questao.statement,
            status: link.questao.status,
            reviewState: link.questao.reviewState,
            extractionReviewState: link.questao.structuredExtraction?.reviewStatus ?? null,
            extractionStatus: link.questao.structuredExtraction?.extractionStatus ?? null,
            answerReviewStatus: link.questao.officialAnswerKey?.answerReviewStatus ?? null,
            answerSituation: link.questao.answerSituation,
            needsHumanReview: link.needsHumanReview,
            confidence:
              link.questao.structuredExtraction?.confidenceOverall ??
              link.extractionConfidence ??
              null,
          })),
        };
      })()
    : null;

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Importações ENEM"
        title="Corpus oficial ENEM 2009–2025"
        description="Acompanhamento real dos 34 cadernos canônicos e de todos os gates editoriais. O piloto ENEM 2022, 2º dia, permanece detalhado abaixo."
      />
      <EnemCorpusProgressPanel progress={corpusProgress} />
      <EnemImportDashboard initialDashboard={dashboard} />
    </div>
  );
}
