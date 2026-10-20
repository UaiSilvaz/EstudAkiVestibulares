import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const token = process.env.HOTMART_HOTTOK_SECRET;
if (!token || !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) {
  throw new Error("Este teste requer servidor e banco locais e HOTMART_HOTTOK_SECRET de teste.");
}
const prefix = `commerce-test-${randomUUID()}`;
const email = `${prefix}@example.invalid`;
const password = randomUUID();
let userId: string | undefined;
let productId: string | undefined;
let courseId: string | undefined;
let moduleId: string | undefined;
let lessonId: string | undefined;

async function deliver(event: string, transaction: string, eventId: string) {
  const response = await fetch(`${base}/api/webhooks/hotmart`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-hotmart-hottok": token! },
    body: JSON.stringify({ id: eventId, event, version: "2.0.0", data: {
      purchase: { transaction }, product: { id: prefix }, buyer: { email, name: "Changed by payment" },
    } }),
  });
  assert.equal(response.status, 200, await response.text());
}

async function main() {
  try {
    const user = await db.user.create({ data: { email, name: "Teacher test", role: "TEACHER", emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash(password, 10) } });
    userId = user.id;
    const course = await db.course.create({ data: { slug: prefix, title: "Commerce test", priceCents: 1000, status: "PUBLISHED", published: true } });
    courseId = course.id;
    const fixtureModule = await db.module.create({ data: { slug: prefix, title: "Commerce fixture module" } });
    moduleId = fixtureModule.id;
    const mediaUrl = `/api/course-media/${prefix}.mp4`;
    const lesson = await db.lesson.create({ data: { slug: prefix, title: "Commerce fixture lesson", status: "PUBLISHED", videoUrl: mediaUrl } });
    lessonId = lesson.id;
    await db.courseModule.create({ data: { courseId, moduleId } });
    await db.moduleLesson.create({ data: { moduleId, lessonId } });
    const firstLogin = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    assert.equal(firstLogin.status, 200);
    const initialCookie = firstLogin.headers.get("set-cookie")!.split(";")[0]!;
    assert.equal((await fetch(`${base}${mediaUrl}`, { headers: { cookie: initialCookie } })).status, 403);
    const product = await db.product.create({ data: {
      slug: prefix, name: "Commerce test", description: "Isolated integration fixture", hotmartProductId: prefix,
      courses: { create: { courseId: course.id } },
    } });
    productId = product.id;
    const approval = `${prefix}-approval`;
    await Promise.all([deliver("PURCHASE_APPROVED", `${prefix}-a`, approval), deliver("PURCHASE_APPROVED", `${prefix}-a`, approval)]);
    assert.equal(await db.purchase.count({ where: { productId } }), 1);
    assert.equal(await db.entitlement.count({ where: { userId, courseId, revokedAt: null } }), 1);
    // Authorized lookup reaches storage (fixture has no real video); unpaid lookup was denied.
    assert.equal((await fetch(`${base}${mediaUrl}`, { headers: { cookie: initialCookie } })).status, 404);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).role, "TEACHER");
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).name, "Teacher test");
    await deliver("PURCHASE_APPROVED", `${prefix}-b`, `${prefix}-approval-b`);
    await deliver("PURCHASE_REFUNDED", `${prefix}-a`, `${prefix}-refund-a`);
    assert.equal(await db.entitlement.count({ where: { userId, courseId, revokedAt: null } }), 1);
    assert.equal((await db.userProduct.findUniqueOrThrow({ where: { userId_productId: { userId, productId } } })).revokedAt, null);
    await deliver("PURCHASE_APPROVED", `${prefix}-a`, `${prefix}-late-approval`);
    assert.equal((await db.purchase.findUniqueOrThrow({ where: { hotmartTransaction: `${prefix}-a` } })).status, "REFUNDED");
    await deliver("PURCHASE_CHARGEBACK", `${prefix}-b`, `${prefix}-chargeback-b`);
    assert.equal(await db.entitlement.count({ where: { userId, courseId, revokedAt: null } }), 0);
    assert.ok((await db.userProduct.findUniqueOrThrow({ where: { userId_productId: { userId, productId } } })).revokedAt);
    assert.equal((await fetch(`${base}${mediaUrl}`, { headers: { cookie: initialCookie } })).status, 403);
    const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
    assert.equal((await fetch(`${base}/api/users/me`, { headers: { cookie } })).status, 200);
    const logout = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie } });
    assert.equal(logout.status, 200);
    assert.equal((await fetch(`${base}/api/users/me`, { headers: { cookie } })).status, 401);
    assert.equal((await fetch(`${base}/api/course-media/private-test.mp4`)).status, 401);
    const resetToken = randomBytes(32).toString("hex");
    await db.passwordReset.create({ data: {
      userId, tokenHash: createHash("sha256").update(resetToken).digest("hex"), expiresAt: new Date(Date.now() + 60_000),
    } });
    const reset = () => fetch(`${base}/api/auth/password`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, password: "New-integration-password-42" }),
    });
    assert.equal((await reset()).status, 200);
    assert.equal((await reset()).status, 400);
    assert.ok(await bcrypt.compare("New-integration-password-42", (await db.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash));
    assert.equal((await fetch(`${base}/api/users/me`, { headers: { cookie: initialCookie } })).status, 401);
    assert.equal((await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "null" })).status, 400);
    console.log("PASS: concurrent delivery, course grants, role preservation, multiple purchases, refund, late approval, chargeback, login, session revocation, private media, single-use password recovery, malformed login.");
  } finally {
    if (userId) {
      await db.entitlement.deleteMany({ where: { userId } });
      await db.user.delete({ where: { id: userId } });
    }
    if (productId) {
      await db.hotmartWebhookLog.deleteMany({ where: { productId } });
      await db.product.delete({ where: { id: productId } });
    }
    if (courseId) await db.course.delete({ where: { id: courseId } });
    if (moduleId) await db.moduleLesson.deleteMany({ where: { moduleId } });
    if (lessonId) await db.lesson.delete({ where: { id: lessonId } });
    if (moduleId) await db.module.delete({ where: { id: moduleId } });
    await db.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
