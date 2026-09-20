import { notFound } from "next/navigation";
import { LessonPageClient } from "@/components/courses/lesson-page-client";
import { getCurrentUser } from "@/lib/auth";
import { getLearningUserId, getLessonPage } from "@/lib/courses/learning";

export default async function CourseLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const user = await getCurrentUser();
  const userId = await getLearningUserId(user);
  const data = await getLessonPage(slug, lessonId, userId);
  if (!data) notFound();

  return <LessonPageClient data={data} />;
}
