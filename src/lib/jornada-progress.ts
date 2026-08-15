import type { JornadaCourse } from "@/lib/jornada-curriculum";

export const JORNADA_PROGRESS_STORAGE_KEY = "estudaki:jornada:v1";

export type JornadaActivityAttempt = {
  answer: string;
  correct: boolean;
  completedAt: string;
};

export type JornadaStoredProgress = {
  completedLessons: string[];
  activityAttempts: Record<string, JornadaActivityAttempt>;
  updatedAt: string;
};

export function emptyJornadaProgress(): JornadaStoredProgress {
  return {
    completedLessons: [],
    activityAttempts: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export function courseLessonIds(course: JornadaCourse) {
  return course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
}

export function courseProgressPercent(course: JornadaCourse, progress: JornadaStoredProgress) {
  const lessonIds = courseLessonIds(course);
  if (lessonIds.length === 0) return 0;
  const done = lessonIds.filter((lessonId) => progress.completedLessons.includes(lessonId)).length;
  return Math.round((done / lessonIds.length) * 100);
}

export function courseCompletedLessons(course: JornadaCourse, progress: JornadaStoredProgress) {
  const lessonIds = courseLessonIds(course);
  return lessonIds.filter((lessonId) => progress.completedLessons.includes(lessonId)).length;
}

export function subjectProgressPercent(
  courses: JornadaCourse[],
  progress: JornadaStoredProgress,
) {
  const lessonIds = courses.flatMap(courseLessonIds);
  if (lessonIds.length === 0) return 0;
  const done = lessonIds.filter((lessonId) => progress.completedLessons.includes(lessonId)).length;
  return Math.round((done / lessonIds.length) * 100);
}
