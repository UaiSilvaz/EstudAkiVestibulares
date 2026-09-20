import { AppShell } from "@/components/app-shell";
import { PlatformLoadingState } from "@/components/loading-states";
import { getPersistedUserId, requirePersistedUser } from "@/lib/auth";
import { educationThemeStyle } from "@/lib/education-verticals";
import { getActivePreparationContext, type ActivePreparationContext } from "@/lib/preparations";
import { Suspense } from "react";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userPromise = requirePersistedUser();

  return (
    <Suspense fallback={<PlatformLoadingState />}>
      <AuthenticatedPlatform userPromise={userPromise}>{children}</AuthenticatedPlatform>
    </Suspense>
  );
}

async function AuthenticatedPlatform({
  userPromise,
  children,
}: {
  userPromise: ReturnType<typeof requirePersistedUser>;
  children: React.ReactNode;
}) {
  const user = await userPromise;
  const persistedUserId = await getPersistedUserId(user);
  const preparationContext: ActivePreparationContext = persistedUserId
    ? await getActivePreparationContext(persistedUserId)
    : {
        active: null,
        preparations: [],
        themeStyle: educationThemeStyle("vestibular"),
      };

  return <AppShell user={user} preparationContext={preparationContext}>{children}</AppShell>;
}
