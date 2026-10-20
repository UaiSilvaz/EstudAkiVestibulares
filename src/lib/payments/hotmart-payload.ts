import { PurchaseStatus } from "@prisma/client";
import { createHash } from "node:crypto";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function nestedString(source: AnyRecord, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = source;
    for (const key of path) {
      current = asRecord(current)[key];
      if (current === undefined || current === null) break;
    }
    const value = firstString(current);
    if (value) return value;
  }
  return null;
}

function normalizeEventType(raw: unknown) {
  const value = firstString(raw)?.toUpperCase().replace(/[^A-Z_]/g, "");
  if (!value) return "UNKNOWN";
  if (value.includes("APPROV")) return "PURCHASE_APPROVED";
  if (value.includes("REFUND")) return "PURCHASE_REFUNDED";
  if (value.includes("CANCEL")) return "PURCHASE_CANCELED";
  if (value.includes("CHARGEBACK")) return "CHARGEBACK";
  return value;
}

function purchaseStatusForEvent(eventType: string) {
  if (eventType === "PURCHASE_APPROVED") return PurchaseStatus.APPROVED;
  if (eventType === "PURCHASE_REFUNDED") return PurchaseStatus.REFUNDED;
  if (eventType === "PURCHASE_CANCELED") return PurchaseStatus.CANCELED;
  if (eventType === "CHARGEBACK") return PurchaseStatus.CHARGEBACK;
  return PurchaseStatus.PENDING;
}

export function extractPayload(body: unknown) {
  const root = asRecord(body);
  const nested = asRecord(root.data ?? root.eventData ?? root.purchase ?? root.subscription ?? root.order);
  const source = Object.keys(nested).length > 0 ? nested : root;

  const eventType = normalizeEventType(
    root.event ?? root.eventType ?? root.event_type ?? source.event ?? source.eventType ?? source.event_type ?? source.status,
  );
  const transactionId =
    nestedString(source, [
      ["purchase", "transaction"],
      ["transaction"],
      ["transactionCode"],
      ["transaction_code"],
      ["transaction_id"],
      ["transactionId"],
      ["id"],
    ]) ??
    nestedString(root, [["transaction"], ["transactionCode"], ["transaction_id"], ["transactionId"]]);
  const purchaseId =
    nestedString(source, [
      ["purchaseId"],
      ["purchase_id"],
      ["hotmartPurchaseId"],
      ["sale_id"],
      ["saleId"],
    ]) ??
    nestedString(root, [["purchaseId"], ["purchase_id"], ["sale_id"], ["saleId"]]);
  const buyerEmail =
    nestedString(source, [
      ["buyer", "email"],
      ["customer", "email"],
      ["email"],
      ["buyerEmail"],
      ["purchase", "buyer", "email"],
    ]) ?? nestedString(root, [["buyer", "email"], ["customer", "email"], ["email"]]);
  const buyerName =
    nestedString(source, [
      ["buyer", "name"],
      ["customer", "name"],
      ["name"],
      ["buyerName"],
    ]) ?? nestedString(root, [["buyer", "name"], ["customer", "name"], ["name"]]);
  const productId =
    nestedString(source, [
      ["product", "id"],
      ["product", "code"],
      ["productId"],
      ["product_id"],
      ["prod"],
      ["product", "sku"],
      ["offer", "id"],
    ]) ?? nestedString(root, [["product", "id"], ["productId"], ["product_id"], ["offer", "id"]]);
  const productName =
    nestedString(source, [
      ["product", "name"],
      ["productName"],
      ["product_name"],
      ["item", "name"],
    ]) ?? nestedString(root, [["product", "name"], ["productName"], ["product_name"]]);

  const eventKey = firstString(
    root.id,
    root.eventId,
    root.event_id,
    source.eventId,
    source.event_id,
    transactionId && `${eventType}:${transactionId}`,
    purchaseId && `${eventType}:${purchaseId}`,
    `${eventType}:${createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex")}`,
  )!;

  return {
    eventType,
    status: purchaseStatusForEvent(eventType),
    transactionId,
    purchaseId,
    buyerEmail,
    buyerName,
    productId,
    productName,
    eventKey,
    payload: JSON.stringify(body ?? {}),
  };
}

