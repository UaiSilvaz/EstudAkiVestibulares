CREATE TYPE "QuestionImportJobStatus" AS ENUM (
  'PREPARED',
  'IMPORTING',
  'WAITING_REVIEW',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'FAILED'
);

CREATE TYPE "QuestionAnswerSituation" AS ENUM (
  'PENDING_OFFICIAL_KEY',
  'CONFIRMED',
  'ANNULLED'
);

CREATE TYPE "QuestionExtractionStatus" AS ENUM (
  'EXTRACTED',
  'NEEDS_REVIEW',
  'INVALID'
);

CREATE TYPE "QuestionBlockType" AS ENUM (
  'SUPPORT_TEXT',
  'COMMAND',
  'CREDIT',
  'IMAGE'
);

CREATE TYPE "QuestionAssetType" AS ENUM (
  'VISUAL',
  'PROMPT_FACSIMILE',
  'ALTERNATIVE_VISUAL',
  'ORIGINAL_REFERENCE'
);

CREATE TYPE "QuestionAssetRelation" AS ENUM (
  'STATEMENT',
  'ALTERNATIVE',
  'ADMIN_REFERENCE'
);

CREATE TYPE "QuestionRevisionAction" AS ENUM (
  'IMPORTED',
  'UPDATED',
  'APPROVED',
  'REOPENED',
  'PUBLISHED'
);

ALTER TABLE "Question"
  ADD COLUMN "answerSituation" "QuestionAnswerSituation" NOT NULL DEFAULT 'CONFIRMED';

ALTER TABLE "QuestionAttempt"
  ADD COLUMN "annulled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Question"
SET "answerSituation" = 'ANNULLED'
WHERE UPPER("correctAlternative") = 'ANULADA';

ALTER TABLE "QuestionAlternative"
  ADD COLUMN "sourcePdfPage" INTEGER,
  ADD COLUMN "consolidatedPdfPage" INTEGER,
  ADD COLUMN "regionX" DOUBLE PRECISION,
  ADD COLUMN "regionY" DOUBLE PRECISION,
  ADD COLUMN "regionWidth" DOUBLE PRECISION,
  ADD COLUMN "regionHeight" DOUBLE PRECISION,
  ADD COLUMN "normalizedX" DOUBLE PRECISION,
  ADD COLUMN "normalizedY" DOUBLE PRECISION,
  ADD COLUMN "normalizedWidth" DOUBLE PRECISION,
  ADD COLUMN "normalizedHeight" DOUBLE PRECISION,
  ADD COLUMN "confidence" DOUBLE PRECISION;

ALTER TABLE "QuestionImage"
  ADD COLUMN "assetType" "QuestionAssetType" NOT NULL DEFAULT 'VISUAL',
  ADD COLUMN "relation" "QuestionAssetRelation" NOT NULL DEFAULT 'STATEMENT',
  ADD COLUMN "alternativeKey" TEXT,
  ADD COLUMN "storagePath" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "sha256Hash" TEXT,
  ADD COLUMN "sourcePdfPage" INTEGER,
  ADD COLUMN "consolidatedPdfPage" INTEGER,
  ADD COLUMN "regionX" DOUBLE PRECISION,
  ADD COLUMN "regionY" DOUBLE PRECISION,
  ADD COLUMN "regionWidth" DOUBLE PRECISION,
  ADD COLUMN "regionHeight" DOUBLE PRECISION,
  ADD COLUMN "normalizedX" DOUBLE PRECISION,
  ADD COLUMN "normalizedY" DOUBLE PRECISION,
  ADD COLUMN "normalizedWidth" DOUBLE PRECISION,
  ADD COLUMN "normalizedHeight" DOUBLE PRECISION;

ALTER TABLE "official_answer_keys"
  ADD COLUMN "question_id" TEXT,
  ADD COLUMN "answer_situation" "QuestionAnswerSituation" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN "source_url" TEXT,
  ADD COLUMN "source_sha256" TEXT,
  ADD COLUMN "source_pdf_page" INTEGER,
  ADD COLUMN "validation_status" TEXT,
  ADD COLUMN "imported_at" TIMESTAMP(3);

UPDATE "official_answer_keys"
SET "answer_situation" = 'ANNULLED'
WHERE UPPER("correct_alternative") = 'ANULADA';

ALTER TABLE "official_answer_keys"
  ADD CONSTRAINT "official_answer_keys_answer_situation_check"
  CHECK (
    ("answer_situation" = 'ANNULLED' AND UPPER("correct_alternative") = 'ANULADA')
    OR ("answer_situation" = 'CONFIRMED' AND UPPER("correct_alternative") ~ '^[A-E]$')
    OR "answer_situation" = 'PENDING_OFFICIAL_KEY'
  );

CREATE TABLE "question_import_jobs" (
  "id" TEXT NOT NULL,
  "pilot_id" TEXT NOT NULL,
  "prova_antiga_id" TEXT NOT NULL,
  "exam_file_id" TEXT NOT NULL,
  "answer_key_file_id" TEXT NOT NULL,
  "vestibular" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "day" INTEGER NOT NULL,
  "application" TEXT NOT NULL,
  "modality" TEXT NOT NULL,
  "booklet_number" INTEGER NOT NULL,
  "booklet_color" TEXT NOT NULL,
  "manifest_path" TEXT NOT NULL,
  "source_json_path" TEXT NOT NULL,
  "source_json_sha256" TEXT NOT NULL,
  "source_schema_version" INTEGER NOT NULL DEFAULT 1,
  "expected_question_count" INTEGER NOT NULL DEFAULT 90,
  "imported_question_count" INTEGER NOT NULL DEFAULT 0,
  "approved_question_count" INTEGER NOT NULL DEFAULT 0,
  "published_question_count" INTEGER NOT NULL DEFAULT 0,
  "status" "QuestionImportJobStatus" NOT NULL DEFAULT 'PREPARED',
  "validation_report" JSONB NOT NULL DEFAULT '{}',
  "checkpoint" JSONB NOT NULL DEFAULT '{}',
  "created_by" TEXT NOT NULL,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "question_import_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "question_import_jobs_expected_count_check"
    CHECK ("expected_question_count" > 0),
  CONSTRAINT "question_import_jobs_progress_check"
    CHECK (
      "imported_question_count" >= 0
      AND "approved_question_count" >= 0
      AND "published_question_count" >= 0
      AND "imported_question_count" <= "expected_question_count"
      AND "approved_question_count" <= "expected_question_count"
      AND "published_question_count" <= "expected_question_count"
    )
);

CREATE TABLE "question_extractions" (
  "id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "import_job_id" TEXT NOT NULL,
  "answer_key_id" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "official_number" INTEGER NOT NULL,
  "official_order" INTEGER NOT NULL,
  "official_pdf_page_start" INTEGER NOT NULL,
  "official_pdf_page_end" INTEGER NOT NULL,
  "consolidated_pdf_page_start" INTEGER NOT NULL,
  "consolidated_pdf_page_end" INTEGER NOT NULL,
  "original_page_url" TEXT NOT NULL,
  "extraction_status" "QuestionExtractionStatus" NOT NULL DEFAULT 'EXTRACTED',
  "review_status" "QuestionReviewState" NOT NULL DEFAULT 'PENDING_REVIEW',
  "answer_situation" "QuestionAnswerSituation" NOT NULL DEFAULT 'CONFIRMED',
  "confidence_text" DOUBLE PRECISION NOT NULL,
  "confidence_alternatives" DOUBLE PRECISION NOT NULL,
  "confidence_images" DOUBLE PRECISION NOT NULL,
  "confidence_answer" DOUBLE PRECISION NOT NULL,
  "confidence_classification" DOUBLE PRECISION NOT NULL,
  "confidence_overall" DOUBLE PRECISION NOT NULL,
  "flags" JSONB NOT NULL DEFAULT '{}',
  "source_metadata" JSONB NOT NULL DEFAULT '{}',
  "source_content_hash" TEXT NOT NULL,
  "raw_payload_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "question_extractions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "question_extractions_page_ranges_check"
    CHECK (
      "official_pdf_page_start" > 0
      AND "official_pdf_page_end" >= "official_pdf_page_start"
      AND "consolidated_pdf_page_start" > 0
      AND "consolidated_pdf_page_end" >= "consolidated_pdf_page_start"
    ),
  CONSTRAINT "question_extractions_confidences_check"
    CHECK (
      "confidence_text" BETWEEN 0 AND 1
      AND "confidence_alternatives" BETWEEN 0 AND 1
      AND "confidence_images" BETWEEN 0 AND 1
      AND "confidence_answer" BETWEEN 0 AND 1
      AND "confidence_classification" BETWEEN 0 AND 1
      AND "confidence_overall" BETWEEN 0 AND 1
    )
);

CREATE TABLE "question_blocks" (
  "id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "asset_id" TEXT,
  "type" "QuestionBlockType" NOT NULL,
  "content" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "source_pdf_page" INTEGER NOT NULL,
  "consolidated_pdf_page" INTEGER NOT NULL,
  "region_x" DOUBLE PRECISION NOT NULL,
  "region_y" DOUBLE PRECISION NOT NULL,
  "region_width" DOUBLE PRECISION NOT NULL,
  "region_height" DOUBLE PRECISION NOT NULL,
  "normalized_x" DOUBLE PRECISION NOT NULL,
  "normalized_y" DOUBLE PRECISION NOT NULL,
  "normalized_width" DOUBLE PRECISION NOT NULL,
  "normalized_height" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "question_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "question_blocks_coordinates_check"
    CHECK (
      "region_width" > 0
      AND "region_height" > 0
      AND "normalized_x" BETWEEN 0 AND 1
      AND "normalized_y" BETWEEN 0 AND 1
      AND "normalized_width" BETWEEN 0 AND 1
      AND "normalized_height" BETWEEN 0 AND 1
      AND "confidence" BETWEEN 0 AND 1
    ),
  CONSTRAINT "question_blocks_image_asset_check"
    CHECK (
      ("type" = 'IMAGE' AND "asset_id" IS NOT NULL)
      OR ("type" <> 'IMAGE' AND "asset_id" IS NULL)
    )
);

CREATE TABLE "question_revisions" (
  "id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "import_job_id" TEXT NOT NULL,
  "action" "QuestionRevisionAction" NOT NULL,
  "actor" TEXT NOT NULL,
  "notes" TEXT,
  "before_snapshot" JSONB,
  "after_snapshot" JSONB,
  "dedupe_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "official_answer_keys_question_id_key"
  ON "official_answer_keys"("question_id");
CREATE INDEX "QuestionImage_questionId_assetType_relation_idx"
  ON "QuestionImage"("questionId", "assetType", "relation");
CREATE INDEX "QuestionImage_sha256Hash_idx"
  ON "QuestionImage"("sha256Hash");
CREATE UNIQUE INDEX "question_import_jobs_pilot_id_key"
  ON "question_import_jobs"("pilot_id");
CREATE INDEX "question_import_jobs_year_day_status_idx"
  ON "question_import_jobs"("year", "day", "status");
CREATE INDEX "question_import_jobs_prova_antiga_id_status_idx"
  ON "question_import_jobs"("prova_antiga_id", "status");
CREATE UNIQUE INDEX "question_extractions_question_id_key"
  ON "question_extractions"("question_id");
CREATE UNIQUE INDEX "question_extractions_answer_key_id_key"
  ON "question_extractions"("answer_key_id");
CREATE UNIQUE INDEX "question_extractions_source_id_key"
  ON "question_extractions"("source_id");
CREATE UNIQUE INDEX "question_extractions_import_job_id_official_number_key"
  ON "question_extractions"("import_job_id", "official_number");
CREATE INDEX "question_extractions_import_job_id_review_status_idx"
  ON "question_extractions"("import_job_id", "review_status");
CREATE INDEX "question_extractions_consolidated_pdf_page_start_consolidated_pdf_page_end_idx"
  ON "question_extractions"("consolidated_pdf_page_start", "consolidated_pdf_page_end");
CREATE UNIQUE INDEX "question_blocks_question_id_order_key"
  ON "question_blocks"("question_id", "order");
CREATE INDEX "question_blocks_question_id_type_order_idx"
  ON "question_blocks"("question_id", "type", "order");
CREATE INDEX "question_blocks_asset_id_idx"
  ON "question_blocks"("asset_id");
CREATE UNIQUE INDEX "question_revisions_dedupe_key_key"
  ON "question_revisions"("dedupe_key");
CREATE INDEX "question_revisions_question_id_created_at_idx"
  ON "question_revisions"("question_id", "created_at");
CREATE INDEX "question_revisions_import_job_id_action_created_at_idx"
  ON "question_revisions"("import_job_id", "action", "created_at");

ALTER TABLE "official_answer_keys"
  ADD CONSTRAINT "official_answer_keys_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "Question"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "question_import_jobs"
  ADD CONSTRAINT "question_import_jobs_prova_antiga_id_fkey"
  FOREIGN KEY ("prova_antiga_id") REFERENCES "provas_antigas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "question_import_jobs_exam_file_id_fkey"
  FOREIGN KEY ("exam_file_id") REFERENCES "official_files"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "question_import_jobs_answer_key_file_id_fkey"
  FOREIGN KEY ("answer_key_file_id") REFERENCES "official_files"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "question_extractions"
  ADD CONSTRAINT "question_extractions_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "Question"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "question_extractions_import_job_id_fkey"
  FOREIGN KEY ("import_job_id") REFERENCES "question_import_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "question_extractions_answer_key_id_fkey"
  FOREIGN KEY ("answer_key_id") REFERENCES "official_answer_keys"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "question_blocks"
  ADD CONSTRAINT "question_blocks_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "Question"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "question_blocks_asset_id_fkey"
  FOREIGN KEY ("asset_id") REFERENCES "QuestionImage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "question_revisions"
  ADD CONSTRAINT "question_revisions_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "Question"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "question_revisions_import_job_id_fkey"
  FOREIGN KEY ("import_job_id") REFERENCES "question_import_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- The new ingestion and review tables are server-admin surfaces. Table owners
-- (the Prisma connection) retain access; direct anon/authenticated connections
-- receive no policy. A service_role policy is installed when that Supabase role
-- exists, keeping local PostgreSQL migrations portable.
ALTER TABLE "question_import_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_extractions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_revisions" ENABLE ROW LEVEL SECURITY;

DO $policy$
DECLARE
  table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'question_import_jobs',
      'question_extractions',
      'question_blocks',
      'question_revisions'
    ]
    LOOP
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        table_name || '_service_role_all',
        table_name
      );
    END LOOP;
  END IF;
END
$policy$;
