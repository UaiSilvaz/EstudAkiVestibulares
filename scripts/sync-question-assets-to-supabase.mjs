import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
]);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Env ausente: ${name}`);
  return value;
}

function encodeObjectPath(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      yield fullPath;
    }
  }
}

async function uploadFile({ bucket, filePath, root, serviceRoleKey, supabaseUrl }) {
  const relativePath = path.relative(root, filePath).replaceAll("\\", "/");
  const extension = path.extname(relativePath).toLowerCase();
  const mimeType = ALLOWED_EXTENSIONS.get(extension);
  const size = (await stat(filePath)).size;
  const body = await readFile(filePath);
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${encodeObjectPath(relativePath)}`,
    {
      method: "POST",
      body,
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Cache-Control": "31536000",
        "Content-Type": mimeType,
        "Content-Length": String(size),
        "x-upsert": "true",
      },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${relativePath}: ${response.status} ${text}`);
  }

  return { relativePath, size };
}

async function main() {
  const root = path.resolve(argument("--root", "storage/questoes"));
  const bucket = argument("--bucket", process.env.QUESTION_ASSETS_BUCKET || "question-images");
  const concurrency = positiveInteger(argument("--concurrency", "8"), 8);
  const include = argument("--include", "");
  const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const files = [];
  for await (const file of walk(root)) {
    const relativePath = path.relative(root, file).replaceAll("\\", "/");
    if (!include || relativePath.includes(include)) files.push(file);
  }

  let uploaded = 0;
  let totalBytes = 0;
  let cursor = 0;
  const errors = [];

  async function worker() {
    while (cursor < files.length) {
      const current = files[cursor++];
      try {
        const result = await uploadFile({
          bucket,
          filePath: current,
          root,
          serviceRoleKey,
          supabaseUrl,
        });
        uploaded += 1;
        totalBytes += result.size;
        if (uploaded % 100 === 0 || uploaded === files.length) {
          console.log(
            JSON.stringify({
              uploaded,
              total: files.length,
              latest: result.relativePath,
            }),
          );
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));

  const summary = {
    bucket,
    root,
    total: files.length,
    uploaded,
    errors: errors.length,
    totalBytes,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (errors.length) {
    console.error(JSON.stringify({ failed: errors.slice(0, 20) }, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
