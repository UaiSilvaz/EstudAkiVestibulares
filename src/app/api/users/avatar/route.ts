import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { deleteAvatarImageFile, storeAvatarImageFile } from "@/lib/avatar-storage";
import { db } from "@/lib/db";
import { detectImageContentType } from "@/server/security/uploads";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForType(contentType: string) {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return ".jpg";
}

function safeFileName(name: string, userId: string, contentType: string) {
  const safeUser = userId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeBase = path
    .basename(name, path.extname(name))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

  return `${safeUser || "usuario"}-${safeBase || "avatar"}-${randomUUID()}${extensionForType(contentType)}`;
}

function avatarFileNameFromUrl(url: string | null | undefined) {
  return url?.match(/^\/api\/users\/avatar\/([a-z0-9._-]+\.(?:png|jpe?g|webp))(?:[?#].*)?$/i)?.[1] ?? null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) {
    return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 409 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie uma imagem." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Use JPG, PNG ou WEBP." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Imagem muito grande. Limite: 3 MB." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageContentType(bytes);

  if (!detectedType || !ALLOWED_TYPES.has(detectedType)) {
    return NextResponse.json({ error: "Arquivo de imagem invalido." }, { status: 400 });
  }

  const current = await db.user.findUnique({
    where: { id: persistedUserId },
    select: { avatarUrl: true },
  });
  const fileName = safeFileName(file.name, persistedUserId, detectedType);
  const avatarUrl = `/api/users/avatar/${fileName}`;

  try {
    await storeAvatarImageFile(fileName, bytes, detectedType);
    const updated = await db.user.update({
      where: { id: persistedUserId },
      data: { avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        xp: true,
        streak: true,
        league: true,
        weeklyHours: true,
        targetExam: true,
      },
    });

    const previousFileName = avatarFileNameFromUrl(current?.avatarUrl);
    if (previousFileName && previousFileName !== fileName) {
      await deleteAvatarImageFile(previousFileName);
    }

    return NextResponse.json({ user: updated, avatarUrl });
  } catch (error) {
    await deleteAvatarImageFile(fileName);
    console.error("Falha ao salvar avatar", error);
    return NextResponse.json(
      { error: "Nao foi possivel salvar a foto agora." },
      { status: 503 },
    );
  }
}
