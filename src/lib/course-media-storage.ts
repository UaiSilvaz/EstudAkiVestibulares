import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const bucket = process.env.COURSE_MEDIA_BUCKET || "question-images";
const prefix = (process.env.COURSE_MEDIA_PREFIX || "course-media").replace(/^\/+|\/+$/g, "");
const localDirectory = path.join(process.cwd(), "storage", "course-media");

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url === "[SENSITIVE]" || key === "[SENSITIVE]") return null;
  return { url, key };
}

function objectPath(fileName: string) {
  return prefix ? `${prefix}/${fileName}` : fileName;
}

function encodedObjectPath(fileName: string) {
  return objectPath(fileName).split("/").map(encodeURIComponent).join("/");
}

export function courseMediaContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".m4v": "video/x-m4v",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".ogv": "video/ogg",
    ".pdf": "application/pdf",
  };
  return types[extension] ?? "application/octet-stream";
}

export async function signedCourseMediaUrl(fileName: string) {
  const config = supabaseConfig();
  if (!config) return null;
  const response = await fetch(`${config.url}/storage/v1/object/sign/${bucket}/${encodedObjectPath(fileName)}`, {
    method: "POST", headers: { Authorization: `Bearer ${config.key}`, apikey: config.key, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600 }), cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Mídia indisponível no armazenamento.");
  const data = await response.json() as { signedURL?: string };
  if (!data.signedURL) throw new Error("O armazenamento não forneceu o acesso à mídia.");
  return new URL(`${config.url}/storage/v1${data.signedURL}`).toString();
}

export async function storeCourseMediaFile(fileName: string, bytes: Buffer, contentType: string) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(
      `${config.url}/storage/v1/object/${bucket}/${encodedObjectPath(fileName)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          apikey: config.key,
          "Content-Type": contentType,
          "x-upsert": "false",
        },
        body: new Uint8Array(bytes).buffer,
      },
    );
    if (!response.ok) throw new Error(`O armazenamento recusou o arquivo: ${response.status}`);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Configure o armazenamento remoto de mídia em produção.");
  }
  await mkdir(localDirectory, { recursive: true });
  await writeFile(path.join(localDirectory, fileName), bytes);
}

export async function readCourseMediaFile(fileName: string) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(
      `${config.url}/storage/v1/object/${bucket}/${encodedObjectPath(fileName)}`,
      {
        headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error(`Arquivo indisponível: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(path.join(localDirectory, fileName));
}
