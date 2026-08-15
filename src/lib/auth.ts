import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { cache } from "react";
import { db } from "./db";
import type { AppUser } from "./roles";
import {
  hashAuthSessionToken,
  isLocalAuthEnabled,
  readSessionCookieValue,
} from "./session-cookie";

export { canManageContent, canPublishDirectly, type AppUser } from "./roles";
export {
  createAuthSessionToken,
  createSessionCookieValue,
  hashAuthSessionToken,
  isLocalAuthEnabled,
  SESSION_MAX_AGE_SECONDS,
} from "./session-cookie";

export const SESSION_COOKIE = "estudaki_user_id";

const appUserSelect = {
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
} as const;

function localUserFromSession(value: string): AppUser | null {
  if (!isLocalAuthEnabled()) return null;

  if (value === "local-admin") {
    return {
      id: "local-admin",
      name: "Administrador EstudAki",
      email: process.env.LOCAL_ADMIN_EMAIL?.trim().toLowerCase() || "local-admin@estudaki.invalid",
      role: Role.ADMIN,
      avatarUrl: null,
      xp: 12800,
      streak: 42,
      league: "Diamante",
      weeklyHours: 20,
      targetExam: "ENEM",
    };
  }

  if (value.startsWith("local-user:")) {
    const email = decodeURIComponent(value.replace("local-user:", ""));
    return {
      id: value,
      name: email.split("@")[0] || "Estudante",
      email,
      role: Role.STUDENT,
      avatarUrl: null,
      xp: 2240,
      streak: 7,
      league: "Prata",
      weeklyHours: 10,
      targetExam: "ENEM",
    };
  }

  return null;
}

export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;

  if (!rawSession) {
    return null;
  }

  const userId = readSessionCookieValue(rawSession);
  if (!userId) return null;

  const localUser = localUserFromSession(userId);
  if (userId === "local-admin" || userId.startsWith("local-user:")) {
    return localUser;
  }

  try {
    const session = await db.authSession.findFirst({
      where: {
        tokenHash: hashAuthSessionToken(userId),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { user: { select: appUserSelect } },
    });

    if (session?.user) return session.user;
  } catch {
    // Allow already-issued signed user-id cookies to keep working before migrations run.
  }

  try {
    // Backward compatibility for signed cookies issued before database sessions.
    return await db.user.findUnique({
      where: { id: userId },
      select: appUserSelect,
    });
  } catch {
    return null;
  }
});

const getPersistedUserIdByIdentity = cache(async (id: string, email: string): Promise<string | null> => {
  if (id === "local-admin" || id.startsWith("local-user:")) return null;

  try {
    const persistedUser = await db.user.findFirst({
      where: { OR: [{ id }, { email }] },
      select: { id: true },
    });
    return persistedUser?.id ?? null;
  } catch {
    return null;
  }
});

export async function getPersistedUserId(
  user: Pick<AppUser, "id" | "email">,
): Promise<string | null> {
  return getPersistedUserIdByIdentity(user.id, user.email);
}

export const requireUser = cache(async (): Promise<AppUser> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export const requirePersistedUser = cache(async (): Promise<AppUser> => {
  const user = await requireUser();
  const persistedUserId = await getPersistedUserId(user);
  if (!persistedUserId) return user;

  const persisted = await db.user.findUnique({
    where: { id: persistedUserId },
    select: appUserSelect,
  });
  return persisted ?? user;
});

export async function requireManager(): Promise<AppUser> {
  const user = await requireUser();
  const { canManageContent } = await import("./roles");

  if (!canManageContent(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
