import { JornadaCertificatesClient } from "@/components/jornada/jornada-client";
import { jornadaCourses } from "@/lib/jornada-curriculum";

export default function CertificadosPage() {
  return <JornadaCertificatesClient courses={jornadaCourses} />;
}
