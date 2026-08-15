ALTER TABLE "Exam"
ADD COLUMN "isSimulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "description" TEXT,
ADD COLUMN "instructions" TEXT,
ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "endsAt" TIMESTAMP(3),
ADD COLUMN "resultsAt" TIMESTAMP(3),
ADD COLUMN "answerKey" TEXT NOT NULL DEFAULT '{}';

CREATE TABLE "ExamAttempt" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "responses" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "correctCount" INTEGER,
  "score" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamAttempt_examId_userId_key" ON "ExamAttempt"("examId", "userId");
CREATE INDEX "ExamAttempt_userId_submittedAt_idx" ON "ExamAttempt"("userId", "submittedAt");
CREATE INDEX "ExamAttempt_examId_status_idx" ON "ExamAttempt"("examId", "status");

ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
