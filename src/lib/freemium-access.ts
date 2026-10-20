import { db } from "@/lib/db";
import { accessibleCourseWhere, FREE_QUESTION_SAMPLE_SIZE, validEntitlementWhere } from "@/lib/freemium";
import type { Prisma } from "@prisma/client";

export async function courseEntitlement(userId: string | null, courseId: string) {
  if (!userId) return null;
  return db.entitlement.findFirst({ where: {
    ...validEntitlementWhere(userId),
    AND: [{ OR: [{ courseId }, { preparation: { courses: { some: { courseId } } } }] }],
  }, select: { id: true } });
}

export async function availableQuestionWhere(userId: string, role: string): Promise<Prisma.QuestionWhereInput> {
  if (role === "ADMIN" || role === "TEACHER") return {};
  const sample = await db.question.findMany({ where: { status: "PUBLISHED", reviewState: "APPROVED" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: FREE_QUESTION_SAMPLE_SIZE, select: { id: true } });
  return { OR: [
    { id: { in: sample.map(item => item.id) } },
    { lessonLinks: { some: { lesson: { status: "PUBLISHED", modules: { some: { module: { courses: { some: { course: {
      AND: [{ OR: [{ published: true }, { status: "PUBLISHED" }] }, accessibleCourseWhere(userId)],
    } } } } } } } } } },
  ] };
}

export async function courseMaterialAccess(userId: string, materialId: string, fileUrl: string | null) {
  return Boolean(await db.lesson.findFirst({ where: {
    status: "PUBLISHED",
    OR: [{ materialId }, ...(fileUrl ? [{ resources: { array_contains: [{ href: fileUrl }] } }] : [])],
    modules: { some: { module: { courses: { some: { course: { AND: [
      { OR: [{ published: true }, { status: "PUBLISHED" }] }, accessibleCourseWhere(userId),
    ] } } } } } },
  }, select: { id: true } }));
}
