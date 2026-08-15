import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  OfficialAnswerReviewStatus,
  OfficialProcessingStatus,
  OfficialResolutionStatus,
  Prisma,
  PrismaClient,
  QuestionAnswerSituation,
  QuestionImportJobStatus,
  QuestionReviewState,
  QuestionRevisionAction,
} from "@prisma/client";
import {
  PILOT_ID,
  cliValue,
  hasCliFlag,
  readPilotBundle,
  type SourceRegion,
  type StructuredAsset,
} from "./pilot-2022-day2";
import { writePilotSnapshot } from "./pilot-db-snapshot";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const REQUIRED_APP_CHECKS = [
  "answerFlow",
  "correction",
  "mobile",
  "adminOriginalPage",
  "answerKeyNotLeaked",
  "languageSelection",
] as const;

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

// The independent Python auditor uses json.dumps(..., ensure_ascii=False,
// sort_keys=True) with its default separators. Reproduce that canonical form
// exactly before comparing each audited resolutionHash.
function pythonCanonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value))
    return `[${value.map(pythonCanonicalJson).join(", ")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(
        ([key, child]) =>
          `${JSON.stringify(key)}: ${pythonCanonicalJson(child)}`,
      )
      .join(", ")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined)
    throw new Error("Valor não serializável no artefato auditado.");
  return encoded;
}

function auditedResolutionHash(value: unknown) {
  return sha256(pythonCanonicalJson(value));
}

type GateResolution = {
  sourceId: string;
  officialNumber: number;
  language: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  estimatedMinutes: number;
  knowledgeArea: string;
  disciplinaryComponent: string;
  content: string;
  subcontent: string;
  shortComment: string;
  fullResolution: string;
  reasoningPath: string[];
  steps: string[];
  alternativeComments: Record<string, string>;
  commonError: string;
  studyTip: string;
  keywords: string[];
  relatedContent: string[];
};

type GateClassification = {
  sourceId: string;
  officialNumber: number;
  language: string;
  knowledgeArea: string;
  disciplinaryComponent: string;
  content: string;
  subcontent: string;
  competencyCode: string;
  abilityCode: string;
  difficulty: string;
  estimatedMinutes: number;
};

async function readJsonArtifact<T>(input: string) {
  const absolute = path.resolve(input);
  const raw = await readFile(absolute);
  return {
    absolute,
    raw,
    sha256: sha256(raw),
    value: JSON.parse(raw.toString("utf8")) as T,
  };
}

function sameNumber(left: number | null, right: number) {
  return left !== null && Math.abs(left - right) < 0.000_001;
}

function sameRegion(
  row: {
    regionX: number | null;
    regionY: number | null;
    regionWidth: number | null;
    regionHeight: number | null;
    normalizedX: number | null;
    normalizedY: number | null;
    normalizedWidth: number | null;
    normalizedHeight: number | null;
  },
  region: SourceRegion,
) {
  return (
    sameNumber(row.regionX, region.x) &&
    sameNumber(row.regionY, region.y) &&
    sameNumber(row.regionWidth, region.width) &&
    sameNumber(row.regionHeight, region.height) &&
    sameNumber(row.normalizedX, region.normalized.x) &&
    sameNumber(row.normalizedY, region.normalized.y) &&
    sameNumber(row.normalizedWidth, region.normalized.width) &&
    sameNumber(row.normalizedHeight, region.normalized.height)
  );
}

function expectedAssetType(type: StructuredAsset["type"]) {
  if (type === "prompt_facsimile") return "PROMPT_FACSIMILE";
  if (type === "alternative_visual") return "ALTERNATIVE_VISUAL";
  if (type === "original_reference") return "ORIGINAL_REFERENCE";
  return "VISUAL";
}

function expectedAssetRelation(relation: StructuredAsset["relation"]) {
  if (relation === "alternative") return "ALTERNATIVE";
  if (relation === "admin_reference") return "ADMIN_REFERENCE";
  return "STATEMENT";
}

async function writePilotValidationMarker({
  structuredPath,
  sourceJsonSha256,
  jobId,
  publishedAt,
  artifacts,
}: {
  structuredPath: string;
  sourceJsonSha256: string;
  jobId: string;
  publishedAt: Date | null;
  artifacts: Record<string, { path: string; sha256: string }>;
}) {
  const markerPath = path.join(
    path.dirname(structuredPath),
    "piloto-validado.json",
  );
  const verifiedAt = new Date().toISOString();
  await writeFile(
    markerPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        pilotId: PILOT_ID,
        published: true,
        jobId,
        sourceJsonSha256,
        expectedQuestionCount: 90,
        importedQuestionCount: 90,
        approvedQuestionCount: 90,
        publishedQuestionCount: 90,
        publicationGate: "90/90",
        artifacts,
        publishedAt: publishedAt?.toISOString() ?? null,
        verifiedAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return { markerPath, verifiedAt };
}

async function main() {
  const confirmed = hasCliFlag("confirm-publish");
  const actor = cliValue("actor") || "codex-cli";
  const visualAuditInput = cliValue("visual-audit");
  const appEvidenceInput = cliValue("app-evidence");
  const resolutionsInput = cliValue("resolutions");
  const resolutionAuditInput = cliValue("resolution-audit");
  const classificationsInput = cliValue("classifications");
  const classificationAuditInput = cliValue("classification-audit");
  if (
    !visualAuditInput ||
    !appEvidenceInput ||
    !resolutionsInput ||
    !resolutionAuditInput ||
    !classificationsInput ||
    !classificationAuditInput
  ) {
    throw new Error(
      "O gate exige --visual-audit, --app-evidence, --resolutions, --resolution-audit, --classifications e --classification-audit.",
    );
  }
  const bundle = await readPilotBundle({ validateAssets: true });
  const issues = [...bundle.report.errors];
  const [
    visualArtifact,
    appArtifact,
    resolutionArtifact,
    resolutionAuditArtifact,
    classificationArtifact,
    classificationAuditArtifact,
  ] = await Promise.all([
    readJsonArtifact<{
      questionsSha256: string;
      complete: boolean;
      canApprove: boolean;
      expected: number;
      audited: number;
      passed: number;
      failed: number;
      audits: Array<{ sourceId: string; verdict: string }>;
    }>(visualAuditInput),
    readJsonArtifact<{
      corpusId: string;
      complete: boolean;
      testedSourceIds: string[];
      checks: Record<string, boolean>;
      evidence: Array<{ path: string; sha256: string }>;
    }>(appEvidenceInput),
    readJsonArtifact<{
      sourceByteSha256?: string;
      sourceFileSha256?: string;
      complete: boolean;
      expectedQuestions?: number;
      processedQuestions?: number;
      finalResolutionSetHash: string;
      resolutions: GateResolution[];
    }>(resolutionsInput),
    readJsonArtifact<{
      sourceByteSha256?: string;
      sourceFileSha256?: string;
      resolutionSetHash: string;
      complete: boolean;
      canApprove: boolean;
      expected: number;
      audited: number;
      passed: number;
      failed: number;
      audits: Array<{
        sourceId: string;
        verdict: string;
        resolutionHash: string;
      }>;
    }>(resolutionAuditInput),
    readJsonArtifact<{
      sourceByteSha256: string;
      sourceHash: string;
      complete: boolean;
      expected: number;
      classified: number;
      reviewRequired: number;
      classifications: GateClassification[];
    }>(classificationsInput),
    readJsonArtifact<{
      sourceByteSha256?: string;
      classificationSourceHash: string;
      complete: boolean;
      canApprove: boolean;
      expected: number;
      audited: number;
      passed: number;
      failed: number;
      audits: Array<{ sourceId: string; verdict: string }>;
    }>(classificationAuditInput),
  ]);
  const sourceIds = new Set(bundle.questions.map((question) => question.id));
  const visual = visualArtifact.value;
  if (
    visual.questionsSha256 !== bundle.sourceJsonSha256 ||
    visual.complete !== true ||
    visual.canApprove !== true ||
    visual.expected !== 90 ||
    visual.audited !== 90 ||
    visual.passed !== 90 ||
    visual.failed !== 0 ||
    visual.audits?.length !== 90 ||
    new Set(visual.audits.map((audit) => audit.sourceId)).size !== 90 ||
    visual.audits.some(
      (audit) => !sourceIds.has(audit.sourceId) || audit.verdict !== "PASS",
    )
  ) {
    issues.push("Auditoria visual atual não comprova PASS rastreável 90/90.");
  }
  const appEvidence = appArtifact.value;
  if (
    appEvidence.corpusId !== PILOT_ID ||
    appEvidence.complete !== true ||
    appEvidence.testedSourceIds?.length !== 90 ||
    new Set(appEvidence.testedSourceIds).size !== 90 ||
    appEvidence.testedSourceIds.some((sourceId) => !sourceIds.has(sourceId)) ||
    !Array.isArray(appEvidence.evidence) ||
    appEvidence.evidence.length < 8 ||
    new Set(appEvidence.evidence.map((item) => item.path)).size !==
      appEvidence.evidence.length ||
    REQUIRED_APP_CHECKS.some((check) => appEvidence.checks?.[check] !== true)
  ) {
    issues.push(
      "Evidência funcional REVIEW não comprova todos os fluxos e identidades 90/90.",
    );
  }
  for (const evidence of appEvidence.evidence ?? []) {
    const absolute = path.resolve(evidence.path);
    try {
      if (sha256(await readFile(absolute)) !== evidence.sha256) {
        issues.push(`Evidência funcional alterada: ${evidence.path}.`);
      }
    } catch {
      issues.push(`Evidência funcional ausente: ${evidence.path}.`);
    }
  }
  const resolutionFile = resolutionArtifact.value;
  const resolutionAudit = resolutionAuditArtifact.value;
  const resolutionSourceHash =
    resolutionFile.sourceByteSha256 ?? resolutionFile.sourceFileSha256;
  if (
    resolutionSourceHash !== bundle.sourceJsonSha256 ||
    resolutionFile.complete !== true ||
    resolutionFile.resolutions?.length !== 90 ||
    (resolutionFile.expectedQuestions !== undefined &&
      resolutionFile.expectedQuestions !== 90) ||
    (resolutionFile.processedQuestions !== undefined &&
      resolutionFile.processedQuestions !== 90) ||
    !resolutionFile.finalResolutionSetHash ||
    (resolutionAudit.sourceByteSha256 ?? resolutionAudit.sourceFileSha256) !==
      bundle.sourceJsonSha256 ||
    resolutionAudit.resolutionSetHash !==
      resolutionFile.finalResolutionSetHash ||
    resolutionAudit.complete !== true ||
    resolutionAudit.canApprove !== true ||
    resolutionAudit.expected !== 90 ||
    resolutionAudit.audited !== 90 ||
    resolutionAudit.passed !== 90 ||
    resolutionAudit.failed !== 0 ||
    resolutionAudit.audits?.length !== 90
  ) {
    issues.push(
      "Resoluções autorais e sua auditoria não comprovam cobertura/vínculo 90/90.",
    );
  }
  const classificationFile = classificationArtifact.value;
  const classificationAudit = classificationAuditArtifact.value;
  if (
    classificationFile.sourceByteSha256 !== bundle.sourceJsonSha256 ||
    classificationFile.complete !== true ||
    classificationFile.expected !== 90 ||
    classificationFile.classified !== 90 ||
    classificationFile.reviewRequired !== 0 ||
    classificationFile.classifications?.length !== 90 ||
    classificationAudit.sourceByteSha256 !== bundle.sourceJsonSha256 ||
    classificationAudit.classificationSourceHash !==
      classificationFile.sourceHash ||
    classificationAudit.complete !== true ||
    classificationAudit.canApprove !== true ||
    classificationAudit.expected !== 90 ||
    classificationAudit.audited !== 90 ||
    classificationAudit.passed !== 90 ||
    classificationAudit.failed !== 0 ||
    classificationAudit.audits?.length !== 90
  ) {
    issues.push(
      "Classificações pedagógicas e sua auditoria não comprovam cobertura 90/90 sem pendências.",
    );
  }
  const resolutionBySource = new Map(
    (resolutionFile.resolutions ?? []).map((resolution) => [
      resolution.sourceId,
      resolution,
    ]),
  );
  const classificationBySource = new Map(
    (classificationFile.classifications ?? []).map((classification) => [
      classification.sourceId,
      classification,
    ]),
  );
  const resolutionAuditBySource = new Map(
    (resolutionAudit.audits ?? []).map((audit) => [audit.sourceId, audit]),
  );
  const classificationAuditBySource = new Map(
    (classificationAudit.audits ?? []).map((audit) => [audit.sourceId, audit]),
  );
  if (
    resolutionBySource.size !== 90 ||
    classificationBySource.size !== 90 ||
    resolutionAuditBySource.size !== 90 ||
    classificationAuditBySource.size !== 90 ||
    [...sourceIds].some(
      (sourceId) =>
        !resolutionBySource.has(sourceId) ||
        !classificationBySource.has(sourceId) ||
        !resolutionAuditBySource.has(sourceId) ||
        !classificationAuditBySource.has(sourceId),
    )
  ) {
    issues.push(
      "Resoluções, classificações e auditorias não possuem vínculo 1:1 com as 90 identidades da fonte.",
    );
  }
  for (const sourceId of sourceIds) {
    const resolution = resolutionBySource.get(sourceId);
    const resolutionRow = resolutionAuditBySource.get(sourceId);
    const classificationRow = classificationAuditBySource.get(sourceId);
    if (
      !resolution ||
      resolutionRow?.verdict !== "PASS" ||
      resolutionRow.resolutionHash !== auditedResolutionHash(resolution) ||
      classificationRow?.verdict !== "PASS"
    ) {
      issues.push(
        `${sourceId}: conteúdo autoral ou classificação não coincide com sua auditoria PASS.`,
      );
    }
  }
  const artifactEvidence = {
    visualAudit: {
      path: visualArtifact.absolute,
      sha256: visualArtifact.sha256,
    },
    appEvidence: { path: appArtifact.absolute, sha256: appArtifact.sha256 },
    resolutions: {
      path: resolutionArtifact.absolute,
      sha256: resolutionArtifact.sha256,
    },
    resolutionAudit: {
      path: resolutionAuditArtifact.absolute,
      sha256: resolutionAuditArtifact.sha256,
    },
    classifications: {
      path: classificationArtifact.absolute,
      sha256: classificationArtifact.sha256,
    },
    classificationAudit: {
      path: classificationAuditArtifact.absolute,
      sha256: classificationAuditArtifact.sha256,
    },
  };
  const job = await db.questionImportJob.findUnique({
    where: { pilotId: PILOT_ID },
    include: { provaAntiga: true },
  });
  if (!job) throw new Error("Piloto ainda não foi importado.");
  const links = await db.provaAntigaQuestao.findMany({
    where: { provaAntigaId: job.provaAntigaId },
    orderBy: { numeroQuestao: "asc" },
    include: {
      questao: {
        include: {
          alternativeItems: { orderBy: { order: "asc" } },
          imageItems: { orderBy: [{ relation: "asc" }, { order: "asc" }] },
          blocks: { orderBy: { order: "asc" }, include: { asset: true } },
          structuredExtraction: true,
          officialAnswerKey: true,
          pedagogicalMetadata: true,
          authorialResolutions: {
            where: { version: 1 },
            take: 1,
          },
          revisions: {
            where: { action: QuestionRevisionAction.APPROVED },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (job.sourceJsonSha256 !== bundle.sourceJsonSha256) {
    issues.push(
      "O manifesto mudou depois da importação; reimporte e revise novamente.",
    );
  }
  if (job.expectedQuestionCount !== 90 || job.importedQuestionCount !== 90) {
    issues.push("Job não registra importação 90/90.");
  }
  if (
    job.approvedQuestionCount !== 90 ||
    job.approvedPedagogicalCount !== 90 ||
    job.approvedResolutionCount !== 90 ||
    (job.status === QuestionImportJobStatus.PUBLISHED
      ? job.publishedResolutionCount !== 90
      : job.publishedResolutionCount !== 0)
  ) {
    issues.push(
      "Job não registra 90 aprovações editoriais, pedagógicas e autorais no estágio esperado.",
    );
  }
  if (!job.requirePedagogicalReview || !job.requireAuthorialResolution) {
    issues.push(
      "Job não mantém obrigatórias a classificação pedagógica e a resolução autoral.",
    );
  }
  if (links.length !== 90)
    issues.push(`Banco contém ${links.length}/90 ligações da prova.`);
  if (
    job.status !== QuestionImportJobStatus.READY_TO_PUBLISH &&
    job.status !== QuestionImportJobStatus.PUBLISHED
  ) {
    issues.push(`Job está em ${job.status}; esperado READY_TO_PUBLISH.`);
  }
  const linkByNumber = new Map(links.map((link) => [link.numeroQuestao, link]));
  for (const source of bundle.questions) {
    const label = `Questão ${source.officialNumber}`;
    const link = linkByNumber.get(source.officialNumber);
    if (!link) {
      issues.push(`${label}: ligação ausente.`);
      continue;
    }
    const question = link.questao;
    const extraction = question.structuredExtraction;
    const answerKey = question.officialAnswerKey;
    const classification = classificationBySource.get(source.id);
    const sourceResolution = resolutionBySource.get(source.id);
    const persistedResolution = question.authorialResolutions[0];
    if (
      question.status === "PUBLISHED" &&
      job.status !== QuestionImportJobStatus.PUBLISHED
    ) {
      issues.push(`${label}: publicada fora do gate controlado.`);
    }
    if (question.reviewState !== QuestionReviewState.APPROVED) {
      issues.push(`${label}: revisão editorial não aprovada.`);
    }
    if (!question.revisions.length) {
      issues.push(`${label}: revisão aprovada sem trilha de auditoria.`);
    } else if (!question.revisions[0]?.notes?.includes(visualArtifact.sha256)) {
      issues.push(
        `${label}: última aprovação não está ligada à auditoria visual atual.`,
      );
    }
    if (link.needsHumanReview)
      issues.push(`${label}: ainda marcada para revisão humana.`);
    if (!extraction || extraction.importJobId !== job.id) {
      issues.push(`${label}: extração estruturada/job ausente.`);
    } else {
      if (extraction.reviewStatus !== QuestionReviewState.APPROVED) {
        issues.push(`${label}: extração ainda não aprovada.`);
      }
      if (
        extraction.officialNumber !== source.officialNumber ||
        extraction.officialOrder !== source.officialOrder ||
        extraction.officialPdfPageStart !==
          source.source.officialPdfPageStart ||
        extraction.officialPdfPageEnd !== source.source.officialPdfPageEnd ||
        extraction.consolidatedPdfPageStart !==
          source.source.consolidatedPdfPageStart ||
        extraction.consolidatedPdfPageEnd !==
          source.source.consolidatedPdfPageEnd ||
        extraction.originalPageUrl !== source.source.originalPageUrl
      ) {
        issues.push(
          `${label}: numeração, ordem ou páginas divergem do manifesto.`,
        );
      }
      if (extraction.sourceContentHash !== source.contentHash) {
        issues.push(`${label}: hash de conteúdo diverge do manifesto.`);
      }
    }
    const concepts = Array.isArray(question.pedagogicalMetadata?.concepts)
      ? question.pedagogicalMetadata.concepts.map(String)
      : [];
    if (
      !classification ||
      classification.officialNumber !== source.officialNumber ||
      classification.language !== extraction?.officialLanguage ||
      !question.pedagogicalMetadata ||
      question.pedagogicalMetadata.importJobId !== job.id ||
      question.pedagogicalMetadata.reviewStatus !==
        QuestionReviewState.APPROVED ||
      question.pedagogicalMetadata.knowledgeArea !==
        classification.knowledgeArea ||
      question.pedagogicalMetadata.disciplinaryComponent !==
        classification.disciplinaryComponent ||
      question.pedagogicalMetadata.competencyCode !==
        classification.competencyCode ||
      question.pedagogicalMetadata.abilityCode !== classification.abilityCode ||
      question.pedagogicalMetadata.cognitiveDemand !==
        classification.difficulty ||
      question.pedagogicalMetadata.estimatedMinutes !==
        classification.estimatedMinutes ||
      concepts[0] !== classification.content ||
      concepts[1] !== classification.subcontent ||
      !question.pedagogicalMetadata.reviewedBy ||
      !question.pedagogicalMetadata.reviewedAt
    ) {
      issues.push(
        `${label}: classificação pedagógica aprovada diverge do artefato auditado.`,
      );
    }
    const expectedResolutionStatus =
      job.status === QuestionImportJobStatus.PUBLISHED
        ? OfficialResolutionStatus.PUBLISHED
        : OfficialResolutionStatus.APPROVED;
    if (
      !sourceResolution ||
      sourceResolution.officialNumber !== source.officialNumber ||
      sourceResolution.language !== extraction?.officialLanguage ||
      !persistedResolution ||
      persistedResolution.importJobId !== job.id ||
      persistedResolution.answerKeyId !== answerKey?.id ||
      persistedResolution.status !== expectedResolutionStatus ||
      persistedResolution.reviewStatus !== QuestionReviewState.APPROVED ||
      persistedResolution.contentHash !==
        sha256(JSON.stringify(sourceResolution)) ||
      persistedResolution.shortComment !== sourceResolution.shortComment ||
      persistedResolution.fullResolution !== sourceResolution.fullResolution ||
      JSON.stringify(persistedResolution.reasoningPath) !==
        JSON.stringify(sourceResolution.reasoningPath) ||
      JSON.stringify(persistedResolution.steps) !==
        JSON.stringify(sourceResolution.steps) ||
      JSON.stringify(persistedResolution.alternativeComments) !==
        JSON.stringify(sourceResolution.alternativeComments) ||
      persistedResolution.commonError !== sourceResolution.commonError ||
      persistedResolution.studyTip !== sourceResolution.studyTip ||
      JSON.stringify(persistedResolution.keywords) !==
        JSON.stringify(sourceResolution.keywords) ||
      JSON.stringify(persistedResolution.relatedContent) !==
        JSON.stringify(sourceResolution.relatedContent) ||
      !persistedResolution.reviewedBy ||
      !persistedResolution.reviewedAt ||
      sourceResolution.shortComment.trim().length < 40 ||
      sourceResolution.fullResolution.trim().length < 180 ||
      sourceResolution.commonError.trim().length < 30 ||
      sourceResolution.studyTip.trim().length < 30 ||
      ["A", "B", "C", "D", "E"].some(
        (letter) =>
          sourceResolution.alternativeComments?.[letter]?.trim().length < 25,
      )
    ) {
      issues.push(
        `${label}: resolução autoral aprovada diverge do artefato auditado ou está incompleta.`,
      );
    }
    if (question.statement.trim() !== source.command.trim())
      issues.push(`${label}: comando divergente.`);
    if (
      question.sourceUrl !== source.source.originalPageUrl ||
      !question.sourceCitation?.includes(source.source.sourcePageUrl)
    ) {
      issues.push(
        `${label}: link direto à página original ou citação institucional ausente.`,
      );
    }
    if (
      (question.supportText ?? "").trim() !== (source.supportText ?? "").trim()
    ) {
      issues.push(`${label}: texto de apoio divergente.`);
    }
    if (question.alternativeItems.length !== 5)
      issues.push(`${label}: não possui cinco alternativas.`);
    source.alternatives.forEach((alternative, index) => {
      const persisted = question.alternativeItems[index];
      if (
        !persisted ||
        persisted.key !== alternative.key ||
        persisted.order !== alternative.order ||
        persisted.text !== alternative.text ||
        persisted.imageUrl !== alternative.imageUrl ||
        persisted.sourcePdfPage !== alternative.sourcePdfPage ||
        persisted.consolidatedPdfPage !== alternative.consolidatedPdfPage ||
        !sameRegion(persisted, alternative.sourceRegion) ||
        !sameNumber(persisted.confidence, alternative.confidence)
      ) {
        issues.push(
          `${label}: alternativa ${alternative.key} diverge do manifesto.`,
        );
      }
    });
    const promptFacsimiles = source.assets.filter(
      (asset) => asset.type === "prompt_facsimile",
    );
    const imageBlocks = question.blocks.filter(
      (block) => block.type === "IMAGE",
    );
    if (
      question.blocks.length !==
      source.blocks.length + promptFacsimiles.length
    ) {
      issues.push(`${label}: quantidade de blocos divergente.`);
    }
    if (question.blocks.some((block, index) => block.order !== index)) {
      issues.push(`${label}: ordem combinada dos blocos não é contínua.`);
    }
    source.blocks.forEach((block, index) => {
      const persisted = question.blocks[index];
      const expectedType =
        block.type === "image"
          ? "IMAGE"
          : block.type === "command"
            ? "COMMAND"
            : block.type === "credit"
              ? "CREDIT"
              : "SUPPORT_TEXT";
      if (
        !persisted ||
        persisted.type !== expectedType ||
        persisted.content !== block.content ||
        persisted.sourcePdfPage !== block.sourcePdfPage ||
        persisted.consolidatedPdfPage !== block.consolidatedPdfPage ||
        !sameRegion(persisted, block.sourceRegion) ||
        !sameNumber(persisted.confidence, block.confidence) ||
        (block.type === "image" &&
          persisted.asset?.sha256Hash !== block.assetSha256)
      ) {
        issues.push(`${label}: bloco ${index} diverge do manifesto.`);
      }
    });
    const imageBlocksByHash = new Map(
      imageBlocks.map((block) => [block.asset?.sha256Hash, block]),
    );
    for (const facsimile of promptFacsimiles) {
      const imageBlock = imageBlocksByHash.get(facsimile.sha256);
      if (
        !imageBlock ||
        imageBlock.asset?.assetType !== "PROMPT_FACSIMILE" ||
        imageBlock.assetId !== imageBlock.asset?.id ||
        imageBlock.sourcePdfPage !== facsimile.sourcePdfPage ||
        imageBlock.consolidatedPdfPage !== facsimile.consolidatedPdfPage ||
        !sameRegion(imageBlock, facsimile.sourceRegion)
      ) {
        issues.push(
          `${label}: PROMPT_FACSIMILE sem bloco IMAGE ordenado/relacionado.`,
        );
      }
    }
    const expectedAssets = [...source.assets, ...source.originalCrops];
    if (question.imageItems.length !== expectedAssets.length) {
      issues.push(`${label}: quantidade de mídias/recortes divergente.`);
    }
    const persistedByHash = new Map(
      question.imageItems.map((image) => [image.sha256Hash, image]),
    );
    for (const asset of expectedAssets) {
      const persisted = persistedByHash.get(asset.sha256);
      if (
        !persisted ||
        persisted.url !== asset.url ||
        persisted.storagePath !== asset.storagePath ||
        persisted.assetType !== expectedAssetType(asset.type) ||
        persisted.relation !== expectedAssetRelation(asset.relation) ||
        persisted.width !== asset.width ||
        persisted.height !== asset.height ||
        persisted.order !== asset.order ||
        persisted.alternativeKey !== (asset.alternativeKey ?? null) ||
        persisted.sourcePdfPage !== asset.sourcePdfPage ||
        persisted.consolidatedPdfPage !== asset.consolidatedPdfPage ||
        !sameRegion(persisted, asset.sourceRegion)
      ) {
        issues.push(
          `${label}: mídia ${asset.storagePath} diverge do manifesto.`,
        );
      }
    }
    if (
      !question.imageItems.some((image) => image.relation === "ADMIN_REFERENCE")
    ) {
      issues.push(
        `${label}: página/recorte original não está acessível ao administrador.`,
      );
    }
    if (!answerKey) {
      issues.push(`${label}: OfficialAnswerKey não relacionado.`);
      continue;
    }
    if (answerKey.answerReviewStatus !== OfficialAnswerReviewStatus.APPROVED) {
      issues.push(`${label}: gabarito ainda não aprovado.`);
    }
    if (answerKey.resolutionStatus !== expectedResolutionStatus) {
      issues.push(
        `${label}: gabarito oficial não está ligado à resolução autoral no estágio esperado.`,
      );
    }
    if (!answerKey.answerReviewedBy || !answerKey.answerReviewedAt) {
      issues.push(`${label}: aprovação do gabarito sem responsável/data.`);
    }
    if (
      answerKey.questionId !== question.id ||
      extraction?.answerKeyId !== answerKey.id ||
      answerKey.sourceSha256 !== source.officialAnswerKey!.sourceSha256 ||
      answerKey.sourceUrl !== source.officialAnswerKey!.sourceUrl ||
      answerKey.validationStatus !== "validated_against_official_pdf"
    ) {
      issues.push(`${label}: proveniência do gabarito oficial divergente.`);
    }
    if (source.officialNumber === 175) {
      if (
        question.answerSituation !== QuestionAnswerSituation.ANNULLED ||
        answerKey.answerSituation !== QuestionAnswerSituation.ANNULLED ||
        question.correctAlternative !== "ANULADA" ||
        answerKey.correctAlternative !== "ANULADA" ||
        question.alternativeItems.some((alternative) => alternative.correct)
      ) {
        issues.push(
          "Questão 175: anulação oficial não está representada corretamente.",
        );
      }
    } else {
      const correct = question.alternativeItems.filter(
        (alternative) => alternative.correct,
      );
      if (
        question.answerSituation !== QuestionAnswerSituation.CONFIRMED ||
        answerKey.answerSituation !== QuestionAnswerSituation.CONFIRMED ||
        question.correctAlternative !== source.answer ||
        answerKey.correctAlternative !== source.answer ||
        correct.length !== 1 ||
        correct[0]?.key !== source.answer
      ) {
        issues.push(`${label}: correção não corresponde ao gabarito oficial.`);
      }
    }
  }

  const uniqueIssues = [...new Set(issues)];
  const gate = {
    pilotId: PILOT_ID,
    confirmed,
    ready: uniqueIssues.length === 0,
    imported: links.length,
    approved: links.filter(
      (link) =>
        link.questao.reviewState === QuestionReviewState.APPROVED &&
        link.questao.structuredExtraction?.reviewStatus ===
          QuestionReviewState.APPROVED &&
        !link.needsHumanReview,
    ).length,
    published: links.filter((link) => link.questao.status === "PUBLISHED")
      .length,
    artifacts: artifactEvidence,
    issues: uniqueIssues,
  };
  console.log(JSON.stringify(gate, null, 2));
  if (uniqueIssues.length)
    throw new Error(
      `Publicação bloqueada por ${uniqueIssues.length} pendência(s).`,
    );
  if (job.status === QuestionImportJobStatus.PUBLISHED) {
    const marker = await writePilotValidationMarker({
      structuredPath: bundle.structuredPath,
      sourceJsonSha256: bundle.sourceJsonSha256,
      jobId: job.id,
      publishedAt: job.publishedAt,
      artifacts: artifactEvidence,
    });
    console.log(
      JSON.stringify(
        {
          message: "Piloto já publicado; gate 90/90 revalidado.",
          ...marker,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!confirmed) {
    console.log(
      "Gate 90/90 aprovado. Use --confirm-publish para publicar o piloto.",
    );
    return;
  }

  const backup = await writePilotSnapshot(db, "backup");
  const publishedAt = new Date();
  const publicationNotes = `Publicação controlada 90/90 em ${publishedAt.toISOString()}; artefatos ${JSON.stringify(
    Object.fromEntries(
      Object.entries(artifactEvidence).map(([key, value]) => [
        key,
        value.sha256,
      ]),
    ),
  )}.`;
  await db.$transaction(
    async (transaction) => {
      for (const link of links) {
        const sourceId = link.questao.structuredExtraction?.sourceId;
        const sourceResolution = sourceId
          ? resolutionBySource.get(sourceId)
          : undefined;
        if (!sourceResolution) {
          throw new Error(
            `Questão ${link.numeroQuestao}: resolução autoral não localizada na publicação.`,
          );
        }
        await transaction.question.update({
          where: { id: link.questaoId },
          data: {
            status: "PUBLISHED",
            difficulty: sourceResolution.difficulty,
            explanation: sourceResolution.fullResolution,
            pedagogyComment: sourceResolution.shortComment,
            alternativeExplanations: JSON.stringify(
              sourceResolution.alternativeComments,
            ),
            pilotTestPublishedAt: publishedAt,
            pilotTestPublishedBy: actor,
          },
        });
        for (const letter of ["A", "B", "C", "D", "E"]) {
          await transaction.questionAlternative.updateMany({
            where: { questionId: link.questaoId, key: letter },
            data: { explanation: sourceResolution.alternativeComments[letter] },
          });
        }
        await transaction.questionAuthorialResolution.updateMany({
          where: {
            questionId: link.questaoId,
            importJobId: job.id,
            version: 1,
          },
          data: {
            status: OfficialResolutionStatus.PUBLISHED,
            publishedAt,
          },
        });
        await transaction.officialAnswerKey.updateMany({
          where: { questionId: link.questaoId },
          data: {
            resolutionStatus: OfficialResolutionStatus.PUBLISHED,
            publishedAt,
          },
        });
        await transaction.questionRevision.upsert({
          where: {
            dedupeKey: `${PILOT_ID}:${link.numeroQuestao}:PUBLISHED:${bundle.sourceJsonSha256}`,
          },
          update: { actor, notes: publicationNotes },
          create: {
            questionId: link.questaoId,
            importJobId: job.id,
            action: QuestionRevisionAction.PUBLISHED,
            actor,
            notes: publicationNotes,
            beforeSnapshot: jsonValue({ status: link.questao.status }),
            afterSnapshot: jsonValue({
              status: "PUBLISHED",
              publishedAt: publishedAt.toISOString(),
            }),
            dedupeKey: `${PILOT_ID}:${link.numeroQuestao}:PUBLISHED:${bundle.sourceJsonSha256}`,
          },
        });
      }
      await transaction.provaAntiga.update({
        where: { id: job.provaAntigaId },
        data: {
          status: "DISPONIVEL",
          importacaoStatus: "PUBLICADO",
          importacaoRelatorio: JSON.stringify({
            ...bundle.report,
            publicationGate: "90/90",
            artifacts: artifactEvidence,
          }),
          pilotTestPreviousStatus: job.provaAntiga.status,
          pilotTestAvailableAt: publishedAt,
          questoesDetectadas: 90,
          questoesValidas: 90,
          questoesComErro: 0,
        },
      });
      await transaction.questionImportJob.update({
        where: { id: job.id },
        data: {
          status: QuestionImportJobStatus.PUBLISHED,
          importedQuestionCount: 90,
          approvedQuestionCount: 90,
          publishedQuestionCount: 90,
          approvedPedagogicalCount: 90,
          approvedResolutionCount: 90,
          publishedResolutionCount: 90,
          validationReport: jsonValue({
            ...bundle.report,
            publicationGate: {
              passed: true,
              checkedAt: publishedAt.toISOString(),
              actor,
              artifacts: artifactEvidence,
            },
          }),
          checkpoint: jsonValue({
            stage: "published_90_of_90",
            backup,
            artifacts: artifactEvidence,
            publishedAt: publishedAt.toISOString(),
          }),
          publishedAt,
        },
      });
      await transaction.officialFile.update({
        where: { id: job.examFileId },
        data: { processingStatus: OfficialProcessingStatus.PUBLISHED },
      });
      await transaction.officialFile.update({
        where: { id: job.answerKeyFileId },
        data: { processingStatus: OfficialProcessingStatus.PUBLISHED },
      });
      await transaction.officialImportLog.create({
        data: {
          fileId: job.examFileId,
          action: "enem_2022_day2_publish",
          status: "SUCCESS",
          message: `Piloto ENEM 2022/2 CD5 Amarelo publicado 90/90 por ${actor}.`,
          metadata: JSON.stringify({
            jobId: job.id,
            backup,
            sourceJsonSha256: bundle.sourceJsonSha256,
            artifacts: artifactEvidence,
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
    publishedJob,
  ] = await Promise.all([
    db.question.count({
      where: {
        id: { in: links.map((link) => link.questaoId) },
        status: "PUBLISHED",
      },
    }),
    db.questionAuthorialResolution.count({
      where: {
        importJobId: job.id,
        version: 1,
        status: OfficialResolutionStatus.PUBLISHED,
        reviewStatus: QuestionReviewState.APPROVED,
      },
    }),
    db.officialAnswerKey.count({
      where: {
        questionId: { in: links.map((link) => link.questaoId) },
        resolutionStatus: OfficialResolutionStatus.PUBLISHED,
      },
    }),
    db.questionAlternative.count({
      where: {
        questionId: { in: links.map((link) => link.questaoId) },
        explanation: { not: null },
      },
    }),
    db.questionImportJob.findUnique({ where: { id: job.id } }),
  ]);
  if (
    publishedQuestions !== 90 ||
    publishedResolutions !== 90 ||
    publishedResolutionKeys !== 90 ||
    explainedAlternatives !== 450 ||
    publishedJob?.publishedQuestionCount !== 90 ||
    publishedJob.publishedResolutionCount !== 90
  ) {
    throw new Error(
      "Verificação pós-publicação falhou para questões, resoluções, gabaritos ou alternativas.",
    );
  }
  const marker = await writePilotValidationMarker({
    structuredPath: bundle.structuredPath,
    sourceJsonSha256: bundle.sourceJsonSha256,
    jobId: job.id,
    publishedAt,
    artifacts: artifactEvidence,
  });
  console.log(
    JSON.stringify(
      {
        published: publishedQuestions,
        publishedResolutions,
        publishedResolutionKeys,
        explainedAlternatives,
        jobStatus: publishedJob.status,
        publishedAt: publishedAt.toISOString(),
        backup,
        ...marker,
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
