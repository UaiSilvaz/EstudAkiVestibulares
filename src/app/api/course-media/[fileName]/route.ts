import { NextResponse } from "next/server";
import { courseMediaContentType, readCourseMediaFile, signedCourseMediaUrl } from "@/lib/course-media-storage";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLessonPage } from "@/lib/courses/learning";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

const SAFE_FILE = /^[a-z0-9._-]+\.(?:jpe?g|png|webp|mp4|m4v|mov|webm|ogg|ogv|pdf)$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await params;
  if (!SAFE_FILE.test(fileName)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }

  const contentType = courseMediaContentType(fileName);
  if (!contentType.startsWith("image/")) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (user.role !== Role.ADMIN) {
      const mediaUrl = `/api/course-media/${fileName}`;
      const lessons = await db.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Lesson"
        WHERE "videoUrl" = ${mediaUrl} OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof("resources") = 'array' THEN "resources" ELSE '[]'::jsonb END
          ) AS resource WHERE resource->>'url' = ${mediaUrl}
        )
      `;
      let allowed = false;
      for (const lesson of lessons) {
        if (user.role === Role.TEACHER && await db.lessonAuthor.count({ where: { lessonId: lesson.id, userId: user.id } })) {
          allowed = true; break;
        }
        const courses = await db.course.findMany({
          where: { modules: { some: { module: { lessons: { some: { lessonId: lesson.id } } } } } },
          select: { slug: true },
        });
        for (const course of courses) {
          const page = await getLessonPage(course.slug, lesson.id, user.id);
          if (page && !page.accessDenied) { allowed = true; break; }
        }
        if (allowed) break;
      }
      if (!allowed) return NextResponse.json({ error: "Você não tem acesso a este material." }, { status: 403 });
    }
  }

  try {
    const remoteUrl = await signedCourseMediaUrl(fileName);
    if (remoteUrl) return NextResponse.redirect(remoteUrl, { status: 307,
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    const bytes = await readCourseMediaFile(fileName);
    const range = request.headers.get("range");
    const commonHeaders = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };

    if (range && contentType.startsWith("video/")) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) return new NextResponse(null, { status: 416 });
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= bytes.length) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${bytes.length}` },
        });
      }
      const chunk = bytes.subarray(start, end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...commonHeaders,
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
        },
      });
    }

    return new NextResponse(new Uint8Array(bytes), {
      headers: { ...commonHeaders, "Content-Length": String(bytes.length) },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
