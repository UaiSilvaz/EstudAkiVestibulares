import { notFound } from "next/navigation";
import { JornadaActivityClient } from "@/components/jornada/jornada-client";
import { getJornadaActivity } from "@/lib/jornada-curriculum";

export default async function JornadaActivityPage({ params }: { params: Promise<{ activity: string }> }) {
  const { activity: activitySlug } = await params;
  const bundle = getJornadaActivity(activitySlug);
  if (!bundle) notFound();

  return <JornadaActivityClient subject={bundle.subject} lesson={bundle.lesson} activity={bundle.activity} />;
}
