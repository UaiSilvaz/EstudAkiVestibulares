import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { abacateRequest, type AbacateCheckout } from "@/lib/payments/abacatepay";
import { confirmAbacateOrder } from "@/lib/payments/abacate-orders";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const order = await db.checkoutOrder.findFirst({ where: { id, userId: user.id }, select: { id: true, providerCheckoutId: true, status: true } });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  const limited = checkRateLimit({ key: `order-status:${user.id}:${id}`, limit: 20, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ error: "Aguarde antes de atualizar." }, { status: 429 });
  try {
    let status = order.status;
    if (order.providerCheckoutId && status === "PENDING") {
      const checkout = await abacateRequest<AbacateCheckout>(`checkouts/get?id=${encodeURIComponent(order.providerCheckoutId)}`);
      status = await confirmAbacateOrder(order.id, checkout);
    }
    return NextResponse.json({ status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Confirmação temporariamente indisponível." }, { status: 503 }); }
}
