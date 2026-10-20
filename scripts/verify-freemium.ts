import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { syncPurchaseAccess } from "../src/lib/payments/access";
import { courseEntitlement, availableQuestionWhere, courseMaterialAccess } from "../src/lib/freemium-access";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname) || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Este teste exige servidor e banco locais.");
const prefix = `freemium-test-${randomUUID()}`;
const password = randomUUID();
const ids: { user?: string; admin?: string; product?: string; preparation?: string; vertical?: string; courses: string[]; modules: string[]; lessons: string[]; questions: string[]; material?: string } = { courses: [], modules: [], lessons: [], questions: [] };
let cookie = ""; let adminCookie = "";
async function api(path: string, body?: unknown, admin = false) {
  return fetch(base + path, { method: body ? "POST" : "GET", headers: { Cookie: admin ? adminCookie : cookie, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function login(email: string) { const response = await api("/api/auth/login", { email, password, intent: "login" }); assert.equal(response.status, 200); return response.headers.get("set-cookie")!.split(";")[0]; }
async function main() {
  try {
    const hash = await bcrypt.hash(password, 10);
    ids.user = (await db.user.create({ data: { email: `${prefix}@example.invalid`, name: "Freemium test", passwordHash: hash, emailVerifiedAt: new Date() } })).id;
    ids.admin = (await db.user.create({ data: { email: `${prefix}-admin@example.invalid`, name: "Offer administrator test", role: "ADMIN", passwordHash: hash, emailVerifiedAt: new Date() } })).id;
    cookie = await login(`${prefix}@example.invalid`); adminCookie = await login(`${prefix}-admin@example.invalid`);
    assert.equal((await api("/cronograma")).status, 200);
    for (let i = 0; i < 3; i++) {
      const course = await db.course.create({ data: { title: prefix + i, slug: prefix + i, priceCents: i === 2 ? 0 : 1000, isFree: false, status: "PUBLISHED", published: true } }); ids.courses.push(course.id);
      const fixtureModule = await db.module.create({ data: { slug: prefix + i, title: prefix + i } }); ids.modules.push(fixtureModule.id);
      const lesson = await db.lesson.create({ data: { slug: prefix + i, title: prefix + i, status: "PUBLISHED", content: "Conteúdo pago", isFree: false, isFreePreview: false } }); ids.lessons.push(lesson.id);
      await db.courseModule.create({ data: { courseId: course.id, moduleId: fixtureModule.id } }); await db.moduleLesson.create({ data: { moduleId: fixtureModule.id, lessonId: lesson.id } });
      const detail = await (await api(`/api/courses/${course.slug}/progress`)).json(); assert.equal(detail.course.hasAccess, false, "Sem compra, inclusive preço zero não configurado, acesso fechado.");
    }
    ids.vertical = (await db.vertical.create({ data: { slug: prefix, name: prefix, themeKey: "vestibular" } })).id;
    ids.preparation = (await db.preparation.create({ data: { slug: prefix, name: prefix, verticalId: ids.vertical, status: "PUBLISHED", isFree: false } })).id;
    await db.preparationCourse.create({ data: { preparationId: ids.preparation, courseId: ids.courses[0] } });
    await db.entitlement.create({ data: { userId: ids.user, preparationId: ids.preparation, sourceType: "PROMOTION", sourceKey: `free:${ids.preparation}` } });
    assert.equal(await courseEntitlement(ids.user, ids.courses[0]), null, "Permissão gratuita automática antiga não libera preparatório pago.");
    ids.product = (await db.product.create({ data: { slug: prefix, name: prefix, description: "Fixture", priceCents: 1000 } })).id;
    await db.preparationProduct.create({ data: { preparationId: ids.preparation, productId: ids.product } });
    assert.equal((await api("/api/admin/offers", { kind: "course", id: ids.courses[0], isFree: true, priceCents: 0 })).status, 403);
    const empty = await db.course.create({ data: { title: prefix + "-empty", slug: prefix + "-empty", priceCents: 1000, isFree: false, status: "PUBLISHED", published: true } }); ids.courses.push(empty.id);
    assert.equal((await api("/api/admin/offers", { kind: "course", id: empty.id, isFree: false, priceCents: 1000 }, true)).status, 200);
    assert.equal((await api("/api/payments/checkout", { courseId: empty.id })).status, 409, "Curso vazio não pode gerar cobrança.");
    const material = await db.material.create({ data: { title: prefix, category: "Teste", description: "Fixture", premium: true, priceCents: 1000, fileUrl: `/api/materials/files/${prefix}.pdf` } }); ids.material = material.id;
    await db.lesson.update({ where: { id: ids.lessons[0] }, data: { materialId: material.id } });
    assert.equal(await courseMaterialAccess(ids.user, material.id, material.fileUrl), false);
    const taxonomy = await db.question.findFirstOrThrow({ select: { subjectId: true, vestibularId: true } });
    for (let i = 0; i < 25; i++) { ids.questions.push((await db.question.create({ data: { ...taxonomy, year: 2026, statement: prefix + i, alternatives: JSON.stringify([{ key: "A", text: "Sim" }, { key: "B", text: "Não" }]), correctAlternative: "A", explanation: "Fixture", status: "PUBLISHED", reviewState: "APPROVED", createdAt: new Date(Date.UTC(2099, 0, 1, 0, 0, i)) } })).id); }
    const paidQuestion = ids.questions.at(-1)!; const unavailable = ids.questions.at(-2)!;
    await db.lessonQuestion.create({ data: { lessonId: ids.lessons[0], questionId: paidQuestion } });
    assert.equal(await db.question.count({ where: { AND: [{ id: paidQuestion }, await availableQuestionWhere(ids.user, "STUDENT")] } }), 0);
    assert.equal((await api(`/api/questions/${paidQuestion}/attempt`, { selectedAlternative: "A" })).status, 403);
    const purchase = await db.purchase.create({ data: { hotmartTransaction: prefix, userId: ids.user, productId: ids.product, buyerEmail: `${prefix}@example.invalid`, status: "PENDING" } });
    const deliver = async (status: "APPROVED" | "REFUNDED") => db.$transaction(async tx => { const saved = await tx.purchase.update({ where: { id: purchase.id }, data: { status } }); await syncPurchaseAccess(tx, saved, prefix); });
    assert.equal(await courseEntitlement(ids.user, ids.courses[0]), null);
    await deliver("APPROVED"); await deliver("APPROVED");
    assert.ok(await courseEntitlement(ids.user, ids.courses[0])); assert.equal(await courseEntitlement(ids.user, ids.courses[1]), null);
    assert.ok(await courseMaterialAccess(ids.user, material.id, material.fileUrl));
    assert.equal((await db.userPreparation.findMany({ where: { userId: ids.user, preparationId: ids.preparation } })).length, 1);
    assert.equal((await (await api(`/api/courses/${prefix}0/progress`)).json()).course.hasAccess, true);
    assert.equal((await api(`/api/questions/${paidQuestion}/attempt`, { selectedAlternative: "A" })).status, 200);
    assert.equal((await api(`/api/questions/${unavailable}/attempt`, { selectedAlternative: "A" })).status, 403);
    assert.equal((await api("/api/payments/checkout", { preparationId: ids.preparation })).status, 409);
    const grant = await db.entitlement.findFirstOrThrow({ where: { userId: ids.user, preparationId: ids.preparation, purchaseId: purchase.id } });
    await db.entitlement.update({ where: { id: grant.id }, data: { validFrom: new Date(Date.now() + 60_000) } }); assert.equal(await courseEntitlement(ids.user, ids.courses[0]), null);
    await db.entitlement.update({ where: { id: grant.id }, data: { validFrom: new Date(0), expiresAt: new Date(0) } }); assert.equal(await courseEntitlement(ids.user, ids.courses[0]), null);
    await db.entitlement.update({ where: { id: grant.id }, data: { expiresAt: null } });
    await deliver("REFUNDED"); assert.equal(await courseEntitlement(ids.user, ids.courses[0]), null); assert.equal(await courseMaterialAccess(ids.user, material.id, material.fileUrl), false);
    assert.equal((await (await api(`/api/courses/${prefix}0/progress`)).json()).course.hasAccess, false);
    const offer = await api("/api/admin/offers", { kind: "course", id: ids.courses[2], isFree: true, priceCents: 0 }, true); assert.equal(offer.status, 200);
    assert.equal((await (await api(`/api/courses/${prefix}2/progress`)).json()).course.hasAccess, true);
    console.log("Freemium: conta/plano grátis; acesso isolado por compra; preço zero fechado; questões limitadas; materiais incluídos; aprovação idempotente; validade; estorno; oferta restrita a ADMIN. Todos aprovados.");
  } finally {
    const userIds = [ids.user, ids.admin].filter((id): id is string => Boolean(id));
    await db.entitlement.deleteMany({ where: { userId: { in: userIds } } }); await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.question.deleteMany({ where: { id: { in: ids.questions } } });
    if (ids.preparation) await db.preparation.delete({ where: { id: ids.preparation } });
    await db.course.deleteMany({ where: { id: { in: ids.courses } } }); await db.module.deleteMany({ where: { id: { in: ids.modules } } }); await db.lesson.deleteMany({ where: { id: { in: ids.lessons } } });
    if (ids.material) await db.material.delete({ where: { id: ids.material } });
    await db.product.deleteMany({ where: { OR: [{ slug: prefix }, { slug: { startsWith: `official-course-${prefix}` } }] } });
    if (ids.vertical) await db.vertical.delete({ where: { id: ids.vertical } }); await db.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message.split("\n")[0] : "Falha de validação"); process.exitCode = 1; });
