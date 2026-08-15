import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}min ${String(rest).padStart(2, "0")}s`;
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    COORDINATOR: "Coordenador",
    TEACHER: "Professor",
    MENTOR: "Monitor",
    STUDENT: "Aluno",
  };

  return labels[role] ?? role;
}

export function difficultyLabel(difficulty: string) {
  const labels: Record<string, string> = {
    EASY: "Fácil",
    MEDIUM: "Media",
    HARD: "Difícil",
  };

  return labels[difficulty] ?? difficulty;
}

export function leagueForXp(xp: number) {
  if (xp >= 10000) return "Diamante";
  if (xp >= 7000) return "Esmeralda";
  if (xp >= 4500) return "Platina";
  if (xp >= 2500) return "Ouro";
  if (xp >= 1000) return "Prata";
  return "Bronze";
}
