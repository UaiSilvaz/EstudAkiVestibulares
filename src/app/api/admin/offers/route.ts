import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readJsonRequest } from "@/server/security/request";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Somente administradores configuram ofertas oficiais." }, { status: 403 });
  const parsed = await readJsonRequest<{ kind?: string; id?: string; priceCents?: number; isFree?: boolean; courseIds?: string[] }>(request, { maxBytes: 8192 });
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;
  if (!input || !["course", "preparation"].includes(input.kind ?? "") || typeof input.id !== "string" || typeof input.isFree !== "boolean" ||
    !Number.isSafeInteger(input.priceCents) || input.priceCents! < 0 || input.priceCents! > 1_000_000 ||
    (input.kind === "preparation" && input.isFree) || (!input.isFree && input.priceCents! < 100) ||
    (input.courseIds !== undefined && (!Array.isArray(input.courseIds) || input.courseIds.length > 100 || input.courseIds.some(id => typeof id !== "string")))) {
    return NextResponse.json({ error: "Informe uma oferta válida: curso gratuito ou preço a partir de R$ 1,00." }, { status: 400 });
  }
  try {
    const product = await db.$transaction(async tx => {
      const record = input.kind === "course"
        ? await tx.course.findUnique({ where: { id: input.id }, select: { id: true, slug: true, title: true, description: true } })
        : await tx.preparation.findUnique({ where: { id: input.id }, select: { id: true, slug: true, name: true, description: true } });
      if (!record) throw new Error("Conteúdo não encontrado.");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`official-offer:${input.kind}:${record.id}`}))`;
      if (input.kind === "preparation" && input.courseIds) {
        if (await tx.course.count({ where: { id: { in: input.courseIds } } }) !== new Set(input.courseIds).size) throw new Error("Curso inválido.");
        await tx.preparationCourse.deleteMany({ where: { preparationId: record.id } });
        await tx.preparationCourse.createMany({ data: [...new Set(input.courseIds)].map((courseId, position) => ({ preparationId: record.id, courseId, position })) });
      }
      const priceCents = input.isFree ? 0 : input.priceCents!;
      if (input.kind === "course") await tx.course.update({ where: { id: record.id }, data: { isFree: input.isFree, priceCents } });
      else await tx.preparation.update({ where: { id: record.id }, data: { isFree: false } });
      const slug = `official-${input.kind}-${record.slug}`;
      const name = "title" in record ? record.title : record.name;
      const existing = await tx.product.findUnique({ where: { slug } });
      const offer = await tx.product.upsert({ where: { slug },
        create: { name, slug, description: record.description, priceCents, status: input.isFree ? "DRAFT" : "PUBLISHED" },
        update: { name, description: record.description, priceCents, status: input.isFree ? "DRAFT" : "PUBLISHED",
          ...(existing?.priceCents !== priceCents ? { abacateProductId: null } : {}) },
      });
      if (input.kind === "course") await tx.courseProduct.upsert({ where: { courseId_productId: { courseId: record.id, productId: offer.id } }, update: {}, create: { courseId: record.id, productId: offer.id } });
      else await tx.preparationProduct.upsert({ where: { preparationId_productId: { preparationId: record.id, productId: offer.id } }, update: {}, create: { preparationId: record.id, productId: offer.id } });
      return offer;
    });
    return NextResponse.json({ product, message: "Oferta salva. O pagamento exige a sincronização com o provedor." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a oferta." }, { status: 400 });
  }
}
