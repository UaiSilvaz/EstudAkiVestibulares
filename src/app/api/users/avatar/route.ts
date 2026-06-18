import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeFileName(name: string, userId: string) {
  const extension = path.extname(name).toLowerCase() || ".jpg";
  const safeUser = userId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `${safeUser || "usuario"}-${Date.now()}${extension}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
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
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  const fileName = safeFileName(file.name, user.id);
  const filePath = path.join(uploadDir, fileName);
  const avatarUrl = `/uploads/avatars/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, bytes);

  try {
    const updated = await db.user.update({
      where: { id: user.id },
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

    return NextResponse.json({ user: updated, avatarUrl });
  } catch {
    return NextResponse.json({ user: { ...user, avatarUrl }, avatarUrl });
  }
}
