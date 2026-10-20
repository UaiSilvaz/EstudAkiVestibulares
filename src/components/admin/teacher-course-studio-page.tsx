import { teacherCourseWhere, teacherModuleWhere, teacherLessonWhere } from "@/lib/teacher-content-access";
import { Role } from "@prisma/client";
import { CourseStudio } from "@/components/admin/course-studio";
import { PageHeader } from "@/components/page-header";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TeacherCourseStudioPage() {
  const user = await requireTeacher();
  const canSeeEveryCourse = user.role === Role.ADMIN;
  const courseWhere = teacherCourseWhere(user);

  const [courses, modules, lessons, subjects, topics] = await Promise.all([
    db.course.findMany({
      where: courseWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        modules: {
          orderBy: { position: "asc" },
          include: {
            module: {
              include: {
                _count: { select: { courses: true, lessons: true } },
                lessons: {
                  orderBy: { position: "asc" },
                  include: {
                    lesson: {
                      include: {
                        subject: { select: { id: true, name: true } },
                        topic: { select: { id: true, name: true } },
                        authors: { include: { user: { select: { id: true, name: true } } } },
                        _count: { select: { modules: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.module.findMany({
      where: teacherModuleWhere(user),
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { courses: true, lessons: true } } },
    }),
    db.lesson.findMany({
      where: teacherLessonWhere(user),
      orderBy: { updatedAt: "desc" },
      include: {
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        authors: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { modules: true } },
      },
    }),
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.topic.findMany({
      orderBy: { name: "asc" },
      select: { id: true, subjectId: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Estúdio do professor"
        title="Cursos, módulos e aulas"
        description="Monte cursos em etapas, crie aulas uma vez e reutilize o mesmo conteúdo em diferentes módulos sem duplicar trabalho."
      />
      <CourseStudio
        courses={courses}
        modules={modules}
        lessons={lessons}
        subjects={subjects}
        topics={topics}
        canPublish={canSeeEveryCourse}
      />
    </div>
  );
}
