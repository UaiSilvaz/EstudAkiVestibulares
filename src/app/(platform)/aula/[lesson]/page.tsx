import { notFound } from "next/navigation";
import { JornadaLessonClient } from "@/components/jornada/jornada-client";
import { getJornadaActivityById, getJornadaLesson, jornadaSources } from "@/lib/jornada-curriculum";

export default async function JornadaLessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson: lessonSlug } = await params;
  const bundle = getJornadaLesson(lessonSlug);
  if (!bundle) notFound();

  const activityBundle = getJornadaActivityById(bundle.lesson.activityId);
  if (!activityBundle) notFound();

  return (
    <JornadaLessonClient
      {...bundle}
      activitySlug={activityBundle.activity.slug}
      sources={jornadaSources.filter((source) => bundle.lesson.sourceIds.includes(source.id))}
    />
  );
}
