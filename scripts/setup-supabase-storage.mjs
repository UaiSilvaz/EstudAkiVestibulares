const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !new URL(url).hostname.endsWith(".supabase.co")) {
  throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do projeto de destino.");
}
const apply = process.argv.includes("--apply");
const headers = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" };
const names = [...new Set(["exam-pdfs", "material-pdfs", "question-images", "official-exam-files", "essay-images",
  process.env.COURSE_MEDIA_BUCKET || "question-images", process.env.AVATAR_IMAGES_BUCKET || "question-images"])];
let errors = 0;
for (const name of names) {
  const path = `${url}/storage/v1/bucket/${encodeURIComponent(name)}`;
  const response = await fetch(path, { headers, signal: AbortSignal.timeout(15_000) });
  if (response.ok) {
    const bucket = await response.json();
    if (bucket.public) {
      if (apply) {
        const changed = await fetch(path, { method: "PUT", headers, body: JSON.stringify({ public: false }), signal: AbortSignal.timeout(15_000) });
        if (!changed.ok) { errors++; console.error(`${name}: não foi possível tornar privado (${changed.status}).`); }
        else console.log(`${name}: privado.`);
      } else { errors++; console.error(`${name}: está público; execute com --apply para proteger.`); }
    } else console.log(`${name}: privado.`);
  } else if (response.status === 404 || (response.status === 400 && /not found|does not exist/i.test(await response.text()))) {
    if (!apply) { errors++; console.error(`${name}: ausente.`); continue; }
    const created = await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers,
      body: JSON.stringify({ id: name, name, public: false }), signal: AbortSignal.timeout(15_000) });
    if (!created.ok) { errors++; console.error(`${name}: criação recusada (${created.status}).`); }
    else console.log(`${name}: criado privado.`);
  } else { errors++; console.error(`${name}: consulta recusada (${response.status}).`); }
}
if (errors) process.exitCode = 1;
else console.log("Buckets privados disponíveis. Os arquivos e as permissões das aulas ainda precisam ser validados.");
