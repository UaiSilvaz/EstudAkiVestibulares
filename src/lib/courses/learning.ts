import {
  ActivityType,
  ContentStatus,
  EntitlementSource,
  LessonCommentKind,
  LessonNodeType,
  LearningEventType,
  Prisma,
  PurchaseStatus,
  Role,
} from "@prisma/client";
import { getPersistedUserId, type AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leagueForXp, parseJson } from "@/lib/utils";
import type {
  CourseCardDTO,
  CourseDetailDTO,
  LearningNodeState,
  LearningPathModuleDTO,
  LearningPathNodeDTO,
  LessonCommentDTO,
  LessonPageDTO,
  LessonQuestionDTO,
  LessonResource,
} from "./types";

const courseLearningInclude = (userId: string | null) =>
  ({
    subject: { select: { name: true, slug: true, color: true } },
    teacher: { select: { id: true, name: true, avatarUrl: true, role: true } },
    products: { include: { product: true } },
    modules: {
      orderBy: { position: "asc" },
      include: {
        module: {
          include: {
            lessons: {
              orderBy: { position: "asc" },
              include: {
                lesson: {
                  include: {
                    progress: userId ? { where: { userId } } : false,
                    likes: userId ? { where: { userId } } : false,
                    favorites: userId ? { where: { userId } } : false,
                    notes: userId ? { where: { userId } } : false,
                    questions: {
                      orderBy: { order: "asc" },
                      include: {
                        question: {
                          include: {
                            alternativeItems: { orderBy: { order: "asc" } },
                          },
                        },
                        attempts: userId
                          ? { where: { userId }, orderBy: { createdAt: "desc" }, take: 1 }
                          : false,
                      },
                    },
                    simulations: true,
                    rewards: {
                      include: {
                        userRewards: { where: { userId: userId ?? "__anonymous__" } },
                      },
                    },
                    _count: { select: { likes: true, comments: true } },
                  },
                },
              },
            },
          },
        },
      },
    },
  }) satisfies Prisma.CourseInclude;

type CourseLearningRow = Prisma.CourseGetPayload<{
  include: ReturnType<typeof courseLearningInclude>;
}>;

type FlatLesson = {
  courseModule: CourseLearningRow["modules"][number];
  moduleLesson: CourseLearningRow["modules"][number]["module"]["lessons"][number];
  globalIndex: number;
};

function isDevelopment() {
  return process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";
}

export async function getLearningUserId(user: AppUser | null): Promise<string | null> {
  if (!user) return null;
  const persisted = await getPersistedUserId(user);
  if (persisted) return persisted;
  if (!isDevelopment()) return null;

  const email = user.email.trim().toLowerCase();
  const localUser = await db.user.upsert({
    where: { email },
    update: {
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      targetExam: user.targetExam ?? "ENEM",
    },
    create: {
      name: user.name,
      email,
      passwordHash: "local-development-user",
      role: user.role,
      avatarUrl: user.avatarUrl,
      xp: user.xp ?? 0,
      streak: user.streak ?? 0,
      league: user.league ?? "Bronze",
      weeklyHours: user.weeklyHours ?? 8,
      targetExam: user.targetExam ?? "ENEM",
    },
    select: { id: true },
  });

  return localUser.id;
}

function jsonArray<T>(value: Prisma.JsonValue, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstProduct(course: Pick<CourseLearningRow, "products">) {
  return course.products[0]?.product ?? null;
}

function formatStatusLabel(course: Pick<CourseLearningRow, "isFree" | "priceCents">, owned: boolean) {
  if (course.isFree || course.priceCents === 0) return "GRATUITO" as const;
  if (owned) return "COMPRADO" as const;
  return `R$ ${(course.priceCents / 100).toFixed(2).replace(".", ",")}`;
}

function flattenLessons(course: CourseLearningRow): FlatLesson[] {
  let globalIndex = 0;
  return course.modules.flatMap((courseModule) =>
    courseModule.module.lessons.map((moduleLesson) => ({
      courseModule,
      moduleLesson,
      globalIndex: globalIndex++,
    })),
  );
}

async function activeEntitlement(userId: string | null, courseId: string) {
  if (!userId) return null;
  const now = new Date();
  return db.entitlement.findFirst({
    where: {
      userId,
      courseId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
}

function courseAccess(course: CourseLearningRow, entitlement: { id: string } | null) {
  return course.isFree || course.priceCents === 0 || Boolean(entitlement);
}

function completedFromProgress(progress: Array<{ completed: boolean; completedAt: Date | null }> | undefined) {
  const latest = progress?.[0];
  return Boolean(latest?.completed || latest?.completedAt);
}

function positionFor(index: number) {
  const pattern = ["center", "left", "center", "right", "center"] as const;
  return pattern[index % pattern.length];
}

function nodeState({
  completed,
  stars,
  isCurrent,
  isLocked,
}: {
  completed: boolean;
  stars: number;
  isCurrent: boolean;
  isLocked: boolean;
}): LearningNodeState {
  if (completed && stars >= 3) return "perfect";
  if (completed) return "completed";
  if (isLocked) return "locked";
  if (isCurrent) return "current";
  return "available";
}

function buildModules(course: CourseLearningRow, hasAccess: boolean): LearningPathModuleDTO[] {
  const flat = flattenLessons(course);
  const firstIncompleteIndex = flat.findIndex((item) => !completedFromProgress(item.moduleLesson.lesson.progress));
  const currentIndex = firstIncompleteIndex === -1 ? flat.length - 1 : firstIncompleteIndex;

  return course.modules.map((courseModule) => {
    const nodes = courseModule.module.lessons.map((moduleLesson) => {
      const flatItem = flat.find((item) => item.moduleLesson.lessonId === moduleLesson.lessonId);
      const globalIndex = flatItem?.globalIndex ?? 0;
      const lesson = moduleLesson.lesson;
      const progress = lesson.progress?.[0];
      const completed = completedFromProgress(lesson.progress);
      const preview = lesson.isFree || lesson.isFreePreview || course.isFree;
      const purchaseLocked = !hasAccess && !preview;
      const sequenceLocked =
        !purchaseLocked &&
        hasAccess &&
        course.navigationMode === "SEQUENTIAL" &&
        !completed &&
        globalIndex > currentIndex;
      const locked = purchaseLocked || sequenceLocked;
      const reward = lesson.rewards[0] ?? null;
      const simulation = lesson.simulations[0] ?? null;

      return {
        id: lesson.id,
        slug: lesson.slug,
        moduleId: courseModule.module.id,
        moduleTitle: courseModule.module.title,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        order: moduleLesson.position,
        globalIndex,
        durationSeconds: lesson.durationSeconds,
        xpReward: lesson.xpReward,
        isFreePreview: preview,
        state: nodeState({
          completed,
          stars: progress?.stars ?? 0,
          isCurrent: globalIndex === currentIndex && !completed && !locked,
          isLocked: locked,
        }),
        lockedReason: purchaseLocked ? "purchase" : sequenceLocked ? "sequence" : null,
        href: `/cursos/${course.slug}/aula/${lesson.id}`,
        position: positionFor(globalIndex),
        progressPercent: Math.round(progress?.percentage ?? 0),
        stars: progress?.stars ?? 0,
        rewardId: reward?.id ?? null,
        rewardClaimed: Boolean(reward?.userRewards.length),
        simulationId: simulation?.id ?? null,
      } satisfies LearningPathNodeDTO;
    });
    const moduleCompleted = nodes.filter((node) => node.state === "completed" || node.state === "perfect").length;

    return {
      id: courseModule.module.id,
      slug: courseModule.module.slug,
      title: courseModule.module.title,
      description: courseModule.module.description,
      eyebrow: courseModule.module.eyebrow || `UNIDADE ${String(courseModule.position + 1).padStart(2, "0")}`,
      color: courseModule.module.color,
      order: courseModule.position,
      progressPercent: nodes.length ? Math.round((moduleCompleted / nodes.length) * 100) : 0,
      completedCount: moduleCompleted,
      totalCount: nodes.length,
      nodes,
    };
  });
}

function courseCard(course: CourseLearningRow, owned: boolean, progressPercent: number): CourseCardDTO {
  const lessonCount = course.modules.reduce((sum, courseModule) => sum + courseModule.module.lessons.length, 0);
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription || course.description,
    category: course.category,
    level: course.level,
    teacherName: course.teacher?.name ?? "Equipe EstudAki",
    thumbnail: course.thumbnail ?? course.coverUrl,
    coverImage: course.coverImage ?? course.coverUrl,
    priceCents: course.priceCents,
    isFree: course.isFree,
    featured: course.featured,
    rating: course.rating,
    studentsCount: course.studentsCount,
    lessonCount,
    totalDurationSeconds: course.totalDurationSeconds,
    progressPercent,
    statusLabel: course.status === "PUBLISHED" || course.published ? formatStatusLabel(course, owned) : "EM BREVE",
  };
}

export async function getCourseCatalog(userId: string | null, preparationId?: string): Promise<CourseCardDTO[]> {
  const courses = await db.course.findMany({
    where: {
      OR: [{ published: true }, { status: ContentStatus.PUBLISHED }],
      ...(preparationId ? { preparations: { some: { preparationId } } } : {}),
    },
    include: courseLearningInclude(userId),
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  const entitlements = userId
    ? await db.entitlement.findMany({
        where: {
          userId,
          courseId: { in: courses.map((course) => course.id) },
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { courseId: true },
      })
    : [];
  const ownedCourseIds = new Set(entitlements.flatMap((item) => (item.courseId ? [item.courseId] : [])));

  return courses.map((course) => {
    const modules = buildModules(course, courseAccess(course, ownedCourseIds.has(course.id) ? { id: course.id } : null));
    const allNodes = modules.flatMap((module) => module.nodes);
    const completed = allNodes.filter((node) => node.state === "completed" || node.state === "perfect").length;
    return courseCard(course, ownedCourseIds.has(course.id) || course.isFree, allNodes.length ? Math.round((completed / allNodes.length) * 100) : 0);
  });
}

export async function getCourseDetail(slug: string, userId: string | null): Promise<CourseDetailDTO | null> {
  const course = await db.course.findUnique({
    where: { slug },
    include: courseLearningInclude(userId),
  });
  if (!course || (!course.published && course.status !== ContentStatus.PUBLISHED)) return null;

  const entitlement = await activeEntitlement(userId, course.id);
  const hasAccess = courseAccess(course, entitlement);
  const modules = buildModules(course, hasAccess);
  const allNodes = modules.flatMap((module) => module.nodes);
  const completedLessons = allNodes.filter((node) => node.state === "completed" || node.state === "perfect").length;
  const attempts = userId
    ? await db.lessonQuestionAttempt.findMany({
        where: { userId, lesson: { modules: { some: { module: { courses: { some: { courseId: course.id } } } } } } },
        select: { correct: true },
      })
    : [];
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const card = courseCard(course, hasAccess, allNodes.length ? Math.round((completedLessons / allNodes.length) * 100) : 0);

  return {
    ...card,
    description: course.description,
    navigationMode: course.navigationMode,
    visualTheme: jsonObject(course.visualTheme),
    benefits: jsonArray<string>(course.benefits, []),
    hasAccess,
    owned: hasAccess && !course.isFree,
    completedLessons,
    totalLessons: allNodes.length,
    totalQuestions: course.modules.reduce(
      (sum, courseModule) =>
        sum + courseModule.module.lessons.reduce((lessonSum, item) => lessonSum + item.lesson.questions.length, 0),
      0,
    ),
    averageAccuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
    nextNode: allNodes.find((node) => node.state === "current" || node.state === "available") ?? null,
    modules,
  };
}

export async function findCourseById(id: string) {
  return db.course.findFirst({
    where: { id, OR: [{ published: true }, { status: ContentStatus.PUBLISHED }] },
    include: { products: { include: { product: true } } },
  });
}

async function recordEvent(input: {
  userId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  type: LearningEventType;
  metadata?: Prisma.InputJsonValue;
}) {
  await db.learningEvent.create({
    data: {
      userId: input.userId ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
      type: input.type,
      metadata: input.metadata ?? {},
    },
  });
}

export async function purchaseCourseDemo(courseId: string, user: AppUser) {
  const userId = await getLearningUserId(user);
  if (!userId) throw new Error("Usuario nao encontrado.");

  const course = await findCourseById(courseId);
  if (!course) throw new Error("Curso indisponivel.");
  const product = firstProduct(course);
  if (!product) throw new Error("Produto do curso nao encontrado.");

  const purchase = await db.purchase.upsert({
    where: { hotmartTransaction: `demo:${userId}:${course.id}` },
    update: {
      status: PurchaseStatus.APPROVED,
      buyerName: user.name,
      buyerEmail: user.email,
      rawPayload: JSON.stringify({ demo: true, approvedAt: new Date().toISOString() }),
    },
    create: {
      hotmartTransaction: `demo:${userId}:${course.id}`,
      hotmartPurchaseId: `demo-${course.slug}`,
      userId,
      productId: product.id,
      buyerName: user.name,
      buyerEmail: user.email,
      status: PurchaseStatus.APPROVED,
      rawPayload: JSON.stringify({ demo: true }),
    },
  });

  await db.entitlement.upsert({
    where: {
      userId_courseId_sourceKey: {
        userId,
        courseId: course.id,
        sourceKey: `demo-purchase:${course.id}`,
      },
    },
    update: {
      productId: product.id,
      purchaseId: purchase.id,
      revokedAt: null,
      expiresAt: null,
      sourceType: EntitlementSource.PURCHASE,
    },
    create: {
      userId,
      courseId: course.id,
      productId: product.id,
      purchaseId: purchase.id,
      sourceType: EntitlementSource.PURCHASE,
      sourceKey: `demo-purchase:${course.id}`,
    },
  });
  await recordEvent({ userId, courseId: course.id, type: LearningEventType.PURCHASE_DEMO_COMPLETED });

  return { courseSlug: course.slug };
}

export async function resetCourseDemo(courseId: string, user: AppUser) {
  if (!isDevelopment()) throw new Error("Reset demo disponivel apenas em desenvolvimento.");
  const userId = await getLearningUserId(user);
  if (!userId) throw new Error("Usuario nao encontrado.");
  const course = await findCourseById(courseId);
  if (!course) throw new Error("Curso indisponivel.");
  const lessonIds = (
    await db.moduleLesson.findMany({
      where: { module: { courses: { some: { courseId: course.id } } } },
      select: { lessonId: true },
    })
  ).map((item) => item.lessonId);

  await db.$transaction([
    db.entitlement.deleteMany({ where: { userId, courseId: course.id, sourceKey: `demo-purchase:${course.id}` } }),
    db.purchase.deleteMany({ where: { userId, hotmartTransaction: `demo:${userId}:${course.id}` } }),
    db.lessonProgress.deleteMany({ where: { userId, lessonId: { in: lessonIds } } }),
    db.lessonFavorite.deleteMany({ where: { userId, lessonId: { in: lessonIds } } }),
    db.lessonLike.deleteMany({ where: { userId, lessonId: { in: lessonIds } } }),
    db.lessonQuestionAttempt.deleteMany({ where: { userId, lessonId: { in: lessonIds } } }),
    db.userReward.deleteMany({ where: { userId, reward: { courseId: course.id } } }),
  ]);

  return { courseSlug: course.slug };
}

export async function getLessonPage(courseSlug: string, lessonId: string, userId: string | null): Promise<LessonPageDTO | null> {
  const detail = await getCourseDetail(courseSlug, userId);
  if (!detail) return null;
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    include: courseLearningInclude(userId),
  });
  if (!course) return null;
  const allNodes = detail.modules.flatMap((module) => module.nodes);
  const currentNode = allNodes.find((node) => node.id === lessonId);
  if (!currentNode) return null;
  const flatLesson = flattenLessons(course).find((item) => item.moduleLesson.lessonId === lessonId);
  if (!flatLesson) return null;
  const lesson = flatLesson.moduleLesson.lesson;
  const nodeIndex = allNodes.findIndex((node) => node.id === lessonId);
  const accessDenied = currentNode.state === "locked";

  return {
    course: {
      id: detail.id,
      slug: detail.slug,
      title: detail.title,
      teacherName: detail.teacherName,
      hasAccess: detail.hasAccess,
      owned: detail.owned,
      navigationMode: detail.navigationMode,
      priceCents: detail.priceCents,
    },
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      content: accessDenied ? null : lesson.content,
      type: lesson.type,
      videoUrl: accessDenied ? null : lesson.videoUrl,
      videoProvider: lesson.videoProvider,
      durationSeconds: lesson.durationSeconds,
      xpReward: lesson.xpReward,
      allowManualCompletion: lesson.allowManualCompletion,
      resources: accessDenied ? [] : jsonArray<LessonResource>(lesson.resources, []),
      outcomes: accessDenied ? [] : jsonArray<string>(lesson.outcomes, []),
      progress: {
        positionSeconds: lesson.progress[0]?.positionSeconds ?? 0,
        watchedSeconds: lesson.progress[0]?.watchedSeconds ?? 0,
        percentage: Math.round(lesson.progress[0]?.percentage ?? 0),
        completed: completedFromProgress(lesson.progress),
        stars: lesson.progress[0]?.stars ?? 0,
      },
      liked: Boolean(lesson.likes?.[0]),
      likesCount: lesson._count.likes,
      favorite: Boolean(lesson.favorites?.[0]),
      noteContent: lesson.notes?.[0]?.content ?? "",
      questions: accessDenied ? [] : lesson.questions.map((item) => serializeLessonQuestion(item)),
      simulation: accessDenied
        ? null
        : lesson.simulations[0]
          ? {
              id: lesson.simulations[0].id,
              title: lesson.simulations[0].title,
              description: lesson.simulations[0].description,
              durationMinutes: lesson.simulations[0].durationMinutes,
              passingScore: lesson.simulations[0].passingScore,
              xpReward: lesson.simulations[0].xpReward,
              questionIds: jsonArray<string>(lesson.simulations[0].questionIds, []),
            }
          : null,
    },
    modules: detail.modules,
    currentNode,
    previousNode: allNodes[nodeIndex - 1] ?? null,
    nextNode: allNodes[nodeIndex + 1] ?? null,
    accessDenied,
    deniedReason: currentNode.lockedReason,
  };
}

type LessonQuestionRow = CourseLearningRow["modules"][number]["module"]["lessons"][number]["lesson"]["questions"][number];

function serializeLessonQuestion(item: LessonQuestionRow): LessonQuestionDTO {
  const alternativeItems = item.question.alternativeItems.map((alternative) => ({
    key: alternative.key,
    text: alternative.text,
  }));
  const fallbackAlternatives = parseJson<Array<{ key: string; text: string }>>(item.question.alternatives, []);
  const lastAttempt = item.attempts[0] ?? null;

  return {
    id: item.id,
    questionId: item.questionId,
    statement: item.question.statement,
    alternatives: alternativeItems.length ? alternativeItems : fallbackAlternatives,
    correctAlternative: item.question.correctAlternative,
    explanation: item.question.explanation,
    xpReward: item.xpReward,
    lastAttempt: lastAttempt
      ? {
          selectedAlternative: lastAttempt.selectedAlternative,
          correct: lastAttempt.correct,
        }
      : null,
  };
}

async function lessonWithCourse(lessonId: string) {
  return db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      modules: {
        include: {
          module: {
            include: {
              courses: {
                include: { course: { include: { products: { include: { product: true } } } } },
                orderBy: { position: "asc" },
              },
            },
          },
        },
      },
    },
  });
}

export async function assertLessonAccess(lessonId: string, userId: string | null) {
  const lesson = await lessonWithCourse(lessonId);
  const course = lesson?.modules[0]?.module.courses[0]?.course;
  if (!lesson || !course) throw new Error("Aula nao encontrada.");
  const detail = await getCourseDetail(course.slug, userId);
  const node = detail?.modules.flatMap((module) => module.nodes).find((item) => item.id === lessonId);
  if (!detail || !node) throw new Error("Curso nao encontrado.");
  if (node.state === "locked") {
    const error = new Error(node.lockedReason === "purchase" ? "Aula exclusiva deste curso." : "Conclua a atividade anterior para desbloquear.");
    error.name = node.lockedReason ?? "locked";
    throw error;
  }
  return { lesson, course, detail, node };
}

function saoPauloDayKey(date: Date) {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function awardXp(userId: string, xp: number, message: string) {
  if (xp <= 0) return;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { xp: true, league: true, streak: true, targetExam: true },
  });
  if (!user) return;
  const now = new Date();
  const todayKey = saoPauloDayKey(now);
  const previousActivity = await db.activity.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const previousDayKey = previousActivity ? saoPauloDayKey(previousActivity.createdAt) : null;
  const yesterdayKey = saoPauloDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const streakUpdated = previousDayKey !== todayKey;
  const nextStreak = streakUpdated ? (previousDayKey === yesterdayKey ? user.streak + 1 : 1) : user.streak;
  const nextLeague = leagueForXp(user.xp + xp, user.targetExam);

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xp },
        ...(streakUpdated ? { streak: nextStreak } : {}),
        ...(nextLeague !== user.league ? { league: nextLeague } : {}),
      },
    }),
    db.activity.create({
      data: { userId, type: ActivityType.XP, message, xp },
    }),
  ]);
}

export async function saveLessonProgress(lessonId: string, userId: string, input: { positionSeconds: number; watchedSeconds: number; percentage: number }) {
  const { lesson, course } = await assertLessonAccess(lessonId, userId);
  const percentage = Math.max(0, Math.min(100, Math.round(input.percentage)));
  const existing = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  const shouldComplete = percentage >= 90 && !existing?.completed;
  const stars = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;
  const progress = await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      positionSeconds: Math.max(0, Math.round(input.positionSeconds)),
      watchedSeconds: Math.max(existing?.watchedSeconds ?? 0, Math.round(input.watchedSeconds)),
      percentage: Math.max(existing?.percentage ?? 0, percentage),
      ...(shouldComplete ? { completed: true, completedAt: new Date(), stars, xpAwarded: lesson.xpReward } : {}),
    },
    create: {
      userId,
      lessonId,
      positionSeconds: Math.max(0, Math.round(input.positionSeconds)),
      watchedSeconds: Math.max(0, Math.round(input.watchedSeconds)),
      percentage,
      completed: shouldComplete,
      completedAt: shouldComplete ? new Date() : null,
      stars,
      xpAwarded: shouldComplete ? lesson.xpReward : 0,
    },
  });
  await recordEvent({
    userId,
    courseId: course.id,
    lessonId,
    type: shouldComplete ? LearningEventType.LESSON_COMPLETED : LearningEventType.PAUSE,
    metadata: { percentage, positionSeconds: input.positionSeconds },
  });
  if (shouldComplete) await awardXp(userId, lesson.xpReward, `Aula concluida: ${lesson.title}.`);
  return progress;
}

export async function completeLesson(lessonId: string, userId: string) {
  const { lesson, course } = await assertLessonAccess(lessonId, userId);
  const existing = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  const alreadyCompleted = Boolean(existing?.completed || existing?.completedAt);
  const progress = await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      completed: true,
      completedAt: existing?.completedAt ?? new Date(),
      percentage: Math.max(existing?.percentage ?? 0, 100),
      stars: Math.max(existing?.stars ?? 0, 3),
      xpAwarded: Math.max(existing?.xpAwarded ?? 0, lesson.xpReward),
    },
    create: {
      userId,
      lessonId,
      completed: true,
      completedAt: new Date(),
      percentage: 100,
      stars: 3,
      xpAwarded: lesson.xpReward,
    },
  });
  if (!alreadyCompleted) await awardXp(userId, lesson.xpReward, `Aula concluida: ${lesson.title}.`);
  await recordEvent({ userId, courseId: course.id, lessonId, type: LearningEventType.LESSON_COMPLETED });
  return progress;
}

export async function toggleLessonLike(lessonId: string, userId: string) {
  await assertLessonAccess(lessonId, userId);
  const existing = await db.lessonLike.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  if (existing) {
    await db.lessonLike.delete({ where: { id: existing.id } });
  } else {
    await db.lessonLike.create({ data: { userId, lessonId } });
  }
  return {
    liked: !existing,
    likesCount: await db.lessonLike.count({ where: { lessonId } }),
  };
}

export async function toggleLessonFavorite(lessonId: string, userId: string) {
  await assertLessonAccess(lessonId, userId);
  const existing = await db.lessonFavorite.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  if (existing) await db.lessonFavorite.delete({ where: { id: existing.id } });
  else await db.lessonFavorite.create({ data: { userId, lessonId } });
  return { favorite: !existing };
}

export async function saveLessonNote(lessonId: string, userId: string, input: { content: string; positionSeconds?: number }) {
  await assertLessonAccess(lessonId, userId);
  return db.lessonNote.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      content: input.content.slice(0, 8000),
      positionSeconds: Math.max(0, Math.round(input.positionSeconds ?? 0)),
    },
    create: {
      userId,
      lessonId,
      content: input.content.slice(0, 8000),
      positionSeconds: Math.max(0, Math.round(input.positionSeconds ?? 0)),
    },
  });
}

export async function getLessonComments(lessonId: string, userId: string, kind?: LessonCommentKind) {
  await assertLessonAccess(lessonId, userId);
  const comments = await db.lessonComment.findMany({
    where: { lessonId, parentId: null, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, role: true, avatarUrl: true } },
      likes: true,
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, role: true, avatarUrl: true } },
          likes: true,
        },
      },
    },
  });

  const serializeReply = (comment: (typeof comments)[number]["replies"][number]): LessonCommentDTO => ({
    id: comment.id,
    kind: comment.kind,
    body: comment.deletedAt ? "Comentario removido." : comment.body,
    positionSeconds: comment.positionSeconds,
    helpful: comment.helpful,
    mine: comment.userId === userId,
    reported: Boolean(comment.reportedAt),
    liked: comment.likes.some((like) => like.userId === userId),
    likesCount: comment.likes.length,
    createdAt: comment.createdAt.toISOString(),
    user: {
      id: comment.user.id,
      name: comment.user.name,
      role: comment.user.role,
      avatarUrl: comment.user.avatarUrl,
    },
    replies: [],
  });

  const serialize = (comment: (typeof comments)[number]): LessonCommentDTO => ({
    id: comment.id,
    kind: comment.kind,
    body: comment.deletedAt ? "Comentario removido." : comment.body,
    positionSeconds: comment.positionSeconds,
    helpful: comment.helpful,
    mine: comment.userId === userId,
    reported: Boolean(comment.reportedAt),
    liked: comment.likes.some((like) => like.userId === userId),
    likesCount: comment.likes.length,
    createdAt: comment.createdAt.toISOString(),
    user: {
      id: comment.user.id,
      name: comment.user.name,
      role: comment.user.role,
      avatarUrl: comment.user.avatarUrl,
    },
    replies: comment.replies.map((reply) => serializeReply(reply)),
  });

  return comments.map((comment) => serialize(comment));
}

export async function createLessonComment(
  lessonId: string,
  userId: string,
  input: { body: string; kind?: LessonCommentKind; positionSeconds?: number | null; parentId?: string | null },
) {
  await assertLessonAccess(lessonId, userId);
  const body = input.body.trim().slice(0, 1600);
  if (!body) throw new Error("Comentario vazio.");
  return db.lessonComment.create({
    data: {
      userId,
      lessonId,
      body,
      kind: input.kind ?? LessonCommentKind.DISCUSSION,
      positionSeconds: typeof input.positionSeconds === "number" ? Math.max(0, Math.round(input.positionSeconds)) : null,
      parentId: input.parentId ?? null,
    },
  });
}

export async function createLessonDoubt(lessonId: string, userId: string, input: { body: string; positionSeconds?: number | null }) {
  const question = await createLessonComment(lessonId, userId, {
    body: input.body,
    kind: LessonCommentKind.QUESTION,
    positionSeconds: input.positionSeconds,
  });
  const teacher =
    (await db.user.findFirst({ where: { role: { in: [Role.TEACHER, Role.ADMIN] } }, orderBy: { createdAt: "asc" } })) ??
    (await db.user.findUnique({ where: { id: userId } }));

  if (teacher) {
    // TODO: integrar futuramente IA real para responder duvidas com contexto da aula.
    await db.lessonComment.create({
      data: {
        userId: teacher.id,
        lessonId,
        parentId: question.id,
        kind: LessonCommentKind.ANSWER,
        positionSeconds: input.positionSeconds ?? null,
        body: "Entendi sua duvida. Nesta parte, foque em identificar a relacao entre os dados do enunciado antes de aplicar a formula. Se quiser, marque o timestamp e refaca a questao guiada logo abaixo.",
        helpful: true,
      },
    });
  }

  return question;
}

export async function updateLessonComment(commentId: string, userId: string, body: string) {
  const comment = await db.lessonComment.findFirst({ where: { id: commentId, userId } });
  if (!comment) throw new Error("Comentario nao encontrado.");
  return db.lessonComment.update({
    where: { id: comment.id },
    data: { body: body.trim().slice(0, 1600), editedAt: new Date() },
  });
}

export async function deleteLessonComment(commentId: string, userId: string) {
  const comment = await db.lessonComment.findFirst({ where: { id: commentId, userId } });
  if (!comment) throw new Error("Comentario nao encontrado.");
  return db.lessonComment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
}

export async function reportLessonComment(commentId: string, userId: string) {
  const comment = await db.lessonComment.findFirst({ where: { id: commentId } });
  if (!comment || comment.userId === userId) throw new Error("Comentario nao encontrado.");
  return db.lessonComment.update({ where: { id: comment.id }, data: { reportedAt: new Date() } });
}

export async function toggleLessonCommentLike(commentId: string, userId: string) {
  const comment = await db.lessonComment.findUnique({ where: { id: commentId }, select: { lessonId: true } });
  if (!comment) throw new Error("Comentario nao encontrado.");
  await assertLessonAccess(comment.lessonId, userId);
  const existing = await db.lessonCommentLike.findUnique({ where: { userId_commentId: { userId, commentId } } });
  if (existing) await db.lessonCommentLike.delete({ where: { id: existing.id } });
  else await db.lessonCommentLike.create({ data: { userId, commentId } });
  return { liked: !existing };
}

export async function answerLessonQuestion(lessonId: string, userId: string, input: { questionId: string; selectedAlternative: string }) {
  const { lesson, course } = await assertLessonAccess(lessonId, userId);
  const link = await db.lessonQuestion.findFirst({
    where: { lessonId, questionId: input.questionId },
    include: { question: true },
  });
  if (!link) throw new Error("Questao nao vinculada a esta aula.");
  const selected = input.selectedAlternative.trim().toUpperCase();
  if (!/^[A-E]$/.test(selected)) throw new Error("Alternativa invalida.");
  const correct = link.question.correctAlternative === selected;
  const previousCorrect = await db.lessonQuestionAttempt.findFirst({
    where: { userId, lessonQuestionId: link.id, correct: true },
    select: { id: true },
  });
  const xpAwarded = correct && !previousCorrect ? link.xpReward : 0;
  const attempt = await db.lessonQuestionAttempt.create({
    data: {
      userId,
      lessonId,
      lessonQuestionId: link.id,
      questionId: link.questionId,
      selectedAlternative: selected,
      correct,
      xpAwarded,
    },
  });
  if (xpAwarded > 0) await awardXp(userId, xpAwarded, `Questao correta em ${lesson.title}.`);
  await recordEvent({
    userId,
    courseId: course.id,
    lessonId,
    type: LearningEventType.QUESTION_ANSWERED,
    metadata: { questionId: link.questionId, correct },
  });

  const allLinks = await db.lessonQuestion.findMany({ where: { lessonId }, select: { id: true } });
  const correctLinks = await db.lessonQuestionAttempt.findMany({
    where: { userId, lessonId, correct: true, lessonQuestionId: { in: allLinks.map((item) => item.id) } },
    distinct: ["lessonQuestionId"],
    select: { lessonQuestionId: true },
  });
  const score = allLinks.length ? Math.round((correctLinks.length / allLinks.length) * 100) : 0;
  if (allLinks.length > 0 && score >= (lesson.type === LessonNodeType.CHECKPOINT ? 70 : 60)) {
    await completeLesson(lessonId, userId);
  }

  return {
    attempt,
    correct,
    correctAlternative: link.question.correctAlternative,
    explanation: link.question.explanation,
    xpAwarded,
    score,
  };
}

export async function claimReward(rewardId: string, userId: string) {
  const reward = await db.reward.findUnique({ where: { id: rewardId }, include: { lesson: true } });
  if (!reward) throw new Error("Recompensa nao encontrada.");
  if (reward.lessonId) await assertLessonAccess(reward.lessonId, userId);
  const existing = await db.userReward.findUnique({ where: { userId_rewardId: { userId, rewardId } } });
  if (existing) return { claimed: false, xpAwarded: 0, reward };
  await db.userReward.create({ data: { userId, rewardId } });
  await awardXp(userId, reward.xpReward, `Recompensa liberada: ${reward.title}.`);
  if (reward.lessonId) await completeLesson(reward.lessonId, userId);
  await recordEvent({ userId, courseId: reward.courseId, lessonId: reward.lessonId, type: LearningEventType.REWARD_CLAIMED });
  return { claimed: true, xpAwarded: reward.xpReward, reward };
}

export async function finishSimulation(simulationId: string, userId: string, input: { responses: Record<string, string>; timeSeconds: number }) {
  const simulation = await db.simulation.findUnique({
    where: { id: simulationId },
    include: { lesson: true },
  });
  if (!simulation) throw new Error("Simulado nao encontrado.");
  if (simulation.lessonId) await assertLessonAccess(simulation.lessonId, userId);
  const questionIds = jsonArray<string>(simulation.questionIds, []);
  const questions = await db.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, correctAlternative: true },
  });
  const correctCount = questions.filter((question) => input.responses[question.id] === question.correctAlternative).length;
  const totalQuestions = Math.max(1, questions.length);
  const score = Math.round((correctCount / totalQuestions) * 100);
  const passed = score >= simulation.passingScore;
  const previousPassed = await db.simulationAttempt.findFirst({
    where: { userId, simulationId, passed: true },
    select: { id: true },
  });
  const xpAwarded = passed && !previousPassed ? simulation.xpReward : 0;
  const attempt = await db.simulationAttempt.create({
    data: {
      userId,
      simulationId,
      responses: input.responses,
      correctCount,
      totalQuestions: questions.length,
      score,
      timeSeconds: Math.max(0, Math.round(input.timeSeconds)),
      passed,
      xpAwarded,
    },
  });
  if (xpAwarded > 0) await awardXp(userId, xpAwarded, `${simulation.title} concluido.`);
  if (passed && simulation.lessonId) await completeLesson(simulation.lessonId, userId);
  await recordEvent({
    userId,
    courseId: simulation.courseId,
    lessonId: simulation.lessonId,
    type: LearningEventType.SIMULATION_COMPLETED,
    metadata: { score, correctCount, totalQuestions: questions.length },
  });

  return { attempt, score, correctCount, totalQuestions: questions.length, passed, xpAwarded };
}

export async function getFavoriteLessons(userId: string) {
  const favorites = await db.lessonFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      lesson: {
        include: {
          modules: { include: { module: { include: { courses: { include: { course: true }, take: 1 } } } }, take: 1 },
          progress: { where: { userId } },
        },
      },
    },
  });

  return favorites.map((favorite) => {
    const course = favorite.lesson.modules[0]?.module.courses[0]?.course;
    return {
      id: favorite.id,
      lessonId: favorite.lessonId,
      title: favorite.lesson.title,
      description: favorite.lesson.description,
      type: favorite.lesson.type,
      durationSeconds: favorite.lesson.durationSeconds,
      courseTitle: course?.title ?? "Curso EstudAki",
      href: course ? `/cursos/${course.slug}/aula/${favorite.lessonId}` : "/cursos",
      progressPercent: Math.round(favorite.lesson.progress[0]?.percentage ?? 0),
    };
  });
}
