import { notFound, redirect } from "next/navigation";
import { ExamWorkspace } from "@/components/exam-workspace";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureEstudakiMaterials } from "@/lib/materials-bootstrap";

export default async function BibliotecaMaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  let product;
  try {
    await ensureEstudakiMaterials();
    product = await db.product.findUnique({
      where: { slug },
      include: {
        material: {
          include: { subject: true },
        },
      },
    });
  } catch (error) {
    console.error("Falha ao abrir material da biblioteca", error);
    notFound();
  }

  if (!product) {
    notFound();
  }

  const access = product.material.priceCents <= 0
    ? true
    : await db.userProduct.findUnique({
        where: {
          userId_productId: {
            userId: user.id,
            productId: product.id,
          },
        },
      });

  if (!access) {
    redirect("/materials");
  }

  const material = product.material;
  const fileUrl = material.fileUrl;

  if (!fileUrl) {
    notFound();
  }

  return (
    <ExamWorkspace
      exam={{
        id: product.id,
        title: material.title,
        year: new Date(material.createdAt).getFullYear(),
        phase: "Biblioteca",
        day: null,
        pdfUrl: fileUrl,
        answerKeyUrl: null,
        sourceUrl: product.checkoutUrl ?? material.purchaseUrl,
        imageUrl: product.coverUrl ?? null,
        questionCount: null,
        durationMinutes: null,
        color: "#2563EB",
        official: false,
        vestibular: {
          name: material.subject?.name ?? "EstudAki",
          slug: "biblioteca",
          color: "#2563EB",
        },
      }}
      backHref="/biblioteca"
    />
  );
}
