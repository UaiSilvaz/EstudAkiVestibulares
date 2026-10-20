import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp, { type Metadata } from "sharp";
import { canUseTeacherTools, getCurrentUser } from "@/lib/auth";
import { storeCourseMediaFile } from "@/lib/course-media-storage";
import { looksLikePdf } from "@/server/security/uploads";

export const runtime = "nodejs";

const IMAGE_SIZE = 8 * 1024 * 1024;
const PDF_SIZE = 35 * 1024 * 1024;
const VIDEO_SIZE = 500 * 1024 * 1024;
const COVER_WIDTH = 1280;
const COVER_HEIGHT = 720;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/ogg", ".ogv"],
  ["video/quicktime", ".mov"],
  ["video/x-m4v", ".m4v"],
]);

function safeBase(name: string) {
  return path
    .basename(name, path.extname(name))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase() || "arquivo";
}

function imageExtension(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  return ".jpg";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canUseTeacherTools(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let extension = path.extname(file.name).toLowerCase();
  let contentType = file.type;

  if (kind === "course-cover" || kind === "lesson-cover") {
    if (file.size > IMAGE_SIZE) {
      return NextResponse.json({ error: "A capa deve ter no máximo 8 MB." }, { status: 413 });
    }
    let metadata: Metadata;
    try {
      metadata = await sharp(bytes).metadata();
    } catch {
      return NextResponse.json({ error: "A imagem enviada é inválida." }, { status: 400 });
    }
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return NextResponse.json({ error: "Use uma capa JPG, PNG ou WEBP." }, { status: 400 });
    }
    if (metadata.width !== COVER_WIDTH || metadata.height !== COVER_HEIGHT) {
      return NextResponse.json(
        { error: `A capa precisa ter exatamente ${COVER_WIDTH} × ${COVER_HEIGHT} px. A imagem enviada tem ${metadata.width ?? "?"} × ${metadata.height ?? "?"} px.` },
        { status: 400 },
      );
    }
    contentType = `image/${metadata.format === "jpeg" ? "jpeg" : metadata.format}`;
    if (!imageTypes.has(contentType)) {
      return NextResponse.json({ error: "Formato de capa não aceito." }, { status: 400 });
    }
    extension = imageExtension(contentType);
  } else if (kind === "lesson-video") {
    if (file.size > VIDEO_SIZE) {
      return NextResponse.json({ error: "O vídeo deve ter no máximo 500 MB." }, { status: 413 });
    }
    const extensionType: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogv": "video/ogg",
      ".ogg": "video/ogg",
      ".mov": "video/quicktime",
      ".m4v": "video/x-m4v",
    };
    contentType = videoTypes.has(file.type) ? file.type : extensionType[extension] ?? "";
    if (!videoTypes.has(contentType)) {
      return NextResponse.json({ error: "Use um vídeo MP4, WebM, OGG, MOV ou M4V." }, { status: 400 });
    }
    extension = videoTypes.get(contentType)!;
  } else if (kind === "lesson-pdf") {
    if (file.size > PDF_SIZE) {
      return NextResponse.json({ error: "O PDF deve ter no máximo 35 MB." }, { status: 413 });
    }
    if (!looksLikePdf(bytes)) {
      return NextResponse.json({ error: "O arquivo enviado não é um PDF válido." }, { status: 400 });
    }
    contentType = "application/pdf";
    extension = ".pdf";
  } else {
    return NextResponse.json({ error: "Tipo de upload inválido." }, { status: 400 });
  }

  const fileName = `${kind}-${safeBase(file.name)}-${randomUUID()}${extension}`;
  await storeCourseMediaFile(fileName, bytes, contentType);
  return NextResponse.json({
    url: `/api/course-media/${fileName}`,
    name: file.name,
    size: file.size,
    width: kind.endsWith("cover") ? COVER_WIDTH : undefined,
    height: kind.endsWith("cover") ? COVER_HEIGHT : undefined,
  });
}
