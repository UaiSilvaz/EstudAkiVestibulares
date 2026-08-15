CREATE TYPE "QuestionSourceType" AS ENUM ('OFFICIAL', 'WEB_PUBLIC', 'LICENSE_REQUIRED', 'AUTHORIAL');
CREATE TYPE "QuestionReviewState" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'HAS_ERROR');
CREATE TYPE "QuestionReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

ALTER TABLE "Question"
  ADD COLUMN "exam" TEXT,
  ADD COLUMN "phase" TEXT,
  ADD COLUMN "day" TEXT,
  ADD COLUMN "questionNumber" INTEGER,
  ADD COLUMN "supportText" TEXT,
  ADD COLUMN "alternativeExplanations" TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN "skill" TEXT,
  ADD COLUMN "images" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN "sourceName" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "sourceType" "QuestionSourceType" NOT NULL DEFAULT 'AUTHORIAL',
  ADD COLUMN "reviewState" "QuestionReviewState" NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN "reviewNotes" TEXT,
  ADD COLUMN "contentHash" TEXT;

UPDATE "Question"
SET
  "sourceType" = 'OFFICIAL',
  "sourceName" = COALESCE("sourceName", 'Fonte oficial'),
  "sourceUrl" = COALESCE("sourceUrl", "source"),
  "reviewState" = CASE WHEN LENGTH(TRIM("explanation")) >= 80 THEN 'PENDING_REVIEW'::"QuestionReviewState" ELSE 'HAS_ERROR'::"QuestionReviewState" END,
  "reviewNotes" = CASE WHEN LENGTH(TRIM("explanation")) >= 80 THEN "reviewNotes" ELSE 'Explicacao pedagogica completa pendente antes da publicacao.' END
WHERE "source" LIKE 'http%';

CREATE TABLE "QuestionFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" "QuestionReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Question_contentHash_key" ON "Question"("contentHash");
CREATE INDEX "Question_vestibularId_status_difficulty_idx" ON "Question"("vestibularId", "status", "difficulty");
CREATE INDEX "Question_subjectId_topicId_status_idx" ON "Question"("subjectId", "topicId", "status");
CREATE INDEX "Question_sourceType_reviewState_status_idx" ON "Question"("sourceType", "reviewState", "status");
CREATE INDEX "Question_year_status_idx" ON "Question"("year", "status");
CREATE UNIQUE INDEX "QuestionFavorite_userId_questionId_key" ON "QuestionFavorite"("userId", "questionId");
CREATE INDEX "QuestionFavorite_userId_createdAt_idx" ON "QuestionFavorite"("userId", "createdAt");
CREATE INDEX "QuestionReport_questionId_status_idx" ON "QuestionReport"("questionId", "status");
CREATE INDEX "QuestionReport_userId_createdAt_idx" ON "QuestionReport"("userId", "createdAt");

ALTER TABLE "QuestionFavorite" ADD CONSTRAINT "QuestionFavorite_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionFavorite" ADD CONSTRAINT "QuestionFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
