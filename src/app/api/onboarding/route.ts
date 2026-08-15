import { NextResponse } from "next/server";
import { getCurrentUser, getPersistedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { regenerateStudyPlan } from "@/lib/adaptive-study-plan";

const allowedExams = new Set(["ENEM", "FUVEST", "UNESP", "UNICAMP", "FATEC", "ETEC", "Provao Paulista"]);
const allowedSubjects = new Set([
  "matematica",
  "linguagens",
  "redacao",
  "fisica",
  "quimica",
  "biologia",
  "ciencias-humanas",
]);

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
  exams: string[];
  course: string;
  targetScore: string;
}) {
  const parts = [input.exams.join(", ")];
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

  const exams = cleanList(body.exams, allowedExams, ["ENEM"]);
  const difficultSubjects = cleanList(body.difficultSubjects, allowedSubjects, []);
  const studyDays = cleanDays(body.studyDays);
  const minutesPerDay =
    typeof body.minutesPerDay === "number" && Number.isFinite(body.minutesPerDay)
      ? clamp(Math.round(body.minutesPerDay), 30, 300)
      : 90;
  const course = typeof body.course === "string" ? body.course.trim().slice(0, 48) : "";
  const targetScore = typeof body.targetScore === "string" ? body.targetScore.trim().slice(0, 24) : "";
  const examDate =
    typeof body.examDate === "string" && body.examDate
      ? new Date(`${body.examDate}T12:00:00`)
      : undefined;
  const weeklyHours = clamp(Math.round((minutesPerDay * studyDays.length) / 60), 1, 80);

  const updatedUser = await db.user.update({
    where: { id: persistedUserId },
    data: {
      weeklyHours,
      targetExam: targetSummary({ exams, course, targetScore }),
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

  const plan = await regenerateStudyPlan(persistedUserId, {
    availableDays: studyDays,
    minutesPerDay,
    examDate,
  });

  return NextResponse.json({
    user: updatedUser,
    onboarding: {
      exams,
      course,
      targetScore,
      minutesPerDay,
      studyDays,
      difficultSubjects,
      examDate: examDate?.toISOString() ?? null,
    },
    plan: {
      tasks: plan.tasks.length,
      diagnostics: plan.diagnostics,
    },
  });
}
