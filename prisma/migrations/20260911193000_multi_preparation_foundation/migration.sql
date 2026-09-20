DO $$ BEGIN
  CREATE TYPE "PreparationLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserPreparationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EntitlementSource" AS ENUM ('PURCHASE', 'PROMOTION', 'ADMIN', 'LEGACY', 'SUBSCRIPTION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "FlashcardReviewState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activePreparationId" TEXT;
ALTER TABLE "StudySession" ADD COLUMN IF NOT EXISTS "userPreparationId" TEXT;
ALTER TABLE "EssaySubmission" ADD COLUMN IF NOT EXISTS "userPreparationId" TEXT;
ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "preparationId" TEXT;
ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'DISCUSSION';
ALTER TABLE "StudyPlanTask" ADD COLUMN IF NOT EXISTS "userPreparationId" TEXT;

CREATE TABLE IF NOT EXISTS "Vertical" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "themeKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Vertical_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Preparation" (
  "id" TEXT NOT NULL,
  "verticalId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "examSlug" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "defaultExamDate" TIMESTAMP(3),
  "coverUrl" TEXT,
  "features" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Preparation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPreparation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "preparationId" TEXT NOT NULL,
  "displayName" TEXT,
  "examDate" TIMESTAMP(3),
  "minutesPerDay" INTEGER NOT NULL DEFAULT 90,
  "studyDays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
  "level" "PreparationLevel" NOT NULL DEFAULT 'BEGINNER',
  "difficultSubjects" JSONB NOT NULL DEFAULT '[]',
  "experience" TEXT,
  "selectedTrackId" TEXT,
  "status" "UserPreparationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreparation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Course" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "subjectId" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "coverUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Module" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CourseModule" (
  "courseId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("courseId","moduleId")
);

CREATE TABLE IF NOT EXISTS "Lesson" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "content" TEXT,
  "videoId" TEXT,
  "videoUrl" TEXT,
  "materialId" TEXT,
  "subjectId" TEXT,
  "topicId" TEXT,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ModuleLesson" (
  "moduleId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ModuleLesson_pkey" PRIMARY KEY ("moduleId","lessonId")
);

CREATE TABLE IF NOT EXISTS "PreparationCourse" (
  "preparationId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PreparationCourse_pkey" PRIMARY KEY ("preparationId","courseId")
);

CREATE TABLE IF NOT EXISTS "Track" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "weeklyMinutes" INTEGER,
  "estimatedWeeks" INTEGER,
  "level" "PreparationLevel" NOT NULL DEFAULT 'BEGINNER',
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PreparationTrack" (
  "preparationId" TEXT NOT NULL,
  "trackId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PreparationTrack_pkey" PRIMARY KEY ("preparationId","trackId")
);

CREATE TABLE IF NOT EXISTS "TrackCourse" (
  "trackId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TrackCourse_pkey" PRIMARY KEY ("trackId","courseId")
);

CREATE TABLE IF NOT EXISTS "LessonProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "positionSeconds" INTEGER NOT NULL DEFAULT 0,
  "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LessonNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "positionSeconds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LessonAuthor" (
  "lessonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'AUTHOR',
  CONSTRAINT "LessonAuthor_pkey" PRIMARY KEY ("lessonId","userId","role")
);

CREATE TABLE IF NOT EXISTS "ContentRevenueShare" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT,
  "courseId" TEXT,
  "materialId" TEXT,
  "shareBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentRevenueShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PreparationProduct" (
  "preparationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "PreparationProduct_pkey" PRIMARY KEY ("preparationId","productId")
);

CREATE TABLE IF NOT EXISTS "CourseProduct" (
  "courseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "CourseProduct_pkey" PRIMARY KEY ("courseId","productId")
);

CREATE TABLE IF NOT EXISTS "Entitlement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT,
  "preparationId" TEXT,
  "courseId" TEXT,
  "purchaseId" TEXT,
  "sourceType" "EntitlementSource" NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FlashcardReview" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "flashcardId" TEXT NOT NULL,
  "state" "FlashcardReviewState" NOT NULL DEFAULT 'NEW',
  "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "intervalDays" INTEGER NOT NULL DEFAULT 0,
  "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "repetitions" INTEGER NOT NULL DEFAULT 0,
  "lastReviewedAt" TIMESTAMP(3),
  CONSTRAINT "FlashcardReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudyRoom" (
  "id" TEXT NOT NULL,
  "preparationId" TEXT,
  "creatorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "isPrivate" BOOLEAN NOT NULL DEFAULT false,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudyRoomMember" (
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "minutesStudied" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StudyRoomMember_pkey" PRIMARY KEY ("roomId","userId")
);

CREATE TABLE IF NOT EXISTS "StudyRoomMessage" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyRoomMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Vertical_slug_key" ON "Vertical"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Preparation_slug_key" ON "Preparation"("slug");
CREATE INDEX IF NOT EXISTS "Preparation_verticalId_status_idx" ON "Preparation"("verticalId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreparation_userId_preparationId_key" ON "UserPreparation"("userId", "preparationId");
CREATE INDEX IF NOT EXISTS "UserPreparation_userId_status_updatedAt_idx" ON "UserPreparation"("userId", "status", "updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Course_slug_key" ON "Course"("slug");
CREATE INDEX IF NOT EXISTS "Course_status_subjectId_idx" ON "Course"("status", "subjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "Module_slug_key" ON "Module"("slug");
CREATE INDEX IF NOT EXISTS "CourseModule_courseId_position_idx" ON "CourseModule"("courseId", "position");
CREATE INDEX IF NOT EXISTS "CourseModule_moduleId_idx" ON "CourseModule"("moduleId");
CREATE UNIQUE INDEX IF NOT EXISTS "Lesson_slug_key" ON "Lesson"("slug");
CREATE INDEX IF NOT EXISTS "Lesson_status_subjectId_topicId_idx" ON "Lesson"("status", "subjectId", "topicId");
CREATE INDEX IF NOT EXISTS "ModuleLesson_moduleId_position_idx" ON "ModuleLesson"("moduleId", "position");
CREATE INDEX IF NOT EXISTS "ModuleLesson_lessonId_idx" ON "ModuleLesson"("lessonId");
CREATE INDEX IF NOT EXISTS "PreparationCourse_preparationId_position_idx" ON "PreparationCourse"("preparationId", "position");
CREATE INDEX IF NOT EXISTS "PreparationCourse_courseId_idx" ON "PreparationCourse"("courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "Track_slug_key" ON "Track"("slug");
CREATE INDEX IF NOT EXISTS "PreparationTrack_preparationId_position_idx" ON "PreparationTrack"("preparationId", "position");
CREATE INDEX IF NOT EXISTS "PreparationTrack_trackId_idx" ON "PreparationTrack"("trackId");
CREATE INDEX IF NOT EXISTS "TrackCourse_trackId_position_idx" ON "TrackCourse"("trackId", "position");
CREATE INDEX IF NOT EXISTS "TrackCourse_courseId_idx" ON "TrackCourse"("courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");
CREATE INDEX IF NOT EXISTS "LessonProgress_userId_updatedAt_idx" ON "LessonProgress"("userId", "updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LessonNote_userId_lessonId_key" ON "LessonNote"("userId", "lessonId");
CREATE INDEX IF NOT EXISTS "LessonAuthor_userId_idx" ON "LessonAuthor"("userId");
CREATE INDEX IF NOT EXISTS "ContentRevenueShare_userId_validFrom_idx" ON "ContentRevenueShare"("userId", "validFrom");
CREATE INDEX IF NOT EXISTS "PreparationProduct_productId_idx" ON "PreparationProduct"("productId");
CREATE INDEX IF NOT EXISTS "CourseProduct_productId_idx" ON "CourseProduct"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "Entitlement_userId_productId_sourceKey_key" ON "Entitlement"("userId", "productId", "sourceKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Entitlement_userId_preparationId_sourceKey_key" ON "Entitlement"("userId", "preparationId", "sourceKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Entitlement_userId_courseId_sourceKey_key" ON "Entitlement"("userId", "courseId", "sourceKey");
CREATE INDEX IF NOT EXISTS "Entitlement_userId_revokedAt_expiresAt_idx" ON "Entitlement"("userId", "revokedAt", "expiresAt");
CREATE INDEX IF NOT EXISTS "Entitlement_purchaseId_idx" ON "Entitlement"("purchaseId");
CREATE UNIQUE INDEX IF NOT EXISTS "FlashcardReview_userId_flashcardId_key" ON "FlashcardReview"("userId", "flashcardId");
CREATE INDEX IF NOT EXISTS "FlashcardReview_userId_nextReviewAt_idx" ON "FlashcardReview"("userId", "nextReviewAt");
CREATE INDEX IF NOT EXISTS "StudyRoom_preparationId_isPrivate_status_idx" ON "StudyRoom"("preparationId", "isPrivate", "status");
CREATE INDEX IF NOT EXISTS "StudyRoomMember_userId_idx" ON "StudyRoomMember"("userId");
CREATE INDEX IF NOT EXISTS "StudyRoomMessage_roomId_createdAt_idx" ON "StudyRoomMessage"("roomId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudySession_userPreparationId_startedAt_idx" ON "StudySession"("userPreparationId", "startedAt");
CREATE INDEX IF NOT EXISTS "EssaySubmission_userPreparationId_createdAt_idx" ON "EssaySubmission"("userPreparationId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_preparationId_createdAt_idx" ON "CommunityPost"("preparationId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudyPlanTask_userPreparationId_scheduledFor_idx" ON "StudyPlanTask"("userPreparationId", "scheduledFor");

ALTER TABLE "Preparation" ADD CONSTRAINT "Preparation_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_activePreparationId_fkey" FOREIGN KEY ("activePreparationId") REFERENCES "Preparation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserPreparation" ADD CONSTRAINT "UserPreparation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPreparation" ADD CONSTRAINT "UserPreparation_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "Preparation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPreparation" ADD CONSTRAINT "UserPreparation_selectedTrackId_fkey" FOREIGN KEY ("selectedTrackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModuleLesson" ADD CONSTRAINT "ModuleLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModuleLesson" ADD CONSTRAINT "ModuleLesson_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreparationCourse" ADD CONSTRAINT "PreparationCourse_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "Preparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreparationCourse" ADD CONSTRAINT "PreparationCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreparationTrack" ADD CONSTRAINT "PreparationTrack_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "Preparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreparationTrack" ADD CONSTRAINT "PreparationTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrackCourse" ADD CONSTRAINT "TrackCourse_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackCourse" ADD CONSTRAINT "TrackCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonAuthor" ADD CONSTRAINT "LessonAuthor_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonAuthor" ADD CONSTRAINT "LessonAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentRevenueShare" ADD CONSTRAINT "ContentRevenueShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentRevenueShare" ADD CONSTRAINT "ContentRevenueShare_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentRevenueShare" ADD CONSTRAINT "ContentRevenueShare_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentRevenueShare" ADD CONSTRAINT "ContentRevenueShare_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreparationProduct" ADD CONSTRAINT "PreparationProduct_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "Preparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreparationProduct" ADD CONSTRAINT "PreparationProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseProduct" ADD CONSTRAINT "CourseProduct_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseProduct" ADD CONSTRAINT "CourseProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "Preparation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyRoom" ADD CONSTRAINT "StudyRoom_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "Preparation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudyRoom" ADD CONSTRAINT "StudyRoom_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyRoomMember" ADD CONSTRAINT "StudyRoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "StudyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyRoomMember" ADD CONSTRAINT "StudyRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyRoomMessage" ADD CONSTRAINT "StudyRoomMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "StudyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyRoomMessage" ADD CONSTRAINT "StudyRoomMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userPreparationId_fkey" FOREIGN KEY ("userPreparationId") REFERENCES "UserPreparation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EssaySubmission" ADD CONSTRAINT "EssaySubmission_userPreparationId_fkey" FOREIGN KEY ("userPreparationId") REFERENCES "UserPreparation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "Preparation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudyPlanTask" ADD CONSTRAINT "StudyPlanTask_userPreparationId_fkey" FOREIGN KEY ("userPreparationId") REFERENCES "UserPreparation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
