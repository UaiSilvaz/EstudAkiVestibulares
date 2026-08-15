import { CommunityWorkspace } from "@/components/community-workspace";
import { requirePersistedUser } from "@/lib/auth";

export default async function CommunityPage() {
  const user = await requirePersistedUser();
  return (
    <CommunityWorkspace
      currentUser={{
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        league: user.league,
        xp: user.xp,
        streak: user.streak,
      }}
    />
  );
}
