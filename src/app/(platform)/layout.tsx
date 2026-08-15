import { AppShell } from "@/components/app-shell";
import { PlatformLoadingState } from "@/components/loading-states";
import { requirePersistedUser } from "@/lib/auth";
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

  return <AppShell user={user}>{children}</AppShell>;
}
