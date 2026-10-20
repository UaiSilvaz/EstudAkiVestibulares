import { MaterialsPageClient } from "@/components/materials-page-client";
import { PageHeader } from "@/components/page-header";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courseMaterialAccess } from "@/lib/freemium-access";
import { ensureEstudakiMaterials } from "@/lib/materials-bootstrap";
import type { Prisma } from "@prisma/client";

type MaterialWithRelations = Prisma.MaterialGetPayload<{
  include: { subject: true; topic: true; product: true };
}>;

export default async function MaterialsPage() {
  const user = await requirePersistedUser();
  let materials: MaterialWithRelations[] = [];
  let ownedProductIds = new Set<string>();

  try {
    await ensureEstudakiMaterials();
    const [materialList, licenses] = await Promise.all([
      db.material.findMany({
        where: { status: "PUBLISHED" },
        include: { subject: true, topic: true, product: true },
        orderBy: { createdAt: "desc" },
      }),
      db.userProduct.findMany({
        where: { userId: user.id, revokedAt: null },
        select: { productId: true },
      }),
    ]);
    materials = materialList;
    ownedProductIds = new Set(licenses.map((item) => item.productId));
    await Promise.all(materialList.map(async material => { if (material.product && await courseMaterialAccess(user.id, material.id, material.fileUrl)) ownedProductIds.add(material.product.id); }));
  } catch {
    materials = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Materiais"
        title="Cadernos e PDFs premium"
        description="Cadernos Norte Preparatórios em PDF, checkout seguro e acesso após a confirmação do pagamento."
      />

      <MaterialsPageClient
        materials={materials.map((material) => ({
          id: material.id,
          title: material.title,
          description: material.description,
          type: material.type,
          category: material.category,
          priceCents: material.priceCents,
          purchaseUrl: material.purchaseUrl,
          fileUrl: material.fileUrl,
          owned: user.role === "ADMIN" || (material.product ? ownedProductIds.has(material.product.id) : material.priceCents <= 0),
          product: material.product
            ? {
                id: material.product.id,
                slug: material.product.slug,
                checkoutUrl: material.product.checkoutUrl,
                coverUrl: material.product.coverUrl,
              }
            : null,
          subject: material.subject ? { name: material.subject.name } : null,
        }))}
      />
    </div>
  );
}
