import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const PILOT_ID = "enem-2022-dia-2-caderno-5-amarelo";
export const PILOT_OLD_EXAM_ID = "pa-enem-2022-dia-2";
export const PILOT_CONFIG_PATH = "scripts/enem/config/enem-2022-dia-2.json";
export const EXPECTED_EXAM_SHA256 =
  "068a960ff3fde64d89484995f1a323676c354ad1efa27c109f09a4bb90619756";
export const EXPECTED_KEY_SHA256 =
  "2aca83d7cf5e990f63318a525883d2e77ba2d2baf815566efb96287dbf631b11";
export const EXPECTED_EXAM_URL =
  "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_PV_impresso_D2_CD5.pdf";
export const EXPECTED_KEY_URL =
  "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_GB_impresso_D2_CD5.pdf";

export type SourceRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  normalized: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type StructuredBlock = {
  type: "support_text" | "command" | "credit" | "image";
  content: string;
  altText?: string;
  assetSha256?: string;
  assetPath?: string;
  storagePath?: string;
  order: number;
  sourcePdfPage: number;
  zoneOrder?: number;
  consolidatedPdfPage: number;
  sourceRegion: SourceRegion;
  confidence: number;
};

export type StructuredAlternative = {
  key: string;
  text: string;
  imageUrl: string | null;
  order: number;
  sourcePdfPage: number;
  consolidatedPdfPage: number;
  sourceRegion: SourceRegion;
  confidence: number;
};

export type StructuredAsset = {
  url: string;
  storagePath: string;
  type: "visual" | "prompt_facsimile" | "alternative_visual" | "original_reference";
  relation: "statement" | "alternative" | "admin_reference";
  alternativeKey?: string;
  order: number;
  altText: string;
  width: number;
  height: number;
  sha256: string;
  sourcePdfPage: number;
  zoneOrder?: number;
  consolidatedPdfPage: number;
  sourceRegion: SourceRegion;
};

export type StructuredQuestion = {
  schemaVersion: number;
  id: string;
  pilotId: string;
  oldExamId: string;
  vestibular: string;
  year: number;
  day: number;
  application: string;
  applicationLabel: string;
  modality: string;
  bookletNumber: number;
  bookletColor: string;
  officialNumber: number;
  officialOrder: number;
  area: string;
  subject: string | null;
  content: string | null;
  subcontent: string | null;
  competency: string | null;
  ability: string | null;
  difficulty: string | null;
  estimatedTimeSeconds: number | null;
  language: string;
  supportText: string | null;
  command: string;
  statement: string;
  blocks: StructuredBlock[];
  alternatives: StructuredAlternative[];
  answer: string | null;
  answerSituation: "confirmed" | "annulled" | "pending_official_key";
  source: {
    institution: string;
    sourcePageUrl: string;
    officialExamUrl: string;
    officialExamSha256: string;
    officialPdfPageStart: number;
    officialPdfPageEnd: number;
    consolidatedPdfPageStart: number;
    consolidatedPdfPageEnd: number;
    originalPageUrl: string;
    accessedAt: string;
  };
  assets: StructuredAsset[];
  originalCrops: StructuredAsset[];
  flags: Record<string, boolean>;
  confidence: {
    text: number;
    alternatives: number;
    images: number;
    answer: number;
    classification: number;
    overall: number;
  };
  extractionStatus: "extracted" | "needs_review" | "invalid";
  reviewStatus: "pending_review" | "approved" | "has_error";
  reviewNotes: string | null;
  contentHash: string;
  isAnnulled: boolean;
  officialAnswerKey: {
    questionNumber: number;
    correctAlternative: string | null;
    situation: "confirmed" | "annulled";
    validationStatus: string;
    sourceUrl: string;
    sourceSha256: string;
    sourcePdfPage: number;
    importedAt: string;
  } | null;
};

export type PilotConfig = {
  id: string;
  vestibular: string;
  year: number;
  day: number;
  application: string;
  modality: string;
  bookletNumber: number;
  bookletColor: string;
  questionStart: number;
  questionEnd: number;
  expectedQuestions: number;
  oldExamId: string;
  consolidatedPdf: string;
  officialExamPdf: string;
  officialAnswerKeyPdf: string;
  officialSourcePage: string;
  officialExamUrl: string;
  officialAnswerKeyUrl: string;
};

export type PilotValidationReport = {
  pilotId: string;
  valid: boolean;
  questionCount: number;
  answerCount: number;
  annulledQuestions: number[];
  blockCount: number;
  assetCount: number;
  originalCropCount: number;
  sourceJsonSha256: string;
  errors: string[];
  warnings: string[];
};

export type PilotBundle = {
  config: PilotConfig;
  questions: StructuredQuestion[];
  configPath: string;
  structuredPath: string;
  sourceJsonSha256: string;
  report: PilotValidationReport;
};

function hashBuffer(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

export function hashJson(value: unknown) {
  return hashBuffer(Buffer.from(JSON.stringify(value), "utf8"));
}

function isSha256(value: string | null | undefined) {
  return Boolean(value && /^[a-f0-9]{64}$/.test(value));
}

function confidenceIsValid(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateRegion(region: SourceRegion, label: string, errors: string[]) {
  const absolute = [region.x, region.y, region.width, region.height];
  const normalized = [
    region.normalized.x,
    region.normalized.y,
    region.normalized.width,
    region.normalized.height,
  ];
  if (absolute.some((value) => !Number.isFinite(value)) || region.width <= 0 || region.height <= 0) {
    errors.push(`${label}: coordenadas absolutas inválidas.`);
  }
  if (normalized.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    errors.push(`${label}: coordenadas normalizadas inválidas.`);
  }
}

function ensurePilotPath(storagePath: string) {
  const resolved = path.resolve(process.cwd(), storagePath);
  const allowed = path.resolve(process.cwd(), "storage/questoes/enem/2022/dia-2");
  if (resolved !== allowed && !resolved.startsWith(`${allowed}${path.sep}`)) {
    throw new Error(`Mídia fora do diretório permitido do piloto: ${storagePath}`);
  }
  return resolved;
}

async function validateAsset(
  asset: StructuredAsset,
  questionNumber: number,
  errors: string[],
) {
  const label = `Questão ${questionNumber}, mídia ${asset.storagePath}`;
  if (!asset.url.startsWith("/api/questions/assets/enem/2022/dia-2/")) {
    errors.push(`${label}: URL pública fora da rota canônica.`);
  }
  if (!isSha256(asset.sha256)) errors.push(`${label}: SHA-256 ausente ou inválido.`);
  if (!Number.isInteger(asset.width) || asset.width <= 0 || !Number.isInteger(asset.height) || asset.height <= 0) {
    errors.push(`${label}: dimensões inválidas.`);
  }
  if (asset.sourcePdfPage < 1 || asset.sourcePdfPage > 32) {
    errors.push(`${label}: página oficial fora do caderno de 32 páginas.`);
  }
  if (asset.consolidatedPdfPage < 898 || asset.consolidatedPdfPage > 929) {
    errors.push(`${label}: página consolidada fora do segmento 898–929.`);
  }
  validateRegion(asset.sourceRegion, label, errors);
  try {
    const absolutePath = ensurePilotPath(asset.storagePath);
    const [bytes, metadata] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);
    if (!metadata.isFile()) errors.push(`${label}: caminho não é um arquivo.`);
    if (hashBuffer(bytes) !== asset.sha256) errors.push(`${label}: hash do arquivo diverge do manifesto.`);
  } catch (error) {
    errors.push(`${label}: arquivo indisponível (${error instanceof Error ? error.message : "erro"}).`);
  }
}

export async function readPilotBundle(options: { validateAssets?: boolean } = {}): Promise<PilotBundle> {
  const configPath = path.resolve(process.cwd(), PILOT_CONFIG_PATH);
  const config = JSON.parse(await readFile(configPath, "utf8")) as PilotConfig;
  const structuredPath = path.resolve(
    process.cwd(),
    path.dirname(config.consolidatedPdf),
    "processamento",
    config.id,
    "questoes-estruturadas.json",
  );
  const structuredBytes = await readFile(structuredPath);
  const questions = JSON.parse(structuredBytes.toString("utf8")) as StructuredQuestion[];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (
    config.id !== PILOT_ID ||
    config.oldExamId !== PILOT_OLD_EXAM_ID ||
    config.year !== 2022 ||
    config.day !== 2 ||
    config.bookletNumber !== 5 ||
    config.bookletColor !== "Amarelo" ||
    config.questionStart !== 91 ||
    config.questionEnd !== 180 ||
    config.expectedQuestions !== 90
  ) {
    errors.push("Configuração não corresponde ao piloto ENEM 2022, 2º dia, Caderno 5 Amarelo.");
  }
  if (config.officialExamUrl !== EXPECTED_EXAM_URL || config.officialAnswerKeyUrl !== EXPECTED_KEY_URL) {
    errors.push("URLs oficiais não correspondem ao Caderno 5 Amarelo do Inep.");
  }
  if (questions.length !== 90) errors.push(`Esperadas 90 questões; encontradas ${questions.length}.`);

  const expectedNumbers = Array.from({ length: 90 }, (_, index) => index + 91);
  const actualNumbers = questions.map((question) => question.officialNumber).sort((a, b) => a - b);
  if (JSON.stringify(actualNumbers) !== JSON.stringify(expectedNumbers)) {
    errors.push("A sequência oficial deve conter exatamente as questões 91–180, sem lacunas ou duplicatas.");
  }

  for (const question of questions) {
    const prefix = `Questão ${question.officialNumber}`;
    if (
      question.pilotId !== PILOT_ID ||
      question.oldExamId !== PILOT_OLD_EXAM_ID ||
      question.year !== 2022 ||
      question.day !== 2 ||
      question.bookletNumber !== 5 ||
      question.bookletColor !== "Amarelo"
    ) {
      errors.push(`${prefix}: identificação do piloto divergente.`);
    }
    if (question.officialOrder !== question.officialNumber - 90) {
      errors.push(`${prefix}: ordem oficial incorreta.`);
    }
    if (!question.statement.trim() || !question.command.trim()) {
      errors.push(`${prefix}: enunciado ou comando vazio.`);
    }
    if (
      !question.subject?.trim() ||
      !question.content?.trim() ||
      !question.subcontent?.trim() ||
      !question.difficulty?.trim() ||
      !Number.isInteger(question.estimatedTimeSeconds) ||
      (question.estimatedTimeSeconds ?? 0) <= 0
    ) {
      errors.push(`${prefix}: classificação editorial incompleta.`);
    }
    if (!isSha256(question.contentHash)) errors.push(`${prefix}: contentHash inválido.`);
    if (
      question.source.officialExamUrl !== EXPECTED_EXAM_URL ||
      question.source.officialExamSha256 !== EXPECTED_EXAM_SHA256
    ) {
      errors.push(`${prefix}: prova oficial/hash não corresponde ao CD5 Amarelo.`);
    }
    if (
      question.source.officialPdfPageStart < 1 ||
      question.source.officialPdfPageEnd > 32 ||
      question.source.officialPdfPageStart > question.source.officialPdfPageEnd
    ) {
      errors.push(`${prefix}: intervalo de páginas oficiais inválido.`);
    }
    if (
      question.source.consolidatedPdfPageStart < 898 ||
      question.source.consolidatedPdfPageEnd > 929 ||
      question.source.consolidatedPdfPageStart > question.source.consolidatedPdfPageEnd
    ) {
      errors.push(`${prefix}: intervalo consolidado fora de 898–929.`);
    }
    const keys = question.alternatives.map((alternative) => alternative.key);
    if (JSON.stringify(keys) !== JSON.stringify(["A", "B", "C", "D", "E"])) {
      errors.push(`${prefix}: alternativas devem ser A–E em ordem.`);
    }
    for (const alternative of question.alternatives) {
      if (!alternative.text.trim() && !alternative.imageUrl) {
        errors.push(`${prefix}: alternativa ${alternative.key} não tem texto nem imagem.`);
      }
      if (!confidenceIsValid(alternative.confidence)) {
        errors.push(`${prefix}: confiança da alternativa ${alternative.key} inválida.`);
      }
      validateRegion(alternative.sourceRegion, `${prefix}, alternativa ${alternative.key}`, errors);
    }
    const structuredText = [
      question.supportText ?? "",
      question.command,
      ...question.blocks.map((block) => block.content),
      ...question.alternatives.map((alternative) => alternative.text),
    ];
    if (structuredText.some((value) => /[\uE000-\uF8FF]/u.test(value))) {
      errors.push(`${prefix}: texto estruturado contém glifo privado do PDF.`);
    }
    const malformedAlternative = question.alternatives.find((alternative) =>
      /\.[il]$/u.test(alternative.text.trim()),
    );
    if (malformedAlternative) {
      errors.push(`${prefix}: alternativa ${malformedAlternative.key} contém resíduo de marcador.`);
    }
    if (!question.blocks.length) errors.push(`${prefix}: nenhum bloco ordenado.`);
    const commandBlocks = question.blocks.filter((block) => block.type === "command");
    if (commandBlocks.length !== 1 || commandBlocks[0]?.content !== question.command) {
      errors.push(`${prefix}: bloco de comando ausente, duplicado ou divergente.`);
    }
    question.blocks.forEach((block, index) => {
      if (block.order !== index) errors.push(`${prefix}: ordem de blocos não é contínua.`);
      if (!block.content.trim()) errors.push(`${prefix}: bloco ${index} vazio.`);
      if (!confidenceIsValid(block.confidence)) errors.push(`${prefix}: confiança do bloco ${index} inválida.`);
      validateRegion(block.sourceRegion, `${prefix}, bloco ${index}`, errors);
      if (block.type === "image") {
        const linkedAsset = question.assets.find(
          (asset) => asset.type === "visual" && asset.sha256 === block.assetSha256,
        );
        if (
          !block.altText?.trim() ||
          !block.assetSha256 ||
          !linkedAsset ||
          linkedAsset.storagePath !== (block.assetPath ?? block.storagePath)
        ) {
          errors.push(`${prefix}: bloco de imagem ${index} sem vÃ­nculo Ã  mÃ­dia visual oficial.`);
        }
      }
    });
    const isAnnulled = question.officialNumber === 175;
    if (isAnnulled) {
      if (
        question.answer !== null ||
        question.answerSituation !== "annulled" ||
        question.officialAnswerKey?.correctAlternative !== null ||
        question.officialAnswerKey?.situation !== "annulled" ||
        !question.isAnnulled
      ) {
        errors.push("Questão 175 deve estar anulada, sem alternativa A–E inventada.");
      }
    } else if (
      !/^[A-E]$/.test(question.answer ?? "") ||
      question.answerSituation !== "confirmed" ||
      question.officialAnswerKey?.correctAlternative !== question.answer ||
      question.officialAnswerKey?.situation !== "confirmed" ||
      question.isAnnulled
    ) {
      errors.push(`${prefix}: resposta oficial confirmada ausente ou divergente.`);
    }
    if (
      !question.officialAnswerKey ||
      question.officialAnswerKey.questionNumber !== question.officialNumber ||
      question.officialAnswerKey.sourceUrl !== EXPECTED_KEY_URL ||
      question.officialAnswerKey.sourceSha256 !== EXPECTED_KEY_SHA256 ||
      question.officialAnswerKey.validationStatus !== "validated_against_official_pdf"
    ) {
      errors.push(`${prefix}: vínculo com o gabarito oficial do CD5 inválido.`);
    }
    for (const value of Object.values(question.confidence)) {
      if (!confidenceIsValid(value)) errors.push(`${prefix}: confiança fora do intervalo 0–1.`);
    }
    if (question.extractionStatus === "invalid") errors.push(`${prefix}: extração marcada como inválida.`);
    if (question.reviewStatus === "has_error") errors.push(`${prefix}: extração marcada com erro editorial.`);
    if (question.originalCrops.length < 1) errors.push(`${prefix}: recorte original do administrador ausente.`);
    if (!question.assets.some((asset) => asset.type === "prompt_facsimile")) {
      errors.push(`${prefix}: fac-símile oficial do enunciado ausente.`);
    }

    const allAssets = [...question.assets, ...question.originalCrops];
    if (options.validateAssets !== false) {
      await Promise.all(allAssets.map((asset) => validateAsset(asset, question.officialNumber, errors)));
    }
    const assetUrls = new Set(allAssets.map((asset) => asset.url));
    for (const alternative of question.alternatives) {
      if (alternative.imageUrl && !assetUrls.has(alternative.imageUrl)) {
        errors.push(`${prefix}: imagem da alternativa ${alternative.key} não consta no manifesto de mídias.`);
      }
    }
    if (question.flags.requiresVisualInterpretation && !question.assets.length) {
      errors.push(`${prefix}: interpretação visual exigida, mas nenhuma mídia estudantil foi preservada.`);
    }
  }

  const report: PilotValidationReport = {
    pilotId: PILOT_ID,
    valid: errors.length === 0,
    questionCount: questions.length,
    answerCount: questions.filter((question) => question.officialAnswerKey).length,
    annulledQuestions: questions
      .filter((question) => question.answerSituation === "annulled")
      .map((question) => question.officialNumber),
    blockCount: questions.reduce((total, question) => total + question.blocks.length, 0),
    assetCount: questions.reduce((total, question) => total + question.assets.length, 0),
    originalCropCount: questions.reduce(
      (total, question) => total + question.originalCrops.length,
      0,
    ),
    sourceJsonSha256: hashBuffer(structuredBytes),
    errors,
    warnings,
  };

  return {
    config,
    questions: [...questions].sort((a, b) => a.officialNumber - b.officialNumber),
    configPath,
    structuredPath,
    sourceJsonSha256: report.sourceJsonSha256,
    report,
  };
}

export function relativeToRepo(absolutePath: string) {
  return path.relative(process.cwd(), absolutePath).replaceAll("\\", "/");
}

export function regionColumns(region: SourceRegion) {
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

export async function assertPilotInputsExist() {
  const bundle = await readPilotBundle({ validateAssets: false });
  await Promise.all([
    access(path.resolve(process.cwd(), bundle.config.officialExamPdf)),
    access(path.resolve(process.cwd(), bundle.config.officialAnswerKeyPdf)),
  ]);
  return bundle;
}

export function cliValue(name: string) {
  const direct = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3).trim();
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1]?.trim();
  return undefined;
}

export function hasCliFlag(name: string) {
  return process.argv.includes(`--${name}`);
}
