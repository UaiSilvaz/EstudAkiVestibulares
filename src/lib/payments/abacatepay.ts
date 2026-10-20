import { createHmac, timingSafeEqual } from "node:crypto";

// Public verification key documented by AbacatePay; the private URL secret is also required.
const PUBLIC_KEY = "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

export function verifyAbacateSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = Buffer.from(createHmac("sha256", PUBLIC_KEY).update(rawBody, "utf8").digest("base64"));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function abacateTestMode() { return process.env.ABACATEPAY_ENV !== "production"; }

export async function abacateRequest<T>(endpoint: string, body?: unknown): Promise<T> {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) throw new Error("Pagamentos indisponíveis. A integração ainda está sendo configurada.");
  const response = await fetch(`https://api.abacatepay.com/v2/${endpoint}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null) as { data?: T; success?: boolean; error?: string } | null;
  if (!response.ok || !payload?.success || !payload.data) throw new Error("O provedor de pagamento está indisponível. Tente novamente em instantes.");
  return payload.data;
}

export type AbacateCheckout = {
  id: string; externalId: string | null; url: string; amount: number; paidAmount: number | null;
  status: string; devMode: boolean; items: Array<{ id: string; quantity: number }>;
};

export type CheckoutItem = { productId: string; providerProductId: string; priceCents: number; quantity: number; name: string };

export function verifyCheckout(order: { id: string; providerCheckoutId: string | null; amountCents: number; devMode: boolean; items: unknown }, checkout: AbacateCheckout) {
  if (checkout.id !== order.providerCheckoutId || checkout.externalId !== order.id || checkout.amount !== order.amountCents || checkout.devMode !== order.devMode || checkout.devMode !== abacateTestMode()) {
    throw new Error("A confirmação do pagamento não corresponde ao pedido.");
  }
  const expected = order.items as CheckoutItem[];
  if (!Array.isArray(checkout.items) || checkout.items.length !== expected.length || expected.some(item => !checkout.items.some(remote => remote.id === item.providerProductId && remote.quantity === item.quantity))) {
    throw new Error("Os itens do pagamento não correspondem ao pedido.");
  }
  if (checkout.status === "PAID" && (!Number.isSafeInteger(checkout.paidAmount) || checkout.paidAmount === null || checkout.paidAmount < order.amountCents)) throw new Error("Valor pago insuficiente.");
}
