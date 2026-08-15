import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function localRoot(...segments: string[]) {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), ...segments);
}

const STORAGE_ROOT = process.env.QUESTION_ASSETS_ROOT
  ? path.resolve(process.env.QUESTION_ASSETS_ROOT)
  : localRoot("storage", "questoes");
const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function supabaseStorageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  if (url === "[SENSITIVE]" || serviceRoleKey === "[SENSITIVE]") return null;

  return {
    bucket: process.env.QUESTION_ASSETS_BUCKET || "question-images",
    serviceRoleKey,
    url,
  };
}

async function readSupabaseAsset(segments: string[], contentType: string) {
  const config = supabaseStorageConfig();
  if (!config) return null;

  const objectPath = segments.map(encodeURIComponent).join("/");
  const response = await fetch(
    `${config.url}/storage/v1/object/${config.bucket}/${objectPath}`,
    {
      headers: {
        Authorization: `Bearer ${config.serviceRoleKey}`,
        apikey: config.serviceRoleKey,
      },
      cache: "force-cache",
    },
  );

  if (response.status === 404) return null;
  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: "Falha ao carregar midia remota." },
      { status: 502 },
    );
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  if (
    !segments.length ||
    segments.some((segment) => !SAFE_SEGMENT.test(segment) || segment === "." || segment === "..")
  ) {
    return NextResponse.json({ error: "Caminho de mídia inválido." }, { status: 400 });
  }

  const filePath = path.resolve(STORAGE_ROOT, ...segments);
  const storagePrefix = `${STORAGE_ROOT}${path.sep}`;
  if (!filePath.startsWith(storagePrefix)) {
    return NextResponse.json({ error: "Caminho de mídia inválido." }, { status: 400 });
  }

  const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()];
  if (!contentType) {
    return NextResponse.json({ error: "Tipo de mídia não permitido." }, { status: 415 });
  }

  const remoteAsset = await readSupabaseAsset(segments, contentType);
  if (remoteAsset) return remoteAsset;

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
  }
}
