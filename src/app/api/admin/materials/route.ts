import { MaterialType } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function priceToCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const type = String(formData.get("type") ?? "PDF") as MaterialType;
  const purchaseUrl = String(formData.get("purchaseUrl") ?? "").trim();
  const premium = String(formData.get("premium") ?? "false") === "true";
  const priceCents = priceToCents(formData.get("price"));
  const file = formData.get("file");

  if (!title || !category || !description) {
    return NextResponse.json({ error: "Campos obrigatorios ausentes." }, { status: 400 });
  }

  let fileUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Envie apenas arquivos PDF." }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "materials");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${safeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, fileName), buffer);
    fileUrl = `/uploads/materials/${fileName}`;
  }

  const material = await db.material.create({
    data: {
      title,
      subjectId: subjectId || null,
      type: Object.values(MaterialType).includes(type) ? type : MaterialType.PDF,
      category,
      description,
      fileUrl,
      priceCents,
      purchaseUrl: purchaseUrl || null,
      premium: premium || priceCents > 0,
      status: "PUBLISHED",
    },
  });

  await db.activity.create({
    data: {
      userId: user.id,
      type: "CONTENT",
      message: `${user.name} cadastrou o material ${title}.`,
    },
  });

  return NextResponse.json({ material });
}
