import { PageHeader } from "@/components/page-header";
import { StudyPlanDashboard } from "@/components/study-plan-dashboard";
import { requirePersistedUser } from "@/lib/auth";
import { getOrCreateStudyPlan } from "@/lib/adaptive-study-plan";

export default async function CronogramaPage() {
  const user = await requirePersistedUser();
  const plan = await getOrCreateStudyPlan(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cronograma"
        title="Plano semanal adaptativo"
        description="Seu tempo, seus erros e o que ainda falta estudar organizados em blocos objetivos."
      />
      <StudyPlanDashboard
        tasks={plan.tasks.map((task) => ({
          ...task,
          scheduledFor: task.scheduledFor.toISOString(),
          completedAt: task.completedAt?.toISOString() ?? null,
          createdAt: undefined,
          updatedAt: undefined,
          userId: undefined,
        }))}
        profile={{
          targetExam: user.targetExam,
          weeklyHours: user.weeklyHours,
        }}
        preference={{
          availableDays: JSON.parse(plan.preference.availableDays) as number[],
          minutesPerDay: plan.preference.minutesPerDay,
          examDate: plan.preference.examDate?.toISOString() ?? null,
        }}
        diagnostics={{
          pendingErrors: plan.diagnostics.pendingErrors,
          weeklyMinutes: plan.diagnostics.weeklyMinutes,
        }}
      />
    </div>
  );
}
