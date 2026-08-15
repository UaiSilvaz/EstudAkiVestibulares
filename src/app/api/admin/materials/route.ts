import { MaterialType } from "@prisma/client";
import { NextResponse } from "next/server";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeMaterialPdf } from "@/lib/material-file-storage";

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

function safeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
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
  const hotmartProductId = String(formData.get("hotmartProductId") ?? "").trim();
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

    const fileName = `${Date.now()}-${safeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await storeMaterialPdf(fileName, buffer);
    fileUrl = `/api/materials/files/${fileName}`;
  }

  const material = await db.$transaction(async (tx) => {
    const createdMaterial = await tx.material.create({
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

    await tx.product.create({
      data: {
        materialId: createdMaterial.id,
        name: createdMaterial.title,
        slug: `${safeSlug(createdMaterial.title)}-${createdMaterial.id.slice(0, 8)}`,
        description: createdMaterial.description,
        priceCents: createdMaterial.priceCents,
        checkoutUrl: createdMaterial.purchaseUrl ?? null,
        hotmartProductId: hotmartProductId || null,
      },
    });

    return createdMaterial;
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
