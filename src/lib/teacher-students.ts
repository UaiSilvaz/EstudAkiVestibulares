import { Prisma, Role } from "@prisma/client";
import { db } from "./db";
import { canUseTeacherTools, type AppUser } from "./roles";
import { buildDashboardInsights } from "./insights";
import { studyDayKey } from "./study-xp";

export function teacherStudentScope(viewer: AppUser): Prisma.UserWhereInput {
  if (!canUseTeacherTools(viewer.role)) throw new Error("Acesso exclusivo para professores.");
  if (viewer.role === Role.ADMIN) return { role: Role.STUDENT };
  const activeGrant: Prisma.EntitlementWhereInput = { revokedAt: null, validFrom: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], NOT: { sourceType: "PROMOTION", sourceKey: { startsWith: "free:" }, purchaseId: null, preparation: { isFree: false } } };
  return { role: Role.STUDENT, OR: [
    { entitlements: { some: { ...activeGrant, course: { teacherId: viewer.id } } } },
    { entitlements: { some: { ...activeGrant, preparation: { courses: { some: { course: { teacherId: viewer.id } } } } } } },
    { lessonProgress: { some: { lesson: { modules: { some: { module: { courses: { some: { course: { teacherId: viewer.id, status: "PUBLISHED", isFree: true } } } } } } } } } },
  ] };
}

export async function getTeacherStudents(viewer: AppUser, studentId?: string) {
  const students = await db.user.findMany({ where: { AND: [teacherStudentScope(viewer), ...(studentId ? [{ id: studentId }] : [])] },
    orderBy: { name: "asc" }, select: {
      id: true, name: true, email: true, xp: true, streak: true, targetExam: true, weeklyHours: true,
      learningProfile: true,
      attempts: { where: { annulled: false }, select: { correct: true, reviewed: true, createdAt: true, timeSpentSeconds: true, errorType: true,
        question: { select: { id: true, difficulty: true, subject: { select: { id: true, name: true, color: true } }, topic: { select: { id: true, name: true } } } } } },
      lessonProgress: { where: { completed: true }, select: { lessonId: true } },
      studySessions: { where: { endedAt: { not: null } }, select: { durationSeconds: true } },
    },
  });
  return students.map(student => {
    const profile = student.learningProfile;
    const insights = buildDashboardInsights({ profile: { name: student.name, weeklyHours: student.weeklyHours, targetExam: student.targetExam, examDate: profile?.examDate, studyDays: profile?.studyDays as number[] | undefined }, attempts: student.attempts, questions: [] });
    const lastStudy = student.attempts.reduce<Date | null>((last, row) => !last || row.createdAt > last ? row.createdAt : last, null);
    return { id: student.id, name: student.name, email: student.email, xp: student.xp, streak: student.streak,
      targetExam: student.targetExam, profile, insights, lastStudy, totalAnswers: student.attempts.length,
      lessonsCompleted: student.lessonProgress.length, studyMinutes: Math.floor(student.studySessions.reduce((sum, row) => sum + row.durationSeconds, 0) / 60),
      activeToday: lastStudy ? studyDayKey(lastStudy) === studyDayKey(new Date()) : false,
    };
  });
}
