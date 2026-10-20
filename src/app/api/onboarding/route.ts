import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { regenerateStudyPlan } from "@/lib/adaptive-study-plan";
import { findOrCreatePreparation, upsertUserPreparation } from "@/lib/preparations";
import { onboardingProfiles } from "@/lib/onboarding-profiles";
import { parseLearningProfile } from "@/lib/learning-profile";
import { readJsonRequest } from "@/server/security/request";
import { lockStudentProgress } from "@/lib/study-xp";
import { leagueForXp } from "@/lib/utils";

async function currentStudent() {
  const user = await getCurrentUser();
  return user ? getPersistedUserId(user) : null;
}

export async function GET() {
  const userId = await currentStudent();
  if (!userId) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const profile = await db.studentLearningProfile.findUnique({ where: { userId } });
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "private, no-store" } });
}

async function save(request: Request, complete: boolean) {
  const userId = await currentStudent();
  if (!userId) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const body = await readJsonRequest<unknown>(request, { maxBytes: 16384 });
  if (!body.ok) return body.response;
  let input;
  try { input = parseLearningProfile(body.data, complete); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Revise seu perfil." }, { status: 400 }); }
  const { examDate: date, ...fields } = input;
  const examDate = date ? new Date(date + "T12:00:00Z") : null;
  try {
    const draft = await db.studentLearningProfile.upsert({ where: { userId }, create: { userId, ...fields, examDate }, update: { ...fields, examDate } });
    if (!complete) return NextResponse.json({ profile: draft });
    const options = onboardingProfiles[input.profile];
    const preparation = await findOrCreatePreparation({ exams: input.exams, course: input.course, examDate: examDate ?? undefined });
    const enrollment = await upsertUserPreparation({ userId, preparationId: preparation.id, displayName: input.course,
      examDate, minutesPerDay: input.minutesPerDay, studyDays: input.studyDays, difficultSubjects: input.difficultSubjects });
    await db.userPreparation.update({ where: { id: enrollment.id }, data: { level: input.level } });
    const plan = await regenerateStudyPlan(userId, { availableDays: input.studyDays, minutesPerDay: input.minutesPerDay,
      examDate: examDate ?? undefined, userPreparationId: enrollment.id });
    const targetExam = [options.shortTitle, input.exams.join(", "), input.course, input.targetScore ? "meta " + input.targetScore : ""].filter(Boolean).join(" | ");
    const result = await db.$transaction(async tx => {
      await lockStudentProgress(tx, userId);
      const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const user = await tx.user.update({ where: { id: userId }, data: {
        weeklyHours: Math.max(1, Math.round(input.minutesPerDay * input.studyDays.length / 60)),
        targetExam, league: leagueForXp(current.xp, targetExam),
      }, select: { id: true, name: true, targetExam: true, weeklyHours: true } });
      const profile = await tx.studentLearningProfile.update({ where: { userId }, data: { completedAt: new Date() } });
      return { user, profile };
    });
    return NextResponse.json({ ...result, preparation: { id: preparation.id, userPreparationId: enrollment.id }, plan: { tasks: plan.tasks.length } });
  } catch (error) {
    console.error("Falha ao salvar perfil de aprendizagem", error);
    return NextResponse.json({ error: "Não foi possível concluir seu plano. Suas respostas foram preservadas; tente novamente." }, { status: 503 });
  }
}
export function PUT(request: Request) { return save(request, false); }
export function POST(request: Request) { return save(request, true); }
