import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname) || !["127.0.0.1", "localhost"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Teste permitido apenas em servidor/banco locais.");
const prefix = `teacher-test-${randomUUID()}`;
const password = randomUUID();
const users: string[] = []; const courses: string[] = []; const modules: string[] = []; const lessons: string[] = [];
const cookies: Record<string, string> = {};
async function request(role: string, path: string, body?: unknown) {
  return fetch(base + path, { redirect: "manual", method: body ? "POST" : "GET", headers: { Cookie: cookies[role] ?? "", "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function main() {
  try {
    const hash = await bcrypt.hash(password, 10);
    for (const role of ["TEACHER", "ADMIN", "STUDENT", "OTHER"] as const) {
      const user = await db.user.create({ data: { name: prefix + role, email: `${prefix}-${role.toLowerCase()}@example.invalid`, passwordHash: hash, emailVerifiedAt: new Date(), role: role === "OTHER" ? "TEACHER" : role } }); users.push(user.id);
      const response = await request(role, "/api/auth/login", { email: user.email, password }); assert.equal(response.status, 200); cookies[role] = response.headers.get("set-cookie")!.split(";")[0];
    }
    for (const [index, teacherId] of [users[0], users[3]].entries()) {
      const course = await db.course.create({ data: { title: prefix + index, slug: prefix + index, teacherId, status: "DRAFT" } }); courses.push(course.id);
      const fixtureModule = await db.module.create({ data: { title: prefix + index, slug: prefix + index } }); modules.push(fixtureModule.id);
      const lesson = await db.lesson.create({ data: { title: prefix + index, slug: prefix + index, status: "DRAFT", authors: { create: { userId: teacherId } } } }); lessons.push(lesson.id);
      await db.courseModule.create({ data: { courseId: course.id, moduleId: fixtureModule.id } }); await db.moduleLesson.create({ data: { moduleId: fixtureModule.id, lessonId: lesson.id } });
    }
    for (const path of ["/api/admin/users", "/api/admin/questions", "/api/admin/provas-antigas", "/api/admin/official-sources"]) assert.equal((await request("TEACHER", path)).status, 403, path);
    assert.equal((await request("TEACHER", "/api/admin/exams", {})).status, 403);
    assert.equal((await request("TEACHER", "/api/admin/materials", { title: "Unauthorized" })).status, 403);
    assert.equal((await request("TEACHER", "/api/admin/offers", {})).status, 403);
    for (const path of ["/admin", "/admin/courses", "/admin/content", "/admin/exams", "/admin/questions"]) {
      const response = await request("TEACHER", path);
      assert.ok(response.status === 307 || (await response.text()).includes("NEXT_REDIRECT"), path);
    }
    const studentProfessor = await request("STUDENT", "/professor");
    assert.ok(studentProfessor.status === 307 || (await studentProfessor.text()).includes("NEXT_REDIRECT"));
    assert.equal((await request("STUDENT", "/api/teacher/students")).status, 403);
    for (const role of ["ADMIN", "TEACHER"]) assert.equal((await request(role, "/professor")).status, 200);
    const html = await (await request("TEACHER", "/professor/cursos")).text(); assert.ok(html.includes(prefix + "0")); assert.ok(!html.includes(prefix + "1"), "Professor não recebe conteúdo de outro professor.");
    const studio = (body: unknown) => request("TEACHER", "/api/admin/course-studio", body);
    assert.equal((await studio({ action: "updateCourse", courseId: courses[1], title: "Forbidden", coverImage: "/icon.png" })).status, 404);
    assert.equal((await studio({ action: "linkModule", courseId: courses[0], moduleId: modules[1] })).status, 404);
    assert.equal((await studio({ action: "linkLesson", moduleId: modules[0], lessonId: lessons[1] })).status, 404);
    assert.equal((await studio({ action: "updateLesson", lessonId: lessons[1], title: "Forbidden" })).status, 403);
    const updated = await studio({ action: "setCourseStatus", courseId: courses[0], status: "PUBLISHED" }); assert.equal(updated.status, 200); assert.equal((await updated.json()).course.status, "REVIEW");
    const created = await studio({ action: "createLesson", moduleId: modules[0], title: prefix + "-created", type: "MATERIAL", status: "PUBLISHED", content: "Professor content" }); assert.equal(created.status, 201); const lesson = (await created.json()).lesson; lessons.push(lesson.id); assert.equal(lesson.status, "REVIEW");
    await db.entitlement.create({ data: { userId: users[2], courseId: courses[0], sourceType: "PROMOTION", sourceKey: prefix } });
    assert.equal((await (await request("TEACHER", "/api/teacher/students")).json()).students.some((student: { id: string }) => student.id === users[2]), true);
    assert.equal((await (await request("OTHER", "/api/teacher/students")).json()).students.some((student: { id: string }) => student.id === users[2]), false);
    const roleOptions = await db.$queryRaw<Array<{ value: string }>>`SELECT unnest(enum_range(NULL::"Role"))::text AS value`;
    assert.deepEqual(roleOptions.map(role => role.value).sort(), ["ADMIN", "STUDENT", "TEACHER"]);
    console.log("Professor: acesso próprio; admin e aluno protegidos; conteúdo de terceiros isolado; publicação em revisão; alunos vinculados; somente três cargos. Todos aprovados.");
  } finally {
    await db.entitlement.deleteMany({ where: { userId: { in: users } } }); await db.lessonAuthor.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } });
    await db.course.deleteMany({ where: { id: { in: courses } } }); await db.module.deleteMany({ where: { id: { in: modules } } }); await db.lesson.deleteMany({ where: { id: { in: lessons } } }); await db.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message.split("\n")[0] + " " + error.stack?.split("\n").find(line => line.includes("verify-teacher-permissions.ts:")) : "Falha no teste"); process.exitCode = 1; });
