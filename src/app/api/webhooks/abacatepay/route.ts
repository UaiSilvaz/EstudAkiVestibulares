import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timingSafeStringEqual } from "@/server/security/request";
import { abacateRequest, abacateTestMode, verifyAbacateSignature, type AbacateCheckout } from "@/lib/payments/abacatepay";
import { confirmAbacateOrder } from "@/lib/payments/abacate-orders";

export async function POST(request: Request) {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  if (!timingSafeStringEqual(new URL(request.url).searchParams.get("webhookSecret"), secret)) return new NextResponse(null, { status: 401 });
  const reader = request.body?.getReader();
  if (!reader) return new NextResponse(null, { status: 400 });
  let size = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 256 * 1024) { await reader.cancel(); return new NextResponse(null, { status: 413 }); }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!verifyAbacateSignature(raw, request.headers.get("x-webhook-signature"))) return new NextResponse(null, { status: 401 });
  let payload: { id?: string; event?: string; devMode?: boolean; data?: { checkout?: { id?: string }; billing?: { id?: string }; id?: string } };
  try { payload = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  if (!payload || typeof payload !== "object" || typeof payload.id !== "string" || typeof payload.event !== "string" || payload.devMode !== abacateTestMode()) return new NextResponse(null, { status: 400 });
  if (!["checkout.completed", "checkout.refunded", "checkout.disputed", "checkout.lost"].includes(payload.event)) return NextResponse.json({ ignored: true });
  const checkoutId = payload.data?.checkout?.id ?? payload.data?.billing?.id ?? payload.data?.id;
  if (typeof checkoutId !== "string") return new NextResponse(null, { status: 400 });
  try {
    const order = await db.checkoutOrder.findUnique({ where: { providerCheckoutId: checkoutId }, select: { id: true } });
    // The transaction creating the checkout may still be committing; ask the provider to retry.
    if (!order) return NextResponse.json({ error: "Pedido ainda não disponível." }, { status: 503 });
    if (await db.paymentWebhookEvent.findUnique({ where: { id: payload.id } })) return NextResponse.json({ duplicate: true });
    const checkout = await abacateRequest<AbacateCheckout>(`checkouts/get?id=${encodeURIComponent(checkoutId)}`);
    if (payload.event === "checkout.completed" && checkout.status !== "PAID") return NextResponse.json({ error: "Pagamento ainda não confirmado." }, { status: 503 });
    if (payload.event === "checkout.refunded" && checkout.status !== "REFUNDED") return NextResponse.json({ error: "Estorno ainda não confirmado." }, { status: 503 });
    await confirmAbacateOrder(order.id, checkout, payload.id, payload.event);
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: "Falha temporária no processamento." }, { status: 503 }); }
}
