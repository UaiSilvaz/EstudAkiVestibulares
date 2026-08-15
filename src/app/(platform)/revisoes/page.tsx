import { JornadaReviewClient } from "@/components/jornada/jornada-client";
import { jornadaCourses } from "@/lib/jornada-curriculum";

export default function RevisoesPage() {
  return <JornadaReviewClient courses={jornadaCourses} />;
}
