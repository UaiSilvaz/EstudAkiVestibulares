import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyAbacateSignature, verifyCheckout, type AbacateCheckout } from "./abacatepay";

const publicKey = "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";
test("verifies the original webhook bytes and rejects modified bodies", () => {
  const body = '{"id":"event-1","event":"checkout.completed"}';
  const signature = createHmac("sha256", publicKey).update(body).digest("base64");
  assert.ok(verifyAbacateSignature(body, signature));
  assert.equal(verifyAbacateSignature(body + " ", signature), false);
  assert.equal(verifyAbacateSignature(body, null), false);
});

test("payment confirmation verifies amount, owner reference, items and environment", () => {
  const old = process.env.ABACATEPAY_ENV;
  process.env.ABACATEPAY_ENV = "sandbox";
  try {
    const order = { id: "order-1", providerCheckoutId: "bill-1", amountCents: 1000, devMode: true,
      items: [{ productId: "local-1", providerProductId: "prod-1", priceCents: 1000, quantity: 1, name: "Course" }] };
    const paid: AbacateCheckout = { id: "bill-1", externalId: "order-1", amount: 1000, paidAmount: 1000, status: "PAID", devMode: true, url: "https://app.abacatepay.com/pay/bill-1", items: [{ id: "prod-1", quantity: 1 }] };
    assert.doesNotThrow(() => verifyCheckout(order, paid));
    for (const patch of [{ externalId: "other-order" }, { amount: 1 }, { paidAmount: 500 }, { paidAmount: undefined }, { paidAmount: NaN }, { devMode: false }, { items: [{ id: "foreign-product", quantity: 1 }] }]) {
      assert.throws(() => verifyCheckout(order, { ...paid, ...patch } as AbacateCheckout));
    }
  } finally { if (old === undefined) delete process.env.ABACATEPAY_ENV; else process.env.ABACATEPAY_ENV = old; }
});
