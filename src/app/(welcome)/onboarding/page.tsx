import { OnboardingFlow } from "@/components/onboarding-flow";
import { requirePersistedUser } from "@/lib/auth";
import { normalizeOnboardingProfile } from "@/lib/onboarding-profiles";
import { db } from "@/lib/db";
import { defaultLearningProfile, type LearningProfileInput } from "@/lib/learning-profile";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ profile?: string }>;
}) {
  const user = await requirePersistedUser();
  const params = await searchParams;

  const saved = await db.studentLearningProfile.findUnique({ where: { userId: user.id } });
  const base = defaultLearningProfile(normalizeOnboardingProfile(params?.profile));
  const initial: LearningProfileInput = saved ? {
    ...base, profile: normalizeOnboardingProfile(saved.profile), exams: saved.exams as string[],
    course: saved.course, targetScore: saved.targetScore, minutesPerDay: saved.minutesPerDay,
    studyDays: saved.studyDays as number[], difficultSubjects: saved.difficultSubjects as string[],
    level: saved.level, learningPreferences: saved.learningPreferences as string[],
    examDate: saved.examDate?.toISOString().slice(0, 10) ?? "", currentStep: saved.currentStep,
  } : base;
  return <OnboardingFlow user={user} initial={initial} />;
}
