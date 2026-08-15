import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { OfficialQuestionLanguage } from "@prisma/client";

export const CORPUS_LETTERS = ["A", "B", "C", "D", "E"] as const;

export type CorpusRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  normalized: { x: number; y: number; width: number; height: number };
};

export type CorpusAsset = {
  artifactPath: string;
  url?: string | null;
  storagePath?: string | null;
  type: string;
  relation: string;
  alternativeKey?: string | null;
  order: number;
  altText: string;
  width: number;
  height: number;
  sha256: string;
  sourcePdfPage: number;
  sourceRegion: CorpusRegion;
};

export type CorpusAlternative = {
  key: string;
  order: number;
  text: string;
  textSha256?: string;
  imageArtifacts: CorpusAsset[];
  marker: { sourcePdfPage: number; sourceRegion: CorpusRegion };
  sourceRegions: Array<{
    sourcePdfPage: number;
    zoneIndex: number;
    sourceRegion: CorpusRegion;
  }>;
  confidence: number;
  reviewStatus: string;
};

export type CorpusBlock = {
  type: string;
  content: string;
  altText?: string;
  assetSha256?: string;
  artifactPath?: string;
  sourcePdfPage: number;
  sourceRegion: CorpusRegion;
  confidence: number;
  order: number;
};

export type CorpusQuestion = {
  schemaVersion: number;
  extractorId: string;
  id: string;
  corpusId: string;
  oldExamId: string;
  vestibular: string;
  year: number;
  day: number;
  application: string;
  applicationLabel?: string;
  modality: string;
  bookletNumber: number;
  bookletColor: string;
  officialNumber: number;
  officialOrder: number;
  printedOccurrenceOrder: number;
  language: string;
  languageOccurrence?: number;
  variantGroupId?: string | null;
  area: string;
  subject?: string | null;
  content?: string | null;
  subcontent?: string | null;
  competency?: string | null;
  ability?: string | null;
  difficulty?: string | null;
  estimatedTimeSeconds?: number | null;
  supportText?: string | null;
  command: string;
  statement: string;
  credits: string[];
  blocks: CorpusBlock[];
  alternatives: CorpusAlternative[];
  answer: string;
  answerSituation: string;
  officialAnswerKey: {
    questionNumber: number;
    language: string;
    correctAlternative: string;
    situation: string;
    validationStatus: string;
    sourcePdfPage: number;
    sourceUrl: string;
    sourcePageUrl?: string;
    sourcePath: string;
    sourceSha256: string;
    importedAt?: string;
    occurrenceId: string;
  };
  source: {
    institution: string;
    sourcePageUrl: string;
    officialExamUrl: string;
    officialExamPath: string;
    officialExamSha256: string;
    officialPdfPageStart: number;
    officialPdfPageEnd: number;
    officialPdfPages: number[];
    originalPageUrl: string;
    sourceRegionHash?: string;
    accessedAt?: string;
  };
  assets: CorpusAsset[];
  originalCrops: CorpusAsset[];
  flags: Record<string, unknown>;
  confidence: {
    text: number;
    alternatives: number;
    images: number;
    answer: number;
    classification: number;
    overall: number;
  };
  extractionStatus: string;
  reviewStatus: string;
  publicationStatus: string;
  publicationBlockers: string[];
  contentHash: string;
  deduplicationHash?: string;
  extraction?: Record<string, unknown>;
  isAnnulled?: boolean;
};

export type CorpusEssay = {
  schemaVersion: number;
  id: string;
  corpusId: string;
  year: number;
  day: number;
  bookletNumber: number;
  bookletColor: string;
  theme: string;
  themeConfidence: number;
  proposalText: string;
  instructions: string;
  rawText: string;
  pages: Array<{
    sourcePdfPage: number;
    text: string;
    blocks: unknown[];
    facsimile?: CorpusAsset;
    visualAssets?: CorpusAsset[];
  }>;
  visualAssets: CorpusAsset[];
  source: {
    institution: string;
    sourcePageUrl: string;
    officialExamUrl: string;
    officialExamPath: string;
    officialExamSha256: string;
    sourcePdfPages: number[];
  };
  reviewStatus: string;
  publicationStatus: string;
  publicationBlockers: string[];
  contentHash: string;
};

type CorpusProvenance = {
  schemaVersion: number;
  extractorId: string;
  corpusId: string;
  officialExam: {
    path: string;
    url: string;
    sourcePageUrl: string;
    sha256: string;
    sizeBytes: number;
    pageCount: number;
    identityChecks: Record<string, boolean>;
  };
  officialAnswerKey: {
    path: string;
    url: string;
    sha256: string;
    sizeBytes: number;
  };
  configuration: { path: string; sha256: string };
  detection: {
    logicalQuestions: number;
    printedOccurrences: number;
    languages: Record<string, number>;
  };
  failures: unknown[];
};

type CorpusAnswerKey = {
  schemaVersion: number;
  corpusId: string;
  year: number;
  day: number;
  application: string;
  modality: string;
  bookletNumber: number;
  bookletColor: string;
  source: {
    officialUrl: string;
    path: string;
    sha256: string;
    sizeBytes: number;
  };
  summary: {
    logicalQuestionNumbers: number;
    answerAssignments: number;
    byLanguage: Record<string, number>;
    annulled: number[];
  };
  answers: Array<{
    questionNumber: number;
    language: string;
    correctAlternative: string;
    situation: string;
    validationStatus: string;
    sourcePdfPage: number;
    occurrenceId: string;
  }>;
};

type CorpusValidation = {
  schemaVersion: number;
  corpusId: string;
  status: string;
  checks: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  knownGaps: unknown[];
  publicationGate: {
    structuralValidationPassed: boolean;
    readyForHumanReview: boolean;
    importExecuted: boolean;
    publicationAuthorized: boolean;
    canPublish: boolean;
    blockers: string[];
  };
};

type CorpusCheckpoint = {
  schemaVersion: number;
  corpusId: string;
  stage: string;
  sourceHashes: {
    officialExamSha256: string;
    officialAnswerKeySha256: string;
  };
  expectedLogicalQuestions: number;
  expectedPrintedOccurrences: number;
  completedOccurrences: string[];
  failedOccurrences: unknown[];
  validationErrors?: number;
};

export type CorpusBundle = {
  directory: string;
  questionsPath: string;
  provenancePath: string;
  answerKeyPath: string;
  validationPath: string;
  checkpointPath: string;
  essayPath: string | null;
  questions: CorpusQuestion[];
  provenance: CorpusProvenance;
  answerKey: CorpusAnswerKey;
  validation: CorpusValidation;
  checkpoint: CorpusCheckpoint;
  essay: CorpusEssay | null;
  sourceJsonSha256: string;
  report: CorpusBundleReport;
};

export type CorpusBundleReport = {
  valid: boolean;
  corpusId: string | null;
  logicalQuestions: number;
  printedOccurrences: number;
  alternatives: number;
  answerAssignments: number;
  assetReferences: number;
  essayExtracted: boolean;
  errors: string[];
  warnings: string[];
};

export type TraceableEvidenceItem = {
  path: string;
  sha256: string;
  kind: string;
  note?: string;
};

export const QUESTION_REVIEW_CHECKS = [
  "statementComplete",
  "elementOrderCorrect",
  "alternativesComplete",
  "imagesLegible",
  "officialAnswerConfirmed",
  "numberYearDayCorrect",
  "originalPageAccessible",
  "noMixedContent",
] as const;

export type QuestionReviewEvidence = {
  sourceId: string;
  officialNumber: number;
  language: string;
  reviewedAt: string;
  reviewer: string;
  checks: Record<(typeof QUESTION_REVIEW_CHECKS)[number], boolean>;
  evidence: TraceableEvidenceItem[];
  notes: string;
};

export type CorpusReviewEvidence = {
  schemaVersion: number;
  corpusId: string;
  complete: boolean;
  generatedAt: string;
  questions: QuestionReviewEvidence[];
  essay?: {
    reviewedAt: string;
    reviewer: string;
    checks: {
      themeComplete: boolean;
      promptComplete: boolean;
      instructionsComplete: boolean;
      imagesLegible: boolean;
      originalPageAccessible: boolean;
      noMixedContent: boolean;
    };
    evidence: TraceableEvidenceItem[];
    notes: string;
  } | null;
};

export const APP_EVIDENCE_CHECKS = [
  "answerFlow",
  "correction",
  "mobile",
  "adminOriginalPage",
  "answerKeyNotLeaked",
  "languageSelection",
] as const;

export type CorpusAppEvidence = {
  schemaVersion: number;
  corpusId: string;
  complete: boolean;
  testedAt: string;
  tester: string;
  baseUrl: string;
  testedSourceIds: string[];
  checks: Record<(typeof APP_EVIDENCE_CHECKS)[number], boolean>;
  evidence: TraceableEvidenceItem[];
  notes: string;
};

export type CorpusVisualAudit = {
  schemaVersion: number;
  sourceByteSha256?: string;
  sourceHash: string;
  expected: number;
  audited: number;
  passed: number;
  failed: number;
  complete: boolean;
  canApprove: boolean;
  audits: Array<{
    sourceId: string;
    officialNumber: number;
    language: string;
    verdict: "PASS" | "FAIL";
    statementFidelity: "PASS" | "FAIL";
    elementOrder: "PASS" | "FAIL";
    alternativeFidelity: "PASS" | "FAIL";
    imageLegibility: "PASS" | "FAIL";
    questionIsolation: "PASS" | "FAIL";
    inspectedFiles: string[];
    issueCodes: string[];
    evidence: string;
    recommendedAction: string;
  }>;
};

export function sha256Text(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export async function sha256File(filePath: string) {
  return sha256Text(await readFile(filePath));
}

export function repoPath(value: string) {
  const root = path.resolve(process.cwd());
  const resolved = path.resolve(root, value);
  const prefix = `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    throw new Error(`Caminho fora do repositório: ${value}`);
  }
  return resolved;
}

export function relativeToRepo(value: string) {
  return path.relative(process.cwd(), value).replaceAll("\\", "/");
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export function corpusLanguage(value: string): OfficialQuestionLanguage {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (["ingles", "english", "en"].includes(normalized)) {
    return OfficialQuestionLanguage.ENGLISH;
  }
  if (["espanhol", "spanish", "es"].includes(normalized)) {
    return OfficialQuestionLanguage.SPANISH;
  }
  if (["portugues", "portuguese", "comum", "common", "not_applicable"].includes(normalized)) {
    return OfficialQuestionLanguage.NOT_APPLICABLE;
  }
  throw new Error(`Idioma oficial desconhecido: ${value}`);
}

export function identityOf(question: Pick<CorpusQuestion, "officialNumber" | "language">) {
  return `${question.officialNumber}:${corpusLanguage(question.language)}`;
}

function validRegion(region: CorpusRegion | undefined) {
  if (!region) return false;
  const values = [
    region.x,
    region.y,
    region.width,
    region.height,
    region.normalized?.x,
    region.normalized?.y,
    region.normalized?.width,
    region.normalized?.height,
  ];
  return (
    values.every((value) => Number.isFinite(value)) &&
    region.width > 0 &&
    region.height > 0 &&
    region.normalized.width > 0 &&
    region.normalized.height > 0 &&
    region.normalized.x >= 0 &&
    region.normalized.y >= 0 &&
    region.normalized.x + region.normalized.width <= 1.000_01 &&
    region.normalized.y + region.normalized.height <= 1.000_01
  );
}

export function assetsOf(question: CorpusQuestion) {
  const alternativeAssets = question.alternatives.flatMap((alternative) =>
    (alternative.imageArtifacts ?? []).map((asset) => ({
      ...asset,
      relation: "alternative",
      alternativeKey: asset.alternativeKey ?? alternative.key,
    })),
  );
  return [...(question.assets ?? []), ...(question.originalCrops ?? []), ...alternativeAssets];
}

function stableQuestionPayload(question: CorpusQuestion) {
  const payload = structuredClone(question) as CorpusQuestion;
  if (payload.source) delete payload.source.accessedAt;
  if (payload.officialAnswerKey) delete payload.officialAnswerKey.importedAt;
  if (payload.extraction) delete payload.extraction.generatedAt;
  return payload;
}

export function stableQuestionHash(question: CorpusQuestion) {
  return sha256Text(JSON.stringify(stableQuestionPayload(question)));
}

async function validateAsset(asset: CorpusAsset, label: string, errors: string[]) {
  if (!asset.artifactPath?.trim()) {
    errors.push(`${label}: artifactPath ausente.`);
    return;
  }
  if (!/^[a-f0-9]{64}$/i.test(asset.sha256 ?? "")) errors.push(`${label}: SHA-256 inválido.`);
  if (!Number.isInteger(asset.width) || asset.width <= 0 || !Number.isInteger(asset.height) || asset.height <= 0) {
    errors.push(`${label}: dimensões inválidas.`);
  }
  if (!Number.isInteger(asset.sourcePdfPage) || asset.sourcePdfPage < 1 || !validRegion(asset.sourceRegion)) {
    errors.push(`${label}: página ou região inválida.`);
  }
  try {
    const artifactPath = repoPath(asset.artifactPath);
    const artifactStat = await stat(artifactPath);
    if (!artifactStat.isFile()) errors.push(`${label}: artefato não é arquivo.`);
    else if ((await sha256File(artifactPath)) !== asset.sha256) errors.push(`${label}: hash físico diverge.`);
  } catch (error) {
    errors.push(`${label}: artefato inacessível (${error instanceof Error ? error.message : "erro"}).`);
  }
}

function validateQuestionShape(question: CorpusQuestion, answer: CorpusAnswerKey["answers"][number] | undefined) {
  const issues: string[] = [];
  const label = question.id || `questão ${question.officialNumber}`;
  if (!question.id?.trim() || !question.corpusId?.trim()) issues.push(`${label}: identidade ausente.`);
  if (!Number.isInteger(question.officialNumber) || question.officialNumber < 1 || question.officialNumber > 180) {
    issues.push(`${label}: número oficial inválido.`);
  }
  if (!Number.isInteger(question.officialOrder) || question.officialOrder < 1) issues.push(`${label}: ordem oficial inválida.`);
  try {
    corpusLanguage(question.language);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : `${label}: idioma inválido.`);
  }
  if (!question.command?.trim()) issues.push(`${label}: comando vazio.`);
  if (!question.statement?.trim()) issues.push(`${label}: enunciado vazio.`);
  if (!Array.isArray(question.blocks) || !question.blocks.length) issues.push(`${label}: blocos estruturados ausentes.`);
  question.blocks?.forEach((block, index) => {
    if (block.order !== index) issues.push(`${label}: bloco ${index} fora de ordem.`);
    if (!block.content?.trim()) issues.push(`${label}: bloco ${index} vazio.`);
    if (!Number.isInteger(block.sourcePdfPage) || !validRegion(block.sourceRegion)) {
      issues.push(`${label}: bloco ${index} sem coordenadas válidas.`);
    }
    if (block.type === "image") {
      const asset = question.assets?.find(
        (item) =>
          item.sha256 === block.assetSha256 &&
          (!block.artifactPath || item.artifactPath === block.artifactPath),
      );
      if (!block.assetSha256 || !/^[a-f0-9]{64}$/i.test(block.assetSha256) || !asset) {
        issues.push(`${label}: bloco visual ${index} não referencia um asset da questão.`);
      } else if (
        asset.relation !== "statement" ||
        asset.type.toLowerCase().includes("facsimile") ||
        asset.type.toLowerCase().includes("original")
      ) {
        issues.push(`${label}: bloco visual ${index} aponta para fac-símile/recorte em vez de visual estudantil.`);
      }
    }
  });
  const studentVisualHashes = new Set(
    (question.assets ?? [])
      .filter(
        (asset) =>
          asset.relation === "statement" &&
          !asset.type.toLowerCase().includes("facsimile") &&
          !asset.type.toLowerCase().includes("original"),
      )
      .map((asset) => asset.sha256),
  );
  const linkedVisualHashes = new Set(
    (question.blocks ?? [])
      .filter((block) => block.type === "image" && block.assetSha256)
      .map((block) => block.assetSha256!),
  );
  for (const assetHash of studentVisualHashes) {
    if (!linkedVisualHashes.has(assetHash)) issues.push(`${label}: visual estudantil ${assetHash} não está na ordem dos blocos.`);
  }
  if (!Array.isArray(question.alternatives) || question.alternatives.length !== 5) {
    issues.push(`${label}: não possui exatamente cinco alternativas.`);
  } else {
    question.alternatives.forEach((alternative, index) => {
      const expectedKey = CORPUS_LETTERS[index];
      if (alternative.key !== expectedKey || alternative.order !== index) {
        issues.push(`${label}: alternativa ${expectedKey} ausente ou fora de ordem.`);
      }
      if (!alternative.text?.trim() && !(alternative.imageArtifacts?.length > 0)) {
        issues.push(`${label}: alternativa ${expectedKey} sem texto nem imagem.`);
      }
      const region = alternative.sourceRegions?.[0]?.sourceRegion ?? alternative.marker?.sourceRegion;
      if (!validRegion(region)) issues.push(`${label}: alternativa ${expectedKey} sem região válida.`);
    });
  }
  const compatibleAnswer = question.answerSituation === "annulled" ? "ANULADA" : question.answer;
  if (!/^(?:[A-E]|ANULADA)$/.test(compatibleAnswer ?? "")) issues.push(`${label}: resposta inválida.`);
  if (!answer) issues.push(`${label}: atribuição no gabarito oficial ausente.`);
  else if (
    answer.questionNumber !== question.officialNumber ||
    answer.correctAlternative !== compatibleAnswer ||
    answer.situation !== question.answerSituation ||
    answer.occurrenceId !== question.id
  ) {
    issues.push(`${label}: vínculo com o gabarito oficial diverge.`);
  }
  if (
    question.officialAnswerKey?.questionNumber !== question.officialNumber ||
    question.officialAnswerKey?.correctAlternative !== compatibleAnswer ||
    !/^[a-f0-9]{64}$/i.test(question.officialAnswerKey?.sourceSha256 ?? "") ||
    !question.officialAnswerKey?.sourceUrl?.startsWith("https://")
  ) {
    issues.push(`${label}: metadados do gabarito oficial inválidos.`);
  }
  if (!question.source?.originalPageUrl?.startsWith("https://")) issues.push(`${label}: página oficial original ausente.`);
  if (!/^[a-f0-9]{64}$/i.test(question.contentHash ?? "")) issues.push(`${label}: contentHash inválido.`);
  if (!question.originalCrops?.length) issues.push(`${label}: recorte original administrativo ausente.`);
  return issues;
}

async function validateOfficialFile(
  sourcePath: string,
  expectedHash: string,
  expectedSize: number,
  label: string,
  errors: string[],
) {
  try {
    const filePath = repoPath(sourcePath);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) errors.push(`${label}: caminho não é arquivo.`);
    if (fileStat.size !== expectedSize) errors.push(`${label}: tamanho diverge da proveniência.`);
    if ((await sha256File(filePath)) !== expectedHash) errors.push(`${label}: hash diverge da proveniência.`);
  } catch (error) {
    errors.push(`${label}: arquivo inacessível (${error instanceof Error ? error.message : "erro"}).`);
  }
}

export async function readCorpusBundle(directoryInput: string): Promise<CorpusBundle> {
  const directory = repoPath(directoryInput);
  const questionsPath = path.join(directory, "questoes-estruturadas.json");
  const provenancePath = path.join(directory, "proveniencia.json");
  const answerKeyPath = path.join(directory, "gabarito-oficial.json");
  const validationPath = path.join(directory, "relatorio-validacao.json");
  const checkpointPath = path.join(directory, "checkpoint.json");
  const possibleEssayPath = path.join(directory, "redacao.json");
  const [questionsRaw, provenance, answerKey, validation, checkpoint] = await Promise.all([
    readFile(questionsPath, "utf8"),
    readJson<CorpusProvenance>(provenancePath),
    readJson<CorpusAnswerKey>(answerKeyPath),
    readJson<CorpusValidation>(validationPath),
    readJson<CorpusCheckpoint>(checkpointPath),
  ]);
  const questions = JSON.parse(questionsRaw) as CorpusQuestion[];
  let essay: CorpusEssay | null = null;
  try {
    await access(possibleEssayPath);
    essay = await readJson<CorpusEssay>(possibleEssayPath);
  } catch {
    essay = null;
  }
  const errors: string[] = [];
  const warnings: string[] = [...(validation.warnings ?? [])];
  const corpusId = questions[0]?.corpusId ?? provenance.corpusId ?? null;
  const ids = [provenance.corpusId, answerKey.corpusId, validation.corpusId, checkpoint.corpusId, essay?.corpusId]
    .filter(Boolean);
  if (!corpusId || ids.some((id) => id !== corpusId)) errors.push("Os artefatos não compartilham o mesmo corpusId.");
  if (!Array.isArray(questions) || !questions.length) errors.push("questoes-estruturadas.json está vazio.");
  if (validation.errors?.length) errors.push(...validation.errors.map((item) => `Validador: ${item}`));
  if (!validation.publicationGate?.structuralValidationPassed || !validation.publicationGate?.readyForHumanReview) {
    errors.push("O relatório estrutural não liberou o corpus para revisão humana.");
  }
  if (checkpoint.stage !== "validated_review_required" || (checkpoint.validationErrors ?? 0) !== 0) {
    errors.push(`Checkpoint incompleto: stage=${checkpoint.stage}.`);
  }
  if (checkpoint.failedOccurrences?.length || provenance.failures?.length) errors.push("Há ocorrências com falha na extração.");
  if (questions.length !== checkpoint.expectedPrintedOccurrences) {
    errors.push(`Ocorrências estruturadas: ${questions.length}/${checkpoint.expectedPrintedOccurrences}.`);
  }
  if (checkpoint.completedOccurrences?.length !== checkpoint.expectedPrintedOccurrences) {
    errors.push(`Checkpoint concluído: ${checkpoint.completedOccurrences?.length ?? 0}/${checkpoint.expectedPrintedOccurrences}.`);
  }
  const sourceIds = new Set<string>();
  const identities = new Set<string>();
  const printedOrders = new Set<number>();
  const completed = new Set(checkpoint.completedOccurrences ?? []);
  const answerByOccurrence = new Map(answerKey.answers.map((item) => [item.occurrenceId, item]));
  for (const question of questions) {
    if (sourceIds.has(question.id)) errors.push(`sourceId duplicado: ${question.id}.`);
    sourceIds.add(question.id);
    let identity = question.id;
    try {
      identity = identityOf(question);
      if (identities.has(identity)) errors.push(`Número+idioma duplicado: ${identity}.`);
      identities.add(identity);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${question.id}: idioma inválido.`);
    }
    if (!completed.has(question.id)) errors.push(`${question.id}: ausente do checkpoint concluído.`);
    if (question.corpusId !== corpusId) errors.push(`${question.id}: corpusId divergente.`);
    if (
      question.year !== answerKey.year ||
      question.day !== answerKey.day ||
      question.application !== answerKey.application ||
      question.modality !== answerKey.modality ||
      question.bookletNumber !== answerKey.bookletNumber ||
      question.bookletColor !== answerKey.bookletColor
    ) {
      errors.push(`${question.id}: ano, dia, aplicação ou caderno diverge do gabarito oficial.`);
    }
    if (question.officialOrder !== question.officialNumber) {
      errors.push(`${question.id}: ordem oficial ${question.officialOrder} diverge do número ${question.officialNumber}.`);
    }
    if (
      !Number.isInteger(question.printedOccurrenceOrder) ||
      question.printedOccurrenceOrder < 1 ||
      printedOrders.has(question.printedOccurrenceOrder)
    ) {
      errors.push(`${question.id}: ordem impressa inválida ou duplicada.`);
    }
    printedOrders.add(question.printedOccurrenceOrder);
    if (
      question.source.officialExamSha256 !== provenance.officialExam.sha256 ||
      question.source.officialExamUrl !== provenance.officialExam.url ||
      question.source.officialExamPath !== provenance.officialExam.path
    ) {
      errors.push(`${question.id}: proveniência do caderno oficial diverge.`);
    }
    errors.push(...validateQuestionShape(question, answerByOccurrence.get(question.id)));
    if (question.officialAnswerKey?.sourceSha256 !== provenance.officialAnswerKey.sha256) {
      errors.push(`${question.id}: hash do gabarito diverge da proveniência oficial.`);
    }
    if (question.officialAnswerKey?.sourceUrl !== provenance.officialAnswerKey.url) {
      errors.push(`${question.id}: URL do gabarito diverge da proveniência oficial.`);
    }
  }
  if (answerKey.answers.length !== questions.length) {
    errors.push(`Gabaritos relacionados: ${answerKey.answers.length}/${questions.length}.`);
  }
  if (
    printedOrders.size !== checkpoint.expectedPrintedOccurrences ||
    Array.from({ length: checkpoint.expectedPrintedOccurrences }, (_, index) => index + 1).some(
      (order) => !printedOrders.has(order),
    )
  ) {
    errors.push("A sequência física das ocorrências possui lacuna ou duplicidade.");
  }
  const logicalNumbers = new Set(questions.map((question) => question.officialNumber));
  if (logicalNumbers.size !== checkpoint.expectedLogicalQuestions) {
    errors.push(`Questões lógicas: ${logicalNumbers.size}/${checkpoint.expectedLogicalQuestions}.`);
  }
  if (
    provenance.detection.logicalQuestions !== checkpoint.expectedLogicalQuestions ||
    provenance.detection.printedOccurrences !== checkpoint.expectedPrintedOccurrences
  ) {
    errors.push("A detecção da proveniência diverge do checkpoint.");
  }
  if (
    provenance.officialExam.sha256 !== checkpoint.sourceHashes.officialExamSha256 ||
    provenance.officialAnswerKey.sha256 !== checkpoint.sourceHashes.officialAnswerKeySha256 ||
    answerKey.source.sha256 !== provenance.officialAnswerKey.sha256
  ) {
    errors.push("Hashes oficiais divergem entre proveniência, gabarito e checkpoint.");
  }
  if (Object.values(provenance.officialExam.identityChecks ?? {}).some((value) => value !== true)) {
    errors.push("A identidade de ano/dia/caderno da prova oficial não passou.");
  }
  await Promise.all([
    validateOfficialFile(
      provenance.officialExam.path,
      provenance.officialExam.sha256,
      provenance.officialExam.sizeBytes,
      "PDF oficial da prova",
      errors,
    ),
    validateOfficialFile(
      provenance.officialAnswerKey.path,
      provenance.officialAnswerKey.sha256,
      provenance.officialAnswerKey.sizeBytes,
      "PDF oficial do gabarito",
      errors,
    ),
  ]);
  for (const question of questions) {
    const questionAssets = assetsOf(question);
    for (let index = 0; index < questionAssets.length; index += 1) {
      await validateAsset(questionAssets[index]!, `${question.id} mídia ${index + 1}`, errors);
    }
  }
  if (essay) {
    if (!essay.theme?.trim()) errors.push("Redação: tema ausente.");
    if (!essay.rawText?.trim()) errors.push("Redação: texto integral ausente.");
    if (!essay.instructions?.trim()) errors.push("Redação: instruções ausentes.");
    if (!essay.pages?.length) errors.push("Redação: página oficial ausente.");
    const essayAssets = [
      ...(essay.visualAssets ?? []),
      ...essay.pages.flatMap((page) => [page.facsimile, ...(page.visualAssets ?? [])].filter(Boolean) as CorpusAsset[]),
    ];
    for (let index = 0; index < essayAssets.length; index += 1) {
      await validateAsset(essayAssets[index]!, `Redação mídia ${index + 1}`, errors);
    }
  }
  const firstQuestion = questions[0];
  if (firstQuestion) {
    const historicallyHasEssay =
      (firstQuestion.year <= 2016 && firstQuestion.day === 2) ||
      (firstQuestion.year >= 2017 && firstQuestion.day === 1);
    if (historicallyHasEssay !== Boolean(essay)) {
      errors.push(
        historicallyHasEssay
          ? `ENEM ${firstQuestion.year} dia ${firstQuestion.day}: proposta de redação historicamente obrigatória ausente.`
          : `ENEM ${firstQuestion.year} dia ${firstQuestion.day}: redacao.json inesperado para este caderno.`,
      );
    }
  }
  const assetReferences = questions.reduce((count, question) => count + assetsOf(question).length, 0);
  const report: CorpusBundleReport = {
    valid: errors.length === 0,
    corpusId,
    logicalQuestions: logicalNumbers.size,
    printedOccurrences: questions.length,
    alternatives: questions.reduce((count, question) => count + question.alternatives.length, 0),
    answerAssignments: answerKey.answers.length,
    assetReferences,
    essayExtracted: Boolean(essay),
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
  return {
    directory,
    questionsPath,
    provenancePath,
    answerKeyPath,
    validationPath,
    checkpointPath,
    essayPath: essay ? possibleEssayPath : null,
    questions,
    provenance,
    answerKey,
    validation,
    checkpoint,
    essay,
    sourceJsonSha256: sha256Text(questionsRaw),
    report,
  };
}

async function validateTraceableItems(items: TraceableEvidenceItem[], label: string, errors: string[]) {
  if (!Array.isArray(items) || !items.length) {
    errors.push(`${label}: evidência rastreável ausente.`);
    return;
  }
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;
    if (!item.kind?.trim() || !item.path?.trim() || !/^[a-f0-9]{64}$/i.test(item.sha256 ?? "")) {
      errors.push(`${label}: evidência ${index + 1} incompleta.`);
      continue;
    }
    try {
      const evidencePath = repoPath(item.path);
      const evidenceStat = await stat(evidencePath);
      if (!evidenceStat.isFile() || (await sha256File(evidencePath)) !== item.sha256) {
        errors.push(`${label}: evidência ${item.path} não confere.`);
      }
    } catch (error) {
      errors.push(`${label}: evidência ${item.path} inacessível (${error instanceof Error ? error.message : "erro"}).`);
    }
  }
}

export async function readReviewEvidence(
  fileInput: string,
  bundle: CorpusBundle,
  options: { requireComplete?: boolean } = {},
) {
  const filePath = repoPath(fileInput);
  const raw = await readFile(filePath, "utf8");
  const evidence = JSON.parse(raw) as CorpusReviewEvidence;
  const errors: string[] = [];
  if (evidence.schemaVersion !== 1) errors.push("Evidência editorial: schemaVersion deve ser 1.");
  if (evidence.corpusId !== bundle.report.corpusId) errors.push("Evidência editorial pertence a outro corpus.");
  if (options.requireComplete && evidence.complete !== true) errors.push("Evidência editorial não está marcada como completa.");
  const questionsBySource = new Map(bundle.questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  for (const review of evidence.questions ?? []) {
    const source = questionsBySource.get(review.sourceId);
    if (!source) {
      errors.push(`Evidência editorial desconhecida: ${review.sourceId}.`);
      continue;
    }
    if (seen.has(review.sourceId)) errors.push(`Evidência editorial duplicada: ${review.sourceId}.`);
    seen.add(review.sourceId);
    if (review.officialNumber !== source.officialNumber || corpusLanguage(review.language) !== corpusLanguage(source.language)) {
      errors.push(`${review.sourceId}: número ou idioma da evidência diverge.`);
    }
    if (!review.reviewer?.trim() || !review.notes?.trim() || Number.isNaN(Date.parse(review.reviewedAt))) {
      errors.push(`${review.sourceId}: revisor, data ou notas ausentes.`);
    }
    for (const check of QUESTION_REVIEW_CHECKS) {
      if (review.checks?.[check] !== true) errors.push(`${review.sourceId}: check ${check} não aprovado.`);
    }
    await validateTraceableItems(review.evidence, review.sourceId, errors);
  }
  if (options.requireComplete && seen.size !== bundle.questions.length) {
    errors.push(`Evidência editorial integral: ${seen.size}/${bundle.questions.length}.`);
  }
  if (bundle.essay) {
    if (!evidence.essay) errors.push("Evidência editorial da redação ausente.");
    else {
      const essayChecks = evidence.essay.checks;
      if (!evidence.essay.reviewer?.trim() || !evidence.essay.notes?.trim() || Number.isNaN(Date.parse(evidence.essay.reviewedAt))) {
        errors.push("Redação: revisor, data ou notas ausentes.");
      }
      for (const [check, passed] of Object.entries(essayChecks ?? {})) {
        if (passed !== true) errors.push(`Redação: check ${check} não aprovado.`);
      }
      const requiredEssayChecks: Array<keyof NonNullable<CorpusReviewEvidence["essay"]>["checks"]> = [
        "themeComplete",
        "promptComplete",
        "instructionsComplete",
        "imagesLegible",
        "originalPageAccessible",
        "noMixedContent",
      ];
      for (const check of requiredEssayChecks) {
        if (essayChecks?.[check] !== true) errors.push(`Redação: check ${check} ausente.`);
      }
      await validateTraceableItems(evidence.essay.evidence, "Redação", errors);
      const evidenceByPath = new Map(
        evidence.essay.evidence.map((item) => [item.path, item.sha256]),
      );
      const officialFacsimiles = bundle.essay.pages
        .map((page) => page.facsimile)
        .filter(Boolean) as CorpusAsset[];
      if (
        !officialFacsimiles.length ||
        officialFacsimiles.some(
          (asset) => evidenceByPath.get(asset.artifactPath) !== asset.sha256,
        )
      ) {
        errors.push("Redação: evidência não referencia todas as páginas oficiais com seus hashes.");
      }
    }
  }
  return { filePath, hash: sha256Text(raw), evidence, errors: [...new Set(errors)] };
}

export async function readAppEvidence(fileInput: string, bundle: CorpusBundle) {
  const filePath = repoPath(fileInput);
  const raw = await readFile(filePath, "utf8");
  const evidence = JSON.parse(raw) as CorpusAppEvidence;
  const errors: string[] = [];
  if (evidence.schemaVersion !== 1) errors.push("Evidência funcional: schemaVersion deve ser 1.");
  if (evidence.corpusId !== bundle.report.corpusId) errors.push("Evidência funcional pertence a outro corpus.");
  if (evidence.complete !== true) errors.push("Evidência funcional não está marcada como completa.");
  if (!evidence.tester?.trim() || !evidence.notes?.trim() || Number.isNaN(Date.parse(evidence.testedAt))) {
    errors.push("Evidência funcional: responsável, data ou notas ausentes.");
  }
  if (!/^https?:\/\//.test(evidence.baseUrl ?? "")) errors.push("Evidência funcional: baseUrl inválida.");
  for (const check of APP_EVIDENCE_CHECKS) {
    if (evidence.checks?.[check] !== true) errors.push(`Evidência funcional: check ${check} não aprovado.`);
  }
  const expected = new Set(bundle.questions.map((question) => question.id));
  const tested = new Set(evidence.testedSourceIds ?? []);
  if (tested.size !== expected.size || [...expected].some((sourceId) => !tested.has(sourceId))) {
    errors.push(`Fluxo funcional testado em ${tested.size}/${expected.size} ocorrências.`);
  }
  await validateTraceableItems(evidence.evidence, "Evidência funcional", errors);
  return { filePath, hash: sha256Text(raw), evidence, errors: [...new Set(errors)] };
}

export async function readVisualAudit(fileInput: string, bundle: CorpusBundle) {
  const filePath = repoPath(fileInput);
  const raw = await readFile(filePath, "utf8");
  const audit = JSON.parse(raw) as CorpusVisualAudit;
  const errors: string[] = [];
  const questionsBySource = new Map(bundle.questions.map((question) => [question.id, question]));
  if (audit.schemaVersion !== 1) errors.push("Auditoria visual: schemaVersion deve ser 1.");
  const auditedSourceByteSha256 = audit.sourceByteSha256 ?? audit.sourceHash;
  if (auditedSourceByteSha256 !== bundle.sourceJsonSha256) {
    errors.push("Auditoria visual não corresponde ao JSON estruturado atual.");
  }
  if (audit.complete !== true || audit.canApprove !== true || audit.failed !== 0) {
    errors.push("Auditoria visual não aprovou integralmente o caderno.");
  }
  if (
    audit.expected !== bundle.questions.length ||
    audit.audited !== bundle.questions.length ||
    audit.passed !== bundle.questions.length ||
    audit.audits?.length !== bundle.questions.length
  ) {
    errors.push(`Auditoria visual integral: ${audit.audited ?? 0}/${bundle.questions.length}.`);
  }
  const seen = new Set<string>();
  for (const row of audit.audits ?? []) {
    const source = questionsBySource.get(row.sourceId);
    if (!source) {
      errors.push(`Auditoria visual contém sourceId desconhecido: ${row.sourceId}.`);
      continue;
    }
    if (seen.has(row.sourceId)) errors.push(`Auditoria visual duplicada: ${row.sourceId}.`);
    seen.add(row.sourceId);
    if (row.officialNumber !== source.officialNumber || corpusLanguage(row.language) !== corpusLanguage(source.language)) {
      errors.push(`${row.sourceId}: número ou idioma diverge na auditoria visual.`);
    }
    const passFields = [
      row.verdict,
      row.statementFidelity,
      row.elementOrder,
      row.alternativeFidelity,
      row.imageLegibility,
      row.questionIsolation,
    ];
    if (passFields.some((value) => value !== "PASS") || row.issueCodes?.length) {
      errors.push(`${row.sourceId}: auditoria visual não está integralmente em PASS.`);
    }
    if (!row.evidence?.trim() || row.evidence.trim().length < 80) {
      errors.push(`${row.sourceId}: justificativa visual rastreável insuficiente.`);
    }
    const inspected = new Set(row.inspectedFiles ?? []);
    const officialCrops = source.originalCrops.map((asset) => asset.artifactPath);
    if (!officialCrops.length || officialCrops.some((artifactPath) => !inspected.has(artifactPath))) {
      errors.push(`${row.sourceId}: nem todos os recortes oficiais constam em inspectedFiles.`);
    }
    for (const inspectedPath of inspected) {
      try {
        const resolved = repoPath(inspectedPath);
        const inspectedStat = await stat(resolved);
        if (!inspectedStat.isFile()) errors.push(`${row.sourceId}: arquivo inspecionado inválido: ${inspectedPath}.`);
      } catch (error) {
        errors.push(
          `${row.sourceId}: arquivo inspecionado inacessível ${inspectedPath} (${error instanceof Error ? error.message : "erro"}).`,
        );
      }
    }
  }
  if (seen.size !== bundle.questions.length) {
    errors.push(`Cobertura da auditoria visual: ${seen.size}/${bundle.questions.length}.`);
  }
  return { filePath, hash: sha256Text(raw), audit, errors: [...new Set(errors)] };
}
