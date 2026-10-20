import assert from "node:assert/strict";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { confirmEmailVerification, sendEmailVerification } from "../src/lib/email-verification";

if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) {
  throw new Error("Esta verificação usa somente banco local e e-mails simulados.");
}
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Servidor deve ser local.");
const originalFetch = globalThis.fetch;
const userIds: string[] = [];
const password = randomUUID();
let sentToken = "";
let deliveries = 0;
let refuseDelivery = false;

async function main() {
  const user = await db.user.create({ data: { email: `verify-${randomUUID()}@example.invalid`, name: "Teste de e-mail", passwordHash: await bcrypt.hash(password, 10) } });
  userIds.push(user.id);
  const login = () => originalFetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password }) });
  assert.equal((await login()).status, 403, "Execute o servidor com EMAIL_VERIFICATION_REQUIRED=true");
  process.env.RESEND_API_KEY = "local-mock-only";
  process.env.EMAIL_FROM = "teste@example.invalid";
  process.env.NEXT_PUBLIC_APP_URL = base;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.resend.com/emails", "Nenhum serviço externo pode ser chamado pelo teste");
    if (refuseDelivery) return new Response("{}", { status: 503 });
    const body = JSON.parse(String(init?.body));
    sentToken = new URL(body.text.match(/https?:\/\/\S+/)[0]).searchParams.get("token")!;
    assert.equal(body.to[0], user.email);
    assert.ok(new Headers(init?.headers).get("Idempotency-Key"));
    deliveries++;
    return new Response('{"id":"mock-delivery"}', { status: 200 });
  };
  await Promise.all([sendEmailVerification(user), sendEmailVerification(user), sendEmailVerification(user)]);
  assert.equal(deliveries, 1);
  assert.ok(sentToken);
  const record = await db.emailVerification.findFirstOrThrow({ where: { userId: user.id } });
  assert.notEqual(record.tokenHash, sentToken);
  assert.equal(record.tokenHash, createHash("sha256").update(sentToken).digest("hex"));
  assert.equal(await confirmEmailVerification("invalido"), false);
  assert.equal(await confirmEmailVerification(randomBytes(32).toString("hex")), false);
  const confirm = () => originalFetch(`${base}/api/auth/email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: sentToken }) });
  const results = await Promise.all([confirm(), confirm()]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
  assert.ok((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerifiedAt);
  assert.equal((await login()).status, 200);
  const expired = randomBytes(32).toString("hex");
  await db.emailVerification.create({ data: { userId: user.id, email: user.email, tokenHash: createHash("sha256").update(expired).digest("hex"), expiresAt: new Date(0) } });
  assert.equal(await confirmEmailVerification(expired), false);
  await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: null } });
  await db.emailVerification.deleteMany({ where: { userId: user.id } });
  refuseDelivery = true;
  await assert.rejects(sendEmailVerification(user));
  assert.equal(await db.emailVerification.count({ where: { userId: user.id } }), 0);
  console.log("PASS: unverified login blocked; mocked delivery, resend cooldown, hashed tokens, concurrent single-use confirmation, expiry, verified login and failed-delivery cleanup. No real e-mails sent.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  globalThis.fetch = originalFetch;
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});
