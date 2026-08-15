import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluateEssay } from "@/lib/essay-evaluator";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const userId = user ? await getPersistedUserId(user) : null;
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const form = await request.formData();
  const theme = String(form.get("theme") ?? "").trim();
  const text = String(form.get("text") ?? "").trim();
  const ocrText = String(form.get("ocrText") ?? "").trim() || null;
  const image = form.get("image");
  if (!theme || !text) {
    return NextResponse.json({ error: "Informe o tema e o texto da redação." }, { status: 400 });
  }
  if (text.length > 30000) {
    return NextResponse.json({ error: "Texto muito extenso." }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/") || image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Envie uma imagem de até 10 MB." }, { status: 400 });
    }
    const extension = path.extname(image.name).toLowerCase() || ".jpg";
    const fileName = `${randomUUID()}${[".png", ".jpg", ".jpeg", ".webp"].includes(extension) ? extension : ".jpg"}`;
    const directory = path.join(process.cwd(), "public", "uploads", "essays");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), Buffer.from(await image.arrayBuffer()));
    imageUrl = `/uploads/essays/${fileName}`;
  }

  const evaluation = evaluateEssay(text, theme);
  const submission = await db.essaySubmission.create({
    data: {
      userId,
      theme,
      text,
      imageUrl,
      ocrText,
      score: evaluation.score,
      competencies: JSON.stringify(evaluation.competencies),
      strengths: JSON.stringify(evaluation.strengths),
      improvements: JSON.stringify(evaluation.improvements),
    },
  });
  return NextResponse.json({ submission, evaluation });
}
