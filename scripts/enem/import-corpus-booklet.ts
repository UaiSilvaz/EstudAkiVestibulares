import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  ContentStatus,
  Difficulty,
  OfficialAnswerReviewStatus,
  OfficialFileType,
  OfficialProcessingStatus,
  OfficialQuestionLanguage,
  OfficialResolutionStatus,
  Prisma,
  PrismaClient,
  QuestionAnswerSituation,
  QuestionAssetRelation,
  QuestionAssetType,
  QuestionBlockType,
  QuestionExtractionStatus,
  QuestionImportJobStatus,
  QuestionReviewState,
  QuestionRevisionAction,
  QuestionSourceType,
} from "@prisma/client";
import {
  CORPUS_LETTERS,
  assetsOf,
  corpusLanguage,
  readAppEvidence,
  readCorpusBundle,
  readReviewEvidence,
  readVisualAudit,
  relativeToRepo,
  repoPath,
  sha256File,
  sha256Text,
  stableQuestionHash,
  type CorpusAsset,
  type CorpusBundle,
  type CorpusQuestion,
  type CorpusRegion,
} from "./corpus-importer-core";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

type PreparedAsset = {
  source: CorpusAsset;
  url: string;
  storagePath: string;
  absoluteStoragePath: string;
  assetType: QuestionAssetType;
  relation: QuestionAssetRelation;
  alternativeKey: string | null;
  order: number;
};

type Resolution = {
  sourceId: string;
  officialNumber: number;
  language: string;
  officialAnswer: string;
  answerVerified: boolean;
  answerVerification: string;
  shortComment: string;
  fullResolution: string;
  reasoningPath: string[];
  steps: string[];
  alternativeComments: Record<(typeof CORPUS_LETTERS)[number], string>;
  commonError: string;
  studyTip: string;
  keywords: string[];
  relatedContent: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  estimatedMinutes: number;
  knowledgeArea: string;
  disciplinaryComponent: string;
  content: string;
  subcontent: string;
};

type ResolutionFile = {
  complete: boolean;
  sourceByteSha256?: string;
  finalResolutionSetHash?: string;
  expectedQuestions: number;
  processedQuestions: number;
  resolutions: Resolution[];
};

type ResolutionAuditFile = {
  sourceByteSha256?: string;
  resolutionSetHash?: string;
  complete: boolean;
  canApprove: boolean;
  expected?: number;
  audited: number;
  passed: number;
  failed: number;
  audits: Array<{ sourceId: string; verdict: "PASS" | "FAIL" }>;
};

type Classification = {
  sourceId: string;
  officialNumber: number;
  language: string;
  knowledgeArea: string;
  disciplinaryComponent: string;
  content: string;
  subcontent: string;
  competencyCode: string;
  abilityCode: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  estimatedMinutes: number;
  reviewRequired?: boolean;
};

type ClassificationFile = {
  sourceByteSha256: string;
  sourceHash: string;
  complete: boolean;
  expected: number;
  classified: number;
  reviewRequired: number;
  classifications: Classification[];
};

type ClassificationAuditFile = {
  sourceByteSha256?: string;
  classificationSourceHash: string;
  complete: boolean;
  canApprove: boolean;
  expected: number;
  audited: number;
  passed: number;
  failed: number;
  audits: Array<{ sourceId: string; verdict: "PASS" | "FAIL" }>;
};

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function has(name: string) {
  return process.argv.includes(name);
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "a-classificar"
  );
}

function difficulty(value: string | null | undefined) {
  const normalized = slugify(value ?? "");
  if (["easy", "facil"].includes(normalized)) return Difficulty.EASY;
  if (["hard", "dificil"].includes(normalized)) return Difficulty.HARD;
  return Difficulty.MEDIUM;
}

function answerSituation(question: CorpusQuestion) {
  return question.answerSituation === "annulled"
    ? QuestionAnswerSituation.ANNULLED
    : QuestionAnswerSituation.CONFIRMED;
}

function compatibleAnswer(question: CorpusQuestion) {
  return answerSituation(question) === QuestionAnswerSituation.ANNULLED
    ? "ANULADA"
    : question.answer;
}

function variantOf(question: CorpusQuestion) {
  const language = corpusLanguage(question.language);
  return language === OfficialQuestionLanguage.NOT_APPLICABLE ? null : language;
}

function blockType(value: string) {
  if (value === "image") return QuestionBlockType.IMAGE;
  if (value === "command") return QuestionBlockType.COMMAND;
  if (value === "credit") return QuestionBlockType.CREDIT;
  return QuestionBlockType.SUPPORT_TEXT;
}

function assetType(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("original"))
    return QuestionAssetType.ORIGINAL_REFERENCE;
  if (normalized.includes("alternative"))
    return QuestionAssetType.ALTERNATIVE_VISUAL;
  if (normalized.includes("facsimile"))
    return QuestionAssetType.PROMPT_FACSIMILE;
  return QuestionAssetType.VISUAL;
}

function assetRelation(value: string) {
  if (value === "alternative") return QuestionAssetRelation.ALTERNATIVE;
  if (value === "admin_reference" || value === "admin_original_page") {
    return QuestionAssetRelation.ADMIN_REFERENCE;
  }
  return QuestionAssetRelation.STATEMENT;
}

function regionColumns(region: CorpusRegion) {
  return {
    regionX: region.x,
    regionY: region.y,
    regionWidth: region.width,
    regionHeight: region.height,
    normalizedX: region.normalized.x,
    normalizedY: region.normalized.y,
    normalizedWidth: region.normalized.width,
    normalizedHeight: region.normalized.height,
  };
}

function sourceRegionOfAlternative(question: CorpusQuestion, key: string) {
  const alternative = question.alternatives.find((item) => item.key === key)!;
  const firstRegion = alternative.sourceRegions?.[0];
  return {
    sourcePdfPage:
      firstRegion?.sourcePdfPage ?? alternative.marker.sourcePdfPage,
    region: firstRegion?.sourceRegion ?? alternative.marker.sourceRegion,
  };
}

function storageMimeType(storagePath: string) {
  const extension = path.extname(storagePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return null;
}

function prepareAssets(bundle: CorpusBundle, question: CorpusQuestion) {
  const seen = new Set<string>();
  const prepared: PreparedAsset[] = [];
  for (const source of assetsOf(question)) {
    const type = assetType(source.type);
    const relation = assetRelation(source.relation);
    const alternativeKey = source.alternativeKey ?? null;
    const dedupe = `${source.sha256}:${type}:${relation}:${alternativeKey ?? ""}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const extension = path.extname(source.artifactPath).toLowerCase() || ".png";
    const safeType = slugify(source.type);
    const fileName = `${String(prepared.length + 1).padStart(3, "0")}-${safeType}-${source.sha256.slice(0, 16)}${extension}`;
    const relativeAssetPath = [
      "enem",
      String(question.year),
      `dia-${question.day}`,
      question.corpusId,
      question.id,
      fileName,
    ].join("/");
    const storagePath = `storage/questoes/${relativeAssetPath}`;
    prepared.push({
      source,
      url: `/api/questions/assets/${relativeAssetPath}`,
      storagePath,
      absoluteStoragePath: repoPath(storagePath),
      assetType: type,
      relation,
      alternativeKey,
      order: prepared.length,
    });
  }
  if (bundle.report.corpusId !== question.corpusId)
    throw new Error(`${question.id}: corpusId inesperado.`);
  return prepared;
}

function prepareEssayAssets(bundle: CorpusBundle) {
  if (!bundle.essay) return [] as PreparedAsset[];
  const rawAssets = [
    ...(bundle.essay.visualAssets ?? []),
    ...bundle.essay.pages.flatMap(
      (page) =>
        [page.facsimile, ...(page.visualAssets ?? [])].filter(
          Boolean,
        ) as CorpusAsset[],
    ),
  ];
  const seen = new Set<string>();
  return rawAssets.flatMap((source, index) => {
    if (seen.has(source.sha256)) return [];
    seen.add(source.sha256);
    const extension = path.extname(source.artifactPath).toLowerCase() || ".png";
    const relativeAssetPath = [
      "enem",
      String(bundle.essay!.year),
      `dia-${bundle.essay!.day}`,
      bundle.essay!.corpusId,
      "redacao",
      `${String(index + 1).padStart(3, "0")}-${slugify(source.type)}-${source.sha256.slice(0, 16)}${extension}`,
    ].join("/");
    const storagePath = `storage/questoes/${relativeAssetPath}`;
    return [
      {
        source,
        url: `/api/questions/assets/${relativeAssetPath}`,
        storagePath,
        absoluteStoragePath: repoPath(storagePath),
        assetType: assetType(source.type),
        relation: assetRelation(source.relation),
        alternativeKey: null,
        order: index,
      },
    ];
  });
}

async function copyPreparedAssets(assets: PreparedAsset[]) {
  for (const asset of assets) {
    await mkdir(path.dirname(asset.absoluteStoragePath), { recursive: true });
    await copyFile(
      repoPath(asset.source.artifactPath),
      asset.absoluteStoragePath,
    );
    if ((await sha256File(asset.absoluteStoragePath)) !== asset.source.sha256) {
      throw new Error(
        `Falha de integridade ao armazenar ${asset.storagePath}.`,
      );
    }
  }
}

async function resolveSubjectAndTopic(question: CorpusQuestion) {
  const subjectName =
    question.subject?.trim() || question.area.trim() || "A classificar";
  const subjectSlug = slugify(subjectName);
  const subject = await db.subject.upsert({
    where: { slug: subjectSlug },
    update: { name: subjectName },
    create: {
      name: subjectName,
      slug: subjectSlug,
      description: "Classificação editorial de questões oficiais do ENEM.",
    },
  });
  if (!question.content?.trim())
    return { subjectId: subject.id, topicId: null };
  const topicName = question.subcontent?.trim()
    ? `${question.content.trim()} — ${question.subcontent.trim()}`
    : question.content.trim();
  const topicSlug = `${subjectSlug}-${slugify(topicName)}`;
  const topic = await db.topic.upsert({
    where: { slug: topicSlug },
    update: { name: topicName, subjectId: subject.id },
    create: { name: topicName, slug: topicSlug, subjectId: subject.id },
  });
  return { subjectId: subject.id, topicId: topic.id };
}

function snapshot(question: {
  id: string;
  contentHash: string | null;
  reviewState: QuestionReviewState;
  status: ContentStatus;
  updatedAt: Date;
}) {
  return jsonValue({
    id: question.id,
    contentHash: question.contentHash,
    reviewState: question.reviewState,
    status: question.status,
    updatedAt: question.updatedAt.toISOString(),
  });
}

async function importQuestion(input: {
  bundle: CorpusBundle;
  question: CorpusQuestion;
  jobId: string;
  vestibularId: string;
  keyFileId: string;
  actor: string;
}) {
  const { bundle, question, jobId, vestibularId, keyFileId, actor } = input;
  const language = corpusLanguage(question.language);
  const variant = variantOf(question);
  const rawPayloadHash = stableQuestionHash(question);
  const preparedAssets = prepareAssets(bundle, question);
  await copyPreparedAssets(preparedAssets);
  const [existingLink, extractionBySource, hashOwner] = await Promise.all([
    db.provaAntigaQuestao.findUnique({
      where: {
        provaAntigaId_numeroQuestao_officialLanguage: {
          provaAntigaId: question.oldExamId,
          numeroQuestao: question.officialNumber,
          officialLanguage: language,
        },
      },
      include: { questao: { include: { structuredExtraction: true } } },
    }),
    db.questionExtraction.findUnique({
      where: { sourceId: question.id },
      include: { question: { include: { structuredExtraction: true } } },
    }),
    db.question.findUnique({
      where: { contentHash: question.contentHash },
      include: { structuredExtraction: true },
    }),
  ]);
  const candidateIds = new Set(
    [
      existingLink?.questaoId,
      extractionBySource?.questionId,
      hashOwner?.id,
    ].filter(Boolean),
  );
  if (candidateIds.size > 1) {
    throw new Error(
      `${question.id}: identidade, sourceId e contentHash apontam para registros diferentes.`,
    );
  }
  const existingQuestion =
    existingLink?.questao ?? extractionBySource?.question ?? hashOwner ?? null;
  if (
    existingQuestion?.structuredExtraction &&
    existingQuestion.structuredExtraction.sourceId !== question.id
  ) {
    throw new Error(
      `${question.id}: questão alvo já pertence a outro sourceId.`,
    );
  }
  if (
    existingQuestion?.status === ContentStatus.PUBLISHED &&
    existingQuestion.structuredExtraction?.importJobId !== jobId
  ) {
    throw new Error(
      `${question.id}: substituição de questão já publicada foi bloqueada.`,
    );
  }
  const unchanged =
    existingQuestion?.structuredExtraction?.rawPayloadHash === rawPayloadHash;
  const preserveApproval =
    unchanged &&
    existingQuestion?.structuredExtraction?.importJobId === jobId &&
    existingQuestion.reviewState === QuestionReviewState.APPROVED;
  const { subjectId, topicId } = await resolveSubjectAndTopic(question);
  const situation = answerSituation(question);
  const answer = compatibleAnswer(question);
  const sourceAnswer = question.officialAnswerKey;
  const normalizedAlternatives = question.alternatives.map((alternative) => {
    const alternativeImage = preparedAssets.find(
      (asset) =>
        asset.relation === QuestionAssetRelation.ALTERNATIVE &&
        asset.alternativeKey === alternative.key,
    );
    return {
      key: alternative.key,
      text: alternative.text,
      imageUrl: alternativeImage?.url ?? null,
    };
  });
  const studentAssets = preparedAssets.filter(
    (asset) =>
      asset.relation === QuestionAssetRelation.STATEMENT &&
      asset.assetType === QuestionAssetType.VISUAL,
  );
  const tags = [
    "oficial",
    "enem",
    String(question.year),
    `${question.day}-dia`,
    `caderno-${question.bookletNumber}-${slugify(question.bookletColor)}`,
    slugify(question.area),
    language === OfficialQuestionLanguage.ENGLISH ? "ingles" : null,
    language === OfficialQuestionLanguage.SPANISH ? "espanhol" : null,
  ].filter(Boolean);
  const commonData = {
    vestibularId,
    subjectId,
    topicId,
    year: question.year,
    exam: `ENEM ${question.year} · ${question.day}º dia · Caderno ${question.bookletNumber} ${question.bookletColor}`,
    phase: question.applicationLabel?.trim() || question.application,
    day: `${question.day}º dia`,
    questionNumber: question.officialNumber,
    difficulty: difficulty(question.difficulty),
    statement: question.command.trim(),
    supportText: question.supportText?.trim() || null,
    alternatives: JSON.stringify(normalizedAlternatives),
    correctAlternative: answer,
    skill:
      [question.competency, question.ability].filter(Boolean).join(" · ") ||
      null,
    imageUrl: studentAssets[0]?.url ?? null,
    images: JSON.stringify(
      studentAssets.map((asset) => ({
        url: asset.url,
        altText: asset.source.altText,
        width: asset.source.width,
        height: asset.source.height,
        order: asset.order,
        assetType: asset.assetType,
        relation: asset.relation,
      })),
    ),
    tags: JSON.stringify(tags),
    source: question.source.institution,
    sourceName: `Inep — ENEM ${question.year}, ${question.day}º dia, Caderno ${question.bookletNumber} ${question.bookletColor}`,
    sourceUrl: question.source.originalPageUrl,
    sourceCitation:
      `ENEM ${question.year} · ${question.day}º dia · Caderno ${question.bookletNumber} ${question.bookletColor} · ` +
      `questão ${question.officialNumber}${variant ? ` · ${variant}` : ""} · página institucional: ${question.source.sourcePageUrl}`,
    sourceAccessedAt:
      question.source.accessedAt ??
      "Data de acesso registrada na proveniência do corpus.",
    sourceType: QuestionSourceType.OFFICIAL,
    answerSituation: situation,
    officialLanguage: language,
    officialGroup: question.variantGroupId ?? null,
    officialVariant: variant,
    reviewState: preserveApproval
      ? QuestionReviewState.APPROVED
      : QuestionReviewState.PENDING_REVIEW,
    reviewNotes:
      "Extração estruturada do PDF oficial. Revisão visual rastreável, gabarito confirmado, resolução autoral e testes funcionais são obrigatórios antes da publicação.",
    contentHash: question.contentHash,
    status: ContentStatus.REVIEW,
  };

  return db.$transaction(
    async (tx) => {
      const existingKey = await tx.officialAnswerKey.findUnique({
        where: {
          fileId_questionNumber_officialLanguage: {
            fileId: keyFileId,
            questionNumber: question.officialNumber,
            officialLanguage: language,
          },
        },
      });
      if (
        existingKey?.questionId &&
        existingKey.questionId !== existingQuestion?.id
      ) {
        throw new Error(
          `${question.id}: gabarito já está relacionado a outra questão.`,
        );
      }
      const answerKey = await tx.officialAnswerKey.upsert({
        where: {
          fileId_questionNumber_officialLanguage: {
            fileId: keyFileId,
            questionNumber: question.officialNumber,
            officialLanguage: language,
          },
        },
        update: {
          officialGroup: question.variantGroupId ?? null,
          officialVariant: variant,
          correctAlternative: answer,
          answerSituation: situation,
          sourceUrl: sourceAnswer.sourceUrl,
          sourceSha256: sourceAnswer.sourceSha256,
          sourcePdfPage: sourceAnswer.sourcePdfPage,
          validationStatus: preserveApproval
            ? "validated_against_official_pdf"
            : sourceAnswer.validationStatus,
          importedAt: sourceAnswer.importedAt
            ? new Date(sourceAnswer.importedAt)
            : new Date(),
          statement: question.command,
          answerReviewStatus: preserveApproval
            ? OfficialAnswerReviewStatus.APPROVED
            : OfficialAnswerReviewStatus.CHECKED,
          answerReviewedBy: preserveApproval
            ? existingKey?.answerReviewedBy
            : null,
          answerReviewedAt: preserveApproval
            ? existingKey?.answerReviewedAt
            : null,
        },
        create: {
          fileId: keyFileId,
          questionNumber: question.officialNumber,
          officialLanguage: language,
          officialGroup: question.variantGroupId ?? null,
          officialVariant: variant,
          correctAlternative: answer,
          answerSituation: situation,
          sourceUrl: sourceAnswer.sourceUrl,
          sourceSha256: sourceAnswer.sourceSha256,
          sourcePdfPage: sourceAnswer.sourcePdfPage,
          validationStatus: sourceAnswer.validationStatus,
          importedAt: sourceAnswer.importedAt
            ? new Date(sourceAnswer.importedAt)
            : new Date(),
          statement: question.command,
          answerReviewStatus: OfficialAnswerReviewStatus.CHECKED,
        },
      });
      const persisted = existingQuestion
        ? await tx.question.update({
            where: { id: existingQuestion.id },
            data: {
              ...commonData,
              ...(!unchanged
                ? {
                    alternativeExplanations: "{}",
                    explanation:
                      "Resolução autoral obrigatória antes da publicação.",
                    pedagogyComment: null,
                  }
                : {}),
            },
          })
        : await tx.question.create({
            data: {
              ...commonData,
              alternativeExplanations: "{}",
              explanation: "Resolução autoral obrigatória antes da publicação.",
              pedagogyComment: null,
            },
          });
      await tx.officialAnswerKey.update({
        where: { id: answerKey.id },
        data: { questionId: persisted.id },
      });
      await tx.questionBlock.deleteMany({
        where: { questionId: persisted.id },
      });
      await tx.questionImage.deleteMany({
        where: { questionId: persisted.id },
      });
      await tx.questionAlternative.deleteMany({
        where: { questionId: persisted.id },
      });
      await tx.questionAlternative.createMany({
        data: question.alternatives.map((alternative) => {
          const sourceRegion = sourceRegionOfAlternative(
            question,
            alternative.key,
          );
          const image = preparedAssets.find(
            (asset) =>
              asset.relation === QuestionAssetRelation.ALTERNATIVE &&
              asset.alternativeKey === alternative.key,
          );
          return {
            questionId: persisted.id,
            key: alternative.key,
            text: alternative.text,
            imageUrl: image?.url ?? null,
            explanation: null,
            correct:
              situation === QuestionAnswerSituation.CONFIRMED &&
              alternative.key === question.answer,
            order: alternative.order,
            sourcePdfPage: sourceRegion.sourcePdfPage,
            consolidatedPdfPage: sourceRegion.sourcePdfPage,
            ...regionColumns(sourceRegion.region),
            confidence: alternative.confidence,
          };
        }),
      });
      if (preparedAssets.length) {
        await tx.questionImage.createMany({
          data: preparedAssets.map((asset) => ({
            questionId: persisted.id,
            url: asset.url,
            description: asset.source.altText,
            altText: asset.source.altText,
            order: asset.order,
            width: asset.source.width,
            height: asset.source.height,
            assetType: asset.assetType,
            relation: asset.relation,
            alternativeKey: asset.alternativeKey,
            storagePath: asset.storagePath,
            mimeType: storageMimeType(asset.storagePath),
            sha256Hash: asset.source.sha256,
            sourcePdfPage: asset.source.sourcePdfPage,
            consolidatedPdfPage: asset.source.sourcePdfPage,
            ...regionColumns(asset.source.sourceRegion),
          })),
        });
      }
      const imageRows = await tx.questionImage.findMany({
        where: { questionId: persisted.id },
      });
      const imageByStorage = new Map(
        imageRows.map((image) => [image.storagePath, image]),
      );
      const orderedBlocks: Array<
        Omit<Prisma.QuestionBlockCreateManyInput, "order">
      > = [];
      for (const block of question.blocks) {
        const preparedAsset =
          block.type === "image"
            ? preparedAssets.find(
                (asset) =>
                  asset.source.sha256 === block.assetSha256 &&
                  (!block.artifactPath ||
                    asset.source.artifactPath === block.artifactPath),
              )
            : null;
        const image = preparedAsset
          ? imageByStorage.get(preparedAsset.storagePath)
          : null;
        if (block.type === "image" && (!preparedAsset || !image)) {
          throw new Error(
            `${question.id}: bloco visual ${block.order} sem asset persistido.`,
          );
        }
        orderedBlocks.push({
          questionId: persisted.id,
          assetId: image?.id ?? null,
          type: blockType(block.type),
          content:
            block.content ||
            block.altText ||
            preparedAsset?.source.altText ||
            "Visual oficial da questão",
          sourcePdfPage: block.sourcePdfPage,
          consolidatedPdfPage: block.sourcePdfPage,
          ...regionColumns(block.sourceRegion),
          confidence: block.confidence,
        });
      }
      if (orderedBlocks.length) {
        await tx.questionBlock.createMany({
          data: orderedBlocks.map((block, order) => ({ ...block, order })),
        });
      }
      const reviewStatus = preserveApproval
        ? QuestionReviewState.APPROVED
        : QuestionReviewState.PENDING_REVIEW;
      await tx.questionExtraction.upsert({
        where: { sourceId: question.id },
        update: {
          questionId: persisted.id,
          importJobId: jobId,
          answerKeyId: answerKey.id,
          schemaVersion: question.schemaVersion,
          officialNumber: question.officialNumber,
          officialLanguage: language,
          officialGroup: question.variantGroupId ?? null,
          officialVariant: variant,
          officialOrder: question.officialOrder,
          officialPdfPageStart: question.source.officialPdfPageStart,
          officialPdfPageEnd: question.source.officialPdfPageEnd,
          consolidatedPdfPageStart: question.source.officialPdfPageStart,
          consolidatedPdfPageEnd: question.source.officialPdfPageEnd,
          originalPageUrl: question.source.originalPageUrl,
          extractionStatus: preserveApproval
            ? QuestionExtractionStatus.EXTRACTED
            : QuestionExtractionStatus.NEEDS_REVIEW,
          reviewStatus,
          answerSituation: situation,
          confidenceText: question.confidence.text,
          confidenceAlternatives: question.confidence.alternatives,
          confidenceImages: question.confidence.images,
          confidenceAnswer: question.confidence.answer,
          confidenceClassification: question.confidence.classification,
          confidenceOverall: question.confidence.overall,
          flags: jsonValue(question.flags),
          sourceMetadata: jsonValue({
            corpusId: question.corpusId,
            printedOccurrenceOrder: question.printedOccurrenceOrder,
            language: question.language,
            area: question.area,
            subject: question.subject,
            content: question.content,
            subcontent: question.subcontent,
            competency: question.competency,
            ability: question.ability,
            source: question.source,
            credits: question.credits,
          }),
          sourceContentHash: question.contentHash,
          rawPayloadHash,
        },
        create: {
          questionId: persisted.id,
          importJobId: jobId,
          answerKeyId: answerKey.id,
          sourceId: question.id,
          schemaVersion: question.schemaVersion,
          officialNumber: question.officialNumber,
          officialLanguage: language,
          officialGroup: question.variantGroupId ?? null,
          officialVariant: variant,
          officialOrder: question.officialOrder,
          officialPdfPageStart: question.source.officialPdfPageStart,
          officialPdfPageEnd: question.source.officialPdfPageEnd,
          consolidatedPdfPageStart: question.source.officialPdfPageStart,
          consolidatedPdfPageEnd: question.source.officialPdfPageEnd,
          originalPageUrl: question.source.originalPageUrl,
          extractionStatus: QuestionExtractionStatus.NEEDS_REVIEW,
          reviewStatus,
          answerSituation: situation,
          confidenceText: question.confidence.text,
          confidenceAlternatives: question.confidence.alternatives,
          confidenceImages: question.confidence.images,
          confidenceAnswer: question.confidence.answer,
          confidenceClassification: question.confidence.classification,
          confidenceOverall: question.confidence.overall,
          flags: jsonValue(question.flags),
          sourceMetadata: jsonValue({
            corpusId: question.corpusId,
            printedOccurrenceOrder: question.printedOccurrenceOrder,
            language: question.language,
            area: question.area,
            source: question.source,
            credits: question.credits,
          }),
          sourceContentHash: question.contentHash,
          rawPayloadHash,
        },
      });
      await tx.provaAntigaQuestao.upsert({
        where: {
          provaAntigaId_numeroQuestao_officialLanguage: {
            provaAntigaId: question.oldExamId,
            numeroQuestao: question.officialNumber,
            officialLanguage: language,
          },
        },
        update: {
          questaoId: persisted.id,
          officialGroup: question.variantGroupId ?? null,
          officialVariant: variant,
          ordem: question.officialOrder,
          paginaPdf: question.source.officialPdfPageStart,
          extractedStatement: question.statement,
          extractionConfidence: question.confidence.overall,
          pageStart: question.source.officialPdfPageStart,
          pageEnd: question.source.officialPdfPageEnd,
          hasImage: preparedAssets.some(
            (asset) => asset.relation !== QuestionAssetRelation.ADMIN_REFERENCE,
          ),
          needsHumanReview: !preserveApproval,
        },
        create: {
          provaAntigaId: question.oldExamId,
          questaoId: persisted.id,
          numeroQuestao: question.officialNumber,
          officialLanguage: language,
          officialGroup: question.variantGroupId ?? null,
          officialVariant: variant,
          ordem: question.officialOrder,
          paginaPdf: question.source.officialPdfPageStart,
          extractedStatement: question.statement,
          extractionConfidence: question.confidence.overall,
          pageStart: question.source.officialPdfPageStart,
          pageEnd: question.source.officialPdfPageEnd,
          hasImage: preparedAssets.some(
            (asset) => asset.relation !== QuestionAssetRelation.ADMIN_REFERENCE,
          ),
          needsHumanReview: !preserveApproval,
        },
      });
      if (!unchanged) {
        await tx.questionAuthorialResolution.updateMany({
          where: { questionId: persisted.id },
          data: {
            status: OfficialResolutionStatus.IN_REVIEW,
            reviewStatus: QuestionReviewState.PENDING_REVIEW,
            reviewedBy: null,
            reviewedAt: null,
            publishedAt: null,
          },
        });
        await tx.questionPedagogicalMetadata.updateMany({
          where: { questionId: persisted.id },
          data: {
            reviewStatus: QuestionReviewState.PENDING_REVIEW,
            reviewedBy: null,
            reviewedAt: null,
          },
        });
      }
      const action = existingQuestion?.structuredExtraction
        ? QuestionRevisionAction.UPDATED
        : QuestionRevisionAction.IMPORTED;
      await tx.questionRevision.upsert({
        where: {
          dedupeKey: `${question.corpusId}:${question.id}:${action}:${rawPayloadHash}`,
        },
        update: {
          actor,
          notes: `Importação idempotente do corpus ${question.corpusId}.`,
        },
        create: {
          questionId: persisted.id,
          importJobId: jobId,
          action,
          actor,
          notes: `Importação idempotente do corpus ${question.corpusId}; publicação bloqueada.`,
          beforeSnapshot: existingQuestion
            ? snapshot(existingQuestion)
            : undefined,
          afterSnapshot: snapshot(persisted),
          dedupeKey: `${question.corpusId}:${question.id}:${action}:${rawPayloadHash}`,
        },
      });
      return { questionId: persisted.id, preservedApproval: preserveApproval };
    },
    { timeout: 60_000 },
  );
}

async function importEssay(bundle: CorpusBundle, jobId: string, actor: string) {
  if (!bundle.essay) return null;
  const essay = bundle.essay;
  const preparedAssets = prepareEssayAssets(bundle);
  await copyPreparedAssets(preparedAssets);
  const rawPayloadHash = sha256Text(JSON.stringify(essay));
  const existing = await db.officialEssayProposal.findUnique({
    where: { importJobId: jobId },
  });
  const preserveApproval =
    existing?.rawPayloadHash === rawPayloadHash &&
    existing.reviewStatus === QuestionReviewState.APPROVED;
  const pages = essay.source.sourcePdfPages;
  const firstPage = Math.min(...pages);
  const lastPage = Math.max(...pages);
  return db.officialEssayProposal.upsert({
    where: { importJobId: jobId },
    update: {
      provaAntigaId: bundle.questions[0]!.oldExamId,
      officialLanguage: OfficialQuestionLanguage.PORTUGUESE,
      title: `Redação ENEM ${essay.year}`,
      theme: essay.theme,
      promptText: essay.rawText,
      instructions: jsonValue(
        essay.instructions
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
      ),
      blocks: jsonValue(essay.pages.flatMap((page) => page.blocks ?? [])),
      assets: jsonValue(
        preparedAssets.map((asset) => ({
          url: asset.url,
          storagePath: asset.storagePath,
          altText: asset.source.altText,
          width: asset.source.width,
          height: asset.source.height,
          sha256: asset.source.sha256,
          sourcePdfPage: asset.source.sourcePdfPage,
          sourceRegion: asset.source.sourceRegion,
        })),
      ),
      officialPdfPageStart: firstPage,
      officialPdfPageEnd: lastPage,
      consolidatedPdfPageStart: firstPage,
      consolidatedPdfPageEnd: lastPage,
      originalPageUrl: `${essay.source.officialExamUrl}#page=${firstPage}`,
      extractionStatus: preserveApproval
        ? QuestionExtractionStatus.EXTRACTED
        : QuestionExtractionStatus.NEEDS_REVIEW,
      reviewStatus: preserveApproval
        ? QuestionReviewState.APPROVED
        : QuestionReviewState.PENDING_REVIEW,
      status: ContentStatus.REVIEW,
      confidenceText: essay.themeConfidence,
      confidenceImages: 0.9,
      confidenceOverall: 0,
      flags: jsonValue({ publicationBlockers: essay.publicationBlockers }),
      sourceMetadata: jsonValue({
        source: essay.source,
        proposalText: essay.proposalText,
        actor,
      }),
      sourceContentHash: essay.contentHash,
      rawPayloadHash,
      reviewedBy: preserveApproval ? existing.reviewedBy : null,
      reviewedAt: preserveApproval ? existing.reviewedAt : null,
      publishedAt: null,
    },
    create: {
      importJobId: jobId,
      provaAntigaId: bundle.questions[0]!.oldExamId,
      officialLanguage: OfficialQuestionLanguage.PORTUGUESE,
      title: `Redação ENEM ${essay.year}`,
      theme: essay.theme,
      promptText: essay.rawText,
      instructions: jsonValue(
        essay.instructions
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
      ),
      blocks: jsonValue(essay.pages.flatMap((page) => page.blocks ?? [])),
      assets: jsonValue(
        preparedAssets.map((asset) => ({
          url: asset.url,
          storagePath: asset.storagePath,
          altText: asset.source.altText,
          width: asset.source.width,
          height: asset.source.height,
          sha256: asset.source.sha256,
          sourcePdfPage: asset.source.sourcePdfPage,
          sourceRegion: asset.source.sourceRegion,
        })),
      ),
      officialPdfPageStart: firstPage,
      officialPdfPageEnd: lastPage,
      consolidatedPdfPageStart: firstPage,
      consolidatedPdfPageEnd: lastPage,
      originalPageUrl: `${essay.source.officialExamUrl}#page=${firstPage}`,
      extractionStatus: QuestionExtractionStatus.NEEDS_REVIEW,
      reviewStatus: QuestionReviewState.PENDING_REVIEW,
      status: ContentStatus.REVIEW,
      confidenceText: essay.themeConfidence,
      confidenceImages: 0.9,
      confidenceOverall: 0,
      flags: jsonValue({ publicationBlockers: essay.publicationBlockers }),
      sourceMetadata: jsonValue({
        source: essay.source,
        proposalText: essay.proposalText,
        actor,
      }),
      sourceContentHash: essay.contentHash,
      rawPayloadHash,
    },
  });
}

async function executeImport(bundle: CorpusBundle, actor: string) {
  if (!bundle.report.valid) {
    throw new Error(
      `Importação bloqueada por ${bundle.report.errors.length} erro(s) estruturais.`,
    );
  }
  const first = bundle.questions[0]!;
  const existingJob = await db.questionImportJob.findUnique({
    where: { pilotId: first.corpusId },
  });
  if (existingJob?.status === QuestionImportJobStatus.PUBLISHED) {
    throw new Error(
      `${first.corpusId}: job já publicado; reimportação foi bloqueada.`,
    );
  }
  const [examFile, keyFile, oldExam] = await Promise.all([
    db.officialFile.findUnique({
      where: { sha256Hash: bundle.provenance.officialExam.sha256 },
    }),
    db.officialFile.findUnique({
      where: { sha256Hash: bundle.provenance.officialAnswerKey.sha256 },
    }),
    db.provaAntiga.findUnique({ where: { id: first.oldExamId } }),
  ]);
  if (
    !examFile ||
    examFile.fileType !== OfficialFileType.EXAM ||
    examFile.originalUrl !== bundle.provenance.officialExam.url ||
    examFile.year !== first.year
  ) {
    throw new Error(
      "PDF oficial da prova não está registrado com hash, URL e ano canônicos.",
    );
  }
  if (
    !keyFile ||
    keyFile.fileType !== OfficialFileType.ANSWER_KEY ||
    keyFile.originalUrl !== bundle.provenance.officialAnswerKey.url ||
    keyFile.year !== first.year
  ) {
    throw new Error(
      "PDF oficial do gabarito não está registrado com hash, URL e ano canônicos.",
    );
  }
  if (!oldExam)
    throw new Error(`Prova antiga não cadastrada: ${first.oldExamId}.`);
  if (oldExam.status === "DISPONIVEL") {
    throw new Error(
      `${first.oldExamId}: prova está disponível sem job publicado; corrija a inconsistência antes de importar.`,
    );
  }
  const vestibular = await db.vestibular.upsert({
    where: { slug: "enem" },
    update: { name: "ENEM" },
    create: {
      name: "ENEM",
      slug: "enem",
      color: "#F97316",
      description: "Exame Nacional do Ensino Médio.",
    },
  });
  const job = await db.questionImportJob.upsert({
    where: { pilotId: first.corpusId },
    update: {
      provaAntigaId: oldExam.id,
      examFileId: examFile.id,
      answerKeyFileId: keyFile.id,
      vestibular: "ENEM",
      year: first.year,
      day: first.day,
      application: first.application,
      modality: first.modality,
      bookletNumber: first.bookletNumber,
      bookletColor: first.bookletColor,
      manifestPath: relativeToRepo(bundle.provenancePath),
      sourceJsonPath: relativeToRepo(bundle.questionsPath),
      sourceJsonSha256: bundle.sourceJsonSha256,
      sourceSchemaVersion: first.schemaVersion,
      expectedQuestionCount: bundle.questions.length,
      importedQuestionCount: 0,
      requirePedagogicalReview: true,
      requireAuthorialResolution: true,
      requireEssayProposal: Boolean(bundle.essay),
      status: QuestionImportJobStatus.IMPORTING,
      validationReport: jsonValue({
        ...bundle.validation,
        importer: bundle.report,
      }),
      checkpoint: jsonValue({
        stage: "importing",
        nextSourceId: bundle.questions[0]!.id,
      }),
      createdBy: actor,
      startedAt: new Date(),
      completedAt: null,
      publishedAt: null,
    },
    create: {
      pilotId: first.corpusId,
      provaAntigaId: oldExam.id,
      examFileId: examFile.id,
      answerKeyFileId: keyFile.id,
      vestibular: "ENEM",
      year: first.year,
      day: first.day,
      application: first.application,
      modality: first.modality,
      bookletNumber: first.bookletNumber,
      bookletColor: first.bookletColor,
      manifestPath: relativeToRepo(bundle.provenancePath),
      sourceJsonPath: relativeToRepo(bundle.questionsPath),
      sourceJsonSha256: bundle.sourceJsonSha256,
      sourceSchemaVersion: first.schemaVersion,
      expectedQuestionCount: bundle.questions.length,
      requirePedagogicalReview: true,
      requireAuthorialResolution: true,
      requireEssayProposal: Boolean(bundle.essay),
      status: QuestionImportJobStatus.IMPORTING,
      validationReport: jsonValue({
        ...bundle.validation,
        importer: bundle.report,
      }),
      checkpoint: jsonValue({
        stage: "importing",
        nextSourceId: bundle.questions[0]!.id,
      }),
      createdBy: actor,
      startedAt: new Date(),
    },
  });
  let imported = 0;
  try {
    for (const question of bundle.questions) {
      await importQuestion({
        bundle,
        question,
        jobId: job.id,
        vestibularId: vestibular.id,
        keyFileId: keyFile.id,
        actor,
      });
      imported += 1;
      await db.questionImportJob.update({
        where: { id: job.id },
        data: {
          importedQuestionCount: imported,
          checkpoint: jsonValue({
            stage: "importing",
            lastSourceId: question.id,
            nextSourceId: bundle.questions[imported]?.id ?? null,
          }),
        },
      });
    }
    const essay = await importEssay(bundle, job.id, actor);
    const approved = await db.questionExtraction.count({
      where: {
        importJobId: job.id,
        reviewStatus: QuestionReviewState.APPROVED,
      },
    });
    const approvedEssay =
      essay?.reviewStatus === QuestionReviewState.APPROVED ? 1 : 0;
    await db.$transaction([
      db.questionImportJob.update({
        where: { id: job.id },
        data: {
          importedQuestionCount: imported,
          approvedQuestionCount: approved,
          publishedQuestionCount: 0,
          approvedEssayProposalCount: approvedEssay,
          status: QuestionImportJobStatus.WAITING_REVIEW,
          completedAt: new Date(),
          checkpoint: jsonValue({
            stage: "imported_waiting_review",
            imported,
            nextSourceId: null,
          }),
        },
      }),
      db.provaAntiga.update({
        where: { id: oldExam.id },
        data: {
          officialExamFileId: examFile.id,
          officialKeyFileId: keyFile.id,
          fileHash: bundle.provenance.officialExam.sha256,
          totalQuestoes: bundle.checkpoint.expectedLogicalQuestions,
          questoesDetectadas: bundle.questions.length,
          questoesValidas: approved,
          questoesComErro: 0,
          imagensDetectadas: bundle.report.assetReferences,
          status: "PENDENTE",
          importacaoStatus: "AGUARDANDO_REVISAO",
          importacaoRelatorio: JSON.stringify({
            ...bundle.report,
            imported,
            approved,
            published: 0,
          }),
        },
      }),
      db.officialFile.update({
        where: { id: examFile.id },
        data: { processingStatus: OfficialProcessingStatus.WAITING_REVIEW },
      }),
      db.officialFile.update({
        where: { id: keyFile.id },
        data: { processingStatus: OfficialProcessingStatus.WAITING_REVIEW },
      }),
      db.officialImportLog.create({
        data: {
          sourceId: examFile.sourceId,
          fileId: examFile.id,
          action: "enem_corpus_import",
          status: "SUCCESS",
          message: `${first.corpusId}: ${imported} ocorrências importadas em REVIEW; publicação bloqueada.`,
          metadata: JSON.stringify({
            jobId: job.id,
            actor,
            sourceJsonSha256: bundle.sourceJsonSha256,
          }),
        },
      }),
    ]);
    return {
      jobId: job.id,
      imported,
      approved,
      published: 0,
      status: "WAITING_REVIEW",
    };
  } catch (error) {
    await db.questionImportJob.update({
      where: { id: job.id },
      data: {
        importedQuestionCount: imported,
        status: QuestionImportJobStatus.FAILED,
        checkpoint: jsonValue({
          stage: "import_failed",
          imported,
          error: error instanceof Error ? error.message : "Falha desconhecida.",
        }),
      },
    });
    throw error;
  }
}

const reviewQuestionInclude = {
  question: {
    include: {
      alternativeItems: { orderBy: { order: "asc" as const } },
      imageItems: { orderBy: { order: "asc" as const } },
      blocks: { orderBy: { order: "asc" as const }, include: { asset: true } },
      officialAnswerKey: true,
      structuredExtraction: true,
    },
  },
} satisfies Prisma.QuestionExtractionInclude;

function sameNumber(left: number | null, right: number) {
  return left !== null && Math.abs(left - right) < 0.000_001;
}

function persistedQuestionIssues(
  bundle: CorpusBundle,
  source: CorpusQuestion,
  extraction: Prisma.QuestionExtractionGetPayload<{
    include: typeof reviewQuestionInclude;
  }>,
  job: { id: string; answerKeyFileId: string },
) {
  const issues: string[] = [];
  const question = extraction.question;
  const language = corpusLanguage(source.language);
  const preparedAssets = prepareAssets(bundle, source);
  if (
    extraction.importJobId !== job.id ||
    extraction.sourceId !== source.id ||
    extraction.officialNumber !== source.officialNumber ||
    extraction.officialLanguage !== language ||
    extraction.officialOrder !== source.officialOrder ||
    extraction.sourceContentHash !== source.contentHash ||
    extraction.rawPayloadHash !== stableQuestionHash(source)
  ) {
    issues.push("Extração persistida diverge da identidade/hash do artefato.");
  }
  if (
    extraction.officialPdfPageStart !== source.source.officialPdfPageStart ||
    extraction.officialPdfPageEnd !== source.source.officialPdfPageEnd ||
    extraction.originalPageUrl !== source.source.originalPageUrl
  ) {
    issues.push("Páginas oficiais ou URL original divergem.");
  }
  if (
    question.year !== source.year ||
    question.day !== `${source.day}º dia` ||
    question.questionNumber !== source.officialNumber ||
    question.officialLanguage !== language
  ) {
    issues.push("Ano, dia, número ou idioma persistido diverge.");
  }
  if (question.statement.trim() !== source.command.trim())
    issues.push("Comando diverge do artefato estruturado.");
  if (
    (question.supportText ?? "").trim() !== (source.supportText ?? "").trim()
  ) {
    issues.push("Texto de apoio diverge do artefato estruturado.");
  }
  if (question.sourceUrl !== source.source.originalPageUrl)
    issues.push("Página original administrativa ausente.");
  if (
    question.alternativeItems.length !== 5 ||
    question.alternativeItems.map((alternative) => alternative.key).join("") !==
      "ABCDE"
  ) {
    issues.push("Alternativas A–E ausentes ou fora de ordem.");
  } else {
    source.alternatives.forEach((alternative, index) => {
      const persisted = question.alternativeItems[index];
      const expectedImage = preparedAssets.find(
        (asset) =>
          asset.relation === QuestionAssetRelation.ALTERNATIVE &&
          asset.alternativeKey === alternative.key,
      );
      const sourceRegion = sourceRegionOfAlternative(source, alternative.key);
      if (
        !persisted ||
        persisted.key !== alternative.key ||
        persisted.order !== alternative.order ||
        persisted.text !== alternative.text ||
        persisted.imageUrl !== (expectedImage?.url ?? null) ||
        persisted.sourcePdfPage !== sourceRegion.sourcePdfPage ||
        !sameNumber(persisted.regionX, sourceRegion.region.x) ||
        !sameNumber(persisted.regionY, sourceRegion.region.y)
      ) {
        issues.push(`Alternativa ${alternative.key} diverge do artefato.`);
      }
    });
  }
  if (question.blocks.length !== source.blocks.length)
    issues.push("Quantidade de blocos estruturados diverge.");
  source.blocks.forEach((block, index) => {
    const persisted = question.blocks[index];
    const expectedAsset =
      block.type === "image"
        ? preparedAssets.find(
            (asset) =>
              asset.source.sha256 === block.assetSha256 &&
              (!block.artifactPath ||
                asset.source.artifactPath === block.artifactPath),
          )
        : null;
    if (
      !persisted ||
      persisted.content !== block.content ||
      persisted.type !== blockType(block.type) ||
      persisted.sourcePdfPage !== block.sourcePdfPage ||
      !sameNumber(persisted.regionX, block.sourceRegion.x) ||
      !sameNumber(persisted.regionY, block.sourceRegion.y) ||
      (block.type === "image" &&
        persisted.asset?.storagePath !== expectedAsset?.storagePath)
    ) {
      issues.push(`Bloco estruturado ${index + 1} diverge do artefato.`);
    }
  });
  if (question.blocks.some((block, index) => block.order !== index)) {
    issues.push("Ordem combinada de blocos não é contínua.");
  }
  const persistedImagesByStorage = new Map(
    question.imageItems.map((image) => [image.storagePath, image]),
  );
  if (question.imageItems.length !== preparedAssets.length)
    issues.push("Quantidade de mídias diverge.");
  for (const asset of preparedAssets) {
    const persisted = persistedImagesByStorage.get(asset.storagePath);
    if (
      !persisted ||
      persisted.url !== asset.url ||
      persisted.sha256Hash !== asset.source.sha256 ||
      persisted.assetType !== asset.assetType ||
      persisted.relation !== asset.relation ||
      persisted.sourcePdfPage !== asset.source.sourcePdfPage ||
      persisted.width !== asset.source.width ||
      persisted.height !== asset.source.height
    ) {
      issues.push(`Mídia ${asset.storagePath} diverge do artefato.`);
    }
  }
  if (
    !question.imageItems.some(
      (image) =>
        image.relation === QuestionAssetRelation.ADMIN_REFERENCE &&
        image.assetType === QuestionAssetType.ORIGINAL_REFERENCE,
    )
  ) {
    issues.push("Recorte oficial administrativo não foi persistido.");
  }
  const key = question.officialAnswerKey;
  if (
    !key ||
    key.fileId !== job.answerKeyFileId ||
    key.questionId !== question.id ||
    extraction.answerKeyId !== key.id ||
    key.questionNumber !== source.officialNumber ||
    key.officialLanguage !== language ||
    key.correctAlternative !== compatibleAnswer(source) ||
    key.answerSituation !== answerSituation(source) ||
    key.sourceUrl !== source.officialAnswerKey.sourceUrl ||
    key.sourceSha256 !== source.officialAnswerKey.sourceSha256
  ) {
    issues.push("Gabarito oficial relacionado diverge do PDF canônico.");
  }
  const correct = question.alternativeItems.filter(
    (alternative) => alternative.correct,
  );
  if (
    answerSituation(source) === QuestionAnswerSituation.ANNULLED
      ? correct.length !== 0
      : correct.length !== 1 || correct[0]?.key !== source.answer
  ) {
    issues.push("Correção persistida diverge do gabarito relacionado.");
  }
  return [...new Set(issues)];
}

async function refreshJobReadiness(jobId: string) {
  const job = await db.questionImportJob.findUnique({
    where: { id: jobId },
    include: { essayProposal: true },
  });
  if (!job) throw new Error(`Job não encontrado: ${jobId}.`);
  const [
    approvedQuestions,
    approvedPedagogy,
    approvedResolutions,
    publishedResolutions,
  ] = await Promise.all([
    db.questionExtraction.count({
      where: {
        importJobId: job.id,
        reviewStatus: QuestionReviewState.APPROVED,
      },
    }),
    db.questionPedagogicalMetadata.count({
      where: {
        importJobId: job.id,
        reviewStatus: QuestionReviewState.APPROVED,
      },
    }),
    db.questionAuthorialResolution.count({
      where: {
        importJobId: job.id,
        reviewStatus: QuestionReviewState.APPROVED,
        status: {
          in: [
            OfficialResolutionStatus.APPROVED,
            OfficialResolutionStatus.PUBLISHED,
          ],
        },
      },
    }),
    db.questionAuthorialResolution.count({
      where: {
        importJobId: job.id,
        status: OfficialResolutionStatus.PUBLISHED,
      },
    }),
  ]);
  const approvedEssay =
    !job.requireEssayProposal ||
    (job.essayProposal?.reviewStatus === QuestionReviewState.APPROVED
      ? true
      : false);
  const ready =
    approvedQuestions === job.expectedQuestionCount &&
    approvedPedagogy === job.expectedQuestionCount &&
    approvedResolutions === job.expectedQuestionCount &&
    approvedEssay;
  const nextStatus = ready
    ? QuestionImportJobStatus.READY_TO_PUBLISH
    : QuestionImportJobStatus.WAITING_REVIEW;
  await db.questionImportJob.update({
    where: { id: job.id },
    data: {
      approvedQuestionCount: approvedQuestions,
      approvedPedagogicalCount: approvedPedagogy,
      approvedResolutionCount: approvedResolutions,
      publishedResolutionCount: publishedResolutions,
      approvedEssayProposalCount:
        approvedEssay && job.requireEssayProposal ? 1 : 0,
      status: nextStatus,
    },
  });
  return {
    approvedQuestions,
    approvedPedagogy,
    approvedResolutions,
    publishedResolutions,
    approvedEssay,
    status: nextStatus,
  };
}

async function executeReview(input: {
  bundle: CorpusBundle;
  visualAuditPath: string;
  reviewEvidencePath?: string;
  actor: string;
}) {
  const { bundle, visualAuditPath, reviewEvidencePath, actor } = input;
  const visualAudit = await readVisualAudit(visualAuditPath, bundle);
  if (visualAudit.errors.length) {
    throw new Error(
      `Revisão bloqueada pela auditoria visual: ${visualAudit.errors.join(" ")}`,
    );
  }
  const reviewEvidence = reviewEvidencePath
    ? await readReviewEvidence(reviewEvidencePath, bundle)
    : null;
  if (reviewEvidence?.errors.length) {
    throw new Error(
      `Revisão bloqueada pela evidência editorial: ${reviewEvidence.errors.join(" ")}`,
    );
  }
  const job = await db.questionImportJob.findUnique({
    where: { pilotId: bundle.report.corpusId! },
  });
  if (!job) throw new Error("Importe o corpus antes da revisão.");
  if (job.status === QuestionImportJobStatus.PUBLISHED)
    throw new Error("Corpus já publicado; revisão bloqueada.");
  if (
    job.sourceJsonSha256 !== bundle.sourceJsonSha256 ||
    job.importedQuestionCount !== bundle.questions.length ||
    job.expectedQuestionCount !== bundle.questions.length
  ) {
    throw new Error(
      "Job importado não corresponde integralmente ao JSON auditado.",
    );
  }
  const auditBySource = new Map(
    visualAudit.audit.audits.map((row) => [row.sourceId, row]),
  );
  const manualBySource = new Map(
    (reviewEvidence?.evidence.questions ?? []).map((row) => [
      row.sourceId,
      row,
    ]),
  );
  let approved = 0;
  for (const source of bundle.questions) {
    const audit = auditBySource.get(source.id);
    if (!audit || audit.verdict !== "PASS")
      throw new Error(`${source.id}: PASS visual ausente.`);
    const extraction = await db.questionExtraction.findUnique({
      where: { sourceId: source.id },
      include: reviewQuestionInclude,
    });
    if (!extraction || extraction.importJobId !== job.id)
      throw new Error(`${source.id}: extração não localizada.`);
    const issues = persistedQuestionIssues(bundle, source, extraction, job);
    if (issues.length) throw new Error(`${source.id}: ${issues.join(" ")}`);
    const manual = manualBySource.get(source.id);
    const evidenceNotes = [
      `Auditoria visual ${relativeToRepo(visualAudit.filePath)} (${visualAudit.hash}).`,
      audit.evidence,
      manual
        ? `Revisão editorial ${relativeToRepo(reviewEvidence!.filePath)} (${reviewEvidence!.hash}): ${manual.notes}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    const reviewedAt = manual ? new Date(manual.reviewedAt) : new Date();
    const reviewer = manual?.reviewer || actor;
    const dedupeKey = `${source.corpusId}:${source.id}:APPROVED:${visualAudit.hash}:${reviewEvidence?.hash ?? "visual"}`;
    await db.$transaction(
      async (tx) => {
        await tx.question.update({
          where: { id: extraction.questionId },
          data: {
            reviewState: QuestionReviewState.APPROVED,
            status: ContentStatus.REVIEW,
          },
        });
        await tx.questionExtraction.update({
          where: { id: extraction.id },
          data: {
            extractionStatus: QuestionExtractionStatus.EXTRACTED,
            reviewStatus: QuestionReviewState.APPROVED,
            confidenceOverall: Math.max(extraction.confidenceOverall, 0.9),
            flags: jsonValue({
              ...(extraction.flags as Record<string, unknown>),
              visualAudit: {
                path: relativeToRepo(visualAudit.filePath),
                sha256: visualAudit.hash,
                evidence: audit.evidence,
                inspectedFiles: audit.inspectedFiles,
              },
            }),
          },
        });
        await tx.provaAntigaQuestao.updateMany({
          where: {
            provaAntigaId: job.provaAntigaId,
            questaoId: extraction.questionId,
          },
          data: { needsHumanReview: false },
        });
        await tx.officialAnswerKey.update({
          where: { id: extraction.answerKeyId },
          data: {
            answerReviewStatus: OfficialAnswerReviewStatus.APPROVED,
            answerReviewedBy: reviewer,
            answerReviewedAt: reviewedAt,
            validationStatus: "validated_against_official_pdf",
          },
        });
        await tx.questionRevision.upsert({
          where: { dedupeKey },
          update: { actor: reviewer, notes: evidenceNotes },
          create: {
            questionId: extraction.questionId,
            importJobId: job.id,
            action: QuestionRevisionAction.APPROVED,
            actor: reviewer,
            notes: evidenceNotes,
            beforeSnapshot: jsonValue({ reviewState: extraction.reviewStatus }),
            afterSnapshot: jsonValue({
              reviewState: QuestionReviewState.APPROVED,
              reviewedAt: reviewedAt.toISOString(),
              visualAuditHash: visualAudit.hash,
              reviewEvidenceHash: reviewEvidence?.hash ?? null,
            }),
            dedupeKey,
          },
        });
      },
      { timeout: 30_000 },
    );
    approved += 1;
  }
  if (bundle.essay && reviewEvidence?.evidence.essay) {
    const essayReview = reviewEvidence.evidence.essay;
    await db.officialEssayProposal.update({
      where: { importJobId: job.id },
      data: {
        extractionStatus: QuestionExtractionStatus.EXTRACTED,
        reviewStatus: QuestionReviewState.APPROVED,
        status: ContentStatus.REVIEW,
        confidenceOverall: 0.9,
        flags: jsonValue({
          reviewEvidence: {
            path: relativeToRepo(reviewEvidence.filePath),
            sha256: reviewEvidence.hash,
            checks: essayReview.checks,
            evidence: essayReview.evidence,
          },
        }),
        reviewedBy: essayReview.reviewer,
        reviewedAt: new Date(essayReview.reviewedAt),
      },
    });
  }
  const readiness = await refreshJobReadiness(job.id);
  await db.$transaction([
    db.provaAntiga.update({
      where: { id: job.provaAntigaId },
      data: {
        questoesValidas: approved,
        questoesComErro: 0,
        importacaoStatus: readiness.status,
      },
    }),
    db.officialImportLog.create({
      data: {
        fileId: job.examFileId,
        action: "enem_corpus_review",
        status: "SUCCESS",
        message: `${bundle.report.corpusId}: ${approved}/${bundle.questions.length} ocorrências aprovadas com auditoria visual rastreável.`,
        metadata: JSON.stringify({
          jobId: job.id,
          actor,
          visualAuditHash: visualAudit.hash,
          reviewEvidenceHash: reviewEvidence?.hash ?? null,
        }),
      },
    }),
  ]);
  return { jobId: job.id, approved, ...readiness };
}

async function readResolutionGate(
  resolutionPathInput: string,
  auditPathInput: string,
  bundle: CorpusBundle,
) {
  const resolutionPath = repoPath(resolutionPathInput);
  const auditPath = repoPath(auditPathInput);
  const [resolutionRaw, auditRaw] = await Promise.all([
    readFile(resolutionPath, "utf8"),
    readFile(auditPath, "utf8"),
  ]);
  const resolutionFile = JSON.parse(resolutionRaw) as ResolutionFile;
  const auditFile = JSON.parse(auditRaw) as ResolutionAuditFile;
  const issues: string[] = [];
  if (
    (resolutionFile.sourceByteSha256 &&
      resolutionFile.sourceByteSha256 !== bundle.sourceJsonSha256) ||
    (auditFile.sourceByteSha256 &&
      auditFile.sourceByteSha256 !== bundle.sourceJsonSha256)
  ) {
    issues.push(
      "Resoluções ou auditoria pertencem a outra versão da fonte estruturada.",
    );
  }
  if (
    resolutionFile.finalResolutionSetHash &&
    auditFile.resolutionSetHash !== resolutionFile.finalResolutionSetHash
  ) {
    issues.push("A auditoria não corresponde ao conjunto final de resoluções.");
  }
  if (
    resolutionFile.complete !== true ||
    resolutionFile.resolutions?.length !== bundle.questions.length ||
    (resolutionFile.expectedQuestions !== undefined &&
      resolutionFile.expectedQuestions !== bundle.questions.length) ||
    (resolutionFile.processedQuestions !== undefined &&
      resolutionFile.processedQuestions !== bundle.questions.length)
  ) {
    issues.push(
      `Resoluções autorais incompletas: ${resolutionFile.resolutions?.length ?? 0}/${bundle.questions.length}.`,
    );
  }
  if (
    auditFile.complete !== true ||
    auditFile.canApprove !== true ||
    auditFile.failed !== 0 ||
    auditFile.audited !== bundle.questions.length ||
    auditFile.passed !== bundle.questions.length ||
    auditFile.audits?.length !== bundle.questions.length
  ) {
    issues.push(
      "Auditoria independente das resoluções não aprovou integralmente o caderno.",
    );
  }
  const sourceById = new Map(
    bundle.questions.map((question) => [question.id, question]),
  );
  const auditBySource = new Map(
    (auditFile.audits ?? []).map((audit) => [audit.sourceId, audit]),
  );
  const seen = new Set<string>();
  for (const resolution of resolutionFile.resolutions ?? []) {
    const source = sourceById.get(resolution.sourceId);
    if (!source) {
      issues.push(`Resolução desconhecida: ${resolution.sourceId}.`);
      continue;
    }
    if (seen.has(resolution.sourceId))
      issues.push(`Resolução duplicada: ${resolution.sourceId}.`);
    seen.add(resolution.sourceId);
    if (
      resolution.officialNumber !== source.officialNumber ||
      corpusLanguage(resolution.language) !== corpusLanguage(source.language) ||
      resolution.officialAnswer !== compatibleAnswer(source) ||
      resolution.answerVerified !== true ||
      resolution.answerVerification?.trim().length < 60
    ) {
      issues.push(
        `${resolution.sourceId}: resposta oficial não foi verificada de forma suficiente.`,
      );
    }
    if (
      resolution.shortComment?.trim().length < 40 ||
      resolution.fullResolution?.trim().length < 180 ||
      resolution.reasoningPath?.length < 2 ||
      !resolution.steps?.length ||
      CORPUS_LETTERS.some(
        (letter) =>
          resolution.alternativeComments?.[letter]?.trim().length < 25,
      ) ||
      resolution.commonError?.trim().length < 30 ||
      resolution.studyTip?.trim().length < 30 ||
      resolution.keywords?.length < 2 ||
      !resolution.knowledgeArea?.trim() ||
      !resolution.disciplinaryComponent?.trim() ||
      !resolution.content?.trim() ||
      !resolution.subcontent?.trim()
    ) {
      issues.push(
        `${resolution.sourceId}: comentário autoral ou classificação incompleta.`,
      );
    }
    if (auditBySource.get(resolution.sourceId)?.verdict !== "PASS") {
      issues.push(
        `${resolution.sourceId}: PASS independente da resolução ausente.`,
      );
    }
  }
  if (seen.size !== bundle.questions.length) {
    issues.push(
      `Cobertura de resoluções: ${seen.size}/${bundle.questions.length}.`,
    );
  }
  return {
    resolutionPath,
    auditPath,
    resolutionHash: sha256Text(resolutionRaw),
    auditHash: sha256Text(auditRaw),
    resolutionFile,
    auditFile,
    issues: [...new Set(issues)],
  };
}

async function readClassificationGate(
  classificationPathInput: string,
  auditPathInput: string,
  bundle: CorpusBundle,
) {
  const classificationPath = repoPath(classificationPathInput);
  const auditPath = repoPath(auditPathInput);
  const [classificationRaw, auditRaw] = await Promise.all([
    readFile(classificationPath, "utf8"),
    readFile(auditPath, "utf8"),
  ]);
  const classificationFile = JSON.parse(
    classificationRaw,
  ) as ClassificationFile;
  const auditFile = JSON.parse(auditRaw) as ClassificationAuditFile;
  const expected = bundle.questions.length;
  const issues: string[] = [];
  if (
    classificationFile.sourceByteSha256 !== bundle.sourceJsonSha256 ||
    (auditFile.sourceByteSha256 &&
      auditFile.sourceByteSha256 !== bundle.sourceJsonSha256)
  ) {
    issues.push(
      "Classificação pedagógica ou auditoria não corresponde à fonte congelada.",
    );
  }
  if (
    classificationFile.complete !== true ||
    classificationFile.expected !== expected ||
    classificationFile.classified !== expected ||
    classificationFile.reviewRequired !== 0 ||
    classificationFile.classifications?.length !== expected ||
    !classificationFile.sourceHash
  ) {
    issues.push(
      `Classificação pedagógica incompleta ou pendente: ${classificationFile.classifications?.length ?? 0}/${expected}.`,
    );
  }
  if (
    auditFile.classificationSourceHash !== classificationFile.sourceHash ||
    auditFile.complete !== true ||
    auditFile.canApprove !== true ||
    auditFile.expected !== expected ||
    auditFile.audited !== expected ||
    auditFile.passed !== expected ||
    auditFile.failed !== 0 ||
    auditFile.audits?.length !== expected
  ) {
    issues.push(
      `Auditoria independente da classificação não comprova PASS ${expected}/${expected}.`,
    );
  }
  const sourceById = new Map(
    bundle.questions.map((source) => [source.id, source]),
  );
  const auditBySource = new Map(
    (auditFile.audits ?? []).map((row) => [row.sourceId, row]),
  );
  const seen = new Set<string>();
  for (const classification of classificationFile.classifications ?? []) {
    const source = sourceById.get(classification.sourceId);
    if (!source || seen.has(classification.sourceId)) {
      issues.push(
        `${classification.sourceId}: identidade pedagógica desconhecida ou duplicada.`,
      );
      continue;
    }
    seen.add(classification.sourceId);
    if (
      classification.officialNumber !== source.officialNumber ||
      corpusLanguage(classification.language) !==
        corpusLanguage(source.language) ||
      classification.reviewRequired === true ||
      !classification.knowledgeArea?.trim() ||
      !classification.disciplinaryComponent?.trim() ||
      !classification.content?.trim() ||
      !classification.subcontent?.trim() ||
      !classification.competencyCode?.trim() ||
      !classification.abilityCode?.trim() ||
      !["EASY", "MEDIUM", "HARD"].includes(classification.difficulty) ||
      !Number.isInteger(classification.estimatedMinutes) ||
      classification.estimatedMinutes <= 0 ||
      auditBySource.get(classification.sourceId)?.verdict !== "PASS"
    ) {
      issues.push(
        `${classification.sourceId}: classificação ou PASS independente inválido.`,
      );
    }
  }
  if (seen.size !== expected || auditBySource.size !== expected) {
    issues.push(`Cobertura pedagógica 1:1 inválida: ${seen.size}/${expected}.`);
  }
  return {
    classificationPath,
    auditPath,
    classificationHash: sha256Text(classificationRaw),
    auditHash: sha256Text(auditRaw),
    classificationFile,
    auditFile,
    issues: [...new Set(issues)],
  };
}

const publishJobInclude = {
  essayProposal: true,
  provaAntiga: true,
  extractions: {
    orderBy: [
      { officialOrder: "asc" as const },
      { officialLanguage: "asc" as const },
    ],
    include: {
      question: {
        include: {
          alternativeItems: { orderBy: { order: "asc" as const } },
          imageItems: true,
          blocks: { orderBy: { order: "asc" as const } },
          officialAnswerKey: true,
          pedagogicalMetadata: true,
          authorialResolutions: { where: { version: 1 }, take: 1 },
          revisions: { orderBy: { createdAt: "desc" as const }, take: 20 },
        },
      },
    },
  },
} satisfies Prisma.QuestionImportJobInclude;

async function publicationGate(input: {
  bundle: CorpusBundle;
  visualAuditPath: string;
  appEvidencePath: string;
  resolutionPath: string;
  resolutionAuditPath: string;
  classificationPath: string;
  classificationAuditPath: string;
  reviewEvidencePath?: string;
}) {
  const { bundle } = input;
  const [
    visualAudit,
    appEvidence,
    resolutions,
    classifications,
    reviewEvidence,
  ] = await Promise.all([
    readVisualAudit(input.visualAuditPath, bundle),
    readAppEvidence(input.appEvidencePath, bundle),
    readResolutionGate(input.resolutionPath, input.resolutionAuditPath, bundle),
    readClassificationGate(
      input.classificationPath,
      input.classificationAuditPath,
      bundle,
    ),
    input.reviewEvidencePath
      ? readReviewEvidence(input.reviewEvidencePath, bundle)
      : Promise.resolve(null),
  ]);
  const issues = [
    ...bundle.report.errors,
    ...visualAudit.errors,
    ...appEvidence.errors,
    ...resolutions.issues,
    ...classifications.issues,
    ...(reviewEvidence?.errors ?? []),
  ];
  const job = await db.questionImportJob.findUnique({
    where: { pilotId: bundle.report.corpusId! },
    include: publishJobInclude,
  });
  if (!job) {
    issues.push("Job não importado.");
    return {
      ready: false,
      issues: [...new Set(issues)],
      job: null,
      visualAudit,
      appEvidence,
      resolutions,
      classifications,
      reviewEvidence,
    };
  }
  if (job.sourceJsonSha256 !== bundle.sourceJsonSha256)
    issues.push("JSON estruturado mudou após a importação.");
  if (
    job.expectedQuestionCount !== bundle.questions.length ||
    job.importedQuestionCount !== bundle.questions.length ||
    job.extractions.length !== bundle.questions.length
  ) {
    issues.push(
      `Persistência incompleta: ${job.extractions.length}/${bundle.questions.length}.`,
    );
  }
  if (
    !job.requirePedagogicalReview ||
    !job.requireAuthorialResolution ||
    job.approvedQuestionCount !== bundle.questions.length ||
    job.approvedPedagogicalCount !== bundle.questions.length ||
    job.approvedResolutionCount !== bundle.questions.length ||
    (job.status === QuestionImportJobStatus.PUBLISHED
      ? job.publishedResolutionCount !== bundle.questions.length
      : job.publishedResolutionCount !== 0)
  ) {
    issues.push(
      "Contadores ou requisitos editoriais/pedagógicos/autorais do job não estão completos.",
    );
  }
  if (
    job.status !== QuestionImportJobStatus.READY_TO_PUBLISH &&
    job.status !== QuestionImportJobStatus.PUBLISHED
  ) {
    issues.push(`Job está em ${job.status}; esperado READY_TO_PUBLISH.`);
  }
  const sourceById = new Map(
    bundle.questions.map((source) => [source.id, source]),
  );
  const resolutionBySource = new Map(
    resolutions.resolutionFile.resolutions.map((resolution) => [
      resolution.sourceId,
      resolution,
    ]),
  );
  const classificationBySource = new Map(
    classifications.classificationFile.classifications.map((classification) => [
      classification.sourceId,
      classification,
    ]),
  );
  for (const extraction of job.extractions) {
    const source = sourceById.get(extraction.sourceId);
    if (!source) {
      issues.push(`Extração desconhecida no banco: ${extraction.sourceId}.`);
      continue;
    }
    const question = extraction.question;
    const key = question.officialAnswerKey;
    const resolution = question.authorialResolutions[0];
    const sourceResolution = resolutionBySource.get(source.id);
    const sourceClassification = classificationBySource.get(source.id);
    const pedagogy = question.pedagogicalMetadata;
    if (
      question.reviewState !== QuestionReviewState.APPROVED ||
      extraction.reviewStatus !== QuestionReviewState.APPROVED ||
      extraction.extractionStatus !== QuestionExtractionStatus.EXTRACTED
    ) {
      issues.push(`${source.id}: digitalização não aprovada.`);
    }
    if (
      job.status === QuestionImportJobStatus.PUBLISHED
        ? question.status !== ContentStatus.PUBLISHED
        : question.status !== ContentStatus.REVIEW
    ) {
      issues.push(`${source.id}: status público diverge do estágio do job.`);
    }
    if (
      !question.revisions.some(
        (revision) =>
          revision.action === QuestionRevisionAction.APPROVED &&
          revision.notes?.includes(visualAudit.hash),
      )
    ) {
      issues.push(
        `${source.id}: aprovação sem trilha ligada à auditoria visual atual.`,
      );
    }
    if (
      question.alternativeItems.length !== 5 ||
      question.alternativeItems
        .map((alternative) => alternative.key)
        .join("") !== "ABCDE" ||
      question.alternativeItems.some(
        (alternative) => !alternative.text.trim() && !alternative.imageUrl,
      )
    ) {
      issues.push(`${source.id}: alternativas estruturadas incompletas.`);
    }
    if (
      question.blocks.length !== source.blocks.length ||
      question.blocks.some((block, index) => block.order !== index)
    ) {
      issues.push(
        `${source.id}: blocos estruturados ausentes ou fora de ordem.`,
      );
    }
    if (
      !question.imageItems.some(
        (image) =>
          image.relation === QuestionAssetRelation.ADMIN_REFERENCE &&
          image.assetType === QuestionAssetType.ORIGINAL_REFERENCE,
      )
    ) {
      issues.push(`${source.id}: original administrativo ausente.`);
    }
    if (
      !key ||
      key.answerReviewStatus !== OfficialAnswerReviewStatus.APPROVED ||
      key.resolutionStatus !==
        (job.status === QuestionImportJobStatus.PUBLISHED
          ? OfficialResolutionStatus.PUBLISHED
          : OfficialResolutionStatus.APPROVED) ||
      !key.answerReviewedBy ||
      !key.answerReviewedAt ||
      key.validationStatus !== "validated_against_official_pdf" ||
      key.sourceSha256 !== bundle.provenance.officialAnswerKey.sha256 ||
      key.sourceUrl !== bundle.provenance.officialAnswerKey.url ||
      key.answerSituation !== answerSituation(source) ||
      key.correctAlternative !== compatibleAnswer(source)
    ) {
      issues.push(`${source.id}: gabarito oficial não aprovado/relacionado.`);
    }
    const correctAlternatives = question.alternativeItems.filter(
      (alternative) => alternative.correct,
    );
    if (
      answerSituation(source) === QuestionAnswerSituation.ANNULLED
        ? correctAlternatives.length !== 0
        : correctAlternatives.length !== 1 ||
          correctAlternatives[0]?.key !== source.answer
    ) {
      issues.push(
        `${source.id}: marcação de correção diverge do gabarito oficial.`,
      );
    }
    const expectedResolutionStatus =
      job.status === QuestionImportJobStatus.PUBLISHED
        ? OfficialResolutionStatus.PUBLISHED
        : OfficialResolutionStatus.APPROVED;
    if (
      !sourceResolution ||
      !sourceClassification ||
      !resolution ||
      resolution.reviewStatus !== QuestionReviewState.APPROVED ||
      resolution.status !== expectedResolutionStatus ||
      resolution.importJobId !== job.id ||
      resolution.answerKeyId !== key?.id ||
      resolution.contentHash !== sha256Text(JSON.stringify(sourceResolution)) ||
      resolution.fullResolution !== sourceResolution.fullResolution ||
      resolution.shortComment !== sourceResolution.shortComment ||
      resolution.commonError !== sourceResolution.commonError ||
      resolution.studyTip !== sourceResolution.studyTip ||
      JSON.stringify(resolution.reasoningPath) !==
        JSON.stringify(sourceResolution.reasoningPath) ||
      JSON.stringify(resolution.steps) !==
        JSON.stringify(sourceResolution.steps) ||
      JSON.stringify(resolution.alternativeComments) !==
        JSON.stringify(sourceResolution.alternativeComments) ||
      sourceResolution.knowledgeArea !== sourceClassification.knowledgeArea ||
      sourceResolution.disciplinaryComponent !==
        sourceClassification.disciplinaryComponent ||
      sourceResolution.content !== sourceClassification.content ||
      sourceResolution.subcontent !== sourceClassification.subcontent ||
      sourceResolution.difficulty !== sourceClassification.difficulty ||
      sourceResolution.estimatedMinutes !==
        sourceClassification.estimatedMinutes
    ) {
      issues.push(
        `${source.id}: resolução autoral aprovada ausente ou divergente.`,
      );
    }
    const comments = resolution?.alternativeComments as
      Record<string, unknown> | undefined;
    if (
      CORPUS_LETTERS.some((letter) => typeof comments?.[letter] !== "string")
    ) {
      issues.push(`${source.id}: comentários autorais A–E ausentes no banco.`);
    }
    const concepts = Array.isArray(pedagogy?.concepts)
      ? pedagogy.concepts.map(String)
      : [];
    if (
      !sourceClassification ||
      !pedagogy ||
      pedagogy.importJobId !== job.id ||
      pedagogy.reviewStatus !== QuestionReviewState.APPROVED ||
      pedagogy.knowledgeArea !== sourceClassification.knowledgeArea ||
      pedagogy.disciplinaryComponent !==
        sourceClassification.disciplinaryComponent ||
      pedagogy.competencyCode !== sourceClassification.competencyCode ||
      pedagogy.abilityCode !== sourceClassification.abilityCode ||
      pedagogy.cognitiveDemand !== sourceClassification.difficulty ||
      pedagogy.estimatedMinutes !== sourceClassification.estimatedMinutes ||
      concepts[0] !== sourceClassification.content ||
      concepts[1] !== sourceClassification.subcontent ||
      !pedagogy.reviewedBy ||
      !pedagogy.reviewedAt
    ) {
      issues.push(
        `${source.id}: classificação pedagógica aprovada ausente ou divergente.`,
      );
    }
  }
  if (job.requireEssayProposal) {
    if (
      !bundle.essay ||
      !job.essayProposal ||
      job.essayProposal.reviewStatus !== QuestionReviewState.APPROVED ||
      !job.essayProposal.reviewedBy ||
      !job.essayProposal.reviewedAt ||
      !job.essayProposal.theme?.trim() ||
      !job.essayProposal.promptText?.trim() ||
      !Array.isArray(job.essayProposal.instructions) ||
      !job.essayProposal.instructions.length ||
      !reviewEvidence?.evidence.essay
    ) {
      issues.push(
        "Proposta de redação não possui conteúdo e revisão visual/editorial rastreável completos.",
      );
    }
  }
  const uniqueIssues = [...new Set(issues)];
  return {
    ready: uniqueIssues.length === 0,
    issues: uniqueIssues,
    job,
    visualAudit,
    appEvidence,
    resolutions,
    classifications,
    reviewEvidence,
  };
}

async function executePublication(
  gate: Awaited<ReturnType<typeof publicationGate>>,
  bundle: CorpusBundle,
  actor: string,
) {
  if (!gate.ready || !gate.job)
    throw new Error(`Publicação bloqueada: ${gate.issues.join(" ")}`);
  const job = gate.job;
  const publishedAt = new Date();
  const artifactEvidence = {
    visualAudit: {
      path: relativeToRepo(gate.visualAudit.filePath),
      sha256: gate.visualAudit.hash,
    },
    appEvidence: {
      path: relativeToRepo(gate.appEvidence.filePath),
      sha256: gate.appEvidence.hash,
    },
    resolutions: {
      path: relativeToRepo(gate.resolutions.resolutionPath),
      sha256: gate.resolutions.resolutionHash,
    },
    resolutionAudit: {
      path: relativeToRepo(gate.resolutions.auditPath),
      sha256: gate.resolutions.auditHash,
    },
    classifications: {
      path: relativeToRepo(gate.classifications.classificationPath),
      sha256: gate.classifications.classificationHash,
    },
    classificationAudit: {
      path: relativeToRepo(gate.classifications.auditPath),
      sha256: gate.classifications.auditHash,
    },
    reviewEvidence: gate.reviewEvidence
      ? {
          path: relativeToRepo(gate.reviewEvidence.filePath),
          sha256: gate.reviewEvidence.hash,
        }
      : null,
  };
  const backupDirectory = path.join(bundle.directory, "backups");
  await mkdir(backupDirectory, { recursive: true });
  const backupPath = path.join(
    backupDirectory,
    `backup-pre-publicacao-${publishedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-")}.json`,
  );
  const backupPayload = `${JSON.stringify(
    {
      schemaVersion: 1,
      corpusId: bundle.report.corpusId,
      capturedAt: publishedAt.toISOString(),
      sourceJsonSha256: bundle.sourceJsonSha256,
      artifacts: artifactEvidence,
      job,
    },
    null,
    2,
  )}\n`;
  const backupHash = sha256Text(backupPayload);
  await writeFile(backupPath, backupPayload, { encoding: "utf8", flag: "wx" });
  await writeFile(
    `${backupPath}.sha256`,
    `${backupHash}  ${path.basename(backupPath)}\n`,
    {
      encoding: "utf8",
      flag: "wx",
    },
  );
  const backup = { path: relativeToRepo(backupPath), sha256: backupHash };
  const publicationNotes =
    `Publicação após gates estruturais, visuais, pedagógicos, autorais e funcionais em ${publishedAt.toISOString()}. ` +
    `visual=${gate.visualAudit.hash}; app=${gate.appEvidence.hash}; resoluções=${gate.resolutions.resolutionHash}; ` +
    `auditoriaResoluções=${gate.resolutions.auditHash}; classificações=${gate.classifications.classificationHash}; ` +
    `auditoriaClassificações=${gate.classifications.auditHash}; backup=${backup.sha256}.`;
  const resolutionBySource = new Map(
    gate.resolutions.resolutionFile.resolutions.map((resolution) => [
      resolution.sourceId,
      resolution,
    ]),
  );
  await db.$transaction(
    async (tx) => {
      for (const extraction of job.extractions) {
        const resolution = resolutionBySource.get(extraction.sourceId)!;
        await tx.question.update({
          where: { id: extraction.questionId },
          data: {
            status: ContentStatus.PUBLISHED,
            explanation: resolution.fullResolution,
            pedagogyComment: resolution.shortComment,
            alternativeExplanations: JSON.stringify(
              resolution.alternativeComments,
            ),
            difficulty: Difficulty[resolution.difficulty],
            pilotTestPublishedAt: publishedAt,
            pilotTestPublishedBy: actor,
          },
        });
        for (const letter of CORPUS_LETTERS) {
          await tx.questionAlternative.update({
            where: {
              questionId_key: {
                questionId: extraction.questionId,
                key: letter,
              },
            },
            data: { explanation: resolution.alternativeComments[letter] },
          });
        }
        await tx.questionAuthorialResolution.update({
          where: {
            questionId_version: {
              questionId: extraction.questionId,
              version: 1,
            },
          },
          data: { status: OfficialResolutionStatus.PUBLISHED, publishedAt },
        });
        await tx.officialAnswerKey.update({
          where: { id: extraction.answerKeyId },
          data: {
            resolutionStatus: OfficialResolutionStatus.PUBLISHED,
            publishedAt,
          },
        });
        await tx.questionRevision.upsert({
          where: {
            dedupeKey: `${bundle.report.corpusId}:${extraction.sourceId}:PUBLISHED:${bundle.sourceJsonSha256}`,
          },
          update: { actor, notes: publicationNotes },
          create: {
            questionId: extraction.questionId,
            importJobId: job.id,
            action: QuestionRevisionAction.PUBLISHED,
            actor,
            notes: publicationNotes,
            beforeSnapshot: jsonValue({ status: extraction.question.status }),
            afterSnapshot: jsonValue({
              status: ContentStatus.PUBLISHED,
              publishedAt: publishedAt.toISOString(),
            }),
            dedupeKey: `${bundle.report.corpusId}:${extraction.sourceId}:PUBLISHED:${bundle.sourceJsonSha256}`,
          },
        });
      }
      if (job.essayProposal) {
        await tx.officialEssayProposal.update({
          where: { id: job.essayProposal.id },
          data: { status: ContentStatus.PUBLISHED, publishedAt },
        });
      }
      await tx.provaAntiga.update({
        where: { id: job.provaAntigaId },
        data: {
          status: "DISPONIVEL",
          importacaoStatus: "PUBLICADO",
          importacaoRelatorio: JSON.stringify({
            ...bundle.report,
            publicationGate: {
              passed: true,
              publishedAt: publishedAt.toISOString(),
              artifacts: artifactEvidence,
              backup,
            },
          }),
          questoesDetectadas: bundle.questions.length,
          questoesValidas: bundle.questions.length,
          questoesComErro: 0,
          pilotTestAvailableAt: publishedAt,
        },
      });
      await tx.questionImportJob.update({
        where: { id: job.id },
        data: {
          importedQuestionCount: bundle.questions.length,
          approvedQuestionCount: bundle.questions.length,
          publishedQuestionCount: bundle.questions.length,
          approvedPedagogicalCount: bundle.questions.length,
          approvedResolutionCount: bundle.questions.length,
          publishedResolutionCount: bundle.questions.length,
          approvedEssayProposalCount: bundle.essay ? 1 : 0,
          status: QuestionImportJobStatus.PUBLISHED,
          validationReport: jsonValue({
            ...bundle.validation,
            importer: bundle.report,
            publicationGate: {
              passed: true,
              actor,
              publishedAt: publishedAt.toISOString(),
              artifacts: artifactEvidence,
              backup,
            },
          }),
          checkpoint: jsonValue({
            stage: "published",
            artifacts: artifactEvidence,
            backup,
            publishedAt: publishedAt.toISOString(),
          }),
          publishedAt,
        },
      });
      await tx.officialFile.update({
        where: { id: job.examFileId },
        data: { processingStatus: OfficialProcessingStatus.PUBLISHED },
      });
      await tx.officialFile.update({
        where: { id: job.answerKeyFileId },
        data: { processingStatus: OfficialProcessingStatus.PUBLISHED },
      });
      await tx.officialImportLog.create({
        data: {
          fileId: job.examFileId,
          action: "enem_corpus_publish",
          status: "SUCCESS",
          message: `${bundle.report.corpusId}: publicação atômica ${bundle.questions.length}/${bundle.questions.length}.`,
          metadata: JSON.stringify({
            jobId: job.id,
            actor,
            artifacts: artifactEvidence,
            backup,
          }),
        },
      });
    },
    { timeout: 180_000 },
  );
  const [
    publishedQuestions,
    publishedResolutions,
    publishedResolutionKeys,
    explainedAlternatives,
    publishedEssays,
    publishedJob,
  ] = await Promise.all([
    db.question.count({
      where: {
        id: { in: job.extractions.map((extraction) => extraction.questionId) },
        status: ContentStatus.PUBLISHED,
      },
    }),
    db.questionAuthorialResolution.count({
      where: {
        importJobId: job.id,
        status: OfficialResolutionStatus.PUBLISHED,
      },
    }),
    db.officialAnswerKey.count({
      where: {
        id: { in: job.extractions.map((extraction) => extraction.answerKeyId) },
        resolutionStatus: OfficialResolutionStatus.PUBLISHED,
      },
    }),
    db.questionAlternative.count({
      where: {
        questionId: {
          in: job.extractions.map((extraction) => extraction.questionId),
        },
        explanation: { not: null },
      },
    }),
    db.officialEssayProposal.count({
      where: { importJobId: job.id, status: ContentStatus.PUBLISHED },
    }),
    db.questionImportJob.findUnique({ where: { id: job.id } }),
  ]);
  if (
    publishedQuestions !== bundle.questions.length ||
    publishedResolutions !== bundle.questions.length ||
    publishedResolutionKeys !== bundle.questions.length ||
    explainedAlternatives !== bundle.questions.length * CORPUS_LETTERS.length ||
    publishedEssays !== (bundle.essay ? 1 : 0) ||
    publishedJob?.publishedQuestionCount !== bundle.questions.length ||
    publishedJob.publishedResolutionCount !== bundle.questions.length ||
    publishedJob.status !== QuestionImportJobStatus.PUBLISHED
  ) {
    throw new Error(
      "Verificação pós-publicação falhou; questões, resoluções, gabaritos, alternativas ou redação divergem.",
    );
  }
  const markerPath = path.join(bundle.directory, "corpus-publicado.json");
  const marker = {
    schemaVersion: 1,
    corpusId: bundle.report.corpusId,
    jobId: job.id,
    publishedAt: publishedAt.toISOString(),
    sourceJsonSha256: bundle.sourceJsonSha256,
    expectedOccurrences: bundle.questions.length,
    importedOccurrences: publishedQuestions,
    approvedOccurrences: publishedQuestions,
    publishedOccurrences: publishedQuestions,
    logicalQuestions: bundle.report.logicalQuestions,
    visualAuditSha256: gate.visualAudit.hash,
    appEvidenceSha256: gate.appEvidence.hash,
    resolutionsSha256: gate.resolutions.resolutionHash,
    resolutionAuditSha256: gate.resolutions.auditHash,
    classificationsSha256: gate.classifications.classificationHash,
    classificationAuditSha256: gate.classifications.auditHash,
    reviewEvidenceSha256: gate.reviewEvidence?.hash ?? null,
    publishedResolutionKeys,
    explainedAlternatives,
    publishedEssays,
    backup,
    artifacts: artifactEvidence,
  };
  await writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
  return { ...marker, markerPath: relativeToRepo(markerPath) };
}

async function main() {
  const corpusDir = argument("--corpus-dir");
  if (!corpusDir) {
    throw new Error(
      "Informe --corpus-dir. Use --confirm-import, --confirm-review e --confirm-publish apenas nas etapas correspondentes.",
    );
  }
  const actor = argument("--actor") || "estudaki-editorial-codex";
  const confirmImport = has("--confirm-import");
  const confirmReview = has("--confirm-review");
  const publishRequested = has("--publish") || has("--confirm-publish");
  const confirmPublish = has("--confirm-publish");
  const visualAuditPath = argument("--visual-audit");
  const reviewEvidencePath = argument("--review-evidence");
  const appEvidencePath = argument("--app-evidence");
  const resolutionPath = argument("--resolutions");
  const resolutionAuditPath = argument("--resolution-audit");
  const classificationPath = argument("--classifications");
  const classificationAuditPath = argument("--classification-audit");
  const bundle = await readCorpusBundle(corpusDir);
  console.log(
    JSON.stringify(
      {
        mode: confirmImport
          ? "IMPORT"
          : confirmReview
            ? "REVIEW"
            : confirmPublish
              ? "PUBLISH"
              : publishRequested
                ? "PUBLICATION_GATE"
                : "DRY_RUN",
        directory: relativeToRepo(bundle.directory),
        sourceJsonSha256: bundle.sourceJsonSha256,
        report: bundle.report,
      },
      null,
      2,
    ),
  );
  if (!bundle.report.valid) {
    throw new Error(`Corpus inválido: ${bundle.report.errors.join(" ")}`);
  }
  if (confirmImport) {
    console.log(JSON.stringify(await executeImport(bundle, actor), null, 2));
  }
  if (reviewEvidencePath && !confirmReview && !publishRequested) {
    const reviewEvidence = await readReviewEvidence(reviewEvidencePath, bundle);
    console.log(
      JSON.stringify(
        {
          reviewEvidence: relativeToRepo(reviewEvidence.filePath),
          sha256: reviewEvidence.hash,
          valid: reviewEvidence.errors.length === 0,
          errors: reviewEvidence.errors,
        },
        null,
        2,
      ),
    );
    if (reviewEvidence.errors.length)
      throw new Error("Evidência editorial inválida.");
  }
  if (visualAuditPath && !confirmReview && !publishRequested) {
    const visualAudit = await readVisualAudit(visualAuditPath, bundle);
    console.log(
      JSON.stringify(
        {
          visualAudit: relativeToRepo(visualAudit.filePath),
          sha256: visualAudit.hash,
          valid: visualAudit.errors.length === 0,
          errors: visualAudit.errors,
        },
        null,
        2,
      ),
    );
    if (visualAudit.errors.length)
      throw new Error("Auditoria visual inválida.");
  }
  if (confirmReview) {
    if (!visualAuditPath)
      throw new Error("--confirm-review exige --visual-audit.");
    console.log(
      JSON.stringify(
        await executeReview({
          bundle,
          visualAuditPath,
          reviewEvidencePath,
          actor,
        }),
        null,
        2,
      ),
    );
  }
  if (publishRequested) {
    if (
      !visualAuditPath ||
      !appEvidencePath ||
      !resolutionPath ||
      !resolutionAuditPath ||
      !classificationPath ||
      !classificationAuditPath
    ) {
      throw new Error(
        "O gate de publicação exige --visual-audit, --app-evidence, --resolutions, --resolution-audit, --classifications e --classification-audit.",
      );
    }
    const gate = await publicationGate({
      bundle,
      visualAuditPath,
      appEvidencePath,
      resolutionPath,
      resolutionAuditPath,
      classificationPath,
      classificationAuditPath,
      reviewEvidencePath,
    });
    console.log(
      JSON.stringify(
        {
          corpusId: bundle.report.corpusId,
          ready: gate.ready,
          issues: gate.issues,
          expected: bundle.questions.length,
          persisted: gate.job?.extractions.length ?? 0,
          checks: {
            structural: bundle.report.valid,
            visualAudit: gate.visualAudit.errors.length === 0,
            appEvidence: gate.appEvidence.errors.length === 0,
            resolutions: gate.resolutions.issues.length === 0,
            classifications: gate.classifications.issues.length === 0,
            essay:
              !gate.job?.requireEssayProposal ||
              Boolean(gate.job.essayProposal),
          },
        },
        null,
        2,
      ),
    );
    if (!gate.ready)
      throw new Error(
        `Publicação bloqueada por ${gate.issues.length} pendência(s).`,
      );
    if (confirmPublish) {
      console.log(
        JSON.stringify(await executePublication(gate, bundle, actor), null, 2),
      );
    } else {
      console.log(
        "Gate aprovado em modo de prévia. Use --confirm-publish para a publicação atômica.",
      );
    }
  }
  if (
    !confirmImport &&
    !confirmReview &&
    !publishRequested &&
    !visualAuditPath &&
    !reviewEvidencePath
  ) {
    console.log(
      "Dry-run concluído. Use --confirm-import para gravar apenas em REVIEW.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
