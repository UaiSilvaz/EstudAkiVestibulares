ALTER TABLE "Question"
ADD COLUMN "sourceCitation" TEXT,
ADD COLUMN "sourceAccessedAt" TEXT;

ALTER TABLE "QuestionAlternative"
ADD COLUMN "imageUrl" TEXT;
