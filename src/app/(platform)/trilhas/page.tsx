import { JornadaHomeClient } from "@/components/jornada/jornada-client";
import { jornadaCourses, jornadaWorlds } from "@/lib/jornada-curriculum";

export default function TrilhasPage() {
  return <JornadaHomeClient worlds={jornadaWorlds} courses={jornadaCourses} />;
}
