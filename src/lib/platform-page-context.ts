import "server-only";

import { getPersistedUserId, requirePersistedUser } from "@/lib/auth";
import { getActivePreparationContext } from "@/lib/preparations";

export async function getPlatformPageContext() {
  const user = await requirePersistedUser();
  const persistedUserId = await getPersistedUserId(user);
  const preparationContext = persistedUserId
    ? await getActivePreparationContext(persistedUserId)
    : null;

  return {
    user,
    persistedUserId,
    preparationContext,
    activePreparation: preparationContext?.active ?? null,
  };
}
