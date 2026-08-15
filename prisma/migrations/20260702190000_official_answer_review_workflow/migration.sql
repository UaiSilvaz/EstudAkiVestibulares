ALTER TYPE "ProvaAntigaStatus" ADD VALUE IF NOT EXISTS 'APROVADA';

CREATE TYPE "OfficialAnswerReviewStatus" AS ENUM (
  'EXTRACTED',
  'CHECKED',
  'APPROVED',
  'REJECTED'
);

ALTER TABLE "official_answer_keys"
  ADD COLUMN "answer_review_status" "OfficialAnswerReviewStatus" NOT NULL DEFAULT 'EXTRACTED',
  ADD COLUMN "answer_reviewed_by" TEXT,
  ADD COLUMN "answer_reviewed_at" TIMESTAMP(3);

CREATE INDEX "official_answer_keys_answer_review_status_updated_at_idx"
  ON "official_answer_keys"("answer_review_status", "updated_at");
