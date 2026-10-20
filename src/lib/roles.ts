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
  return role === Role.ADMIN;
}

export function canPublishDirectly(role: Role) {
  return role === Role.ADMIN;
}

export function canUseTeacherTools(role: Role) {
  return role === Role.ADMIN || role === Role.TEACHER;
}
