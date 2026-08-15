-- Generalize the official ENEM identity without changing the existing pilot
-- rows. Existing records are backfilled by the NOT_APPLICABLE defaults.
CREATE TYPE "OfficialQuestionLanguage" AS ENUM (
  'NOT_APPLICABLE',
  'PORTUGUESE',
  'ENGLISH',
  'SPANISH'
);

ALTER TABLE "Question"
  ADD COLUMN "officialLanguage" "OfficialQuestionLanguage" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "officialGroup" TEXT,
  ADD COLUMN "officialVariant" TEXT;

ALTER TABLE "prova_antiga_questoes"
  ADD COLUMN "official_language" "OfficialQuestionLanguage" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "official_group" TEXT,
  ADD COLUMN "official_variant" TEXT;

ALTER TABLE "official_answer_keys"
  ADD COLUMN "official_language" "OfficialQuestionLanguage" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "official_group" TEXT,
  ADD COLUMN "official_variant" TEXT;

ALTER TABLE "question_extractions"
  ADD COLUMN "official_language" "OfficialQuestionLanguage" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "official_group" TEXT,
  ADD COLUMN "official_variant" TEXT;

ALTER TABLE "question_import_jobs"
  ADD COLUMN "require_pedagogical_review" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "require_authorial_resolution" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "require_essay_proposal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "approved_pedagogical_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "approved_resolution_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "published_resolution_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "approved_essay_proposal_count" INTEGER NOT NULL DEFAULT 0;

-- Language is part of the official identity. This permits the English and
-- Spanish versions of questions 1-5 to coexist in the same exam/job/file.
DROP INDEX "prova_antiga_questoes_prova_antiga_id_numero_questao_key";
DROP INDEX "official_answer_keys_file_id_question_number_key";
DROP INDEX "question_extractions_import_job_id_official_number_key";

CREATE UNIQUE INDEX "paq_exam_number_language_key"
  ON "prova_antiga_questoes"("prova_antiga_id", "numero_questao", "official_language");
CREATE UNIQUE INDEX "official_answer_keys_file_number_language_key"
  ON "official_answer_keys"("file_id", "question_number", "official_language");
CREATE UNIQUE INDEX "question_extractions_job_number_language_key"
  ON "question_extractions"("import_job_id", "official_number", "official_language");

CREATE INDEX "Question_year_questionNumber_officialLanguage_idx"
  ON "Question"("year", "questionNumber", "officialLanguage");
CREATE INDEX "Question_officialGroup_officialVariant_idx"
  ON "Question"("officialGroup", "officialVariant");
CREATE INDEX "paq_exam_group_variant_idx"
  ON "prova_antiga_questoes"("prova_antiga_id", "official_group", "official_variant");
CREATE INDEX "official_answer_keys_file_group_variant_idx"
  ON "official_answer_keys"("file_id", "official_group", "official_variant");
CREATE INDEX "question_extractions_job_group_variant_idx"
  ON "question_extractions"("import_job_id", "official_group", "official_variant");

-- Normalize the identifier that PostgreSQL truncated from the previous pilot
-- migration to the name Prisma derives from the current datamodel.
ALTER INDEX "question_extractions_consolidated_pdf_page_start_consolidated_p"
  RENAME TO "question_extractions_consolidated_pdf_page_start_consolidat_idx";

ALTER TABLE "question_import_jobs"
  ADD CONSTRAINT "question_import_jobs_expansion_counts_check"
  CHECK (
    "approved_pedagogical_count" >= 0
    AND "approved_resolution_count" >= 0
    AND "published_resolution_count" >= 0
    AND "approved_essay_proposal_count" BETWEEN 0 AND 1
    AND "approved_pedagogical_count" <= "expected_question_count"
    AND "approved_resolution_count" <= "expected_question_count"
    AND "published_resolution_count" <= "expected_question_count"
    AND "published_resolution_count" <= "approved_resolution_count"
  ),
  ADD CONSTRAINT "question_import_jobs_pedagogical_gate_check"
  CHECK (
    "status" <> 'PUBLISHED'
    OR NOT "require_pedagogical_review"
    OR "approved_pedagogical_count" = "published_question_count"
  ),
  ADD CONSTRAINT "question_import_jobs_resolution_gate_check"
  CHECK (
    "status" <> 'PUBLISHED'
    OR NOT "require_authorial_resolution"
    OR (
      "approved_resolution_count" = "published_question_count"
      AND "published_resolution_count" = "published_question_count"
    )
  ),
  ADD CONSTRAINT "question_import_jobs_essay_gate_check"
  CHECK (
    "status" <> 'PUBLISHED'
    OR NOT "require_essay_proposal"
    OR "approved_essay_proposal_count" = 1
  );

CREATE TABLE "official_essay_proposals" (
  "id" TEXT NOT NULL,
  "import_job_id" TEXT NOT NULL,
  "prova_antiga_id" TEXT NOT NULL,
  "official_language" "OfficialQuestionLanguage" NOT NULL DEFAULT 'PORTUGUESE',
  "official_group" TEXT,
  "official_variant" TEXT,
  "title" TEXT,
  "theme" TEXT,
  "prompt_text" TEXT NOT NULL,
  "instructions" JSONB NOT NULL DEFAULT '[]',
  "blocks" JSONB NOT NULL DEFAULT '[]',
  "assets" JSONB NOT NULL DEFAULT '[]',
  "official_pdf_page_start" INTEGER NOT NULL,
  "official_pdf_page_end" INTEGER NOT NULL,
  "consolidated_pdf_page_start" INTEGER,
  "consolidated_pdf_page_end" INTEGER,
  "original_page_url" TEXT NOT NULL,
  "extraction_status" "QuestionExtractionStatus" NOT NULL DEFAULT 'EXTRACTED',
  "review_status" "QuestionReviewState" NOT NULL DEFAULT 'PENDING_REVIEW',
  "status" "ContentStatus" NOT NULL DEFAULT 'REVIEW',
  "confidence_text" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence_images" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence_overall" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "flags" JSONB NOT NULL DEFAULT '{}',
  "source_metadata" JSONB NOT NULL DEFAULT '{}',
  "source_content_hash" TEXT NOT NULL,
  "raw_payload_hash" TEXT NOT NULL,
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "official_essay_proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "official_essay_proposals_page_ranges_check"
    CHECK (
      "official_pdf_page_start" > 0
      AND "official_pdf_page_end" >= "official_pdf_page_start"
      AND (
        ("consolidated_pdf_page_start" IS NULL AND "consolidated_pdf_page_end" IS NULL)
        OR (
          "consolidated_pdf_page_start" > 0
          AND "consolidated_pdf_page_end" >= "consolidated_pdf_page_start"
        )
      )
    ),
  CONSTRAINT "official_essay_proposals_confidences_check"
    CHECK (
      "confidence_text" BETWEEN 0 AND 1
      AND "confidence_images" BETWEEN 0 AND 1
      AND "confidence_overall" BETWEEN 0 AND 1
    ),
  CONSTRAINT "official_essay_proposals_review_gate_check"
    CHECK (
      "review_status" <> 'APPROVED'
      OR ("reviewed_by" IS NOT NULL AND "reviewed_at" IS NOT NULL)
    ),
  CONSTRAINT "official_essay_proposals_publication_gate_check"
    CHECK (
      "status" <> 'PUBLISHED'
      OR (
        "review_status" = 'APPROVED'
        AND "reviewed_by" IS NOT NULL
        AND "reviewed_at" IS NOT NULL
        AND "published_at" IS NOT NULL
      )
    )
);

CREATE TABLE "question_pedagogical_metadata" (
  "id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "import_job_id" TEXT,
  "knowledge_area" TEXT,
  "disciplinary_component" TEXT,
  "competency_code" TEXT,
  "competency_description" TEXT,
  "ability_code" TEXT,
  "ability_description" TEXT,
  "cognitive_demand" TEXT,
  "learning_objectives" JSONB NOT NULL DEFAULT '[]',
  "concepts" JSONB NOT NULL DEFAULT '[]',
  "prerequisites" JSONB NOT NULL DEFAULT '[]',
  "curriculum_codes" JSONB NOT NULL DEFAULT '[]',
  "keywords" JSONB NOT NULL DEFAULT '[]',
  "estimated_minutes" INTEGER,
  "classification_source" TEXT,
  "classification_confidence" DOUBLE PRECISION,
  "review_status" "QuestionReviewState" NOT NULL DEFAULT 'PENDING_REVIEW',
  "review_notes" TEXT,
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "provenance" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "question_pedagogical_metadata_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "question_pedagogical_metadata_values_check"
    CHECK (
      ("estimated_minutes" IS NULL OR "estimated_minutes" > 0)
      AND (
        "classification_confidence" IS NULL
        OR "classification_confidence" BETWEEN 0 AND 1
      )
    ),
  CONSTRAINT "question_pedagogical_metadata_review_gate_check"
    CHECK (
      "review_status" <> 'APPROVED'
      OR ("reviewed_by" IS NOT NULL AND "reviewed_at" IS NOT NULL)
    )
);

CREATE TABLE "question_authorial_resolutions" (
  "id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "import_job_id" TEXT NOT NULL,
  "answer_key_id" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "OfficialResolutionStatus" NOT NULL DEFAULT 'NOT_GENERATED',
  "review_status" "QuestionReviewState" NOT NULL DEFAULT 'PENDING_REVIEW',
  "short_comment" TEXT,
  "full_resolution" TEXT,
  "reasoning_path" JSONB NOT NULL DEFAULT '[]',
  "steps" JSONB NOT NULL DEFAULT '[]',
  "alternative_comments" JSONB NOT NULL DEFAULT '{}',
  "common_error" TEXT,
  "study_tip" TEXT,
  "keywords" JSONB NOT NULL DEFAULT '[]',
  "related_content" JSONB NOT NULL DEFAULT '[]',
  "content_hash" TEXT,
  "generated_by_model" TEXT,
  "generation_metadata" JSONB NOT NULL DEFAULT '{}',
  "generated_at" TIMESTAMP(3),
  "authored_by" TEXT,
  "submitted_at" TIMESTAMP(3),
  "review_notes" TEXT,
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "question_authorial_resolutions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "question_authorial_resolutions_version_check"
    CHECK ("version" > 0),
  CONSTRAINT "question_authorial_resolutions_review_gate_check"
    CHECK (
      "status" NOT IN ('APPROVED', 'PUBLISHED')
      OR (
        "review_status" = 'APPROVED'
        AND "reviewed_by" IS NOT NULL
        AND "reviewed_at" IS NOT NULL
        AND NULLIF(BTRIM("full_resolution"), '') IS NOT NULL
      )
    ),
  CONSTRAINT "question_authorial_resolutions_publication_gate_check"
    CHECK (
      "status" <> 'PUBLISHED'
      OR "published_at" IS NOT NULL
    )
);

CREATE UNIQUE INDEX "official_essay_proposals_import_job_id_key"
  ON "official_essay_proposals"("import_job_id");
CREATE INDEX "official_essay_proposals_exam_status_idx"
  ON "official_essay_proposals"("prova_antiga_id", "status");
CREATE INDEX "official_essay_proposals_review_status_idx"
  ON "official_essay_proposals"("review_status", "status", "updated_at");

CREATE UNIQUE INDEX "question_pedagogical_metadata_question_id_key"
  ON "question_pedagogical_metadata"("question_id");
CREATE INDEX "question_pedagogy_job_review_idx"
  ON "question_pedagogical_metadata"("import_job_id", "review_status");
CREATE INDEX "question_pedagogy_area_component_idx"
  ON "question_pedagogical_metadata"("knowledge_area", "disciplinary_component");
CREATE INDEX "question_pedagogy_review_updated_idx"
  ON "question_pedagogical_metadata"("review_status", "updated_at");

CREATE UNIQUE INDEX "question_resolutions_question_version_key"
  ON "question_authorial_resolutions"("question_id", "version");
CREATE INDEX "question_authorial_resolutions_answer_key_id_idx"
  ON "question_authorial_resolutions"("answer_key_id");
CREATE INDEX "question_resolutions_job_status_review_idx"
  ON "question_authorial_resolutions"("import_job_id", "status", "review_status");
CREATE INDEX "question_resolutions_review_updated_idx"
  ON "question_authorial_resolutions"("review_status", "updated_at");
CREATE UNIQUE INDEX "question_resolutions_one_published_per_question_idx"
  ON "question_authorial_resolutions"("question_id")
  WHERE "status" = 'PUBLISHED';

ALTER TABLE "official_essay_proposals"
  ADD CONSTRAINT "official_essay_proposals_import_job_id_fkey"
  FOREIGN KEY ("import_job_id") REFERENCES "question_import_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "official_essay_proposals_prova_antiga_id_fkey"
  FOREIGN KEY ("prova_antiga_id") REFERENCES "provas_antigas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "question_pedagogical_metadata"
  ADD CONSTRAINT "question_pedagogical_metadata_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "Question"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "question_pedagogical_metadata_import_job_id_fkey"
  FOREIGN KEY ("import_job_id") REFERENCES "question_import_jobs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "question_authorial_resolutions"
  ADD CONSTRAINT "question_authorial_resolutions_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "Question"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "question_authorial_resolutions_import_job_id_fkey"
  FOREIGN KEY ("import_job_id") REFERENCES "question_import_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "question_authorial_resolutions_answer_key_id_fkey"
  FOREIGN KEY ("answer_key_id") REFERENCES "official_answer_keys"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON COLUMN "official_answer_keys"."short_comment" IS
  'Legacy compatibility only; new authorial resolution content belongs to question_authorial_resolutions.';
COMMENT ON TABLE "question_authorial_resolutions" IS
  'Authorial pedagogical resolutions. Official answer keys remain provenance-only records.';

-- These are server-admin editorial surfaces. Owners retain access; direct
-- anon/authenticated connections receive no policy. Local PostgreSQL remains
-- portable when the Supabase service_role does not exist.
ALTER TABLE "official_essay_proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_pedagogical_metadata" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_authorial_resolutions" ENABLE ROW LEVEL SECURITY;

DO $policy$
DECLARE
  table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'official_essay_proposals',
      'question_pedagogical_metadata',
      'question_authorial_resolutions'
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
