import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { db } from "./db";
import type { AppUser } from "./roles";

export { canManageContent, canPublishDirectly, type AppUser } from "./roles";

export const SESSION_COOKIE = "estudaki_user_id";

function localUserFromSession(value: string): AppUser | null {
  if (value === "local-admin") {
    return {
      id: "local-admin",
      name: "Administrador EstudAki",
      email: "admin@gmail",
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

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  const localUser = localUserFromSession(userId);
  if (localUser) return localUser;

  try {
    return await db.user.findUnique({
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
  } catch {
    return null;
  }
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
