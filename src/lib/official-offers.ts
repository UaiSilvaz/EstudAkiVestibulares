import { db } from "@/lib/db";
import { validEntitlementWhere } from "@/lib/freemium";

export function paymentsConfigured() {
  return process.env.PAYMENT_PROVIDER === "hotmart" || Boolean(process.env.ABACATEPAY_API_KEY);
}

export async function preparationOffer(preparationId: string) {
  const preparation = await db.preparation.findFirst({ where: { id: preparationId, status: "PUBLISHED" }, include: {
    products: { include: { product: true } },
    courses: { include: { course: { select: { id: true, published: true, status: true, modules: { select: { module: { select: { lessons: { where: { lesson: { status: "PUBLISHED" } }, take: 1, select: { lessonId: true } } } } } } } } } },
  } });
  if (!preparation) return null;
  const offers = preparation.products.map(link => link.product).filter(product => product.status === "PUBLISHED" && product.priceCents >= 100)
    .sort((a, b) => Number(b.slug.startsWith("official-preparation-")) - Number(a.slug.startsWith("official-preparation-")) || a.id.localeCompare(b.id));
  const product = offers[0] ?? null;
  const ready = preparation.courses.length > 0 && preparation.courses.every(({ course }) => (course.published || course.status === "PUBLISHED") && course.modules.some(link => link.module.lessons.length > 0));
  return { preparation, product, ready, canPurchase: ready && Boolean(product) && paymentsConfigured() && Boolean(process.env.PAYMENT_PROVIDER === "hotmart" ? product?.checkoutUrl : product?.abacateProductId) };
}

export async function preparationOwned(userId: string, preparationId: string) {
  return Boolean(await db.entitlement.findFirst({ where: { ...validEntitlementWhere(userId), preparationId }, select: { id: true } }));
}
