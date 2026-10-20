import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { confirmAbacateOrder } from "../src/lib/payments/abacate-orders";
import type { AbacateCheckout } from "../src/lib/payments/abacatepay";

if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Use somente banco local para este teste.");
process.env.ABACATEPAY_ENV = "sandbox";
const prefix = `abacate-test-${randomUUID()}`;
let userId: string | undefined;
let productId: string | undefined;
let courseId: string | undefined;

async function main() {
  try {
    const user = await db.user.create({ data: { name: "Payment test", email: `${prefix}@example.invalid`, passwordHash: "test-disabled-login" } });
    userId = user.id;
    const course = await db.course.create({ data: { slug: prefix, title: "Payment fixture" } });
    courseId = course.id;
    const product = await db.product.create({ data: { slug: prefix, name: prefix, description: "Local test fixture", priceCents: 1000, courses: { create: { courseId } } } });
    productId = product.id;
    const createOrder = () => db.checkoutOrder.create({ data: { userId: user.id, amountCents: 1000, method: "PIX", devMode: true,
      providerCheckoutId: `bill-${randomUUID()}`, items: [{ productId: product.id, providerProductId: "prod-test", priceCents: 1000, quantity: 1, name: prefix }] } });
    const first = await createOrder();
    const paid: AbacateCheckout = { id: first.providerCheckoutId!, externalId: first.id, url: "https://app.abacatepay.com/pay/test", amount: 1000,
      paidAmount: 1000, status: "PAID", devMode: true, items: [{ id: "prod-test", quantity: 1 }] };
    await assert.rejects(confirmAbacateOrder(first.id, { ...paid, amount: 1 }));
    assert.equal(await db.purchase.count({ where: { userId } }), 0);
    await confirmAbacateOrder(first.id, { ...paid, status: "PENDING", paidAmount: null });
    assert.equal(await db.entitlement.count({ where: { userId, revokedAt: null } }), 0);
    await Promise.all(Array.from({ length: 4 }, () => confirmAbacateOrder(first.id, paid, `${prefix}-approved`, "checkout.completed")));
    assert.equal(await db.purchase.count({ where: { userId, status: "APPROVED" } }), 1);
    assert.equal(await db.paymentWebhookEvent.count({ where: { orderId: first.id } }), 1);
    assert.equal(await db.entitlement.count({ where: { userId, courseId, revokedAt: null } }), 1);
    const second = await createOrder();
    const secondPaid = { ...paid, id: second.providerCheckoutId!, externalId: second.id };
    await confirmAbacateOrder(second.id, secondPaid);
    await confirmAbacateOrder(first.id, { ...paid, status: "REFUNDED" }, `${prefix}-refund`, "checkout.refunded");
    assert.equal((await db.userProduct.findUniqueOrThrow({ where: { userId_productId: { userId: user.id, productId: product.id } } })).revokedAt, null);
    assert.equal(await db.entitlement.count({ where: { userId, courseId, revokedAt: null } }), 1);
    await confirmAbacateOrder(first.id, paid, `${prefix}-late`, "checkout.completed");
    assert.equal((await db.checkoutOrder.findUniqueOrThrow({ where: { id: first.id } })).status, "REFUNDED");
    await confirmAbacateOrder(second.id, secondPaid, `${prefix}-chargeback`, "checkout.disputed");
    assert.equal(await db.entitlement.count({ where: { userId, revokedAt: null } }), 0);
    assert.ok((await db.userProduct.findUniqueOrThrow({ where: { userId_productId: { userId: user.id, productId: product.id } } })).revokedAt);
    console.log("PASS: mismatched amount, pending access, concurrent confirmation, duplicate event, course access, multiple purchases, refund, late approval and chargeback.");
  } finally {
    if (userId) {
      await db.entitlement.deleteMany({ where: { userId } });
      await db.checkoutOrder.deleteMany({ where: { userId } });
      await db.user.delete({ where: { id: userId } });
    }
    if (productId) await db.product.delete({ where: { id: productId } });
    if (courseId) await db.course.delete({ where: { id: courseId } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
