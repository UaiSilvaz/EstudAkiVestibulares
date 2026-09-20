import type { CourseNavigationMode, LessonCommentKind, LessonNodeType, VideoProvider } from "@prisma/client";

export type LearningNodeState = "locked" | "available" | "current" | "completed" | "perfect";
export type LearningNodePosition = "left" | "center" | "right";

export type LessonResource = {
  title: string;
  type: "PDF" | "SUMMARY" | "SHEET";
  href: string;
};

export type CourseCardDTO = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: string;
  level: string;
  teacherName: string;
  thumbnail: string | null;
  coverImage: string | null;
  priceCents: number;
  isFree: boolean;
  featured: boolean;
  rating: number;
  studentsCount: number;
  lessonCount: number;
  totalDurationSeconds: number;
  progressPercent: number;
  statusLabel: "GRATUITO" | "COMPRADO" | "EM BREVE" | string;
};

export type LearningPathNodeDTO = {
  id: string;
  slug: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  description: string;
  type: LessonNodeType;
  order: number;
  globalIndex: number;
  durationSeconds: number;
  xpReward: number;
  isFreePreview: boolean;
  state: LearningNodeState;
  lockedReason: "purchase" | "sequence" | null;
  href: string;
  position: LearningNodePosition;
  progressPercent: number;
  stars: number;
  rewardId: string | null;
  rewardClaimed: boolean;
  simulationId: string | null;
};

export type LearningPathModuleDTO = {
  id: string;
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  color: string;
  order: number;
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  nodes: LearningPathNodeDTO[];
};

export type CourseDetailDTO = CourseCardDTO & {
  description: string;
  navigationMode: CourseNavigationMode;
  visualTheme: Record<string, unknown>;
  benefits: string[];
  hasAccess: boolean;
  owned: boolean;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  totalQuestions: number;
  averageAccuracy: number;
  nextNode: LearningPathNodeDTO | null;
  modules: LearningPathModuleDTO[];
};

export type LessonCommentDTO = {
  id: string;
  kind: LessonCommentKind;
  body: string;
  positionSeconds: number | null;
  helpful: boolean;
  mine: boolean;
  reported: boolean;
  liked: boolean;
  likesCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  };
  replies: LessonCommentDTO[];
};

export type LessonQuestionDTO = {
  id: string;
  questionId: string;
  statement: string;
  alternatives: Array<{ key: string; text: string }>;
  correctAlternative?: string;
  explanation?: string;
  xpReward: number;
  lastAttempt: {
    selectedAlternative: string;
    correct: boolean;
  } | null;
};

export type LessonPageDTO = {
  course: Pick<CourseDetailDTO, "id" | "slug" | "title" | "teacherName" | "hasAccess" | "owned" | "navigationMode" | "priceCents">;
  lesson: {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string | null;
    type: LessonNodeType;
    videoUrl: string | null;
    videoProvider: VideoProvider;
    durationSeconds: number;
    xpReward: number;
    allowManualCompletion: boolean;
    resources: LessonResource[];
    outcomes: string[];
    progress: {
      positionSeconds: number;
      watchedSeconds: number;
      percentage: number;
      completed: boolean;
      stars: number;
    };
    liked: boolean;
    likesCount: number;
    favorite: boolean;
    noteContent: string;
    questions: LessonQuestionDTO[];
    simulation: {
      id: string;
      title: string;
      description: string;
      durationMinutes: number;
      passingScore: number;
      xpReward: number;
      questionIds: string[];
    } | null;
  };
  modules: LearningPathModuleDTO[];
  currentNode: LearningPathNodeDTO;
  previousNode: LearningPathNodeDTO | null;
  nextNode: LearningPathNodeDTO | null;
  accessDenied: boolean;
  deniedReason: "purchase" | "sequence" | null;
};
