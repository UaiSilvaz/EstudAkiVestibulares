import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateStudyPlan, regenerateStudyPlan, studyPlanTaskSelect } from "@/lib/adaptive-study-plan";
import { getActivePreparationContext } from "@/lib/preparations";

async function userScope() {
  const user = await getCurrentUser();
  if (!user) return null;
  const id = await getPersistedUserId(user);
  if (!id) return null;
  const preparationContext = await getActivePreparationContext(id);
  return {
    id,
    userPreparationId: preparationContext.active?.userPreparationId ?? null,
  };
}

export async function GET() {
  const scope = await userScope();
  if (!scope) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 401 });
  return NextResponse.json(await getOrCreateStudyPlan(scope.id, scope.userPreparationId));
}

export async function POST(request: Request) {
  const scope = await userScope();
  if (!scope) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 401 });
  const body = (await request.json()) as {
    availableDays?: number[];
    minutesPerDay?: number;
    examDate?: string | null;
  };
  const result = await regenerateStudyPlan(scope.id, {
    availableDays: body.availableDays,
    minutesPerDay:
      typeof body.minutesPerDay === "number"
        ? Math.min(300, Math.max(30, Math.round(body.minutesPerDay)))
        : undefined,
    examDate: body.examDate ? new Date(body.examDate) : body.examDate === null ? null : undefined,
    userPreparationId: scope.userPreparationId,
  });
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const scope = await userScope();
  if (!scope) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 401 });
  const body = (await request.json()) as { taskId?: string; completed?: boolean };
  if (!body.taskId) {
    return NextResponse.json({ error: "Tarefa nao informada." }, { status: 400 });
  }
  const task = await db.studyPlanTask.findFirst({
    select: { id: true },
    where: {
      id: body.taskId,
      userId: scope.id,
      ...(scope.userPreparationId
        ? { userPreparationId: scope.userPreparationId }
        : {}),
    },
  });
  if (!task) return NextResponse.json({ error: "Tarefa nao encontrada." }, { status: 404 });
  const updated = await db.studyPlanTask.update({
    select: studyPlanTaskSelect,
    where: { id: task.id },
    data: { completedAt: body.completed === false ? null : new Date() },
  });
  return NextResponse.json({ task: updated });
}
