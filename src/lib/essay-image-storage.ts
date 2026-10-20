import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const bucket = "essay-images";
const directory = path.join(process.cwd(), "storage", "essays");

export async function essayImage(fileName: string, bytes?: Buffer) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURIComponent(fileName)}`, {
      method: bytes ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${key}`, apikey: key,
        ...(bytes ? { "Content-Type": "image/webp", "x-upsert": "false" } : {}),
      },
      body: bytes ? new Uint8Array(bytes).buffer : undefined,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Imagem da redação indisponível no armazenamento.");
    return bytes ? null : Buffer.from(await response.arrayBuffer());
  }
  if (process.env.NODE_ENV === "production") throw new Error("Armazenamento privado não configurado.");
  if (bytes) {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), bytes);
    return null;
  }
  return readFile(path.join(directory, fileName));
}
