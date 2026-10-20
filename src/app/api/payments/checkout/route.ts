import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { preparationOffer, preparationOwned } from "@/lib/official-offers";
import { courseEntitlement } from "@/lib/freemium-access";
import { abacateRequest, abacateTestMode, type AbacateCheckout, type CheckoutItem } from "@/lib/payments/abacatepay";
import { checkRateLimit } from "@/server/security/rate-limit";
import { readJsonRequest } from "@/server/security/request";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  const limit = checkRateLimit({ key: `checkout:${user.id}`, limit: 8, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: "Aguarde antes de tentar novamente." }, { status: 429 });
  const parsed = await readJsonRequest<{ courseId?: string; productId?: string; preparationId?: string; method?: string }>(request, { maxBytes: 4096 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body || typeof body !== "object" || (body.courseId !== undefined && typeof body.courseId !== "string") ||
    (body.productId !== undefined && typeof body.productId !== "string") || (body.preparationId !== undefined && typeof body.preparationId !== "string") ||
    [body.productId, body.courseId, body.preparationId].filter(Boolean).length > 1 || (body.method !== undefined && !["PIX", "CARD", "BOLETO"].includes(body.method))) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const method = body.method || "PIX";
  try {
    let selected: Array<{ productId: string; quantity: number }>;
    if (body.preparationId) {
      const offer = await preparationOffer(body.preparationId);
      if (!offer?.ready || !offer.product) return NextResponse.json({ error: "Este preparatório está em breve: aguarde a publicação do conteúdo e da oferta." }, { status: 409 });
      if (await preparationOwned(user.id, body.preparationId)) return NextResponse.json({ error: "Este preparatório já está liberado na sua conta." }, { status: 409 });
      selected = [{ productId: offer.product.id, quantity: 1 }];
    } else if (body.courseId) {
      if (await courseEntitlement(user.id, body.courseId)) return NextResponse.json({ error: "Este curso já está liberado na sua conta." }, { status: 409 });
      const links = await db.courseProduct.findMany({ where: { courseId: body.courseId, course: { isFree: false, priceCents: { gte: 100 }, OR: [{ published: true }, { status: "PUBLISHED" }] }, product: { status: "PUBLISHED" } }, include: { product: true }, orderBy: { productId: "asc" } });
      const link = links.find(link => link.product.slug.startsWith("official-course-")) ?? links[0];
      if (!link) return NextResponse.json({ error: "Este curso ainda não possui uma oferta disponível." }, { status: 409 });
      selected = [{ productId: link.productId, quantity: 1 }];
    } else if (body.productId) selected = [{ productId: body.productId, quantity: 1 }];
    else selected = await db.cartItem.findMany({ where: { userId: user.id, status: "CART" }, select: { productId: true, quantity: true } });
    if (!selected.length || selected.length > 20) return NextResponse.json({ error: "Escolha de 1 a 20 produtos." }, { status: 400 });
    const products = await db.product.findMany({ where: { id: { in: selected.map(item => item.productId) }, status: "PUBLISHED" } });
    if (products.length !== selected.length) return NextResponse.json({ error: "Um produto não está mais disponível." }, { status: 409 });
    for (const product of products) {
      const preparations = await db.preparationProduct.findMany({ where: { productId: product.id }, select: { preparationId: true } });
      for (const link of preparations) {
        const offer = await preparationOffer(link.preparationId);
        if (!offer?.ready || offer.product?.id !== product.id) return NextResponse.json({ error: "Este preparatório ainda não está disponível para compra." }, { status: 409 });
        if (await preparationOwned(user.id, link.preparationId)) return NextResponse.json({ error: "Você já possui este preparatório." }, { status: 409 });
      }
      const courses = await db.courseProduct.findMany({ where: { productId: product.id }, include: { course: { select: { isFree: true, priceCents: true, published: true, status: true, modules: { select: { module: { select: { lessons: { where: { lesson: { status: "PUBLISHED" } }, take: 1, select: { lessonId: true } } } } } } } } } });
      for (const link of courses) {
        if (link.course.isFree || (!link.course.published && link.course.status !== "PUBLISHED") || link.course.priceCents !== product.priceCents) return NextResponse.json({ error: "A oferta deste curso precisa ser atualizada." }, { status: 409 });
        if (!link.course.modules.some(item => item.module.lessons.length > 0)) return NextResponse.json({ error: "Este curso ainda não possui conteúdo publicado para compra." }, { status: 409 });
        if (await courseEntitlement(user.id, link.courseId)) return NextResponse.json({ error: "Você já possui este curso." }, { status: 409 });
      }
      if ((preparations.length || courses.length) && selected.find(item => item.productId === product.id)?.quantity !== 1) return NextResponse.json({ error: "Cursos e preparatórios são comprados uma vez por conta." }, { status: 400 });
    }

    if (process.env.PAYMENT_PROVIDER === "hotmart") {
      if (products.length !== 1 || !products[0].checkoutUrl?.startsWith("https://")) return NextResponse.json({ error: "Finalize um produto por vez no checkout Hotmart." }, { status: 409 });
      return NextResponse.json({ url: products[0].checkoutUrl, provider: "HOTMART" });
    }
    if (!process.env.ABACATEPAY_API_KEY) return NextResponse.json({ error: "O pagamento está sendo configurado. Tente novamente mais tarde." }, { status: 503 });
    if (products.some(product => !product.abacateProductId || product.priceCents < 100)) return NextResponse.json({ error: "A oferta precisa ser configurada antes de receber pagamentos." }, { status: 409 });
    const items: CheckoutItem[] = products.map(product => ({ productId: product.id, providerProductId: product.abacateProductId!,
      priceCents: product.priceCents, quantity: selected.find(item => item.productId === product.id)!.quantity, name: product.name,
    })).sort((a, b) => a.productId.localeCompare(b.productId));
    if (items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
    await Promise.all(items.map(async item => {
      const remote = await abacateRequest<{ id: string; price: number; status: string; currency: string; cycle?: string | null }>(`products/get?id=${encodeURIComponent(item.providerProductId)}`);
      if (remote.id !== item.providerProductId || remote.price !== item.priceCents || remote.currency !== "BRL" || remote.status !== "ACTIVE" || remote.cycle) {
        throw new Error("O preço da oferta precisa ser atualizado. Tente novamente mais tarde.");
      }
    }));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return NextResponse.json({ error: "Checkout indisponível no momento." }, { status: 503 });
    const amount = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    if (!Number.isSafeInteger(amount) || amount > 100_000_000) return NextResponse.json({ error: "Valor do pedido inválido." }, { status: 400 });
    const order = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkout-user:${user.id}`}))`;
      const pending = await tx.checkoutOrder.findMany({ where: { userId: user.id, method, status: "PENDING", devMode: abacateTestMode(), createdAt: { gt: new Date(Date.now() - 15 * 60_000) } }, orderBy: { createdAt: "desc" }, take: 20 });
      const existing = pending.find(order => {
        const saved = order.items as CheckoutItem[];
        return order.checkoutUrl && Array.isArray(saved) && saved.length === items.length && items.every(item => saved.some(previous =>
          previous.productId === item.productId && previous.providerProductId === item.providerProductId && previous.priceCents === item.priceCents && previous.quantity === item.quantity));
      });
      if (existing) return existing;
      const created = await tx.checkoutOrder.create({ data: { userId: user.id, method, amountCents: amount, items, devMode: abacateTestMode() } });
      const checkout = await abacateRequest<AbacateCheckout>("checkouts/create", {
        items: items.map(item => ({ id: item.providerProductId, quantity: item.quantity })), methods: [method], externalId: created.id,
        returnUrl: new URL("/carrinho", appUrl).toString(), completionUrl: new URL(`/pagamento/${created.id}`, appUrl).toString(),
        metadata: { orderId: created.id },
      });
      const url = new URL(checkout.url);
      if (url.protocol !== "https:" || !(url.hostname === "abacatepay.com" || url.hostname.endsWith(".abacatepay.com")) || !checkout.id || checkout.externalId !== created.id || checkout.amount !== amount || checkout.devMode !== created.devMode) {
        throw new Error("O provedor retornou uma cobrança incompatível.");
      }
      return tx.checkoutOrder.update({ where: { id: created.id }, data: { providerCheckoutId: checkout.id, checkoutUrl: checkout.url } });
    }, { timeout: 30_000 });
    return NextResponse.json({ url: order.checkoutUrl, orderId: order.id, provider: "ABACATEPAY", devMode: order.devMode });
  } catch (error) {
    console.error("Checkout indisponível", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Não foi possível abrir o pagamento. Tente novamente em instantes." }, { status: 503 });
  }
}
