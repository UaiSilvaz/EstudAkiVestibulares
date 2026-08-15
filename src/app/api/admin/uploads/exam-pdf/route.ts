import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { storeExamPdf } from "@/lib/exam-file-storage";
import { looksLikePdf } from "@/server/security/uploads";

const MAX_FILE_SIZE = 35 * 1024 * 1024;

function safeFileName(name: string, kind: string) {
  const extension = path.extname(name).toLowerCase() || ".pdf";
  const base = path
    .basename(name, extension)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

  return `${kind}-${base || "documento"}-${randomUUID()}${extension}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind") === "answer" ? "answer" : "exam";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo PDF ausente." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "PDF muito grande. Limite: 35 MB." }, { status: 413 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json({ error: "Envie apenas arquivos PDF." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLikePdf(bytes)) {
    return NextResponse.json({ error: "O arquivo enviado nao parece ser um PDF valido." }, { status: 400 });
  }

  const fileName = safeFileName(file.name, kind);
  await storeExamPdf(fileName, bytes);

  return NextResponse.json({
    url: `/api/exams/files/${fileName}`,
    name: file.name,
    size: file.size,
  });
}
