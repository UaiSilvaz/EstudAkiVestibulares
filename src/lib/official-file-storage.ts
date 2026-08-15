import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const bucket = "official-exam-files";
const localDirectory = path.join(process.cwd(), "storage", "official-files");

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export async function storeOfficialFile(fileName: string, bytes: Buffer) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${fileName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        apikey: config.key,
        "Content-Type": "application/pdf",
        "x-upsert": "false",
      },
      body: new Uint8Array(bytes).buffer,
    });
    if (!response.ok) {
      throw new Error(`Storage recusou o PDF oficial: ${response.status}`);
    }
    return;
  }

  await mkdir(localDirectory, { recursive: true });
  await writeFile(path.join(localDirectory, fileName), bytes);
}

export async function readOfficialFile(fileName: string) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${fileName}`, {
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`PDF oficial indisponível: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(path.join(localDirectory, fileName));
}

export async function deleteOfficialFile(fileName: string) {
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
    // Missing local files are already effectively deleted.
  }
}
