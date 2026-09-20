-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('LOCAL', 'MUX', 'CLOUDFLARE', 'BUNNY');

-- CreateEnum
CREATE TYPE "LessonNodeType" AS ENUM ('VIDEO', 'QUESTIONS', 'REVIEW', 'CHECKPOINT', 'SIMULATION', 'MATERIAL', 'REWARD', 'FINAL');

-- CreateEnum
CREATE TYPE "CourseNavigationMode" AS ENUM ('SEQUENTIAL', 'FREE_NAVIGATION');

-- CreateEnum
CREATE TYPE "LessonCommentKind" AS ENUM ('DISCUSSION', 'QUESTION', 'ANSWER');

-- CreateEnum
CREATE TYPE "LearningEventType" AS ENUM ('PLAY', 'PAUSE', 'LESSON_STARTED', 'LESSON_COMPLETED', 'QUESTION_ANSWERED', 'CHECKPOINT_COMPLETED', 'SIMULATION_COMPLETED', 'COURSE_STARTED', 'COURSE_COMPLETED', 'PURCHASE_DEMO_COMPLETED', 'REWARD_CLAIMED');

-- AlterTable
ALTER TABLE "Course"
ADD COLUMN "shortDescription" TEXT NOT NULL DEFAULT '',
ADD COLUMN "thumbnail" TEXT,
ADD COLUMN "coverImage" TEXT,
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'ENEM',
ADD COLUMN "level" TEXT NOT NULL DEFAULT 'Base',
ADD COLUMN "priceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "teacherId" TEXT,
ADD COLUMN "totalDurationSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "navigationMode" "CourseNavigationMode" NOT NULL DEFAULT 'SEQUENTIAL',
ADD COLUMN "visualTheme" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "benefits" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.8,
ADD COLUMN "studentsCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Course" SET "published" = ("status" = 'PUBLISHED');
UPDATE "Course" SET "coverImage" = "coverUrl" WHERE "coverImage" IS NULL AND "coverUrl" IS NOT NULL;

-- AlterTable
ALTER TABLE "Module"
ADD COLUMN "eyebrow" TEXT NOT NULL DEFAULT '',
ADD COLUMN "color" TEXT NOT NULL DEFAULT '#1E73FF';

-- AlterTable
ALTER TABLE "Lesson"
ADD COLUMN "type" "LessonNodeType" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN "videoProvider" "VideoProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "xpReward" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "isFreePreview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allowManualCompletion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "resources" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "outcomes" JSONB NOT NULL DEFAULT '[]';

UPDATE "Lesson" SET "isFreePreview" = "isFree";

-- AlterTable
ALTER TABLE "LessonProgress"
ADD COLUMN "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "xpAwarded" INTEGER NOT NULL DEFAULT 0;

UPDATE "LessonProgress" SET "completed" = true, "percentage" = 100 WHERE "completedAt" IS NOT NULL;

-- CreateTable
CREATE TABLE "LessonLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" "LessonCommentKind" NOT NULL DEFAULT 'DISCUSSION',
    "body" TEXT NOT NULL,
    "positionSeconds" INTEGER,
    "helpful" BOOLEAN NOT NULL DEFAULT false,
    "reportedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCommentLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonQuestion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonQuestionAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "lessonQuestionId" TEXT,
    "questionId" TEXT NOT NULL,
    "selectedAlternative" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonQuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "questionIds" JSONB NOT NULL DEFAULT '[]',
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "xpReward" INTEGER NOT NULL DEFAULT 150,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "responses" JSONB NOT NULL DEFAULT '{}',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeSeconds" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "badge" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "type" "LearningEventType" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_published_featured_idx" ON "Course"("published", "featured");

-- CreateIndex
CREATE INDEX "Course_category_level_idx" ON "Course"("category", "level");

-- CreateIndex
CREATE INDEX "Lesson_type_status_idx" ON "Lesson"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LessonLike_userId_lessonId_key" ON "LessonLike"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "LessonLike_lessonId_createdAt_idx" ON "LessonLike"("lessonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonFavorite_userId_lessonId_key" ON "LessonFavorite"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "LessonFavorite_userId_createdAt_idx" ON "LessonFavorite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonComment_lessonId_kind_createdAt_idx" ON "LessonComment"("lessonId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "LessonComment_parentId_idx" ON "LessonComment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCommentLike_userId_commentId_key" ON "LessonCommentLike"("userId", "commentId");

-- CreateIndex
CREATE INDEX "LessonCommentLike_commentId_createdAt_idx" ON "LessonCommentLike"("commentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonQuestion_lessonId_questionId_key" ON "LessonQuestion"("lessonId", "questionId");

-- CreateIndex
CREATE INDEX "LessonQuestion_lessonId_order_idx" ON "LessonQuestion"("lessonId", "order");

-- CreateIndex
CREATE INDEX "LessonQuestion_questionId_idx" ON "LessonQuestion"("questionId");

-- CreateIndex
CREATE INDEX "LessonQuestionAttempt_userId_lessonId_createdAt_idx" ON "LessonQuestionAttempt"("userId", "lessonId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonQuestionAttempt_questionId_idx" ON "LessonQuestionAttempt"("questionId");

-- CreateIndex
CREATE INDEX "Simulation_courseId_moduleId_idx" ON "Simulation"("courseId", "moduleId");

-- CreateIndex
CREATE INDEX "Simulation_lessonId_idx" ON "Simulation"("lessonId");

-- CreateIndex
CREATE INDEX "SimulationAttempt_userId_submittedAt_idx" ON "SimulationAttempt"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "SimulationAttempt_simulationId_submittedAt_idx" ON "SimulationAttempt"("simulationId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_slug_key" ON "Reward"("slug");

-- CreateIndex
CREATE INDEX "Reward_courseId_moduleId_idx" ON "Reward"("courseId", "moduleId");

-- CreateIndex
CREATE INDEX "Reward_lessonId_idx" ON "Reward"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReward_userId_rewardId_key" ON "UserReward"("userId", "rewardId");

-- CreateIndex
CREATE INDEX "UserReward_userId_claimedAt_idx" ON "UserReward"("userId", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CourseReview_userId_courseId_key" ON "CourseReview"("userId", "courseId");

-- CreateIndex
CREATE INDEX "CourseReview_courseId_createdAt_idx" ON "CourseReview"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningEvent_userId_createdAt_idx" ON "LearningEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningEvent_courseId_createdAt_idx" ON "LearningEvent"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningEvent_lessonId_createdAt_idx" ON "LearningEvent"("lessonId", "createdAt");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLike" ADD CONSTRAINT "LessonLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLike" ADD CONSTRAINT "LessonLike_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonFavorite" ADD CONSTRAINT "LessonFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonFavorite" ADD CONSTRAINT "LessonFavorite_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonComment" ADD CONSTRAINT "LessonComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonComment" ADD CONSTRAINT "LessonComment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonComment" ADD CONSTRAINT "LessonComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LessonComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCommentLike" ADD CONSTRAINT "LessonCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCommentLike" ADD CONSTRAINT "LessonCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "LessonComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestion" ADD CONSTRAINT "LessonQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestion" ADD CONSTRAINT "LessonQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestionAttempt" ADD CONSTRAINT "LessonQuestionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestionAttempt" ADD CONSTRAINT "LessonQuestionAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestionAttempt" ADD CONSTRAINT "LessonQuestionAttempt_lessonQuestionId_fkey" FOREIGN KEY ("lessonQuestionId") REFERENCES "LessonQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestionAttempt" ADD CONSTRAINT "LessonQuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReward" ADD CONSTRAINT "UserReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReward" ADD CONSTRAINT "UserReward_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
