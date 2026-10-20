import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultLearningProfile } from "../src/lib/learning-profile";

const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname) || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Use servidor e banco locais.");
const prefix = "real-learning-test-" + randomUUID(), password = randomUUID();
const users: string[] = [];
let courseId: string | undefined, moduleId: string | undefined, lessonId: string | undefined, questionId: string | undefined;

async function api(cookie: string, path: string, method = "GET", data?: unknown) {
  const response = await fetch(base + path, { method, headers: { cookie, "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
  const body = await response.json();
  return { status: response.status, body };
}
async function account(role: "STUDENT" | "TEACHER", index: number) {
  const user = await db.user.create({ data: { name: prefix + "-" + index, email: prefix + "-" + index + "@example.invalid", role, passwordHash: await bcrypt.hash(password, 10) } });
  users.push(user.id);
  const response = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password }) });
  assert.equal(response.status, 200);
  return { user, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}
async function main() {
  try {
    const student = await account("STUDENT", 1), stranger = await account("STUDENT", 2);
    const teacher = await account("TEACHER", 3), unrelatedTeacher = await account("TEACHER", 4);
    const initialMetrics = await api(student.cookie, "/api/metrics");
    assert.equal(initialMetrics.status, 200);
    assert.equal(initialMetrics.body.user.xp, 0); assert.equal(initialMetrics.body.insights.consistencyScore, 0);
    const profile = { ...defaultLearningProfile(), course: "Medicina", targetScore: "800", minutesPerDay: 90, studyDays: [1, 3, 5], level: "INTERMEDIATE", difficultSubjects: ["matematica"], learningPreferences: ["video", "questions"], examDate: "2027-11-07", currentStep: 2 };
    assert.equal((await api(student.cookie, "/api/onboarding", "PUT", profile)).status, 200);
    const stored = await db.studentLearningProfile.findUniqueOrThrow({ where: { userId: student.user.id } });
    assert.equal(stored.course, "Medicina"); assert.deepEqual(stored.learningPreferences, ["video", "questions"]); assert.equal(stored.completedAt, null);
    assert.equal((await api(student.cookie, "/api/onboarding")).body.profile.targetScore, "800");
    assert.equal((await api(stranger.cookie, "/api/onboarding")).body.profile, null);
    const completed = await api(student.cookie, "/api/onboarding", "POST", profile);
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    assert.ok(completed.body.profile.completedAt);
    assert.deepEqual((await db.studyPlanPreference.findUniqueOrThrow({ where: { userId: student.user.id } })).availableDays, "[1,3,5]");
    assert.equal((await api(student.cookie, "/api/onboarding", "POST", { ...profile, examDate: "2027-02-30" })).status, 400);

    const exam = await db.vestibular.findUniqueOrThrow({ where: { slug: "enem" } });
    const subject = await db.subject.findFirstOrThrow({ where: { slug: "matematica" } });
    const question = await db.question.create({ data: { vestibularId: exam.id, subjectId: subject.id, year: 2026, statement: prefix, alternatives: JSON.stringify({ A: "A", B: "B", C: "C", D: "D", E: "E" }), correctAlternative: "A", explanation: "Local fixture", status: "PUBLISHED", reviewState: "APPROVED" } });
    questionId = question.id;
    const directFirstAnswer = await api(stranger.cookie, "/api/questions/" + question.id + "/attempt", "POST", { selectedAlternative: "A" });
    assert.equal(directFirstAnswer.status, 200);
    assert.equal(directFirstAnswer.body.answerXp, 15);
    const answers = await Promise.all(Array.from({ length: 4 }, () => api(student.cookie, "/api/questions/" + question.id + "/attempt", "POST", { selectedAlternative: "A", timeSpentSeconds: 20 })));
    answers.forEach(row => assert.equal(row.status, 200, JSON.stringify(row.body)));
    assert.equal(answers.reduce((sum, row) => sum + row.body.answerXp, 0), 15);
    assert.equal(await db.xpAward.count({ where: { userId: student.user.id, sourceKey: "question:" + question.id } }), 1);
    assert.equal(await db.questionAttempt.count({ where: { userId: student.user.id, questionId } }), 4);
    assert.equal((await api(student.cookie, "/api/questions/" + question.id + "/attempt", "POST", null)).status, 400);

    const course = await db.course.create({ data: { slug: prefix, title: prefix, teacherId: teacher.user.id, status: "PUBLISHED", published: true, isFree: false, priceCents: 1000 } });
    courseId = course.id;
    const fixtureModule = await db.module.create({ data: { slug: prefix, title: prefix } }); moduleId = fixtureModule.id;
    const lesson = await db.lesson.create({ data: { slug: prefix, title: prefix, status: "PUBLISHED", xpReward: 40 } }); lessonId = lesson.id;
    await db.courseModule.create({ data: { courseId, moduleId } }); await db.moduleLesson.create({ data: { moduleId, lessonId } });
    await db.entitlement.create({ data: { userId: student.user.id, courseId, sourceKey: prefix, sourceType: "ADMIN" } });
    const completions = await Promise.all(Array.from({ length: 4 }, () => api(student.cookie, "/api/lessons/" + lesson.id + "/complete", "POST", {})));
    completions.forEach(row => assert.equal(row.status, 200, JSON.stringify(row.body)));
    assert.equal(await db.xpAward.count({ where: { userId: student.user.id, sourceKey: "lesson:" + lesson.id } }), 1);
    assert.equal((await db.xpAward.findUniqueOrThrow({ where: { userId_sourceKey: { userId: student.user.id, sourceKey: "lesson:" + lesson.id } } })).amount, 40);
    const assigned = await api(teacher.cookie, "/api/teacher/students?studentId=" + student.user.id);
    assert.equal(assigned.status, 200); assert.equal(assigned.body.students[0].profile.targetScore, "800"); assert.equal(assigned.body.students[0].totalAnswers, 4); assert.equal(assigned.body.students[0].lessonsCompleted, 1);
    assert.equal((await api(unrelatedTeacher.cookie, "/api/teacher/students?studentId=" + student.user.id)).status, 404);
    assert.equal((await api(stranger.cookie, "/api/teacher/students")).status, 403);
    await db.entitlement.updateMany({ where: { userId: student.user.id, courseId }, data: { revokedAt: new Date() } });
    assert.equal((await api(teacher.cookie, "/api/teacher/students?studentId=" + student.user.id)).status, 404);

    assert.equal((await api(student.cookie, "/api/study-sessions", "POST", { durationSeconds: 999999, questionsAnswered: 999 })).status, 400);
    const started = await api(student.cookie, "/api/study-sessions", "POST", { action: "start" }); assert.equal(started.status, 201);
    const duplicateStart = await api(student.cookie, "/api/study-sessions", "POST", { action: "start" }); assert.equal(duplicateStart.body.session.id, started.body.session.id);
    // Move only this test fixture's server start backwards instead of waiting four minutes.
    await db.studySession.update({ where: { id: started.body.session.id }, data: { startedAt: new Date(Date.now() - 240000) } });
    assert.equal((await api(stranger.cookie, "/api/study-sessions", "PATCH", { id: started.body.session.id })).status, 404);
    const ended = await Promise.all(Array.from({ length: 3 }, () => api(student.cookie, "/api/study-sessions", "PATCH", { id: started.body.session.id })));
    ended.forEach(row => assert.equal(row.status, 200)); assert.equal(ended.reduce((sum, row) => sum + row.body.gainedXp, 0), 2);
    await db.questionAttempt.createMany({ data: Array.from({ length: 247 }, () => ({ userId: student.user.id, questionId: question.id, selectedAlternative: "B", correct: false, timeSpentSeconds: 10 })) });
    await Promise.all(Array.from({ length: 3 }, () => api(student.cookie, "/api/metrics")));
    const awards = await db.xpAward.aggregate({ where: { userId: student.user.id }, _sum: { amount: true } });
    const realUser = await db.user.findUniqueOrThrow({ where: { id: student.user.id } });
    assert.equal(realUser.xp, awards._sum.amount); assert.equal(realUser.streak, 1);
    const metrics = await api(student.cookie, "/api/metrics"); assert.equal(metrics.body.metrics.attempts, 251); assert.equal(metrics.body.metrics.studySessions, 1);
    assert.equal(metrics.body.insights.accuracyRate, 4 / 251 * 100);
    console.log("PASS: zero initial XP, database draft/final profile, personalization, concurrent question/lesson/achievement XP, exact ledger balance, real timer, professor scoping and revoked access.");
  } finally {
    if (users.length) { await db.entitlement.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); }
    if (courseId) await db.course.delete({ where: { id: courseId } });
    if (moduleId) await db.moduleLesson.deleteMany({ where: { moduleId } });
    if (lessonId) await db.lesson.delete({ where: { id: lessonId } });
    if (moduleId) await db.module.delete({ where: { id: moduleId } });
    if (questionId) await db.question.delete({ where: { id: questionId } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
