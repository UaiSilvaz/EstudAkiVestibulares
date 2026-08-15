import { notFound } from "next/navigation";
import { JornadaSubjectClient } from "@/components/jornada/jornada-client";
import { jornadaCourses, jornadaPaths } from "@/lib/jornada-curriculum";
import { getJornadaSubject } from "@/lib/jornada-subjects";

export default async function JornadaSubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectSlug } = await params;
  const subject = getJornadaSubject(subjectSlug);
  if (!subject) notFound();

  return (
    <JornadaSubjectClient
      subject={subject}
      paths={jornadaPaths.filter((path) => path.subjectSlug === subject.slug)}
      courses={jornadaCourses.filter((course) => course.subjectSlug === subject.slug)}
    />
  );
}
