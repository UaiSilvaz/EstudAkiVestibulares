CREATE TABLE "StudentLearningProfile" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "profile" TEXT NOT NULL,
  "exams" JSONB NOT NULL,
  "course" TEXT NOT NULL DEFAULT '',
  "targetScore" TEXT NOT NULL DEFAULT '',
  "minutesPerDay" INTEGER NOT NULL DEFAULT 60,
  "studyDays" JSONB NOT NULL,
  "difficultSubjects" JSONB NOT NULL,
  "level" "PreparationLevel" NOT NULL DEFAULT 'BEGINNER',
  "learningPreferences" JSONB NOT NULL,
  "examDate" TIMESTAMP(3),
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentLearningProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "XpAward" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "XpAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "XpAward_userId_sourceKey_key" ON "XpAward"("userId", "sourceKey");
CREATE INDEX "XpAward_userId_createdAt_idx" ON "XpAward"("userId", "createdAt");
