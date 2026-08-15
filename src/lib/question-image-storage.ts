import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const bucket = "question-images";
const localDirectory = path.join(process.cwd(), "storage", "question-images");

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export async function storeQuestionImageFile(
  fileName: string,
  bytes: Buffer,
  contentType = "image/webp",
) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${fileName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        apikey: config.key,
      "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: new Uint8Array(bytes).buffer,
    });
    if (!response.ok) throw new Error(`Supabase Storage recusou a imagem: ${response.status}`);
    return;
  }

  await mkdir(localDirectory, { recursive: true });
  await writeFile(path.join(localDirectory, fileName), bytes);
}

export async function readQuestionImageFile(fileName: string) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${fileName}`, {
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Imagem indisponível: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(path.join(localDirectory, fileName));
}

export async function deleteQuestionImageFile(fileName: string) {
  const config = supabaseConfig();
  if (config) {
    await fetch(`${config.url}/storage/v1/object/${bucket}/${fileName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
    });
    return;
  }

  try {
    await unlink(path.join(localDirectory, fileName));
  } catch {
    // A missing local file is already effectively deleted.
  }
}
