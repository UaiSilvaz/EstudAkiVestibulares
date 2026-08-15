import { createHash, randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import {
  ContentStatus,
  Difficulty,
  Prisma,
  QuestionReviewState,
  QuestionSourceType,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { canPublishDirectly, getCurrentUser, canManageContent } from "@/lib/auth";
import { db } from "@/lib/db";

type Alternative = { key: string; text: string; imageUrl?: string | null };
type QuestionImagePayload =
  | string
  | {
      url: string;
      description?: string;
      altText?: string;
      order?: number;
      width?: number;
      height?: number;
    };

type QuestionPayload = {
  id?: string;
  vestibularId?: string;
  subjectId?: string;
  topicId?: string;
  year?: number;
  exam?: string | null;
  phase?: string | null;
  day?: string | null;
  questionNumber?: number | null;
  difficulty?: Difficulty;
  statement?: string;
  alternatives?: Alternative[];
  correctAlternative?: string;
  explanation?: string;
  videoUrl?: string | null;
  pedagogyComment?: string;
  tags?: string[];
  source?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceCitation?: string;
  sourceAccessedAt?: string;
  sourceType?: QuestionSourceType;
  reviewState?: QuestionReviewState;
  reviewNotes?: string;
  skill?: string;
  supportText?: string;
  alternativeExplanations?: Record<string, string>;
  imageUrl?: string | null;
  images?: QuestionImagePayload[];
  removeImage?: boolean;
  status?: ContentStatus;
};

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function errorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return "Não foi possível salvar: vestibular, matéria, conteúdo ou autor não encontrado.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Não foi possível salvar: esta questão parece duplicada no banco.";
  }

  return "Não foi possível salvar a questão.";
}

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined;
}

function nullableTextValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text : null;
}

function numberValue(value: FormDataEntryValue | null) {
  const text = textValue(value);
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function jsonValue<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeImageName(name: string, contentType?: string) {
  const rawExtension = path.extname(name).toLowerCase();
  const extension =
    rawExtension && /\.(png|jpe?g|webp|gif|svg)$/i.test(rawExtension)
      ? rawExtension
      : contentType === "image/png"
        ? ".png"
        : contentType === "image/jpeg" || contentType === "image/jpg"
          ? ".jpg"
          : contentType === "image/gif"
            ? ".gif"
            : contentType === "image/svg+xml"
              ? ".svg"
              : ".webp";
  const base = path
    .basename(name, extension)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

  return `${base || "questao"}-${randomUUID()}${extension}`;
}

function normalizeForHash(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function questionContentHash(input: {
  vestibularId: string;
  supportText?: string | null;
  statement: string;
  alternatives: Alternative[];
}) {
  const canonical = [
    input.vestibularId,
    normalizeForHash(input.supportText),
    normalizeForHash(input.statement),
    ...input.alternatives.map(
      (item) => `${item.key}:${normalizeForHash(item.text)}:${normalizeForHash(item.imageUrl)}`,
    ),
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

function normalizeImageItems(images: QuestionImagePayload[] | undefined, imageUrl?: string | null) {
  const seen = new Set<string>();
  const normalized: Array<{
    url: string;
    description?: string;
    altText?: string;
    order: number;
    width?: number;
    height?: number;
  }> = [];

  const add = (entry: QuestionImagePayload, index: number) => {
    const url = typeof entry === "string" ? entry : entry.url;
    if (!url || seen.has(url)) return;
    seen.add(url);
    normalized.push({
      url,
      description: typeof entry === "string" ? undefined : entry.description,
      altText: typeof entry === "string" ? undefined : entry.altText,
      order: typeof entry === "string" ? index : entry.order ?? index,
      width: typeof entry === "string" ? undefined : entry.width,
      height: typeof entry === "string" ? undefined : entry.height,
    });
  };

  (images ?? []).forEach(add);
  if (imageUrl) add(imageUrl, normalized.length);

  return normalized;
}

function parseStoredImages(value: string | null | undefined) {
  if (!value) return [] as QuestionImagePayload[];
  try {
    return JSON.parse(value) as QuestionImagePayload[];
  } catch {
    return [];
  }
}

function imageUrlsFromStored(imageUrl: string | null | undefined, images: string | null | undefined) {
  const urls = new Set<string>();
  if (imageUrl) urls.add(imageUrl);
  for (const item of parseStoredImages(images)) {
    const url = typeof item === "string" ? item : item.url;
    if (url) urls.add(url);
  }
  return Array.from(urls);
}

function alternativeImageUrlsFromStored(alternatives: string | null | undefined) {
  if (!alternatives) return [];
  try {
    return (JSON.parse(alternatives) as Alternative[])
      .map((alternative) => alternative.imageUrl)
      .filter((url): url is string => Boolean(url));
  } catch {
    return [];
  }
}

function localUploadPathFromUrl(url: string) {
  if (!url.startsWith("/uploads/questions/")) return null;
  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads", "questions");
  const relativeUploadPath = url
    .replace(/^\/uploads\/questions\/+/, "")
    .split(/[?#]/)[0];
  const target = path.resolve(uploadsRoot, relativeUploadPath);
  return target.startsWith(uploadsRoot) ? target : null;
}

async function deleteLocalQuestionImages(urls: string[]) {
  await Promise.all(
    urls.map(async (url) => {
      const storedFileName = url.match(
        /^\/api\/questions\/images\/([a-z0-9-]+\.(?:png|jpe?g|webp|gif|svg))(?:[?#].*)?$/i,
      )?.[1];
      if (storedFileName) {
        const { deleteQuestionImageFile } = await import("@/lib/question-image-storage");
        await deleteQuestionImageFile(storedFileName);
        return;
      }
      const target = localUploadPathFromUrl(url);
      if (!target) return;
      try {
        await unlink(target);
      } catch {
        // Missing files should not block question management.
      }
    }),
  );
}

async function replaceQuestionAssets(
  client: Prisma.TransactionClient,
  questionId: string,
  alternatives: Alternative[],
  correctAlternative: string,
  alternativeExplanations: Record<string, string>,
  images: QuestionImagePayload[] | undefined,
  imageUrl?: string | null,
) {
  const normalizedAlternatives = alternatives.map((item, index) => {
    const key = item.key.trim().toUpperCase();
    return {
      id: randomUUID(),
      questionId,
      key,
      text: item.text.trim(),
      imageUrl: item.imageUrl?.trim() || null,
      explanation: alternativeExplanations[key]?.trim() || null,
      correct: key === correctAlternative,
      order: index,
    };
  });
  const normalizedImages = normalizeImageItems(images, imageUrl).map((item) => ({
    id: randomUUID(),
    questionId,
    url: item.url,
    description: item.description ?? null,
    altText: item.altText ?? item.description ?? null,
    order: item.order,
    width: item.width ?? null,
    height: item.height ?? null,
  }));

  await client.questionAlternative.deleteMany({ where: { questionId } });
  await client.questionImage.deleteMany({ where: { questionId } });

  if (normalizedAlternatives.length) {
    await client.questionAlternative.createMany({ data: normalizedAlternatives });
  }

  if (normalizedImages.length) {
    await client.questionImage.createMany({ data: normalizedImages });
  }
}

async function storeQuestionImage(file: File) {
  if (!IMAGE_TYPES.has(file.type) && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)) {
    throw new Error("Envie imagem PNG, JPG, WEBP, GIF ou SVG.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Imagem muito grande. Limite: 8 MB.");
  }

  const fileName = safeImageName(file.name, file.type);
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const { storeQuestionImageFile } = await import("@/lib/question-image-storage");
    await storeQuestionImageFile(fileName, bytes, file.type || "application/octet-stream");
    return {
      url: `/api/questions/images/${fileName}`,
      width: undefined,
      height: undefined,
    };
  } catch {
    throw new Error("A imagem está corrompida ou usa um formato não suportado.");
  }
}

async function readQuestionPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return {
      body: (await request.json()) as QuestionPayload,
      images: [] as string[],
    };
  }

  const formData = await request.formData();
  const legacyFile = formData.get("image");
  const imageFiles = [
    ...(legacyFile instanceof File && legacyFile.size > 0 ? [legacyFile] : []),
    ...formData
      .getAll("images")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0),
  ];
  const uploadedImageItems = await Promise.all(imageFiles.map(storeQuestionImage));
  const uploadedImages = uploadedImageItems.map((item) => item.url);
  const storedImages = jsonValue<QuestionImagePayload[]>(
    formData.get("storedImages") ?? formData.get("images"),
    [],
  );
  const combinedImages = normalizeImageItems([...storedImages, ...uploadedImageItems]);
  const alternatives = jsonValue<Alternative[]>(formData.get("alternatives"), []);
  const uploadedAlternativeImages: string[] = [];
  const alternativesWithImages = await Promise.all(
    alternatives.map(async (alternative) => {
      const alternativeFile = formData.get(`alternativeImage_${alternative.key.toUpperCase()}`);
      const storedAlternative =
        alternativeFile instanceof File && alternativeFile.size > 0
          ? await storeQuestionImage(alternativeFile)
          : null;
      if (storedAlternative) uploadedAlternativeImages.push(storedAlternative.url);
      return {
        ...alternative,
        imageUrl: storedAlternative?.url ?? alternative.imageUrl ?? null,
      };
    }),
  );

  return {
    body: {
      id: textValue(formData.get("id")),
      vestibularId: textValue(formData.get("vestibularId")),
      subjectId: textValue(formData.get("subjectId")),
      topicId: textValue(formData.get("topicId")),
      year: numberValue(formData.get("year")),
      exam: nullableTextValue(formData.get("exam")),
      phase: nullableTextValue(formData.get("phase")),
      day: nullableTextValue(formData.get("day")),
      questionNumber: numberValue(formData.get("questionNumber")) ?? null,
      difficulty: textValue(formData.get("difficulty")) as Difficulty | undefined,
      supportText: textValue(formData.get("supportText")),
      statement: textValue(formData.get("statement")),
      alternatives: alternativesWithImages,
      correctAlternative: textValue(formData.get("correctAlternative")),
      alternativeExplanations: jsonValue<Record<string, string>>(formData.get("alternativeExplanations"), {}),
      explanation: textValue(formData.get("explanation")),
      videoUrl: nullableTextValue(formData.get("videoUrl")) ?? undefined,
      pedagogyComment: textValue(formData.get("pedagogyComment")),
      tags: jsonValue<string[]>(formData.get("tags"), []),
      source: textValue(formData.get("source")),
      sourceName: nullableTextValue(formData.get("sourceName")) ?? undefined,
      sourceUrl: nullableTextValue(formData.get("sourceUrl")) ?? undefined,
      sourceCitation: nullableTextValue(formData.get("sourceCitation")) ?? undefined,
      sourceAccessedAt: nullableTextValue(formData.get("sourceAccessedAt")) ?? undefined,
      sourceType: textValue(formData.get("sourceType")) as QuestionSourceType | undefined,
      reviewState: textValue(formData.get("reviewState")) as QuestionReviewState | undefined,
      reviewNotes: nullableTextValue(formData.get("reviewNotes")) ?? undefined,
      status: textValue(formData.get("status")) as ContentStatus | undefined,
      imageUrl: combinedImages[0]?.url ?? nullableTextValue(formData.get("imageUrl")),
      images: combinedImages,
      removeImage: textValue(formData.get("removeImage")) === "true",
    } satisfies QuestionPayload,
    images: [...uploadedImages, ...uploadedAlternativeImages],
  };
}

function validateQuestionPayload(body: QuestionPayload) {
  if (
    !body.vestibularId ||
    !body.subjectId ||
    !body.year ||
    !body.statement?.trim() ||
    !body.alternatives?.length ||
    !body.correctAlternative ||
    !body.explanation?.trim()
  ) {
    return "Preencha os campos obrigatórios.";
  }

  const alternatives = body.alternatives.map((item) => ({
    key: item.key.trim().toUpperCase(),
    text: item.text.trim(),
    imageUrl: item.imageUrl?.trim() || null,
  }));
  const correctAlternative = body.correctAlternative.trim().toUpperCase();
  const correct = alternatives.find((item) => item.key === correctAlternative);

  if (alternatives.length < 2) return "Cadastre pelo menos duas alternativas.";
  if (alternatives.some((item) => !item.key || (!item.text && !item.imageUrl))) {
    return "Cada alternativa precisa ter texto ou imagem.";
  }
  if (!correct) return "A resposta certa precisa existir entre as alternativas.";

  const missingWrongReason = alternatives.find(
    (item) => item.key !== correctAlternative && !body.alternativeExplanations?.[item.key]?.trim(),
  );
  if (missingWrongReason) {
    return `Explique por que a alternativa ${missingWrongReason.key} está errada.`;
  }

  return null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = Math.min(100, Math.max(10, Number(params.get("limit")) || 30));
  const status = params.get("status");
  const difficulty = params.get("difficulty");
  const sourceType = params.get("sourceType");
  const reviewState = params.get("reviewState");
  const year = Number(params.get("year"));
  const search = params.get("search")?.trim();
  const where: Prisma.QuestionWhereInput = {
    ...(params.get("vestibularId") ? { vestibularId: params.get("vestibularId")! } : {}),
    ...(params.get("subjectId") ? { subjectId: params.get("subjectId")! } : {}),
    ...(params.get("topicId") ? { topicId: params.get("topicId")! } : {}),
    ...(Number.isInteger(year) && year > 0 ? { year } : {}),
    ...(status && Object.values(ContentStatus).includes(status as ContentStatus) ? { status: status as ContentStatus } : {}),
    ...(difficulty && Object.values(Difficulty).includes(difficulty as Difficulty) ? { difficulty: difficulty as Difficulty } : {}),
    ...(sourceType && Object.values(QuestionSourceType).includes(sourceType as QuestionSourceType) ? { sourceType: sourceType as QuestionSourceType } : {}),
    ...(reviewState && Object.values(QuestionReviewState).includes(reviewState as QuestionReviewState) ? { reviewState: reviewState as QuestionReviewState } : {}),
    ...(search
      ? {
          OR: [
            { statement: { contains: search, mode: "insensitive" } },
            { sourceName: { contains: search, mode: "insensitive" } },
            { sourceUrl: { contains: search, mode: "insensitive" } },
            { exam: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.question.findMany({
      where,
      include: { vestibular: true, subject: true, topic: true, _count: { select: { reports: { where: { status: "OPEN" } } } } },
      orderBy: [{ reviewState: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.question.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  let body: QuestionPayload;
  let images: string[] = [];

  try {
    const payload = await readQuestionPayload(request);
    body = payload.body;
    images = payload.images;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dados inválidos." },
      { status: 400 },
    );
  }

  const validation = validateQuestionPayload(body);
  if (validation) {
    await deleteLocalQuestionImages(images);
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  if (
    body.sourceType === QuestionSourceType.OFFICIAL &&
    body.status === ContentStatus.PUBLISHED
  ) {
    await deleteLocalQuestionImages(images);
    return NextResponse.json(
      { error: "Questões oficiais devem passar pelo fluxo controlado de prova, gabarito e resolução." },
      { status: 400 },
    );
  }
  const status =
    body.sourceType === QuestionSourceType.OFFICIAL
      ? ContentStatus.REVIEW
      : canPublishDirectly(user.role)
        ? body.status ?? ContentStatus.PUBLISHED
        : ContentStatus.REVIEW;

  try {
    const persistedUser = await db.user.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email }] },
      select: { id: true },
    });
    const persistedUserId = persistedUser?.id ?? null;
    const vestibularId = body.vestibularId!;
    const subjectId = body.subjectId!;
    const year = body.year!;
    const statement = body.statement!;
    const supportText = body.supportText ?? null;
    const alternatives = body.alternatives!;
    const normalizedAlternatives = alternatives.map((item) => ({
      key: item.key.trim().toUpperCase(),
      text: item.text.trim(),
      imageUrl: item.imageUrl?.trim() || null,
    }));
    const correctAlternative = body.correctAlternative!.trim().toUpperCase();
    const explanation = body.explanation!;
    const videoUrl = body.videoUrl ?? null;
    const pedagogyComment = body.pedagogyComment ?? null;
    const skill = body.skill ?? null;
    const source = body.source ?? null;
    const sourceName = body.sourceName ?? body.source ?? null;
    const sourceUrl = body.sourceUrl ?? null;
    const sourceCitation = body.sourceCitation ?? null;
    const sourceAccessedAt = body.sourceAccessedAt ?? null;
    const reviewNotes = body.reviewNotes ?? null;
    const imageUrl = body.imageUrl ?? images[0] ?? null;
    const imageItems = body.images ?? images;
    const contentHash = questionContentHash({
      vestibularId,
      supportText,
      statement,
      alternatives: normalizedAlternatives,
    });

    const question = await db.$transaction(async (transaction) => {
      const created = await transaction.question.create({
        data: {
          vestibularId,
          subjectId,
          topicId: body.topicId || null,
          authorId: persistedUserId,
          year,
          exam: body.exam ?? null,
          phase: body.phase ?? null,
          day: body.day ?? null,
          questionNumber: body.questionNumber ?? null,
          difficulty: body.difficulty ?? Difficulty.MEDIUM,
          statement,
          supportText,
          alternatives: JSON.stringify(normalizedAlternatives),
          alternativeExplanations: JSON.stringify(body.alternativeExplanations ?? {}),
          correctAlternative,
          explanation,
          videoUrl,
          pedagogyComment,
          skill,
          tags: JSON.stringify(body.tags ?? []),
          source,
          sourceName,
          sourceUrl,
          sourceCitation,
          sourceAccessedAt,
          sourceType: body.sourceType ?? QuestionSourceType.AUTHORIAL,
          imageUrl,
          images: JSON.stringify(normalizeImageItems(imageItems, imageUrl)),
          reviewState: body.reviewState ?? QuestionReviewState.PENDING_REVIEW,
          reviewNotes,
          contentHash,
          status,
        },
      });

      await replaceQuestionAssets(
        transaction,
        created.id,
        normalizedAlternatives,
        correctAlternative,
        body.alternativeExplanations ?? {},
        imageItems,
        imageUrl,
      );

      return created;
    });

    try {
      await db.activity.create({
        data: {
          userId: persistedUserId,
          type: "CONTENT",
          message: `${user.name} cadastrou uma nova questão.`,
          xp: 0,
        },
      });
    } catch {
      // A questão já foi salva; uma falha no histórico não deve invalidá-la.
    }

    return NextResponse.json({ question });
  } catch (error) {
    await deleteLocalQuestionImages(images);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  let body: QuestionPayload;
  let uploadedImages: string[] = [];
  try {
    const payload = await readQuestionPayload(request);
    body = payload.body;
    uploadedImages = payload.images;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dados inválidos." },
      { status: 400 },
    );
  }

  if (!body.id) {
    await deleteLocalQuestionImages(uploadedImages);
    return NextResponse.json({ error: "Questão não informada." }, { status: 400 });
  }
  if (body.status === ContentStatus.PUBLISHED && !canPublishDirectly(user.role)) {
    await deleteLocalQuestionImages(uploadedImages);
    return NextResponse.json({ error: "Seu perfil não pode publicar diretamente." }, { status: 403 });
  }

  const current = await db.question.findUnique({ where: { id: body.id } });
  if (!current) {
    await deleteLocalQuestionImages(uploadedImages);
    return NextResponse.json({ error: "Questão não encontrada." }, { status: 404 });
  }
  if (
    current.sourceType === QuestionSourceType.OFFICIAL &&
    body.status === ContentStatus.PUBLISHED &&
    current.status !== ContentStatus.PUBLISHED
  ) {
    await deleteLocalQuestionImages(uploadedImages);
    return NextResponse.json(
      { error: "Use a publicação controlada do ENEM 2025 para publicar questões oficiais." },
      { status: 400 },
    );
  }

  const mergedAlternatives = (body.alternatives ?? (JSON.parse(current.alternatives) as Alternative[])).map((item) => ({
    key: item.key.trim().toUpperCase(),
    text: item.text.trim(),
    imageUrl: item.imageUrl?.trim() || null,
  }));
  const mergedAlternativeExplanations =
    body.alternativeExplanations ?? (JSON.parse(current.alternativeExplanations || "{}") as Record<string, string>);
  const mergedCorrectAlternative = (body.correctAlternative ?? current.correctAlternative).trim().toUpperCase();
  const mergedStatement = body.statement ?? current.statement;
  const mergedSupportText = body.supportText !== undefined ? body.supportText : current.supportText;
  const mergedExplanation = body.explanation ?? current.explanation;
  const mergedVestibularId = body.vestibularId ?? current.vestibularId;

  const validation = validateQuestionPayload({
    vestibularId: mergedVestibularId,
    subjectId: body.subjectId ?? current.subjectId,
    year: body.year ?? current.year,
    statement: mergedStatement,
    alternatives: mergedAlternatives,
    correctAlternative: mergedCorrectAlternative,
    explanation: mergedExplanation,
    alternativeExplanations: mergedAlternativeExplanations,
  });

  if (validation) {
    await deleteLocalQuestionImages(uploadedImages);
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  if (body.status === ContentStatus.PUBLISHED && mergedExplanation.trim().length < 80) {
    await deleteLocalQuestionImages(uploadedImages);
    return NextResponse.json(
      { error: "Preencha uma explicação mais detalhada antes de publicar." },
      { status: 400 },
    );
  }

  let nextImageUrl: string | null | undefined;
  let nextImages: QuestionImagePayload[] | undefined;

  if (body.removeImage) {
    nextImageUrl = null;
    nextImages = [];
  } else if (body.images !== undefined) {
    nextImages = normalizeImageItems(body.images, body.imageUrl);
    nextImageUrl =
      (typeof nextImages[0] === "string" ? nextImages[0] : nextImages[0]?.url) ??
      body.imageUrl ??
      null;
  } else if (body.imageUrl !== undefined) {
    nextImageUrl = body.imageUrl;
    nextImages = normalizeImageItems([], nextImageUrl);
  }

  const nextImageUrls = new Set(
    normalizeImageItems(nextImages, nextImageUrl).map((image) => image.url),
  );
  const oldImageUrls =
    nextImages !== undefined || nextImageUrl !== undefined || body.removeImage
      ? imageUrlsFromStored(current.imageUrl, current.images).filter(
          (url) => !nextImageUrls.has(url),
        )
      : [];
  const nextAlternativeImageUrls = new Set(
    mergedAlternatives
      .map((alternative) => alternative.imageUrl)
      .filter((url): url is string => Boolean(url)),
  );
  const oldAlternativeImageUrls = body.alternatives
    ? alternativeImageUrlsFromStored(current.alternatives).filter(
        (url) => !nextAlternativeImageUrls.has(url),
      )
    : [];

  const contentHash = questionContentHash({
    vestibularId: mergedVestibularId,
    supportText: mergedSupportText,
    statement: mergedStatement,
    alternatives: mergedAlternatives,
  });

  try {
    const question = await db.$transaction(async (transaction) => {
      const updated = await transaction.question.update({
        where: { id: body.id },
        data: {
          ...(body.vestibularId ? { vestibularId: body.vestibularId } : {}),
          ...(body.subjectId ? { subjectId: body.subjectId } : {}),
          ...(body.topicId !== undefined ? { topicId: body.topicId || null } : {}),
          ...(body.year !== undefined ? { year: body.year } : {}),
          ...(body.exam !== undefined ? { exam: body.exam } : {}),
          ...(body.phase !== undefined ? { phase: body.phase } : {}),
          ...(body.day !== undefined ? { day: body.day } : {}),
          ...(body.questionNumber !== undefined ? { questionNumber: body.questionNumber } : {}),
          ...(body.difficulty ? { difficulty: body.difficulty } : {}),
          statement: mergedStatement,
          supportText: mergedSupportText,
          alternatives: JSON.stringify(mergedAlternatives),
          alternativeExplanations: JSON.stringify(mergedAlternativeExplanations),
          correctAlternative: mergedCorrectAlternative,
          explanation: mergedExplanation,
          ...(body.videoUrl !== undefined ? { videoUrl: body.videoUrl } : {}),
          ...(body.pedagogyComment !== undefined ? { pedagogyComment: body.pedagogyComment } : {}),
          ...(body.skill !== undefined ? { skill: body.skill } : {}),
          ...(body.tags !== undefined ? { tags: JSON.stringify(body.tags) } : {}),
          ...(nextImageUrl !== undefined ? { imageUrl: nextImageUrl } : {}),
          ...(nextImages !== undefined
            ? { images: JSON.stringify(normalizeImageItems(nextImages, nextImageUrl)) }
            : {}),
          ...(body.source !== undefined ? { source: body.source } : {}),
          ...(body.sourceName !== undefined ? { sourceName: body.sourceName, source: body.sourceName } : {}),
          ...(body.sourceUrl !== undefined ? { sourceUrl: body.sourceUrl } : {}),
          ...(body.sourceCitation !== undefined ? { sourceCitation: body.sourceCitation } : {}),
          ...(body.sourceAccessedAt !== undefined ? { sourceAccessedAt: body.sourceAccessedAt } : {}),
          ...(body.sourceType ? { sourceType: body.sourceType } : {}),
          ...(body.reviewState ? { reviewState: body.reviewState } : {}),
          ...(body.reviewNotes !== undefined ? { reviewNotes: body.reviewNotes } : {}),
          ...(body.status ? { status: body.status } : {}),
          contentHash,
        },
      });

      await replaceQuestionAssets(
        transaction,
        updated.id,
        mergedAlternatives,
        mergedCorrectAlternative,
        mergedAlternativeExplanations,
        nextImages ?? parseStoredImages(updated.images),
        nextImageUrl !== undefined ? nextImageUrl : updated.imageUrl,
      );

      return updated;
    });

    await deleteLocalQuestionImages([...oldImageUrls, ...oldAlternativeImageUrls]);

    return NextResponse.json({ question });
  } catch (error) {
    await deleteLocalQuestionImages(uploadedImages);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Questão não informada." }, { status: 400 });

  try {
    const question = await db.question.findUnique({
      where: { id },
      select: { imageUrl: true, images: true, alternatives: true },
    });
    await db.question.delete({ where: { id } });
    if (question) {
      await deleteLocalQuestionImages([
        ...imageUrlsFromStored(question.imageUrl, question.images),
        ...alternativeImageUrlsFromStored(question.alternatives),
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a questão." }, { status: 500 });
  }
}
