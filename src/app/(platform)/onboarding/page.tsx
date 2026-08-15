import { OnboardingFlow } from "@/components/onboarding-flow";
import { requirePersistedUser } from "@/lib/auth";

export default async function OnboardingPage() {
  const user = await requirePersistedUser();

  return <OnboardingFlow user={user} />;
}
