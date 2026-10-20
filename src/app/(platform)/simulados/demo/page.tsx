import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { availableQuestionWhere } from "@/lib/freemium-access";
import { toStudentQuestion } from "@/lib/student-question";
import { DemoSimulation } from "@/components/demo-simulation";
import { PageHeader } from "@/components/page-header";
export default async function DemoPage() {
  const user = await requirePersistedUser();
  const questions = await db.question.findMany({ where: { status: "PUBLISHED", reviewState: "APPROVED", answerSituation: { not: "ANNULLED" }, AND: [await availableQuestionWhere(user.id, user.role)] }, include: { subject: true, topic: true, vestibular: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 5 });
  return <div className="space-y-5"><PageHeader eyebrow="Gratuito" title="Simulado demonstrativo" description="Treino de até cinco questões. Suas respostas contam para o progresso gratuito; este treino não reproduz uma prova completa." /><DemoSimulation questions={questions.map(toStudentQuestion)} /></div>;
}
