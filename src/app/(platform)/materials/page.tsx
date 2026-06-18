import { MaterialsPageClient } from "@/components/materials-page-client";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type MaterialWithRelations = Prisma.MaterialGetPayload<{
  include: { subject: true; topic: true };
}>;

export default async function MaterialsPage() {
  await requireUser();
  let materials: MaterialWithRelations[] = [];

  try {
    materials = await db.material.findMany({
      where: { status: "PUBLISHED" },
      include: { subject: true, topic: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    materials = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Materiais"
        title="Cadernos e PDFs premium"
        description="Capas reais do EstudAki, upload de PDF, preco e compra pela Hotmart quando o material for pago. Passe o mouse para ver o efeito 3D."
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
          subject: material.subject ? { name: material.subject.name } : null,
        }))}
      />
    </div>
  );
}
