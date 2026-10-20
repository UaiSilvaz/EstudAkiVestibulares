import type { Prisma } from "@prisma/client";
import { EmptyState } from "@/components/visual/empty-state";
import { LibraryMaterialsClient } from "@/components/library-materials-client";
import { PageHeader } from "@/components/page-header";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courseMaterialAccess } from "@/lib/freemium-access";
import { ensureEstudakiMaterials } from "@/lib/materials-bootstrap";

type LibraryLicense = Pick<Prisma.UserProductGetPayload<{
  include: {
    product: {
      include: {
        material: {
          include: { subject: true; topic: true; product: true };
        };
      };
    };
  };
}>, "product" | "progress" | "lastPage" | "lastOpenedAt">;

export default async function BibliotecaPage() {
  const user = await requirePersistedUser();
  let loadError: string | null = null;
  let licenses: LibraryLicense[] = [];

  try {
    await ensureEstudakiMaterials();
    licenses = await db.userProduct.findMany({
      where: { userId: user.id, revokedAt: null },
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
    {
      const progressByProduct = new Map(licenses.map(license => [license.product.id, license]));
      const products = await db.product.findMany({
        where: { status: "PUBLISHED", materialId: { not: null } },
        include: { material: { include: { subject: true, topic: true, product: true } } },
        orderBy: { createdAt: "desc" },
      });
      const accessible = user.role === "ADMIN" ? products : (await Promise.all(products.map(async product =>
        progressByProduct.has(product.id) || (product.material && await courseMaterialAccess(user.id, product.material.id, product.material.fileUrl)) ? product : null,
      ))).filter((product): product is (typeof products)[number] => Boolean(product));
      licenses = accessible.map(product => ({
        product,
        progress: progressByProduct.get(product.id)?.progress ?? 0,
        lastPage: progressByProduct.get(product.id)?.lastPage ?? 1,
        lastOpenedAt: progressByProduct.get(product.id)?.lastOpenedAt ?? null,
      }));
    }
  } catch (error) {
    console.error("Falha ao carregar biblioteca", error);
    loadError = "Não foi possível carregar sua biblioteca agora. Tente novamente em alguns instantes.";
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
