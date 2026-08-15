import bcrypt from "bcryptjs";
import { PurchaseStatus, Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/server/security/rate-limit";
import {
  clientIpFromRequest,
  readJsonRequest,
  timingSafeStringEqual,
} from "@/server/security/request";

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

function extractPayload(body: unknown) {
  const root = asRecord(body);
  const nested = asRecord(root.data ?? root.eventData ?? root.purchase ?? root.subscription ?? root.order);
  const source = Object.keys(nested).length > 0 ? nested : root;

  const eventType = normalizeEventType(
    root.event ?? root.eventType ?? root.event_type ?? source.event ?? source.eventType ?? source.event_type ?? source.status,
  );
  const transactionId =
    nestedString(source, [
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
    root.eventId,
    root.event_id,
    source.eventId,
    source.event_id,
    transactionId && `${eventType}:${transactionId}`,
    purchaseId && `${eventType}:${purchaseId}`,
    productId && `${eventType}:${productId}`,
    `${eventType}:${randomUUID()}`,
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

async function ensureUser(email: string, name: string | null) {
  return db.user.upsert({
    where: { email },
    update: {
      name: name?.trim() || email.split("@")[0] || "Estudante",
      role: Role.STUDENT,
    },
    create: {
      email,
      name: name?.trim() || email.split("@")[0] || "Estudante",
      role: Role.STUDENT,
      passwordHash: await bcrypt.hash(randomUUID(), 10),
      targetExam: "ENEM",
    },
    select: { id: true, email: true, name: true, role: true },
  });
}

async function resolveProduct(productId: string | null, productName: string | null) {
  if (!productId && !productName) return null;

  return db.product.findFirst({
    where: {
      OR: [
        ...(productId ? [{ hotmartProductId: productId }] : []),
        ...(productId ? [{ slug: productId }] : []),
        ...(productName ? [{ name: { equals: productName, mode: "insensitive" as const } }] : []),
      ],
    },
    include: { material: true },
  });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: `webhook:hotmart:${clientIpFromRequest(request)}`,
    limit: 120,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas requisicoes." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const hottok = process.env.HOTMART_HOTTOK ?? process.env.HOTMART_HOTTOK_SECRET;
  if (!hottok) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 });
  }

  const receivedHottok = request.headers.get("x-hotmart-hottok") ?? request.headers.get("X-HOTMART-HOTTOK");
  if (!timingSafeStringEqual(receivedHottok, hottok)) {
    return NextResponse.json({ error: "Assinatura invalida." }, { status: 401 });
  }

  let body: unknown;
  try {
    const parsedBody = await readJsonRequest<unknown>(request, { maxBytes: 512 * 1024 });
    if (!parsedBody.ok) return parsedBody.response;
    body = parsedBody.data;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const normalized = extractPayload(body);

  try {
    const existing = await db.hotmartWebhookLog.findUnique({
      where: { eventKey: normalized.eventKey },
      select: { id: true, status: true },
    });
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const product = await resolveProduct(normalized.productId, normalized.productName);
    const rawPayload = normalized.payload;

    await db.hotmartWebhookLog.create({
      data: {
        eventKey: normalized.eventKey,
        eventType: normalized.eventType,
        transactionId: normalized.transactionId,
        purchaseId: normalized.purchaseId,
        productId: product?.id ?? null,
        status: "PENDING",
        payload: rawPayload,
      },
    });

    if (!product) {
      await db.hotmartWebhookLog.update({
        where: { eventKey: normalized.eventKey },
        data: {
          status: "ERROR",
          error: "Produto não encontrado.",
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const email = normalized.buyerEmail;
    if (!email) {
      await db.hotmartWebhookLog.update({
        where: { eventKey: normalized.eventKey },
        data: {
          status: "ERROR",
          error: "Email do comprador ausente.",
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ error: "Email do comprador ausente." }, { status: 400 });
    }

    const user = await ensureUser(email, normalized.buyerName);
    const purchaseKey = normalized.transactionId ?? normalized.purchaseId ?? normalized.eventKey;
    const purchaseIdentifier = normalized.purchaseId ?? normalized.transactionId ?? null;

    const purchase = await db.purchase.upsert({
      where: { hotmartTransaction: purchaseKey },
      update: {
        hotmartPurchaseId: purchaseIdentifier,
        userId: user.id,
        productId: product.id,
        buyerName: normalized.buyerName,
        buyerEmail: email,
        status: normalized.status,
        rawPayload,
      },
      create: {
        hotmartTransaction: purchaseKey,
        hotmartPurchaseId: purchaseIdentifier,
        userId: user.id,
        productId: product.id,
        buyerName: normalized.buyerName,
        buyerEmail: email,
        status: normalized.status,
        rawPayload,
      },
    });

    if (normalized.status === PurchaseStatus.APPROVED) {
      await db.userProduct.upsert({
        where: {
          userId_productId: {
            userId: user.id,
            productId: product.id,
          },
        },
        update: {
          unlockedAt: new Date(),
        },
        create: {
          userId: user.id,
          productId: product.id,
        },
      });
    }

    if (
      normalized.status === PurchaseStatus.REFUNDED ||
      normalized.status === PurchaseStatus.CANCELED ||
      normalized.status === PurchaseStatus.CHARGEBACK
    ) {
      await db.userProduct.deleteMany({
        where: {
          userId: user.id,
          productId: product.id,
        },
      });
    }

    await db.hotmartWebhookLog.update({
      where: { eventKey: normalized.eventKey },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    await db.activity.create({
      data: {
        userId: user.id,
        type: "CONTENT",
        message: `Webhook Hotmart processado para ${product.name} (${normalized.eventType}).`,
        xp: 0,
      },
    });

    return NextResponse.json({
      received: true,
      eventType: normalized.eventType,
      purchaseStatus: purchase.status,
      product: product.name,
      user: user.email,
    });
  } catch (error) {
    console.error("Falha ao processar webhook Hotmart", error);

    await db.hotmartWebhookLog
      .update({
        where: { eventKey: normalized.eventKey },
        data: {
          status: "ERROR",
          error: error instanceof Error ? error.message : "Erro desconhecido.",
          processedAt: new Date(),
        },
      })
      .catch(() => null);

    return NextResponse.json({ error: "Erro interno ao processar webhook." }, { status: 500 });
  }
}
