import bcrypt from "bcryptjs";
import { syncPurchaseAccess } from "@/lib/payments/access";
import { extractPayload } from "@/lib/payments/hotmart-payload";
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

async function ensureUser(tx: import("@prisma/client").Prisma.TransactionClient, email: string, name: string | null) {
  return tx.user.upsert({
    where: { email },
    update: {},
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
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const normalized = extractPayload(body);

  if (!normalized.transactionId && !normalized.purchaseId) {
    return NextResponse.json({ error: "Identificador da compra ausente." }, { status: 400 });
  }
  const email = normalized.buyerEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail do comprador inv?lido." }, { status: 400 });
  }

  try {
    const product = await resolveProduct(normalized.productId, normalized.productName);
    if (!product) return NextResponse.json({ error: "Produto n?o encontrado." }, { status: 404 });

    const result = await db.$transaction(async (tx) => {
      // Serialize events for the same transaction, including concurrent deliveries.
      const purchaseKey = normalized.transactionId ?? normalized.purchaseId!;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${purchaseKey}))`;
      const existing = await tx.hotmartWebhookLog.findUnique({ where: { eventKey: normalized.eventKey } });
      if (existing?.status === "PROCESSED") return { duplicate: true };

      await tx.hotmartWebhookLog.upsert({
        where: { eventKey: normalized.eventKey },
        update: { status: "PENDING", error: null },
        create: {
          eventKey: normalized.eventKey, eventType: normalized.eventType,
          transactionId: normalized.transactionId, purchaseId: normalized.purchaseId,
          productId: product.id, status: "PENDING", payload: normalized.payload,
        },
      });
      const user = await ensureUser(tx, email, normalized.buyerName);
      const previous = await tx.purchase.findUnique({ where: { hotmartTransaction: purchaseKey } });
      if (previous && (previous.userId !== user.id || previous.productId !== product.id)) {
        throw new Error("Identidade da compra divergente.");
      }
      const terminal = [PurchaseStatus.REFUNDED, PurchaseStatus.CANCELED, PurchaseStatus.CHARGEBACK];
      // Late approval/pending deliveries must never resurrect a refunded transaction.
      const status = previous && terminal.includes(previous.status as typeof terminal[number])
        ? previous.status
        : normalized.status === PurchaseStatus.PENDING && previous
          ? previous.status : normalized.status;
      const purchase = await tx.purchase.upsert({
        where: { hotmartTransaction: purchaseKey },
        update: { status, rawPayload: normalized.payload },
        create: {
          hotmartTransaction: purchaseKey, hotmartPurchaseId: normalized.purchaseId,
          userId: user.id, productId: product.id, buyerName: normalized.buyerName,
          buyerEmail: email, status, rawPayload: normalized.payload,
        },
      });
      await syncPurchaseAccess(tx, purchase, `hotmart:${purchase.id}`);
      await tx.hotmartWebhookLog.update({
        where: { eventKey: normalized.eventKey }, data: { status: "PROCESSED", error: null, processedAt: new Date() },
      });
      await tx.activity.create({ data: {
        userId: user.id, type: "CONTENT", message: `Pagamento processado: ${product.name} (${normalized.eventType}).`, xp: 0,
      } });
      return { duplicate: false, purchaseStatus: purchase.status };
    }, { timeout: 15000 });
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("Falha ao processar webhook Hotmart", error);
    // All purchase/access writes roll back together. Failed deliveries can retry.
    return NextResponse.json({ error: "Erro interno ao processar webhook." }, { status: 500 });
  }
}
