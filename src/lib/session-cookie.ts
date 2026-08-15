import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_VERSION = "v1";
const MINIMUM_SECRET_BYTES = 32;
const DEVELOPMENT_SESSION_SECRET =
  "estudaki-development-only-session-secret-do-not-use-in-production";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function createAuthSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAuthSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function isLocalAuthEnabled() {
  if (process.env.NODE_ENV === "production") return false;

  return (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    process.env.LOCAL_AUTH_ENABLED === "true"
  );
}

function sessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured && Buffer.byteLength(configured, "utf8") >= MINIMUM_SECRET_BYTES) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") return null;
  return DEVELOPMENT_SESSION_SECRET;
}

function signatureFor(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest();
}

function signaturesMatch(expected: Buffer, received: string) {
  let receivedBuffer: Buffer;
  try {
    receivedBuffer = Buffer.from(received, "base64url");
  } catch {
    return false;
  }

  return (
    expected.length === receivedBuffer.length && timingSafeEqual(expected, receivedBuffer)
  );
}

export function createSessionCookieValue(
  userId: string,
  options: { nowMs?: number; maxAgeSeconds?: number } = {},
) {
  const secret = sessionSecret();
  if (!secret) {
    throw new Error(
      "SESSION_SECRET com pelo menos 32 bytes é obrigatório em produção.",
    );
  }

  if (!userId || Buffer.byteLength(userId, "utf8") > 512) {
    throw new Error("Identificador de sessão inválido.");
  }

  const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const maxAgeSeconds = options.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS;
  const expiresAt = nowSeconds + maxAgeSeconds;
  const encodedUserId = Buffer.from(userId, "utf8").toString("base64url");
  const payload = `${SESSION_VERSION}.${encodedUserId}.${expiresAt}`;
  const signature = signatureFor(payload, secret).toString("base64url");

  return `${payload}.${signature}`;
}

export function verifySignedSessionCookie(value: string, nowMs = Date.now()) {
  const secret = sessionSecret();
  if (!secret) return null;

  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== SESSION_VERSION) return null;

  const [version, encodedUserId, rawExpiresAt, receivedSignature] = parts;
  if (!/^\d{10,}$/.test(rawExpiresAt)) return null;

  const payload = `${version}.${encodedUserId}.${rawExpiresAt}`;
  const expectedSignature = signatureFor(payload, secret);
  if (!signaturesMatch(expectedSignature, receivedSignature)) return null;

  const expiresAt = Number(rawExpiresAt);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(nowMs / 1000)) {
    return null;
  }

  try {
    const userId = Buffer.from(encodedUserId, "base64url").toString("utf8");
    if (!userId || Buffer.byteLength(userId, "utf8") > 512) return null;
    return userId;
  } catch {
    return null;
  }
}

export function readSessionCookieValue(value: string) {
  const verified = verifySignedSessionCookie(value);
  if (verified) return verified;

  if (!isLocalAuthEnabled()) return null;

  // Keep the established local-only identities usable for development and tests.
  if (value === "local-admin" || value.startsWith("local-user:")) return value;

  // Persisted raw IDs are accepted only through an explicit local migration flag.
  if (process.env.ALLOW_LEGACY_SESSION_COOKIE === "true") return value;

  return null;
}
