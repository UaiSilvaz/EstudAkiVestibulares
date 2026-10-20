import {
  ContentStatus,
  CourseNavigationMode,
  LessonNodeType,
  Prisma,
  Role,
  VideoProvider,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { canUseTeacherTools, canPublishDirectly, getCurrentUser } from "@/lib/auth";
import { isValidLessonVideoUrl } from "@/lib/courses/video-source";
import { db } from "@/lib/db";
import { readJsonRequest } from "@/server/security/request";

type StudioCommand = {
  action?: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  direction?: "up" | "down";
  title?: string;
  description?: string;
  shortDescription?: string;
  subjectId?: string;
  topicId?: string;
  category?: string;
  level?: string;
  navigationMode?: string;
  coverImage?: string;
  type?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  resources?: unknown;
  content?: string;
  durationMinutes?: number;
  isFreePreview?: boolean;
  color?: string;
  status?: "DRAFT" | "REVIEW" | "PUBLISHED";
};

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function saveError(cause: unknown) {
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    if (cause.code === "P2022") {
      return "O banco ainda não possui todos os campos de cursos. Aplique as migrações e reinicie o servidor.";
    }
    if (cause.code === "P2002") return "Já existe um conteúdo com estes dados.";
    if (cause.code === "P2003") return "A matéria, o assunto, o módulo ou o autor selecionado não existe mais.";
    if (cause.code === "P2025") return "O conteúdo que você tentou alterar não foi encontrado.";
  }
  if (cause instanceof Prisma.PrismaClientValidationError) {
    return "O servidor está usando uma versão antiga do banco. Reinicie o servidor e tente novamente.";
  }
  return "Não foi possível salvar. Revise os campos e tente novamente.";
}

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function lessonResources(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = clean(record.title, 140);
    const href = clean(record.href, 2000);
    if (!title || (!href.startsWith("/") && !/^https?:\/\//i.test(href))) return [];
    const type = record.type === "SUMMARY" || record.type === "SHEET" ? record.type : "PDF";
    return [{ title, href, type }];
  });
}

function slugBase(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase() || "conteudo";
}

async function uniqueCourseSlug(title: string) {
  const base = slugBase(title);
  let slug = base;
  let suffix = 2;
  while (await db.course.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

async function uniqueModuleSlug(title: string, client: Prisma.TransactionClient) {
  const base = slugBase(title);
  let slug = base;
  let suffix = 2;
  while (await client.module.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

async function uniqueLessonSlug(title: string, client: Prisma.TransactionClient) {
  const base = slugBase(title);
  let slug = base;
  let suffix = 2;
  while (await client.lesson.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

function elevated(role: Role) {
  return role === Role.ADMIN;
}

async function editableCourse(courseId: string, user: { id: string; role: Role }) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true },
  });
  if (!course) return null;
  if (!elevated(user.role) && course.teacherId !== user.id) return null;
  return course;
}

async function editableModule(moduleId: string, user: { id: string; role: Role }) {
  const moduleRecord = await db.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      courses: { select: { course: { select: { teacherId: true } } } },
    },
  });
  if (!moduleRecord) return null;
  if (
    !elevated(user.role) &&
    (!moduleRecord.courses.length || moduleRecord.courses.some((item) => item.course.teacherId !== user.id))
  ) {
    return null;
  }
  return moduleRecord;
}

async function editableLesson(lessonId: string, user: { id: string; role: Role }) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      authors: { select: { userId: true } },
      modules: {
        select: {
          module: { select: { courses: { select: { course: { select: { teacherId: true } } } } } },
        },
      },
    },
  });
  if (!lesson) return null;
  if (elevated(user.role) || lesson.authors.some((author) => author.userId === user.id)) {
    return lesson;
  }
  const linkedCourses = lesson.modules.flatMap((item) => item.module.courses);
  if (linkedCourses.length && linkedCourses.every((item) => item.course.teacherId === user.id)) {
    return lesson;
  }
  return null;
}

async function refreshCourseDuration(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      modules: {
        select: {
          module: {
            select: {
              lessons: { select: { lesson: { select: { durationSeconds: true } } } },
            },
          },
        },
      },
    },
  });
  if (!course) return;
  const totalDurationSeconds = course.modules.reduce(
    (courseTotal, item) =>
      courseTotal +
      item.module.lessons.reduce(
        (moduleTotal, lesson) => moduleTotal + lesson.lesson.durationSeconds,
        0,
      ),
    0,
  );
  await db.course.update({ where: { id: courseId }, data: { totalDurationSeconds } });
}

async function refreshCoursesUsingModule(moduleId: string) {
  const links = await db.courseModule.findMany({
    where: { moduleId },
    select: { courseId: true },
  });
  await Promise.all(links.map((item) => refreshCourseDuration(item.courseId)));
}

async function refreshCoursesUsingLesson(lessonId: string) {
  const links = await db.moduleLesson.findMany({
    where: { lessonId },
    select: { moduleId: true },
  });
  await Promise.all(links.map((item) => refreshCoursesUsingModule(item.moduleId)));
}

async function moveCourseModule(courseId: string, moduleId: string, direction: "up" | "down") {
  const items = await db.courseModule.findMany({
    where: { courseId },
    orderBy: [{ position: "asc" }, { moduleId: "asc" }],
  });
  const index = items.findIndex((item) => item.moduleId === moduleId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
  const reordered = [...items];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  await db.$transaction(
    reordered.map((item, position) =>
      db.courseModule.update({
        where: { courseId_moduleId: { courseId, moduleId: item.moduleId } },
        data: { position },
      }),
    ),
  );
}

async function moveModuleLesson(moduleId: string, lessonId: string, direction: "up" | "down") {
  const items = await db.moduleLesson.findMany({
    where: { moduleId },
    orderBy: [{ position: "asc" }, { lessonId: "asc" }],
  });
  const index = items.findIndex((item) => item.lessonId === lessonId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
  const reordered = [...items];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  await db.$transaction(
    reordered.map((item, position) =>
      db.moduleLesson.update({
        where: { moduleId_lessonId: { moduleId, lessonId: item.lessonId } },
        data: { position },
      }),
    ),
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canUseTeacherTools(user.role)) return error("Sem permissão.", 403);

  const parsed = await readJsonRequest<StudioCommand>(request, { maxBytes: 32 * 1024 });
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    if (input.action === "createCourse") {
      const title = clean(input.title, 120);
      if (!title) return error("Informe o título do curso.");
      const coverImage = clean(input.coverImage, 2000);
      if (!coverImage) return error("Adicione a capa do curso em 1280 × 720 px.");
      const publishImmediately = false;
      const course = await db.course.create({
        data: {
          title,
          slug: await uniqueCourseSlug(title),
          description: clean(input.description, 4000),
          shortDescription: clean(input.shortDescription || input.description, 220),
          subjectId: clean(input.subjectId, 80) || null,
          category: clean(input.category, 60) || "ENEM",
          level: clean(input.level, 40) || "Base",
          navigationMode:
            input.navigationMode === CourseNavigationMode.FREE_NAVIGATION
              ? CourseNavigationMode.FREE_NAVIGATION
              : CourseNavigationMode.SEQUENTIAL,
          thumbnail: coverImage,
          coverImage,
          teacherId: user.id,
          status: publishImmediately ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
          published: publishImmediately,
          isFree: false,
        },
      });
      return NextResponse.json({ course }, { status: 201 });
    }

    if (input.action === "updateCourse") {
      const courseId = clean(input.courseId, 80);
      if (!(await editableCourse(courseId, user))) return error("Curso não encontrado.", 404);
      const title = clean(input.title, 120);
      if (!title) return error("Informe o título do curso.");
      const coverImage = clean(input.coverImage, 2000);
      if (!coverImage) return error("Adicione a capa do curso em 1280 × 720 px.");
      const course = await db.course.update({
        where: { id: courseId },
        data: {
          title,
          description: clean(input.description, 4000),
          shortDescription: clean(input.shortDescription || input.description, 220),
          subjectId: clean(input.subjectId, 80) || null,
          category: clean(input.category, 60) || "ENEM",
          level: clean(input.level, 40) || "Base",
          navigationMode:
            input.navigationMode === CourseNavigationMode.FREE_NAVIGATION
              ? CourseNavigationMode.FREE_NAVIGATION
              : CourseNavigationMode.SEQUENTIAL,
          thumbnail: coverImage,
          coverImage,
        },
      });
      return NextResponse.json({ course });
    }

    if (input.action === "setCourseStatus") {
      const courseId = clean(input.courseId, 80);
      if (!(await editableCourse(courseId, user))) return error("Curso não encontrado.", 404);
      const requested = input.status ?? "DRAFT";
      const status =
        requested === "PUBLISHED" && !canPublishDirectly(user.role)
          ? ContentStatus.REVIEW
          : requested === "PUBLISHED"
            ? ContentStatus.PUBLISHED
            : requested === "REVIEW"
              ? ContentStatus.REVIEW
              : ContentStatus.DRAFT;
      const course = await db.course.update({
        where: { id: courseId },
        data: { status, published: status === ContentStatus.PUBLISHED },
      });
      return NextResponse.json({ course });
    }

    if (input.action === "createModule") {
      const courseId = clean(input.courseId, 80);
      if (!(await editableCourse(courseId, user))) return error("Curso não encontrado.", 404);
      const title = clean(input.title, 120);
      if (!title) return error("Informe o título do módulo.");
      const createdModule = await db.$transaction(async (tx) => {
        const created = await tx.module.create({
          data: {
            title,
            slug: await uniqueModuleSlug(title, tx),
            description: clean(input.description, 1000),
            eyebrow: "",
            color: /^#[0-9a-f]{6}$/i.test(input.color ?? "") ? input.color! : "#2563EB",
          },
        });
        const aggregate = await tx.courseModule.aggregate({
          where: { courseId },
          _max: { position: true },
        });
        await tx.courseModule.create({
          data: { courseId, moduleId: created.id, position: (aggregate._max.position ?? -1) + 1 },
        });
        return created;
      });
      return NextResponse.json({ module: createdModule }, { status: 201 });
    }

    if (input.action === "updateModule") {
      const moduleId = clean(input.moduleId, 80);
      if (!(await editableModule(moduleId, user))) {
        return error("Você não pode alterar este módulo compartilhado.", 403);
      }
      const title = clean(input.title, 120);
      if (!title) return error("Informe o título do módulo.");
      const updatedModule = await db.module.update({
        where: { id: moduleId },
        data: {
          title,
          description: clean(input.description, 1000),
          color: /^#[0-9a-f]{6}$/i.test(input.color ?? "") ? input.color! : "#2563EB",
        },
      });
      return NextResponse.json({ module: updatedModule });
    }

    if (input.action === "linkModule") {
      const courseId = clean(input.courseId, 80);
      const moduleId = clean(input.moduleId, 80);
      if (!(await editableCourse(courseId, user))) return error("Curso não encontrado.", 404);
      if (!(await editableModule(moduleId, user))) {
        return error("Módulo não encontrado.", 404);
      }
      const aggregate = await db.courseModule.aggregate({
        where: { courseId },
        _max: { position: true },
      });
      await db.courseModule.upsert({
        where: { courseId_moduleId: { courseId, moduleId } },
        update: {},
        create: { courseId, moduleId, position: (aggregate._max.position ?? -1) + 1 },
      });
      await refreshCourseDuration(courseId);
      return NextResponse.json({ ok: true });
    }

    if (input.action === "unlinkModule") {
      const courseId = clean(input.courseId, 80);
      const moduleId = clean(input.moduleId, 80);
      if (!(await editableCourse(courseId, user))) return error("Curso não encontrado.", 404);
      await db.courseModule.deleteMany({ where: { courseId, moduleId } });
      await refreshCourseDuration(courseId);
      return NextResponse.json({ ok: true });
    }

    if (input.action === "moveModule") {
      const courseId = clean(input.courseId, 80);
      if (!(await editableCourse(courseId, user))) return error("Curso não encontrado.", 404);
      await moveCourseModule(courseId, clean(input.moduleId, 80), input.direction ?? "down");
      return NextResponse.json({ ok: true });
    }

    if (input.action === "createLesson") {
      const moduleId = clean(input.moduleId, 80);
      if (!(await editableModule(moduleId, user))) {
        return error("Você não pode alterar este módulo.", 403);
      }
      const title = clean(input.title, 140);
      if (!title) return error("Informe o título da aula.");
      const lessonType = Object.values(LessonNodeType).includes(input.type as LessonNodeType)
        ? (input.type as LessonNodeType)
        : LessonNodeType.VIDEO;
      const videoUrl = clean(input.videoUrl, 2000);
      if (videoUrl && !isValidLessonVideoUrl(videoUrl)) {
        return error("Informe um link de vídeo válido, começando com http://, https:// ou /.");
      }
      const thumbnailUrl = clean(input.thumbnailUrl, 2000);
      if (lessonType === LessonNodeType.VIDEO && !thumbnailUrl) {
        return error("Adicione a capa da videoaula em 1280 × 720 px.");
      }
      const durationSeconds = Math.max(0, Math.round(Number(input.durationMinutes) || 0) * 60);
      const requestedLessonStatus = input.status ?? "DRAFT";
      const lessonStatus =
        requestedLessonStatus === "PUBLISHED" && canPublishDirectly(user.role)
          ? ContentStatus.PUBLISHED
          : requestedLessonStatus === "PUBLISHED" || requestedLessonStatus === "REVIEW"
            ? ContentStatus.REVIEW
            : ContentStatus.DRAFT;
      const lesson = await db.$transaction(async (tx) => {
        const created = await tx.lesson.create({
          data: {
            title,
            slug: await uniqueLessonSlug(title, tx),
            description: clean(input.description, 2000),
            content: clean(input.content, 20_000) || null,
            type: lessonType,
            videoUrl: videoUrl || null,
            thumbnailUrl: thumbnailUrl || null,
            videoProvider: VideoProvider.LOCAL,
            subjectId: clean(input.subjectId, 80) || null,
            topicId: clean(input.topicId, 80) || null,
            durationSeconds,
            isFreePreview: Boolean(input.isFreePreview),
            isFree: Boolean(input.isFreePreview),
            status: lessonStatus,
            resources: lessonResources(input.resources),
            authors: { create: { userId: user.id } },
          },
        });
        const aggregate = await tx.moduleLesson.aggregate({
          where: { moduleId },
          _max: { position: true },
        });
        await tx.moduleLesson.create({
          data: { moduleId, lessonId: created.id, position: (aggregate._max.position ?? -1) + 1 },
        });
        return created;
      });
      await refreshCoursesUsingModule(moduleId);
      return NextResponse.json({ lesson }, { status: 201 });
    }

    if (input.action === "updateLesson") {
      const lessonId = clean(input.lessonId, 80);
      if (!(await editableLesson(lessonId, user))) {
        return error("Você não pode alterar esta aula compartilhada.", 403);
      }
      const title = clean(input.title, 140);
      if (!title) return error("Informe o título da aula.");
      const lessonType = Object.values(LessonNodeType).includes(input.type as LessonNodeType)
        ? (input.type as LessonNodeType)
        : LessonNodeType.VIDEO;
      const videoUrl = clean(input.videoUrl, 2000);
      if (videoUrl && !isValidLessonVideoUrl(videoUrl)) {
        return error("Informe um link de vídeo válido, começando com http://, https:// ou /.");
      }
      const thumbnailUrl = clean(input.thumbnailUrl, 2000);
      if (lessonType === LessonNodeType.VIDEO && !thumbnailUrl) {
        return error("Adicione a capa da videoaula em 1280 × 720 px.");
      }
      const requestedLessonStatus = input.status ?? "DRAFT";
      const lessonStatus =
        requestedLessonStatus === "PUBLISHED" && canPublishDirectly(user.role)
          ? ContentStatus.PUBLISHED
          : requestedLessonStatus === "PUBLISHED" || requestedLessonStatus === "REVIEW"
            ? ContentStatus.REVIEW
            : ContentStatus.DRAFT;
      const lesson = await db.lesson.update({
        where: { id: lessonId },
        data: {
          title,
          description: clean(input.description, 2000),
          content: clean(input.content, 20_000) || null,
          type: lessonType,
          videoUrl: videoUrl || null,
          thumbnailUrl: thumbnailUrl || null,
          subjectId: clean(input.subjectId, 80) || null,
          topicId: clean(input.topicId, 80) || null,
          durationSeconds: Math.max(0, Math.round(Number(input.durationMinutes) || 0) * 60),
          isFreePreview: Boolean(input.isFreePreview),
          isFree: Boolean(input.isFreePreview),
          status: lessonStatus,
          resources: lessonResources(input.resources),
        },
      });
      await refreshCoursesUsingLesson(lessonId);
      return NextResponse.json({ lesson });
    }

    if (input.action === "linkLesson") {
      const moduleId = clean(input.moduleId, 80);
      const lessonId = clean(input.lessonId, 80);
      if (!(await editableModule(moduleId, user))) {
        return error("Você não pode alterar este módulo.", 403);
      }
      if (!(await editableLesson(lessonId, user))) {
        return error("Aula não encontrada.", 404);
      }
      const aggregate = await db.moduleLesson.aggregate({
        where: { moduleId },
        _max: { position: true },
      });
      await db.moduleLesson.upsert({
        where: { moduleId_lessonId: { moduleId, lessonId } },
        update: {},
        create: { moduleId, lessonId, position: (aggregate._max.position ?? -1) + 1 },
      });
      await refreshCoursesUsingModule(moduleId);
      return NextResponse.json({ ok: true });
    }

    if (input.action === "unlinkLesson") {
      const moduleId = clean(input.moduleId, 80);
      if (!(await editableModule(moduleId, user))) {
        return error("Você não pode alterar este módulo.", 403);
      }
      await db.moduleLesson.deleteMany({
        where: { moduleId, lessonId: clean(input.lessonId, 80) },
      });
      await refreshCoursesUsingModule(moduleId);
      return NextResponse.json({ ok: true });
    }

    if (input.action === "moveLesson") {
      const moduleId = clean(input.moduleId, 80);
      if (!(await editableModule(moduleId, user))) {
        return error("Você não pode alterar este módulo.", 403);
      }
      await moveModuleLesson(
        moduleId,
        clean(input.lessonId, 80),
        input.direction ?? "down",
      );
      return NextResponse.json({ ok: true });
    }

    return error("Ação desconhecida.");
  } catch (cause) {
    console.error("Falha no estúdio de cursos", cause);
    return error(saveError(cause), 500);
  }
}
