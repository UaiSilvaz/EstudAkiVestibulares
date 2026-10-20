import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureEducationCatalog } from "@/lib/preparations";
import { OfficialOfferManager } from "@/components/admin/official-offer-manager";
import { PageHeader } from "@/components/page-header";
export default async function OffersPage() {
  const user = await requireUser(); if (user.role !== "ADMIN") redirect("/dashboard");
  await ensureEducationCatalog();
  const [courses, preparations] = await Promise.all([
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, priceCents: true, isFree: true } }),
    db.preparation.findMany({ orderBy: { name: "asc" }, include: { courses: true, products: { include: { product: true }, orderBy: { productId: "asc" } } } }),
  ]);
  return <div className="space-y-5"><PageHeader title="Ofertas oficiais Norte Preparatórios" eyebrow="Administração" description="Conta gratuita. Cada curso ou preparatório é uma compra individual, sem assinatura obrigatória." />
    <OfficialOfferManager courses={courses.map(course => ({ ...course, name: course.title, courseIds: [] }))} preparations={preparations.map(preparation => ({ id: preparation.id, name: preparation.name, isFree: false, priceCents: preparation.products.find(link => link.product.slug.startsWith("official-preparation-"))?.product.priceCents ?? 0, courseIds: preparation.courses.map(link => link.courseId) }))} />
  </div>;
}
