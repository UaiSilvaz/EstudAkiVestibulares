import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  ContentStatus,
  Difficulty,
  OfficialAnswerReviewStatus,
  OfficialFileType,
  OfficialProcessingStatus,
  OfficialQuestionLanguage,
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
  EXPECTED_EXAM_SHA256,
  EXPECTED_EXAM_URL,
  EXPECTED_KEY_SHA256,
  EXPECTED_KEY_URL,
  PILOT_ID,
  cliValue,
  hasCliFlag,
  hashJson,
  readPilotBundle,
  regionColumns,
  relativeToRepo,
  type StructuredAsset,
  type StructuredQuestion,
} from "./pilot-2022-day2";
import { writePilotSnapshot } from "./pilot-db-snapshot";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "a-classificar";
}

function difficulty(value: string | null) {
  const normalized = slugify(value ?? "");
  if (["facil", "easy"].includes(normalized)) return Difficulty.EASY;
  if (["dificil", "hard"].includes(normalized)) return Difficulty.HARD;
  return Difficulty.MEDIUM;
}

function answerSituation(question: StructuredQuestion) {
  return question.answerSituation === "annulled"
    ? QuestionAnswerSituation.ANNULLED
    : QuestionAnswerSituation.CONFIRMED;
}

function extractionStatus(question: StructuredQuestion) {
  if (question.extractionStatus === "invalid") return QuestionExtractionStatus.INVALID;
  if (question.extractionStatus === "needs_review") return QuestionExtractionStatus.NEEDS_REVIEW;
  return QuestionExtractionStatus.EXTRACTED;
}

function blockType(value: string) {
  if (value === "image") return QuestionBlockType.IMAGE;
  if (value === "command") return QuestionBlockType.COMMAND;
  if (value === "credit") return QuestionBlockType.CREDIT;
  return QuestionBlockType.SUPPORT_TEXT;
}

function assetType(value: StructuredAsset["type"]) {
  if (value === "prompt_facsimile") return QuestionAssetType.PROMPT_FACSIMILE;
  if (value === "alternative_visual") return QuestionAssetType.ALTERNATIVE_VISUAL;
  if (value === "original_reference") return QuestionAssetType.ORIGINAL_REFERENCE;
  return QuestionAssetType.VISUAL;
}

function assetRelation(value: StructuredAsset["relation"]) {
  if (value === "alternative") return QuestionAssetRelation.ALTERNATIVE;
  if (value === "admin_reference") return QuestionAssetRelation.ADMIN_REFERENCE;
  return QuestionAssetRelation.STATEMENT;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

async function resolveSubjectAndTopic(question: StructuredQuestion) {
  const subjectName = question.subject?.trim() || "A classificar";
  const subject = await db.subject.upsert({
    where: { slug: slugify(subjectName) },
    update: { name: subjectName },
    create: {
      name: subjectName,
      slug: slugify(subjectName),
      description: "Classificação editorial de questões oficiais do ENEM.",
    },
  });
  if (!question.content?.trim()) return { subjectId: subject.id, topicId: null };
  const topicName = question.subcontent?.trim()
    ? `${question.content.trim()} — ${question.subcontent.trim()}`
    : question.content.trim();
  const topic = await db.topic.upsert({
    where: { slug: `${slugify(subjectName)}-${slugify(topicName)}` },
    update: { name: topicName, subjectId: subject.id },
    create: {
      name: topicName,
      slug: `${slugify(subjectName)}-${slugify(topicName)}`,
      subjectId: subject.id,
    },
  });
  return { subjectId: subject.id, topicId: topic.id };
}

function mediaRows(questionId: string, question: StructuredQuestion) {
  return [...question.assets, ...question.originalCrops].map((asset) => ({
    questionId,
    url: asset.url,
    description: asset.altText,
    altText: asset.altText,
    order: asset.order,
    width: asset.width,
    height: asset.height,
    assetType: assetType(asset.type),
    relation: assetRelation(asset.relation),
    alternativeKey: asset.alternativeKey ?? null,
    storagePath: asset.storagePath,
    mimeType: path.extname(asset.storagePath).toLowerCase() === ".png" ? "image/png" : null,
    sha256Hash: asset.sha256,
    sourcePdfPage: asset.sourcePdfPage,
    consolidatedPdfPage: asset.consolidatedPdfPage,
    ...regionColumns(asset.sourceRegion),
  }));
}

async function importQuestion(input: {
  question: StructuredQuestion;
  jobId: string;
  vestibularId: string;
  keyFileId: string;
  actor: string;
}) {
  const { question, jobId, vestibularId, keyFileId, actor } = input;
  const rawPayloadHash = hashJson(question);
  const existingLink = await db.provaAntigaQuestao.findUnique({
    where: {
      provaAntigaId_numeroQuestao_officialLanguage: {
        provaAntigaId: question.oldExamId,
        numeroQuestao: question.officialNumber,
        officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
      },
    },
    include: { questao: { include: { structuredExtraction: true } } },
  });
  const hashOwner = await db.question.findUnique({
    where: { contentHash: question.contentHash },
    include: { structuredExtraction: true },
  });
  if (hashOwner && existingLink && hashOwner.id !== existingLink.questaoId) {
    throw new Error(
      `Questão ${question.officialNumber}: contentHash pertence a outro registro (${hashOwner.id}).`,
    );
  }
  const existingQuestion = existingLink?.questao ?? hashOwner;
  const unchanged = existingQuestion?.structuredExtraction?.rawPayloadHash === rawPayloadHash;
  const preserveApproval = unchanged && existingQuestion?.reviewState === QuestionReviewState.APPROVED;
  const { subjectId, topicId } = await resolveSubjectAndTopic(question);
  const situation = answerSituation(question);
  const compatibleAnswer = situation === QuestionAnswerSituation.ANNULLED ? "ANULADA" : question.answer!;
  const normalizedAlternatives = question.alternatives.map((alternative) => ({
    key: alternative.key,
    text: alternative.text,
    imageUrl: alternative.imageUrl,
  }));
  const studentImages = question.assets
    .filter((asset) => asset.relation === "statement")
    .map((asset) => ({
      url: asset.url,
      altText: asset.altText,
      width: asset.width,
      height: asset.height,
      order: asset.order,
      assetType: assetType(asset.type),
      relation: assetRelation(asset.relation),
    }));
  const skill = [question.competency, question.ability].filter(Boolean).join(" · ") || null;
  const tags = [
    "oficial",
    "enem",
    "2022",
    "2-dia",
    "caderno-5-amarelo",
    slugify(question.area),
    question.content ? slugify(question.content) : null,
    question.subcontent ? slugify(question.subcontent) : null,
  ].filter(Boolean);
  const reviewNotes = [
    question.reviewNotes,
    "Extração coordenada do Caderno 5 Amarelo; conferência humana individual obrigatória antes da publicação.",
    situation === QuestionAnswerSituation.ANNULLED
      ? "Questão anulada no gabarito oficial; nenhuma alternativa deve ser tratada como correta."
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return db.$transaction(
    async (transaction) => {
      const existingKey = await transaction.officialAnswerKey.findUnique({
        where: {
          fileId_questionNumber_officialLanguage: {
            fileId: keyFileId,
            questionNumber: question.officialNumber,
            officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
          },
        },
      });
      const answerKey = await transaction.officialAnswerKey.upsert({
        where: {
          fileId_questionNumber_officialLanguage: {
            fileId: keyFileId,
            questionNumber: question.officialNumber,
            officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
          },
        },
        update: {
          correctAlternative: compatibleAnswer,
          answerSituation: situation,
          statement: question.command,
          subject: question.subject,
          topic: question.content,
          difficulty: difficulty(question.difficulty),
          officialQuestionUrl: question.source.originalPageUrl,
          sourceUrl: question.officialAnswerKey!.sourceUrl,
          sourceSha256: question.officialAnswerKey!.sourceSha256,
          sourcePdfPage: question.officialAnswerKey!.sourcePdfPage,
          validationStatus: question.officialAnswerKey!.validationStatus,
          importedAt: new Date(question.officialAnswerKey!.importedAt),
          answerReviewStatus:
            existingKey?.answerReviewStatus === OfficialAnswerReviewStatus.APPROVED
              ? OfficialAnswerReviewStatus.APPROVED
              : OfficialAnswerReviewStatus.CHECKED,
        },
        create: {
          fileId: keyFileId,
          questionNumber: question.officialNumber,
          correctAlternative: compatibleAnswer,
          answerSituation: situation,
          statement: question.command,
          subject: question.subject,
          topic: question.content,
          difficulty: difficulty(question.difficulty),
          officialQuestionUrl: question.source.originalPageUrl,
          sourceUrl: question.officialAnswerKey!.sourceUrl,
          sourceSha256: question.officialAnswerKey!.sourceSha256,
          sourcePdfPage: question.officialAnswerKey!.sourcePdfPage,
          validationStatus: question.officialAnswerKey!.validationStatus,
          importedAt: new Date(question.officialAnswerKey!.importedAt),
          answerReviewStatus: OfficialAnswerReviewStatus.CHECKED,
        },
      });

      const commonData = {
        vestibularId,
        subjectId,
        topicId,
        year: 2022,
        exam: "ENEM 2022 · 2º dia · Caderno 5 Amarelo",
        phase: "Aplicação regular",
        day: "2º dia",
        questionNumber: question.officialNumber,
        difficulty: difficulty(question.difficulty),
        statement: question.command,
        supportText: question.supportText,
        alternatives: JSON.stringify(normalizedAlternatives),
        correctAlternative: compatibleAnswer,
        skill,
        imageUrl: studentImages[0]?.url ?? null,
        images: JSON.stringify(studentImages),
        tags: JSON.stringify(tags),
        source: question.source.institution,
        sourceName: "Inep — ENEM 2022, 2º dia, Caderno 5 Amarelo",
        sourceUrl: question.source.originalPageUrl,
        sourceCitation: `ENEM 2022 · 2º dia · Caderno 5 Amarelo · questão ${question.officialNumber} · Página institucional: ${question.source.sourcePageUrl}`,
        sourceAccessedAt: question.source.accessedAt,
        sourceType: QuestionSourceType.OFFICIAL,
        answerSituation: situation,
        reviewState: preserveApproval ? QuestionReviewState.APPROVED : QuestionReviewState.PENDING_REVIEW,
        reviewNotes,
        contentHash: question.contentHash,
        status: ContentStatus.REVIEW,
      };
      const persistedQuestion = existingQuestion
        ? await transaction.question.update({
            where: { id: existingQuestion.id },
            data: commonData,
          })
        : await transaction.question.create({
            data: {
              ...commonData,
              alternativeExplanations: "{}",
              explanation:
                situation === QuestionAnswerSituation.ANNULLED
                  ? "Questão anulada no gabarito oficial do Inep para o Caderno 5 Amarelo."
                  : "Correção vinculada ao gabarito oficial; resolução editorial em revisão.",
              pedagogyComment: "Não publicar sem revisão visual e funcional completa.",
            },
          });

      await transaction.officialAnswerKey.update({
        where: { id: answerKey.id },
        data: { questionId: persistedQuestion.id },
      });
      await transaction.questionBlock.deleteMany({ where: { questionId: persistedQuestion.id } });
      await transaction.questionImage.deleteMany({ where: { questionId: persistedQuestion.id } });
      await transaction.questionAlternative.deleteMany({ where: { questionId: persistedQuestion.id } });
      await transaction.questionAlternative.createMany({
        data: question.alternatives.map((alternative) => ({
          questionId: persistedQuestion.id,
          key: alternative.key,
          text: alternative.text,
          imageUrl: alternative.imageUrl,
          correct:
            situation === QuestionAnswerSituation.CONFIRMED && alternative.key === question.answer,
          order: alternative.order,
          sourcePdfPage: alternative.sourcePdfPage,
          consolidatedPdfPage: alternative.consolidatedPdfPage,
          ...regionColumns(alternative.sourceRegion),
          confidence: alternative.confidence,
        })),
      });
      const images = mediaRows(persistedQuestion.id, question);
      if (images.length) await transaction.questionImage.createMany({ data: images });
      const persistedImages = await transaction.questionImage.findMany({
        where: { questionId: persistedQuestion.id },
      });
      const imageByHash = new Map(persistedImages.map((image) => [image.sha256Hash, image]));
      const orderedBlocks: Array<{
        page: number;
        y: number;
        x: number;
        group: number;
        sequence: number;
        data: Omit<Prisma.QuestionBlockCreateManyInput, "order">;
      }> = question.blocks.map((block) => {
        const linkedImage = block.type === "image" ? imageByHash.get(block.assetSha256 ?? "") : null;
        if (block.type === "image" && (!linkedImage || linkedImage.assetType !== QuestionAssetType.VISUAL)) {
          throw new Error(
            `QuestÃ£o ${question.officialNumber}: bloco IMAGE ${block.assetSha256 ?? "sem hash"} nÃ£o vinculado ao visual oficial.`,
          );
        }
        return {
          page: block.sourcePdfPage,
          y: block.sourceRegion.y,
          x: block.sourceRegion.x,
          group: 0,
          sequence: block.order,
          data: {
            questionId: persistedQuestion.id,
            assetId: linkedImage?.id ?? null,
            type: blockType(block.type),
            content: block.content,
            sourcePdfPage: block.sourcePdfPage,
            consolidatedPdfPage: block.consolidatedPdfPage,
            ...regionColumns(block.sourceRegion),
            confidence: block.confidence,
          },
        };
      });
      for (const asset of question.assets.filter((item) => item.type === "prompt_facsimile")) {
        const image = imageByHash.get(asset.sha256);
        if (!image) {
          throw new Error(
            `Questão ${question.officialNumber}: PROMPT_FACSIMILE ${asset.sha256} não persistido.`,
          );
        }
        orderedBlocks.push({
          page: asset.sourcePdfPage,
          y: asset.sourceRegion.y,
          x: asset.sourceRegion.x,
          group: 1,
          sequence: asset.order,
          data: {
            questionId: persistedQuestion.id,
            assetId: image.id,
            type: QuestionBlockType.IMAGE,
            content: asset.altText,
            sourcePdfPage: asset.sourcePdfPage,
            consolidatedPdfPage: asset.consolidatedPdfPage,
            ...regionColumns(asset.sourceRegion),
            confidence: question.confidence.images,
          },
        });
      }
      orderedBlocks.sort(
        (left, right) =>
          left.group - right.group ||
          left.sequence - right.sequence ||
          left.page - right.page ||
          left.y - right.y ||
          left.x - right.x,
      );
      await transaction.questionBlock.createMany({
        data: orderedBlocks.map((block, order) => ({ ...block.data, order })),
      });
      const extractionReviewState = preserveApproval
        ? QuestionReviewState.APPROVED
        : QuestionReviewState.PENDING_REVIEW;
      await transaction.questionExtraction.upsert({
        where: { sourceId: question.id },
        update: {
          questionId: persistedQuestion.id,
          importJobId: jobId,
          answerKeyId: answerKey.id,
          schemaVersion: question.schemaVersion,
          officialNumber: question.officialNumber,
          officialOrder: question.officialOrder,
          officialPdfPageStart: question.source.officialPdfPageStart,
          officialPdfPageEnd: question.source.officialPdfPageEnd,
          consolidatedPdfPageStart: question.source.consolidatedPdfPageStart,
          consolidatedPdfPageEnd: question.source.consolidatedPdfPageEnd,
          originalPageUrl: question.source.originalPageUrl,
          extractionStatus: extractionStatus(question),
          reviewStatus: extractionReviewState,
          answerSituation: situation,
          confidenceText: question.confidence.text,
          confidenceAlternatives: question.confidence.alternatives,
          confidenceImages: question.confidence.images,
          confidenceAnswer: question.confidence.answer,
          confidenceClassification: question.confidence.classification,
          confidenceOverall: question.confidence.overall,
          flags: jsonValue(question.flags),
          sourceMetadata: jsonValue({
            area: question.area,
            subject: question.subject,
            content: question.content,
            subcontent: question.subcontent,
            competency: question.competency,
            ability: question.ability,
            estimatedTimeSeconds: question.estimatedTimeSeconds,
            language: question.language,
            source: question.source,
          }),
          sourceContentHash: question.contentHash,
          rawPayloadHash,
        },
        create: {
          questionId: persistedQuestion.id,
          importJobId: jobId,
          answerKeyId: answerKey.id,
          sourceId: question.id,
          schemaVersion: question.schemaVersion,
          officialNumber: question.officialNumber,
          officialOrder: question.officialOrder,
          officialPdfPageStart: question.source.officialPdfPageStart,
          officialPdfPageEnd: question.source.officialPdfPageEnd,
          consolidatedPdfPageStart: question.source.consolidatedPdfPageStart,
          consolidatedPdfPageEnd: question.source.consolidatedPdfPageEnd,
          originalPageUrl: question.source.originalPageUrl,
          extractionStatus: extractionStatus(question),
          reviewStatus: extractionReviewState,
          answerSituation: situation,
          confidenceText: question.confidence.text,
          confidenceAlternatives: question.confidence.alternatives,
          confidenceImages: question.confidence.images,
          confidenceAnswer: question.confidence.answer,
          confidenceClassification: question.confidence.classification,
          confidenceOverall: question.confidence.overall,
          flags: jsonValue(question.flags),
          sourceMetadata: jsonValue({
            area: question.area,
            subject: question.subject,
            content: question.content,
            subcontent: question.subcontent,
            competency: question.competency,
            ability: question.ability,
            estimatedTimeSeconds: question.estimatedTimeSeconds,
            language: question.language,
            source: question.source,
          }),
          sourceContentHash: question.contentHash,
          rawPayloadHash,
        },
      });
      await transaction.provaAntigaQuestao.upsert({
        where: {
          provaAntigaId_numeroQuestao_officialLanguage: {
            provaAntigaId: question.oldExamId,
            numeroQuestao: question.officialNumber,
            officialLanguage: OfficialQuestionLanguage.NOT_APPLICABLE,
          },
        },
        update: {
          questaoId: persistedQuestion.id,
          ordem: question.officialOrder,
          paginaPdf: question.source.officialPdfPageStart,
          extractedStatement: question.statement,
          extractionConfidence: question.confidence.overall,
          pageStart: question.source.officialPdfPageStart,
          pageEnd: question.source.officialPdfPageEnd,
          hasImage: question.assets.length > 0,
          needsHumanReview: !preserveApproval,
        },
        create: {
          provaAntigaId: question.oldExamId,
          questaoId: persistedQuestion.id,
          numeroQuestao: question.officialNumber,
          ordem: question.officialOrder,
          paginaPdf: question.source.officialPdfPageStart,
          extractedStatement: question.statement,
          extractionConfidence: question.confidence.overall,
          pageStart: question.source.officialPdfPageStart,
          pageEnd: question.source.officialPdfPageEnd,
          hasImage: question.assets.length > 0,
          needsHumanReview: true,
        },
      });
      const action = existingQuestion?.structuredExtraction
        ? QuestionRevisionAction.UPDATED
        : QuestionRevisionAction.IMPORTED;
      await transaction.questionRevision.upsert({
        where: {
          dedupeKey: `${PILOT_ID}:${question.officialNumber}:${action}:${rawPayloadHash}`,
        },
        update: { actor, notes: `Importação idempotente do manifesto ${rawPayloadHash}.` },
        create: {
          questionId: persistedQuestion.id,
          importJobId: jobId,
          action,
          actor,
          notes: `Importação idempotente do manifesto ${rawPayloadHash}.`,
          beforeSnapshot: existingQuestion ? snapshot(existingQuestion) : undefined,
          afterSnapshot: snapshot(persistedQuestion),
          dedupeKey: `${PILOT_ID}:${question.officialNumber}:${action}:${rawPayloadHash}`,
        },
      });
      return { questionId: persistedQuestion.id, preservedApproval: preserveApproval };
    },
    { timeout: 30_000 },
  );
}

async function main() {
  const confirmed = hasCliFlag("confirm-import");
  const actor = cliValue("actor") || "codex-cli";
  const bundle = await readPilotBundle({ validateAssets: true });
  console.log(
    JSON.stringify(
      {
        mode: confirmed ? "IMPORT" : "PREVIEW",
        pilotId: PILOT_ID,
        report: bundle.report,
      },
      null,
      2,
    ),
  );
  if (!bundle.report.valid) {
    throw new Error(`Manifesto bloqueado por ${bundle.report.errors.length} erro(s) estrutural(is).`);
  }
  if (!confirmed) {
    console.log("Prévia concluída. Use --confirm-import para gravar 90 questões em REVIEW.");
    return;
  }

  const existingJob = await db.questionImportJob.findUnique({ where: { pilotId: PILOT_ID } });
  if (existingJob?.status === QuestionImportJobStatus.PUBLISHED) {
    throw new Error("Piloto já publicado. Reimportação pós-publicação é bloqueada.");
  }
  const [examFile, keyFile, oldExam] = await Promise.all([
    db.officialFile.findUnique({ where: { sha256Hash: EXPECTED_EXAM_SHA256 } }),
    db.officialFile.findUnique({ where: { sha256Hash: EXPECTED_KEY_SHA256 } }),
    db.provaAntiga.findUnique({ where: { id: bundle.config.oldExamId } }),
  ]);
  if (
    !examFile ||
    examFile.fileType !== OfficialFileType.EXAM ||
    examFile.originalUrl !== EXPECTED_EXAM_URL ||
    examFile.year !== 2022
  ) {
    throw new Error("Arquivo oficial da prova CD5 Amarelo não está cadastrado com URL e hash canônicos.");
  }
  if (
    !keyFile ||
    keyFile.fileType !== OfficialFileType.ANSWER_KEY ||
    keyFile.originalUrl !== EXPECTED_KEY_URL ||
    keyFile.year !== 2022
  ) {
    throw new Error("Arquivo oficial do gabarito CD5 Amarelo não está cadastrado com URL e hash canônicos.");
  }
  if (!oldExam) throw new Error(`Prova antiga ${bundle.config.oldExamId} não cadastrada.`);

  const backup = await writePilotSnapshot(db, "backup");
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
    where: { pilotId: PILOT_ID },
    update: {
      provaAntigaId: oldExam.id,
      examFileId: examFile.id,
      answerKeyFileId: keyFile.id,
      manifestPath: relativeToRepo(bundle.configPath),
      sourceJsonPath: relativeToRepo(bundle.structuredPath),
      sourceJsonSha256: bundle.sourceJsonSha256,
      sourceSchemaVersion: bundle.questions[0]!.schemaVersion,
      expectedQuestionCount: 90,
      status: QuestionImportJobStatus.IMPORTING,
      validationReport: jsonValue(bundle.report),
      checkpoint: jsonValue({ backup, nextQuestion: 91 }),
      createdBy: actor,
      startedAt: new Date(),
      completedAt: null,
    },
    create: {
      pilotId: PILOT_ID,
      provaAntigaId: oldExam.id,
      examFileId: examFile.id,
      answerKeyFileId: keyFile.id,
      vestibular: "ENEM",
      year: 2022,
      day: 2,
      application: bundle.config.application,
      modality: bundle.config.modality,
      bookletNumber: 5,
      bookletColor: "Amarelo",
      manifestPath: relativeToRepo(bundle.configPath),
      sourceJsonPath: relativeToRepo(bundle.structuredPath),
      sourceJsonSha256: bundle.sourceJsonSha256,
      sourceSchemaVersion: bundle.questions[0]!.schemaVersion,
      expectedQuestionCount: 90,
      status: QuestionImportJobStatus.IMPORTING,
      validationReport: jsonValue(bundle.report),
      checkpoint: jsonValue({ backup, nextQuestion: 91 }),
      createdBy: actor,
      startedAt: new Date(),
    },
  });

  let imported = 0;
  try {
    for (const question of bundle.questions) {
      await importQuestion({
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
            backup,
            lastImportedQuestion: question.officialNumber,
            nextQuestion: question.officialNumber < 180 ? question.officialNumber + 1 : null,
          }),
        },
      });
    }
    const approved = await db.questionExtraction.count({
      where: { importJobId: job.id, reviewStatus: QuestionReviewState.APPROVED },
    });
    await db.$transaction([
      db.questionImportJob.update({
        where: { id: job.id },
        data: {
          importedQuestionCount: imported,
          approvedQuestionCount: approved,
          publishedQuestionCount: 0,
          status:
            approved === 90
              ? QuestionImportJobStatus.READY_TO_PUBLISH
              : QuestionImportJobStatus.WAITING_REVIEW,
          completedAt: new Date(),
          checkpoint: jsonValue({ backup, lastImportedQuestion: 180, nextQuestion: null }),
        },
      }),
      db.provaAntiga.update({
        where: { id: oldExam.id },
        data: {
          officialExamFileId: examFile.id,
          officialKeyFileId: keyFile.id,
          fileHash: EXPECTED_EXAM_SHA256,
          totalQuestoes: 90,
          questoesDetectadas: 90,
          questoesValidas: 90,
          questoesComErro: 0,
          imagensDetectadas: bundle.report.assetCount,
          status: "PENDENTE",
          importacaoStatus: "AGUARDANDO_REVISAO",
          importacaoRelatorio: JSON.stringify(bundle.report),
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
          action: "enem_2022_day2_import",
          status: "SUCCESS",
          message: "90 questões do Caderno 5 Amarelo importadas em REVIEW; publicação bloqueada.",
          metadata: JSON.stringify({ jobId: job.id, actor, backup, sourceJsonSha256: bundle.sourceJsonSha256 }),
        },
      }),
    ]);
    console.log(
      JSON.stringify(
        {
          jobId: job.id,
          imported,
          approved,
          published: 0,
          status: approved === 90 ? "READY_TO_PUBLISH" : "WAITING_REVIEW",
          backup,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await db.questionImportJob.update({
      where: { id: job.id },
      data: {
        importedQuestionCount: imported,
        status: QuestionImportJobStatus.FAILED,
        checkpoint: jsonValue({
          backup,
          imported,
          error: error instanceof Error ? error.message : "Falha desconhecida.",
        }),
      },
    });
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
