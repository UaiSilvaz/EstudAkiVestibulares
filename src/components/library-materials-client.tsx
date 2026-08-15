"use client";

import { MaterialCardContent, MaterialsExplorer } from "@/components/materials-explorer";
import { MaterialProfileCard } from "@/components/material-profile-card";
import { coverForMaterial } from "@/lib/assets";

type LibraryMaterial = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  category: string | null;
  priceCents: number;
  purchaseUrl: string | null;
  fileUrl: string | null;
  owned: boolean;
  product: {
    id: string;
    slug: string;
    checkoutUrl: string | null;
    coverUrl: string | null;
  };
  subject: { name: string } | null;
  progress: number;
  lastPage: number | null;
  lastOpenedAt: string | null;
};

export function LibraryMaterialsClient({ materials }: { materials: LibraryMaterial[] }) {
  return (
    <MaterialsExplorer
      materials={materials}
      cover={(title, index) => coverForMaterial(title, index)}
      renderCard={(material, cover) => (
        <div key={material.id} className="flex flex-col items-center">
          <MaterialProfileCard
            avatarUrl={material.product?.coverUrl ?? cover.src}
            name={material.title}
            title={material.subject?.name ?? "Geral"}
            handle={material.category ?? material.type ?? "Material"}
            status={`Lido ${Math.round((material.progress ?? 0) * 100)}%`}
            contactText="Continuar"
            ctaHref={material.product?.slug ? `/biblioteca/${material.product.slug}` : material.fileUrl ?? "#"}
            innerGradient="linear-gradient(145deg, rgba(37,99,235,0.55) 0%, rgba(34,211,238,0.45) 100%)"
            behindGlowColor="rgba(56, 189, 248, 0.55)"
          />
          <MaterialCardContent material={material} cover={cover} />
        </div>
      )}
    />
  );
}
