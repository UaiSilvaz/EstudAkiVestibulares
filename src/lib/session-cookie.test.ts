import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  createSessionCookieValue,
  readSessionCookieValue,
  verifySignedSessionCookie,
} from "./session-cookie";

const originalNodeEnv = process.env.NODE_ENV;
const originalSecret = process.env.SESSION_SECRET;
const originalLegacyFlag = process.env.ALLOW_LEGACY_SESSION_COOKIE;
const mutableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
  if (originalLegacyFlag === undefined) delete process.env.ALLOW_LEGACY_SESSION_COOKIE;
  else process.env.ALLOW_LEGACY_SESSION_COOKIE = originalLegacyFlag;
});

test("round-trips an unexpired signed session", () => {
  mutableEnv.NODE_ENV = "test";
  process.env.SESSION_SECRET = "s".repeat(48);
  const nowMs = Date.UTC(2026, 6, 17);
  const cookie = createSessionCookieValue("user-123", { nowMs, maxAgeSeconds: 60 });

  assert.notEqual(cookie, "user-123");
  assert.equal(verifySignedSessionCookie(cookie, nowMs + 30_000), "user-123");
  assert.equal(verifySignedSessionCookie(cookie, nowMs + 61_000), null);
});

test("rejects a tampered signature", () => {
  mutableEnv.NODE_ENV = "test";
  process.env.SESSION_SECRET = "t".repeat(48);
  const cookie = createSessionCookieValue("admin-id");
  const tampered = `${cookie.slice(0, -1)}${cookie.endsWith("A") ? "B" : "A"}`;

  assert.equal(verifySignedSessionCookie(tampered), null);
});

test("fails closed in production without a strong secret", () => {
  mutableEnv.NODE_ENV = "production";
  delete process.env.SESSION_SECRET;

  assert.throws(() => createSessionCookieValue("admin-id"), /SESSION_SECRET/);
  assert.equal(readSessionCookieValue("local-admin"), null);
});

test("limits unsigned legacy cookies to explicit local compatibility", () => {
  mutableEnv.NODE_ENV = "test";
  delete process.env.ALLOW_LEGACY_SESSION_COOKIE;

  assert.equal(readSessionCookieValue("local-admin"), "local-admin");
  assert.equal(readSessionCookieValue("persisted-user-id"), null);

  process.env.ALLOW_LEGACY_SESSION_COOKIE = "true";
  assert.equal(readSessionCookieValue("persisted-user-id"), "persisted-user-id");
});
