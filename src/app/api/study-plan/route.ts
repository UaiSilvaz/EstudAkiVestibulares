import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateStudyPlan, regenerateStudyPlan } from "@/lib/adaptive-study-plan";

async function userId() {
  const user = await getCurrentUser();
  if (!user) return null;
  return getPersistedUserId(user);
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  return NextResponse.json(await getOrCreateStudyPlan(id));
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const body = (await request.json()) as {
    availableDays?: number[];
    minutesPerDay?: number;
    examDate?: string | null;
  };
  const result = await regenerateStudyPlan(id, {
    availableDays: body.availableDays,
    minutesPerDay:
      typeof body.minutesPerDay === "number"
        ? Math.min(300, Math.max(30, Math.round(body.minutesPerDay)))
        : undefined,
    examDate: body.examDate ? new Date(body.examDate) : body.examDate === null ? null : undefined,
  });
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  const body = (await request.json()) as { taskId?: string; completed?: boolean };
  if (!body.taskId) {
    return NextResponse.json({ error: "Tarefa não informada." }, { status: 400 });
  }
  const task = await db.studyPlanTask.findFirst({
    where: { id: body.taskId, userId: id },
  });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const updated = await db.studyPlanTask.update({
    where: { id: task.id },
    data: { completedAt: body.completed === false ? null : new Date() },
  });
  return NextResponse.json({ task: updated });
}
