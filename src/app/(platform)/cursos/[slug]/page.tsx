import { notFound } from "next/navigation";
import { CourseDetailClient } from "@/components/courses/course-detail-client";
import { getCurrentUser } from "@/lib/auth";
import { getCourseDetail, getLearningUserId } from "@/lib/courses/learning";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const userId = await getLearningUserId(user);
  const course = await getCourseDetail(slug, userId);
  if (!course) notFound();

  return (
    <CourseDetailClient
      course={course}
      devResetEnabled={process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production"}
    />
  );
}
