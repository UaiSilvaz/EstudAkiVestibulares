import type { Prisma } from "@prisma/client";

export function teacherCourseWhere(user: { id: string; role: string }): Prisma.CourseWhereInput {
  return user.role === "ADMIN" ? {} : { teacherId: user.id };
}

export function teacherModuleWhere(user: { id: string; role: string }): Prisma.ModuleWhereInput {
  return user.role === "ADMIN" ? {} : { courses: { some: { course: { teacherId: user.id } }, every: { course: { teacherId: user.id } } } };
}

export function teacherLessonWhere(user: { id: string; role: string }): Prisma.LessonWhereInput {
  return user.role === "ADMIN" ? {} : { OR: [
    { authors: { some: { userId: user.id } } },
    { modules: { some: { module: { courses: { some: { course: { teacherId: user.id } } } } },
      every: { module: { courses: { every: { course: { teacherId: user.id } } } } } } },
  ] };
}
