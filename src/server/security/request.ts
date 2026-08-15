import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

type JsonRequestOptions = {
  maxBytes?: number;
  requireJsonContentType?: boolean;
};

type JsonRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export function clientIpFromRequest(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cloudflareIp || "unknown";
}

export async function readJsonRequest<T>(
  request: Request,
  options: JsonRequestOptions = {},
): Promise<JsonRequestResult<T>> {
  const requireJsonContentType = options.requireJsonContentType ?? true;
  const contentType = request.headers.get("content-type") ?? "";
  const maxBytes = options.maxBytes ?? 64 * 1024;
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (requireJsonContentType && !contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Envie o corpo como application/json." },
        { status: 415 },
      ),
    };
  }

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Corpo da requisicao muito grande." }, { status: 413 }),
    };
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Corpo da requisicao muito grande." }, { status: 413 }),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "JSON invalido." }, { status: 400 }),
    };
  }
}

export function timingSafeStringEqual(received: string | null, expected: string) {
  if (!received) return false;

  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}
