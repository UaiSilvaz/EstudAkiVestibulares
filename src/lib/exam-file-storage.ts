import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const bucket = "exam-pdfs";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export async function storeExamPdf(fileName: string, bytes: Buffer) {
  const config = supabaseConfig();
  if (config) {
    const body = new Uint8Array(bytes).buffer;
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${fileName}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key, "Content-Type": "application/pdf", "x-upsert": "false" },
      body,
    });
    if (!response.ok) throw new Error(`Supabase Storage recusou o upload: ${response.status}`);
    return;
  }

  const directory = path.join(process.cwd(), "storage", "exams");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), bytes);
}

export async function readExamPdf(fileName: string) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${fileName}`, {
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key }, cache: "no-store",
    });
    if (!response.ok) throw new Error(`PDF privado indisponível: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(path.join(process.cwd(), "storage", "exams", fileName));
}
