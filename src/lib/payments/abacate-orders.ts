import { PurchaseStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { type AbacateCheckout, type CheckoutItem, verifyCheckout } from "./abacatepay";
import { syncPurchaseAccess } from "./access";

export async function confirmAbacateOrder(orderId: string, checkout: AbacateCheckout, eventId?: string, event?: string) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`abacate:${orderId}`}))`;
    const order = await tx.checkoutOrder.findUniqueOrThrow({ where: { id: orderId }, include: { user: { select: { email: true, name: true } } } });
    verifyCheckout(order, checkout);
    if (eventId && await tx.paymentWebhookEvent.findUnique({ where: { id: eventId } })) return order.status;
    let status: PurchaseStatus = checkout.status === "PAID" ? PurchaseStatus.APPROVED
      : checkout.status === "REFUNDED" ? PurchaseStatus.REFUNDED
        : ["EXPIRED", "CANCELLED"].includes(checkout.status) ? PurchaseStatus.CANCELED : PurchaseStatus.PENDING;
    if (event === "checkout.disputed" || event === "checkout.lost") status = PurchaseStatus.CHARGEBACK;
    const terminal: PurchaseStatus[] = [PurchaseStatus.REFUNDED, PurchaseStatus.CANCELED, PurchaseStatus.CHARGEBACK];
    if (terminal.includes(order.status)) status = order.status;
    if (order.status === PurchaseStatus.APPROVED && status === PurchaseStatus.PENDING) status = order.status;
    for (const item of order.items as CheckoutItem[]) {
      const purchase = await tx.purchase.upsert({
        where: { hotmartTransaction: `abacate:${order.id}:${item.productId}` },
        update: { status },
        create: { hotmartTransaction: `abacate:${order.id}:${item.productId}`, userId: order.userId,
          productId: item.productId, buyerEmail: order.user.email, buyerName: order.user.name, status,
          rawPayload: JSON.stringify({ provider: "ABACATEPAY", checkoutId: checkout.id, orderId: order.id }),
        },
      });
      await syncPurchaseAccess(tx, purchase, `abacate:${purchase.id}`);
    }
    if (status === PurchaseStatus.APPROVED) await tx.cartItem.deleteMany({ where: { userId: order.userId, productId: { in: (order.items as CheckoutItem[]).map(item => item.productId) }, status: "CART" } });
    await tx.checkoutOrder.update({ where: { id: order.id }, data: { status } });
    if (eventId) await tx.paymentWebhookEvent.create({ data: { id: eventId, orderId, event: event! } });
    return status;
  }, { timeout: 15_000 });
}
