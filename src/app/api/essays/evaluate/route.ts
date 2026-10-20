import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluateEssay } from "@/lib/essay-evaluator";
import { essayImage } from "@/lib/essay-image-storage";
import { detectImageContentType } from "@/server/security/uploads";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const userId = user ? await getPersistedUserId(user) : null;
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) {
    return NextResponse.json({ error: "Envio muito grande." }, { status: 413 });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Envio inválido." }, { status: 400 }); }
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
    const bytes = Buffer.from(await image.arrayBuffer());
    if (!detectImageContentType(bytes)) {
      return NextResponse.json({ error: "Use uma imagem JPG, PNG ou WEBP válida." }, { status: 400 });
    }
    const fileName = `${randomUUID()}.webp`;
    let normalized: Buffer;
    try { normalized = await sharp(bytes, { limitInputPixels: 25_000_000 }).rotate().webp({ quality: 85 }).toBuffer(); }
    catch { return NextResponse.json({ error: "Imagem inválida." }, { status: 400 }); }
    try { await essayImage(fileName, normalized); }
    catch { return NextResponse.json({ error: "Não foi possível armazenar a imagem. Tente novamente." }, { status: 503 }); }
    imageUrl = `/api/essays/images/${fileName}`;
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
