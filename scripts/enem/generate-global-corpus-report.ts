import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  OfficialResolutionStatus,
  PrismaClient,
  QuestionImportJobStatus,
  QuestionReviewState,
} from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function essayDay(year: number) {
  return year >= 2017 ? 1 : 2;
}

function alternativeCommentsComplete(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const comments = value as Record<string, unknown>;
  return ["A", "B", "C", "D", "E"].every(
    (letter) =>
      typeof comments[letter] === "string" &&
      comments[letter].trim().length >= 25,
  );
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const outputJson = path.resolve(
    argument("--json") ??
      "data/QUESTÕES/processamento/relatorio-global-enem-2009-2025.json",
  );
  const outputMarkdown = path.resolve(
    argument("--markdown") ??
      "data/QUESTÕES/processamento/relatorio-global-enem-2009-2025.md",
  );
  const jobs = await db.questionImportJob.findMany({
    where: {
      vestibular: { equals: "ENEM", mode: "insensitive" },
      year: { gte: 2009, lte: 2025 },
      day: { in: [1, 2] },
    },
    include: {
      essayProposal: true,
      provaAntiga: {
        select: {
          questoes: {
            select: { questaoId: true, needsHumanReview: true },
          },
        },
      },
      extractions: {
        include: {
          answerKey: true,
          question: {
            include: {
              alternativeItems: { select: { id: true, explanation: true } },
              imageItems: { select: { id: true, relation: true } },
              pedagogicalMetadata: true,
              authorialResolutions: { where: { version: 1 }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const candidates = new Map<string, typeof jobs>();
  for (const job of jobs) {
    const key = `${job.year}-${job.day}`;
    candidates.set(key, [...(candidates.get(key) ?? []), job]);
  }

  const rows = [];
  for (let year = 2009; year <= 2025; year += 1) {
    for (const day of [1, 2] as const) {
      const job = (candidates.get(`${year}-${day}`) ?? []).sort(
        (left, right) =>
          Number(right.status === QuestionImportJobStatus.PUBLISHED) -
            Number(left.status === QuestionImportJobStatus.PUBLISHED) ||
          right.publishedQuestionCount - left.publishedQuestionCount ||
          right.approvedQuestionCount - left.approvedQuestionCount ||
          right.updatedAt.getTime() - left.updatedAt.getTime(),
      )[0];
      if (!job) {
        rows.push({
          year,
          day,
          corpusId: null,
          status: "NOT_STARTED",
          expected: 0,
          extracted: 0,
          alternatives: 0,
          media: 0,
          officialKeys: 0,
          classifications: 0,
          comments: 0,
          reviewed: 0,
          published: 0,
          essay: day === essayDay(year) ? "PENDING" : "NOT_APPLICABLE",
          pending: null,
          complete: false,
          issues: ["Caderno ainda não importado"],
        });
        continue;
      }
      const expected = job.expectedQuestionCount;
      const links = new Map(
        job.provaAntiga.questoes.map((link) => [
          link.questaoId,
          link.needsHumanReview,
        ]),
      );
      const extracted = job.extractions.length;
      const alternatives = job.extractions.reduce(
        (sum, extraction) => sum + extraction.question.alternativeItems.length,
        0,
      );
      const media = job.extractions.reduce(
        (sum, extraction) => sum + extraction.question.imageItems.length,
        0,
      );
      const officialKeys = job.extractions.filter(
        (extraction) =>
          extraction.answerKey.answerReviewStatus === "APPROVED" &&
          Boolean(extraction.answerKey.sourceUrl) &&
          Boolean(extraction.answerKey.sourceSha256) &&
          Boolean(extraction.answerKey.validationStatus),
      ).length;
      const classifications = job.extractions.filter(
        (extraction) =>
          extraction.question.pedagogicalMetadata?.reviewStatus ===
            QuestionReviewState.APPROVED &&
          Boolean(
            extraction.question.pedagogicalMetadata.knowledgeArea?.trim(),
          ) &&
          Boolean(
            extraction.question.pedagogicalMetadata.disciplinaryComponent?.trim(),
          ),
      ).length;
      const comments = job.extractions.filter((extraction) => {
        const resolution = extraction.question.authorialResolutions[0];
        return (
          resolution?.reviewStatus === QuestionReviewState.APPROVED &&
          (resolution.status === OfficialResolutionStatus.APPROVED ||
            resolution.status === OfficialResolutionStatus.PUBLISHED) &&
          Boolean(resolution.fullResolution?.trim()) &&
          Boolean(resolution.shortComment?.trim()) &&
          Boolean(resolution.commonError?.trim()) &&
          Boolean(resolution.studyTip?.trim()) &&
          alternativeCommentsComplete(resolution.alternativeComments)
        );
      }).length;
      const reviewed = job.extractions.filter(
        (extraction) =>
          extraction.reviewStatus === QuestionReviewState.APPROVED &&
          extraction.question.reviewState === QuestionReviewState.APPROVED &&
          links.get(extraction.questionId) === false &&
          extraction.question.imageItems.some(
            (image) => image.relation === "ADMIN_REFERENCE",
          ),
      ).length;
      const published = job.extractions.filter(
        (extraction) => extraction.question.status === "PUBLISHED",
      ).length;
      const essayRequired = day === essayDay(year);
      const essayComplete =
        !essayRequired ||
        (job.essayProposal?.reviewStatus === QuestionReviewState.APPROVED &&
          job.essayProposal.status === "PUBLISHED" &&
          Boolean(job.essayProposal.theme?.trim()) &&
          Boolean(job.essayProposal.promptText.trim()) &&
          Boolean(job.essayProposal.publishedAt));
      const issues = [
        extracted !== expected && `Extração ${extracted}/${expected}`,
        alternatives !== expected * 5 &&
          `Alternativas ${alternatives}/${expected * 5}`,
        officialKeys !== expected && `Gabaritos ${officialKeys}/${expected}`,
        classifications !== expected &&
          `Classificações ${classifications}/${expected}`,
        comments !== expected && `Comentários ${comments}/${expected}`,
        reviewed !== expected && `Revisões ${reviewed}/${expected}`,
        published !== expected && `Publicadas ${published}/${expected}`,
        !essayComplete && "Redação pendente",
        job.status !== QuestionImportJobStatus.PUBLISHED && `Job ${job.status}`,
      ].filter((issue): issue is string => Boolean(issue));
      rows.push({
        year,
        day,
        corpusId: job.pilotId,
        status: job.status,
        expected,
        extracted,
        alternatives,
        media,
        officialKeys,
        classifications,
        comments,
        reviewed,
        published,
        essay: essayRequired
          ? essayComplete
            ? "PUBLISHED"
            : "PENDING"
          : "NOT_APPLICABLE",
        pending: issues.length
          ? expected -
            Math.min(
              extracted,
              officialKeys,
              classifications,
              comments,
              reviewed,
              published,
            )
          : 0,
        complete: issues.length === 0,
        issues,
      });
    }
  }

  const totals = {
    years: 17,
    expectedBooklets: 34,
    representedBooklets: rows.filter((row) => row.corpusId).length,
    completedBooklets: rows.filter((row) => row.complete).length,
    mappedExpectedOccurrences: rows.reduce((sum, row) => sum + row.expected, 0),
    extractedOccurrences: rows.reduce((sum, row) => sum + row.extracted, 0),
    alternatives: rows.reduce((sum, row) => sum + row.alternatives, 0),
    media: rows.reduce((sum, row) => sum + row.media, 0),
    officialKeys: rows.reduce((sum, row) => sum + row.officialKeys, 0),
    classifications: rows.reduce((sum, row) => sum + row.classifications, 0),
    comments: rows.reduce((sum, row) => sum + row.comments, 0),
    reviewedOccurrences: rows.reduce((sum, row) => sum + row.reviewed, 0),
    publishedOccurrences: rows.reduce((sum, row) => sum + row.published, 0),
    publishedEssays: rows.filter((row) => row.essay === "PUBLISHED").length,
    complete: rows.every((row) => row.complete),
  };
  const generatedAt = new Date().toISOString();
  const report = { schemaVersion: 1, generatedAt, totals, rows };
  const jsonPayload = `${JSON.stringify(report, null, 2)}\n`;
  const header =
    "| Ano | Dia | Esperadas | Extraídas | Gabaritos | Comentários | Publicadas | Pendências |\n" +
    "|---:|---:|---:|---:|---:|---:|---:|---:|\n";
  const table = rows
    .map(
      (row) =>
        `| ${row.year} | ${row.day} | ${row.expected || "—"} | ${row.extracted} | ${row.officialKeys} | ${row.comments} | ${row.published} | ${row.complete ? 0 : (row.pending ?? "não iniciado")} |`,
    )
    .join("\n");
  const markdownPayload =
    `# Relatório global ENEM 2009–2025\n\nGerado em ${generatedAt}.\n\n` +
    `Cadernos concluídos: **${totals.completedBooklets}/${totals.expectedBooklets}**. ` +
    `Ocorrências publicadas nos cadernos já mapeados: **${totals.publishedOccurrences}/${totals.mappedExpectedOccurrences}**; ` +
    `isso não representa conclusão global enquanto houver caderno não importado.\n\n${header}${table}\n`;

  await Promise.all([
    mkdir(path.dirname(outputJson), { recursive: true }),
    mkdir(path.dirname(outputMarkdown), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(outputJson, jsonPayload, "utf8"),
    writeFile(outputMarkdown, markdownPayload, "utf8"),
    writeFile(
      `${outputJson}.sha256`,
      `${sha256(jsonPayload)}  ${path.basename(outputJson)}\n`,
      "utf8",
    ),
    writeFile(
      `${outputMarkdown}.sha256`,
      `${sha256(markdownPayload)}  ${path.basename(outputMarkdown)}\n`,
      "utf8",
    ),
  ]);
  console.log(
    JSON.stringify(
      {
        generatedAt,
        totals,
        json: path.relative(process.cwd(), outputJson).replaceAll("\\", "/"),
        jsonSha256: sha256(jsonPayload),
        markdown: path
          .relative(process.cwd(), outputMarkdown)
          .replaceAll("\\", "/"),
        markdownSha256: sha256(markdownPayload),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
