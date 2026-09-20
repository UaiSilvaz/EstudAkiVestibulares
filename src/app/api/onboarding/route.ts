import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { regenerateStudyPlan } from "@/lib/adaptive-study-plan";
import {
  findOrCreatePreparation,
  upsertUserPreparation,
} from "@/lib/preparations";
import {
  allowedOnboardingExams,
  allowedOnboardingSubjects,
  normalizeOnboardingProfile,
  onboardingProfiles,
} from "@/lib/onboarding-profiles";

const allowedExams = allowedOnboardingExams();
const allowedSubjects = allowedOnboardingSubjects();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanList(values: unknown, allowed: Set<string>, fallback: string[]) {
  if (!Array.isArray(values)) return fallback;
  const result = Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && allowed.has(value))),
  );
  return result.length ? result : fallback;
}

function cleanDays(values: unknown) {
  if (!Array.isArray(values)) return [1, 2, 3, 4, 5];
  const result = Array.from(
    new Set(values.filter((value): value is number => Number.isInteger(value) && value >= 0 && value <= 6)),
  ).sort();
  return result.length ? result : [1, 2, 3, 4, 5];
}

function targetSummary(input: {
  profile: string;
  exams: string[];
  course: string;
  targetScore: string;
}) {
  const parts = [input.profile, input.exams.join(", ")];
  if (input.course) parts.push(input.course);
  if (input.targetScore) parts.push(`meta ${input.targetScore}`);
  return parts.join(" | ").slice(0, 80) || "ENEM";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) {
    return NextResponse.json({ error: "Usuario nao encontrado para salvar o onboarding." }, { status: 409 });
  }

  let body: {
    profile?: unknown;
    exams?: unknown;
    course?: unknown;
    targetScore?: unknown;
    minutesPerDay?: unknown;
    studyDays?: unknown;
    difficultSubjects?: unknown;
    examDate?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const profileKey = normalizeOnboardingProfile(body.profile);
  const profile = onboardingProfiles[profileKey];
  const exams = cleanList(body.exams, allowedExams, profile.defaultExams);
  const difficultSubjects = cleanList(
    body.difficultSubjects,
    allowedSubjects,
    [profile.subjects[0]?.value ?? "matematica"],
  );
  const studyDays = cleanDays(body.studyDays);
  const minutesPerDay =
    typeof body.minutesPerDay === "number" && Number.isFinite(body.minutesPerDay)
      ? clamp(Math.round(body.minutesPerDay), 30, 300)
      : 90;
  const course = typeof body.course === "string" ? body.course.trim().slice(0, 96) : "";
  const targetScore = typeof body.targetScore === "string" ? body.targetScore.trim().slice(0, 80) : "";
  const examDate =
    typeof body.examDate === "string" && body.examDate
      ? new Date(`${body.examDate}T12:00:00`)
      : undefined;
  const weeklyHours = clamp(Math.round((minutesPerDay * studyDays.length) / 60), 1, 80);

  const updatedUser = await db.user.update({
    where: { id: persistedUserId },
    data: {
      weeklyHours,
      targetExam: targetSummary({ profile: profile.shortTitle, exams, course, targetScore }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      xp: true,
      streak: true,
      league: true,
      weeklyHours: true,
      targetExam: true,
    },
  });

  let preparationPayload: {
    id: string;
    slug: string;
    name: string;
    userPreparationId: string | null;
  } | null = null;
  let planPayload: {
    tasks: number;
    diagnostics: unknown;
  } = {
    tasks: 0,
    diagnostics: null,
  };

  try {
    const preparation = await findOrCreatePreparation({
      exams,
      course: course || profile.shortTitle,
      examDate,
    });
    const userPreparation = await upsertUserPreparation({
      userId: persistedUserId,
      preparationId: preparation.id,
      displayName: course || preparation.name,
      examDate: examDate ?? null,
      minutesPerDay,
      studyDays,
      difficultSubjects,
    });
    preparationPayload = {
      id: preparation.id,
      slug: preparation.slug,
      name: preparation.name,
      userPreparationId: userPreparation.id,
    };

    try {
      const plan = await regenerateStudyPlan(persistedUserId, {
        availableDays: studyDays,
        minutesPerDay,
        examDate,
        userPreparationId: userPreparation.id,
      });
      planPayload = {
        tasks: plan.tasks.length,
        diagnostics: plan.diagnostics,
      };
    } catch (error) {
      console.warn("Cronograma nao foi regenerado durante o onboarding.", error);
    }
  } catch (error) {
    console.warn("Preparacao completa nao foi criada durante o onboarding; objetivo basico foi salvo.", error);
  }

  return NextResponse.json({
    user: updatedUser,
    preparation: preparationPayload,
    onboarding: {
      profile: profileKey,
      exams,
      course,
      targetScore,
      minutesPerDay,
      studyDays,
      difficultSubjects,
      examDate: examDate?.toISOString() ?? null,
    },
    plan: planPayload,
  });
}
