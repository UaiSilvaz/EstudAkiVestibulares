import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const bucket = process.env.AVATAR_IMAGES_BUCKET || "question-images";
const prefix = (process.env.AVATAR_IMAGES_PREFIX || "avatars").replace(/^\/+|\/+$/g, "");
const localDirectory = path.join(process.cwd(), "storage", "avatars");

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url === "[SENSITIVE]" || key === "[SENSITIVE]") return null;
  return { url, key };
}

function storageObjectPath(fileName: string) {
  return prefix ? `${prefix}/${fileName}` : fileName;
}

function encodedStoragePath(fileName: string) {
  return storageObjectPath(fileName).split("/").map(encodeURIComponent).join("/");
}

export function avatarContentTypeFromName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

export async function storeAvatarImageFile(
  fileName: string,
  bytes: Buffer,
  contentType: string,
) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(
      `${config.url}/storage/v1/object/${bucket}/${encodedStoragePath(fileName)}`,
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

    if (!response.ok) throw new Error(`Avatar storage rejected file: ${response.status}`);
    return;
  }

  await mkdir(localDirectory, { recursive: true });
  await writeFile(path.join(localDirectory, fileName), bytes);
}

export async function readAvatarImageFile(fileName: string) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(
      `${config.url}/storage/v1/object/${bucket}/${encodedStoragePath(fileName)}`,
      {
        headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
        cache: "no-store",
      },
    );

    if (!response.ok) throw new Error(`Avatar unavailable: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(path.join(localDirectory, fileName));
}

export async function deleteAvatarImageFile(fileName: string) {
  const config = supabaseConfig();
  if (config) {
    await fetch(`${config.url}/storage/v1/object/${bucket}/${encodedStoragePath(fileName)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
    });
    return;
  }

  try {
    await unlink(path.join(localDirectory, fileName));
  } catch {
    // Missing files are already effectively deleted.
  }
}
