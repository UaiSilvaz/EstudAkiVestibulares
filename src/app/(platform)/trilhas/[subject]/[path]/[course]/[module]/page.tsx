import { notFound } from "next/navigation";
import { JornadaModuleClient } from "@/components/jornada/jornada-client";
import { getJornadaCourse, getJornadaModule } from "@/lib/jornada-curriculum";
import { getJornadaSubject } from "@/lib/jornada-subjects";

export default async function JornadaModulePage({
  params,
}: {
  params: Promise<{ subject: string; path: string; course: string; module: string }>;
}) {
  const { subject: subjectSlug, path: pathSlug, course: courseSlug, module: moduleSlug } = await params;
  const subject = getJornadaSubject(subjectSlug);
  const course = getJornadaCourse(subjectSlug, pathSlug, courseSlug);
  const courseModule = getJornadaModule(subjectSlug, pathSlug, courseSlug, moduleSlug);
  if (!subject || !course || !courseModule) notFound();

  return <JornadaModuleClient subject={subject} course={course} module={courseModule} />;
}
