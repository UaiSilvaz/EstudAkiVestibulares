import assert from "node:assert/strict";
import test from "node:test";
import { extractPayload } from "./hotmart-payload";

test("Hotmart v2 uses the event id and nested purchase transaction", () => {
  const result = extractPayload({
    id: "event-approval", event: "PURCHASE_APPROVED", version: "2.0.0",
    data: { purchase: { transaction: "HP123" }, buyer: { email: "student@example.com" }, product: { id: 123 } },
  });
  assert.equal(result.transactionId, "HP123");
  assert.equal(result.eventKey, "event-approval");
  assert.equal(result.status, "APPROVED");
  assert.equal(result.productId, "123");
});

test("different buyers are not deduplicated by product", () => {
  const first = { event: "PURCHASE_APPROVED", data: { product: { id: 1 }, buyer: { email: "a@example.com" } } };
  const second = { ...first, data: { ...first.data, buyer: { email: "b@example.com" } } };
  assert.equal(extractPayload(first).eventKey, extractPayload(first).eventKey);
  assert.notEqual(extractPayload(first).eventKey, extractPayload(second).eventKey);
});

test("refund and chargeback never normalize as approval", () => {
  assert.equal(extractPayload({ event: "PURCHASE_REFUNDED" }).status, "REFUNDED");
  assert.equal(extractPayload({ event: "PURCHASE_CHARGEBACK" }).status, "CHARGEBACK");
});
