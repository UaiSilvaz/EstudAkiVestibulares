import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import sharp from "sharp";
import { looksLikePdf } from "@/server/security/uploads";

type Upload = { userId: string; fileName: string; kind: string; name: string; size: number; contentType: string; expiresAt: number };
function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const bucket = process.env.COURSE_MEDIA_BUCKET || "question-images";
  const prefix = (process.env.COURSE_MEDIA_PREFIX || "course-media").replace(/^\/+|\/+$/g, "");
  return { url, key, bucket, prefix, headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" } };
}
function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && Buffer.byteLength(value) >= 32) return value;
  if (process.env.NODE_ENV !== "production") return "estudaki-local-upload-receipt-only";
  throw new Error("Configure a segurança das sessões.");
}
export function signUploadReceipt(upload: Upload) {
  const payload = Buffer.from(JSON.stringify(upload)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function readUploadReceipt(receipt: string, userId: string): Upload {
  const [payload, signature, extra] = receipt.split(".");
  if (!payload || !signature || extra || receipt.length > 4096) throw new Error("Envio inválido.");
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) throw new Error("Envio inválido.");
  const upload = JSON.parse(Buffer.from(payload, "base64url").toString()) as Upload;
  if (upload.userId !== userId || upload.expiresAt < Date.now() || !/^[a-z0-9._-]+$/i.test(upload.fileName)) throw new Error("Envio expirado ou sem permissão.");
  return upload;
}
function objectPath(upload: Upload, settings: NonNullable<ReturnType<typeof config>>) {
  return [settings.bucket, settings.prefix, upload.fileName].filter(Boolean).map(encodeURIComponent).join("/");
}
export async function prepareDirectUpload(userId: string, data: Record<string, unknown>) {
  const settings = config();
  if (!settings) return null;
  const kind = String(data.kind), name = String(data.name), size = Number(data.size), mime = String(data.contentType);
  const types: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
    "video/mp4": ".mp4", "video/webm": ".webm", "video/ogg": ".ogv", "video/quicktime": ".mov", "video/x-m4v": ".m4v" };
  const limit = kind.endsWith("cover") ? 8 * 1024 * 1024 : kind === "lesson-pdf" ? 35 * 1024 * 1024 : 500 * 1024 * 1024;
  const allowed = ["course-cover", "lesson-cover"].includes(kind) ? mime.startsWith("image/") : kind === "lesson-video" ? mime.startsWith("video/") : kind === "lesson-pdf" && mime === "application/pdf";
  if (!allowed || !types[mime] || !Number.isSafeInteger(size) || size <= 0 || size > limit || name.length > 200) throw new Error("Formato ou tamanho do arquivo não permitido.");
  const upload: Upload = { userId, kind, name, size, contentType: mime, fileName: `${kind}-${randomUUID()}${types[mime]}`, expiresAt: Date.now() + 2 * 60 * 60_000 };
  const response = await fetch(`${settings.url}/storage/v1/object/upload/sign/${objectPath(upload, settings)}`, {
    method: "POST", headers: settings.headers, body: "{}", signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Não foi possível preparar o envio. Confira o Storage do projeto.");
  const result = await response.json() as { url?: string };
  if (!result.url) throw new Error("O armazenamento não autorizou o envio.");
  const signedUrl = new URL(`${settings.url}/storage/v1${result.url}`);
  if (signedUrl.origin !== new URL(settings.url).origin) throw new Error("Destino de envio inválido.");
  return { signedUrl: signedUrl.toString(), receipt: signUploadReceipt(upload), contentType: mime };
}
export async function completeDirectUpload(userId: string, receipt: string) {
  const settings = config();
  if (!settings) throw new Error("Armazenamento não configurado.");
  const upload = readUploadReceipt(receipt, userId);
  const url = `${settings.url}/storage/v1/object/${objectPath(upload, settings)}`;
  const head = await fetch(url, { method: "HEAD", headers: settings.headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!head.ok || Number(head.headers.get("content-length")) !== upload.size) throw new Error("O envio está incompleto ou o tamanho não corresponde ao arquivo.");
  const cover = upload.kind.endsWith("cover");
  const response = await fetch(url, { headers: { ...settings.headers, ...(cover ? {} : { Range: "bytes=0-1023" }) },
    cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Não foi possível verificar o arquivo enviado.");
  // Stream only the required prefix for PDF/video, even if Storage ignores Range.
  const reader = response.body!.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); size += value.length;
      if (!cover && size >= 1024) break;
      if (cover && size > upload.size) throw new Error("Imagem excedeu o tamanho autorizado.");
    }
  } finally { await reader.cancel(); }
  const bytes = Buffer.concat(chunks);
  if (cover) {
    const image = await sharp(bytes).metadata();
    if (image.width !== 1280 || image.height !== 720 || !["jpeg", "png", "webp"].includes(image.format ?? "")) throw new Error("A capa precisa ser JPG, PNG ou WEBP de 1280 × 720 px.");
  } else if (upload.kind === "lesson-pdf" && !looksLikePdf(bytes)) throw new Error("O arquivo não é um PDF válido.");
  else if (upload.kind === "lesson-video") {
    const valid = upload.contentType === "video/webm" ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      : upload.contentType === "video/ogg" ? bytes.subarray(0, 4).toString() === "OggS"
      : ["ftyp", "moov", "mdat", "wide"].includes(bytes.subarray(4, 8).toString());
    if (!valid) throw new Error("O arquivo não corresponde a um vídeo suportado.");
  }
  return { url: `/api/course-media/${upload.fileName}`, name: upload.name, size: upload.size };
}
