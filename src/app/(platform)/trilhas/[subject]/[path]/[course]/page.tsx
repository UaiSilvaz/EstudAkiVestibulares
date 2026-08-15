import { notFound } from "next/navigation";
import { JornadaCourseClient } from "@/components/jornada/jornada-client";
import { getJornadaCourse } from "@/lib/jornada-curriculum";
import { getJornadaSubject } from "@/lib/jornada-subjects";

export default async function JornadaCoursePage({
  params,
}: {
  params: Promise<{ subject: string; path: string; course: string }>;
}) {
  const { subject: subjectSlug, path: pathSlug, course: courseSlug } = await params;
  const subject = getJornadaSubject(subjectSlug);
  const course = getJornadaCourse(subjectSlug, pathSlug, courseSlug);
  if (!subject || !course) notFound();

  return <JornadaCourseClient subject={subject} course={course} />;
}
