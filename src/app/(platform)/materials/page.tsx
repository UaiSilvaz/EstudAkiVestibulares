import { PageHeader } from "@/components/page-header";
import { MaterialProfileCard } from "@/components/material-profile-card";
import { MaterialsExplorer, MaterialCardContent } from "@/components/materials-explorer";
import { requireUser } from "@/lib/auth";
import { coverForMaterial } from "@/lib/assets";
import { db } from "@/lib/db";

export default async function MaterialsPage() {
  await requireUser();
  const materials = await db.material.findMany({
    where: { status: "PUBLISHED" },
    include: { subject: true, topic: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Materiais"
        title="Cadernos e PDFs premium"
        description="Capas reais do EstudAki, upload de PDF, preço e compra pela Hotmart quando o material for pago. Passe o mouse para ver o efeito 3D."
      />

      <style>{`
        .pc-card-wrapper.material-pc {
          height: 440px;
          max-height: 440px;
        }
        .pc-card-wrapper.material-pc .pc-card {
          height: 440px;
          max-height: 440px;
        }
        @media (max-width: 768px) {
          .pc-card-wrapper.material-pc,
          .pc-card-wrapper.material-pc .pc-card {
            height: 400px;
            max-height: 400px;
          }
        }
        .material-pc .pc-contact-btn {
          background: linear-gradient(135deg, #2563EB 0%, #22D3EE 100%);
          color: #fff;
          border-color: transparent;
          font-weight: 700;
        }
        .material-pc .pc-contact-btn:hover {
          background: linear-gradient(135deg, #1E40AF 0%, #06B6D4 100%);
        }
        .material-pc .pc-handle,
        .material-pc .pc-status {
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
        }
        .material-pc .pc-details h3 {
          font-size: min(4.5svh, 2.1em);
        }
        .material-pc .pc-details p {
          font-size: 14px;
        }
      `}</style>

      <MaterialsExplorer
        materials={materials}
        cover={(title, index) => coverForMaterial(title, index)}
        renderCard={(material, cover) => {
          const isPaid = material.priceCents > 0 || Boolean(material.purchaseUrl);
          return (
            <div key={material.id} className="flex flex-col items-center">
              <MaterialProfileCard
                avatarUrl={cover.src}
                name={material.title}
                title={material.subject?.name ?? "Geral"}
                handle={material.category ?? material.type ?? "Material"}
                status={material.priceCents > 0 ? `R$ ${(material.priceCents / 100).toFixed(2).replace(".", ",")}` : "Grátis"}
                contactText={
                  !material.fileUrl && material.purchaseUrl
                    ? "Comprar"
                    : material.purchaseUrl
                      ? "Comprar"
                      : material.fileUrl
                        ? "Abrir PDF"
                        : "Aguardando PDF"
                }
                innerGradient={
                  isPaid
                    ? "linear-gradient(145deg, rgba(37,99,235,0.55) 0%, rgba(34,211,238,0.45) 100%)"
                    : "linear-gradient(145deg, rgba(34,197,94,0.55) 0%, rgba(250,204,21,0.45) 100%)"
                }
                behindGlowColor={
                  isPaid
                    ? "rgba(56, 189, 248, 0.55)"
                    : "rgba(132, 204, 22, 0.55)"
                }
                ctaHref={material.purchaseUrl ?? material.fileUrl ?? "#"}
              />
              <MaterialCardContent material={material} cover={cover} />
            </div>
          );
        }}
      />
    </div>
  );
}
