import type { Prisma } from "@prisma/client";
import { EmptyState } from "@/components/visual/empty-state";
import { LibraryMaterialsClient } from "@/components/library-materials-client";
import { PageHeader } from "@/components/page-header";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureEstudakiMaterials } from "@/lib/materials-bootstrap";

type LibraryLicense = Prisma.UserProductGetPayload<{
  include: {
    product: {
      include: {
        material: {
          include: { subject: true; topic: true; product: true };
        };
      };
    };
  };
}>;

export default async function BibliotecaPage() {
  const user = await requirePersistedUser();
  let loadError: string | null = null;
  let licenses: LibraryLicense[] = [];

  try {
    await ensureEstudakiMaterials();
    licenses = await db.userProduct.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            material: {
              include: { subject: true, topic: true, product: true },
            },
          },
        },
      },
      orderBy: [{ unlockedAt: "desc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("Falha ao carregar biblioteca", error);
    loadError = "Nao foi possivel carregar sua biblioteca agora. Tente novamente em alguns instantes.";
  }

  const materials = licenses.flatMap((license) => {
    const product = license.product;
    const material = product?.material;
    if (!product || !material) return [];
    return [{
    id: material.id,
    title: material.title,
    description: material.description,
    type: material.type,
    category: material.category,
    priceCents: material.priceCents,
    purchaseUrl: product.checkoutUrl ?? material.purchaseUrl,
    fileUrl: material.fileUrl,
    owned: true,
    product: {
      id: product.id,
      slug: product.slug,
      checkoutUrl: product.checkoutUrl,
      coverUrl: product.coverUrl,
    },
    subject: material.subject ? { name: material.subject.name } : null,
    progress: license.progress,
    lastPage: license.lastPage,
    lastOpenedAt: license.lastOpenedAt?.toISOString() ?? null,
  }];
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Biblioteca"
        title="Minha Biblioteca"
        description="Materiais comprados, liberados e prontos para continuar lendo, baixar ou editar."
      />

      {loadError ? (
        <EmptyState
          title="Biblioteca indisponivel"
          description={loadError}
          accent="orange"
        />
      ) : materials.length === 0 ? (
        <EmptyState
          title="Nenhum material liberado ainda"
          description="Quando uma compra for aprovada, o material entra aqui automaticamente."
          accent="blue"
        />
      ) : (
        <LibraryMaterialsClient materials={materials} />
      )}
    </div>
  );
}
