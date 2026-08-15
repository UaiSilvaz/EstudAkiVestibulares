import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readMaterialPdf } from "@/lib/material-file-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const request = _request;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { fileName } = await params;
  if (!/^[a-z0-9-]+\.(pdf)$/i.test(fileName)) {
    return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 });
  }

  const url = `/api/materials/files/${fileName}`;
  const material = await db.material.findFirst({
    where: { fileUrl: url },
    include: { product: true },
  });

  if (!material) {
    return NextResponse.json({ error: "Arquivo não vinculado." }, { status: 404 });
  }

  const requiresLicense =
    material.priceCents > 0 ||
    Boolean(material.purchaseUrl) ||
    Boolean(material.product?.checkoutUrl) ||
    material.premium;
  if (requiresLicense && user.role !== Role.ADMIN) {
    const license = material.product
      ? await db.userProduct.findUnique({
          where: {
            userId_productId: {
              userId: user.id,
              productId: material.product.id,
            },
          },
        })
      : null;

    if (!license) {
      return NextResponse.json({ error: "Você precisa comprar este material." }, { status: 403 });
    }
  }

  try {
    const bytes = await readMaterialPdf(fileName);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download ? `attachment; filename="${fileName}"` : "inline",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
