import { Role } from "@prisma/client";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  xp: number;
  streak: number;
  league: string;
  weeklyHours: number | null;
  targetExam: string | null;
};

export function canManageContent(role: Role) {
  const roles: Role[] = [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.MENTOR];
  return roles.includes(role);
}

export function canPublishDirectly(role: Role) {
  const roles: Role[] = [Role.ADMIN, Role.COORDINATOR];
  return roles.includes(role);
}
