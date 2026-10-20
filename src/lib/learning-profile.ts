import { normalizeOnboardingProfile, onboardingProfiles, type OnboardingProfileKey } from "./onboarding-profiles";

export type LearningProfileInput = {
  profile: OnboardingProfileKey; exams: string[]; course: string; targetScore: string;
  minutesPerDay: number; studyDays: number[]; difficultSubjects: string[];
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; learningPreferences: string[];
  examDate: string; currentStep: number;
};

export function defaultLearningProfile(profile: OnboardingProfileKey = "vestibular"): LearningProfileInput {
  return { profile, exams: [...onboardingProfiles[profile].defaultExams], course: "", targetScore: "",
    minutesPerDay: 60, studyDays: [1, 2, 3, 4, 5], difficultSubjects: [],
    level: "BEGINNER", learningPreferences: ["questions"], examDate: "", currentStep: 0 };
}

export function parseLearningProfile(value: unknown, complete = false): LearningProfileInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Preencha seu perfil para continuar.");
  const body = value as Record<string, unknown>;
  const profile = normalizeOnboardingProfile(body.profile);
  if (profile !== body.profile) throw new Error("Escolha um objetivo válido.");
  const options = onboardingProfiles[profile];
  const list = (key: string, allowed: string[]) => {
    if (!Array.isArray(body[key]) || (body[key] as unknown[]).some(item => typeof item !== "string" || !allowed.includes(item))) throw new Error("Uma das opções selecionadas é inválida.");
    return [...new Set(body[key] as string[])];
  };
  const exams = list("exams", options.exams);
  const difficultSubjects = list("difficultSubjects", options.subjects.map(item => item.value));
  const learningPreferences = list("learningPreferences", ["questions", "video", "reading", "review"]);
  if (!Array.isArray(body.studyDays) || body.studyDays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Escolha dias válidos.");
  const studyDays = [...new Set(body.studyDays as number[])].sort();
  if (!Number.isInteger(body.minutesPerDay) || Number(body.minutesPerDay) < 30 || Number(body.minutesPerDay) > 300) throw new Error("Escolha entre 30 e 300 minutos por dia.");
  if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(String(body.level))) throw new Error("Escolha seu ponto de partida.");
  const text = (key: string, max: number) => {
    if (typeof body[key] !== "string" || (body[key] as string).length > max) throw new Error("Revise os campos do seu objetivo.");
    return (body[key] as string).trim();
  };
  const course = text("course", 96), targetScore = text("targetScore", 80), examDate = text("examDate", 10);
  if (examDate && (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) || Number.isNaN(Date.parse(examDate + "T12:00:00Z")) || new Date(examDate + "T12:00:00Z").toISOString().slice(0, 10) !== examDate)) throw new Error("Informe uma data de prova válida.");
  if (complete && (!exams.length || !course || !studyDays.length || !learningPreferences.length)) throw new Error("Escolha a prova, seu objetivo, dias de estudo e uma preferência.");
  return { profile, exams, difficultSubjects, learningPreferences, course, targetScore, examDate,
    studyDays, minutesPerDay: Number(body.minutesPerDay), level: body.level as LearningProfileInput["level"],
    currentStep: Math.max(0, Math.min(4, Number.isInteger(body.currentStep) ? Number(body.currentStep) : 0)) };
}
