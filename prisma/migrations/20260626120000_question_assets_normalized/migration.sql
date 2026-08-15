CREATE TABLE "QuestionAlternative" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "explanation" TEXT,
  "correct" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionAlternative_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionImage" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "altText" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "width" INTEGER,
  "height" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionAlternative_questionId_key_key" ON "QuestionAlternative"("questionId", "key");
CREATE INDEX "QuestionAlternative_questionId_order_idx" ON "QuestionAlternative"("questionId", "order");
CREATE INDEX "QuestionImage_questionId_order_idx" ON "QuestionImage"("questionId", "order");

ALTER TABLE "QuestionAlternative" ADD CONSTRAINT "QuestionAlternative_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionImage" ADD CONSTRAINT "QuestionImage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
