import { NextResponse } from "next/server";
import { avatarContentTypeFromName, readAvatarImageFile } from "@/lib/avatar-storage";

export const runtime = "nodejs";

const SAFE_AVATAR_FILE = /^[a-z0-9._-]+\.(?:png|jpe?g|webp)$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await params;
  if (!SAFE_AVATAR_FILE.test(fileName)) {
    return NextResponse.json({ error: "Avatar invalido." }, { status: 400 });
  }

  try {
    const bytes = await readAvatarImageFile(fileName);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": avatarContentTypeFromName(fileName),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Avatar nao encontrado." }, { status: 404 });
  }
}
