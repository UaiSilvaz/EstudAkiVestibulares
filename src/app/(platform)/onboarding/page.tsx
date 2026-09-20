import { OnboardingFlow } from "@/components/onboarding-flow";
import { requirePersistedUser } from "@/lib/auth";
import { normalizeOnboardingProfile } from "@/lib/onboarding-profiles";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ profile?: string }>;
}) {
  const user = await requirePersistedUser();
  const params = await searchParams;

  return <OnboardingFlow user={user} initialProfile={normalizeOnboardingProfile(params?.profile)} />;
}
