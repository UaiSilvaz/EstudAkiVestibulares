import { ContentStatus, MaterialType } from "@prisma/client";
import { db } from "@/lib/db";

const WHATSAPP_URL = "https://wa.me/5517997172045";

type MaterialSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  subjectSlug: string;
  subjectName: string;
  subjectColor: string;
  priceCents: number;
  oldPriceCents: number;
  coverUrl: string;
  fileName: string;
};

export const estudakiMaterialSeeds: MaterialSeed[] = [
  {
    slug: "kit-enem-estudaki",
    title: "Kit ENEM Norte Preparatórios",
    description: "Preparação completa com cadernos ENEM, cobrindo Exatas, Natureza, Linguagens e Humanas.",
    category: "ENEM",
    subjectSlug: "enem",
    subjectName: "ENEM",
    subjectColor: "#FF6201",
    priceCents: 2990,
    oldPriceCents: 4000,
    coverUrl: "/assets/norte-design/06_Capas_Digitais/kit-enem.svg",
    fileName: "kit-enem-estudaki.pdf",
  },
  {
    slug: "enem-exatas-natureza",
    title: "Caderno ENEM 1000 Questões - Exatas e Natureza",
    description: "Química, Física, Biologia e Matemática com foco em questões estratégicas dos últimos anos.",
    category: "ENEM",
    subjectSlug: "ciencias-da-natureza",
    subjectName: "Ciências da Natureza",
    subjectColor: "#22C55E",
    priceCents: 1990,
    oldPriceCents: 2900,
    coverUrl: "/assets/norte-design/06_Capas_Digitais/enem-exatas-natureza.svg",
    fileName: "enem-exatas-natureza.pdf",
  },
  {
    slug: "enem-humanas-linguagens",
    title: "Caderno ENEM 1000 Questões - Linguagens e Humanas",
    description: "Linguagens, interpretação, humanas e repertório para revisar com questões selecionadas.",
    category: "ENEM",
    subjectSlug: "linguagens",
    subjectName: "Linguagens",
    subjectColor: "#F97316",
    priceCents: 1990,
    oldPriceCents: 2900,
    coverUrl: "/assets/norte-design/06_Capas_Digitais/enem-humanas-linguagens.svg",
    fileName: "enem-humanas-linguagens.pdf",
  },
  {
    slug: "formula-aprovacao-etec",
    title: "Fórmula da Aprovação ETEC",
    description: "Roteiro direto para revisar conteúdos, treinar provas antigas e chegar no vestibulinho com plano.",
    category: "Vestibulinho",
    subjectSlug: "etec",
    subjectName: "ETEC",
    subjectColor: "#06B6D4",
    priceCents: 1990,
    oldPriceCents: 2900,
    coverUrl: "/assets/norte-design/06_Capas_Digitais/formula-aprovacao-etec.svg",
    fileName: "formula-aprovacao-etec.pdf",
  },
  {
    slug: "super-pack-etec",
    title: "Super Pack 250 Questões ETEC - Completo",
    description: "Pacotão com 250 questões selecionadas para treinar todas as áreas do vestibulinho ETEC.",
    category: "Vestibulinho",
    subjectSlug: "etec",
    subjectName: "ETEC",
    subjectColor: "#06B6D4",
    priceCents: 1990,
    oldPriceCents: 2900,
    coverUrl: "/assets/norte-design/06_Capas_Digitais/super-pack-etec.svg",
    fileName: "super-pack-etec.pdf",
  },
];

function purchaseUrl(seed: MaterialSeed) {
  const text = `Olá, quero comprar ${seed.title} no Norte Preparatórios.`;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

const globalForMaterials = globalThis as unknown as {
  estudakiMaterialsSeed?: Promise<void>;
};

async function seedMaterials() {

  for (const seed of estudakiMaterialSeeds) {
    const subject = await db.subject.upsert({
      where: { slug: seed.subjectSlug },
      update: { name: seed.subjectName, color: seed.subjectColor },
      create: { slug: seed.subjectSlug, name: seed.subjectName, color: seed.subjectColor },
      select: { id: true },
    });

    const fileUrl = `/api/materials/files/${seed.fileName}`;
    const product = await db.product.findUnique({
      where: { slug: seed.slug },
      select: { id: true, materialId: true },
    });

    const material = product?.materialId
      ? await db.material.update({
          where: { id: product.materialId },
          data: {
            subjectId: subject.id,
            title: seed.title,
            description: seed.description,
            category: seed.category,
            type: MaterialType.PDF,
            premium: true,
            priceCents: seed.priceCents,
            purchaseUrl: purchaseUrl(seed),
            fileUrl,
            status: ContentStatus.PUBLISHED,
          },
          select: { id: true },
        })
      : await db.material.create({
          data: {
            subjectId: subject.id,
            title: seed.title,
            description: seed.description,
            category: seed.category,
            type: MaterialType.PDF,
            premium: true,
            priceCents: seed.priceCents,
            purchaseUrl: purchaseUrl(seed),
            fileUrl,
            status: ContentStatus.PUBLISHED,
          },
          select: { id: true },
        });

    await db.product.upsert({
      where: { slug: seed.slug },
      update: {
        materialId: material.id,
        name: seed.title,
        description: seed.description,
        priceCents: seed.priceCents,
        coverUrl: seed.coverUrl,
        checkoutUrl: purchaseUrl(seed),
        status: ContentStatus.PUBLISHED,
      },
      create: {
        materialId: material.id,
        name: seed.title,
        slug: seed.slug,
        description: seed.description,
        priceCents: seed.priceCents,
        coverUrl: seed.coverUrl,
        checkoutUrl: purchaseUrl(seed),
        status: ContentStatus.PUBLISHED,
      },
    });
  }

}

export async function ensureEstudakiMaterials() {
  globalForMaterials.estudakiMaterialsSeed ??= seedMaterials().catch((error) => {
    globalForMaterials.estudakiMaterialsSeed = undefined;
    console.error("Falha ao garantir materiais Norte Preparatórios", error);
  });
  await globalForMaterials.estudakiMaterialsSeed;
}
