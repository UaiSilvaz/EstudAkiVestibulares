import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import type { AppUser } from "./roles";

export { canManageContent, canPublishDirectly, type AppUser } from "./roles";

export const SESSION_COOKIE = "estudaki_user_id";

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  return db.user.findUnique({
    where: { id: userId },
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
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireManager(): Promise<AppUser> {
  const user = await requireUser();
  const { canManageContent } = await import("./roles");

  if (!canManageContent(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
