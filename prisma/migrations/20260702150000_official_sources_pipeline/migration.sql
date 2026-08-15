CREATE TYPE "OfficialFileType" AS ENUM ('INDEX_PAGE', 'EXAM', 'ANSWER_KEY');
CREATE TYPE "OfficialSourceKind" AS ENUM ('SEED_PAGE', 'DIRECT_FILE');
CREATE TYPE "OfficialSourceStatus" AS ENUM ('PENDING', 'APPROVED', 'DOWNLOADED', 'ERROR', 'ARCHIVED');
CREATE TYPE "OfficialDownloadStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'DOWNLOADED', 'DUPLICATE', 'ERROR');
CREATE TYPE "OfficialProcessingStatus" AS ENUM ('FILE_DOWNLOADED', 'WAITING_EXTRACTION', 'EXTRACTING', 'EXTRACTED', 'WAITING_REVIEW', 'APPROVED', 'PUBLISHED', 'ERROR');
CREATE TYPE "OfficialResolutionStatus" AS ENUM ('NOT_GENERATED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

CREATE TABLE "official_sources" (
  "id" TEXT NOT NULL,
  "vestibular" TEXT NOT NULL,
  "year" INTEGER,
  "edition" TEXT NOT NULL DEFAULT 'regular',
  "exam_day" TEXT,
  "file_type" "OfficialFileType" NOT NULL,
  "source_kind" "OfficialSourceKind" NOT NULL DEFAULT 'DIRECT_FILE',
  "source_url" TEXT NOT NULL,
  "source_domain" TEXT NOT NULL,
  "status" "OfficialSourceStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "approved_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "official_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "official_files" (
  "id" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "vestibular" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "edition" TEXT NOT NULL,
  "exam_day" TEXT,
  "file_type" "OfficialFileType" NOT NULL,
  "original_url" TEXT NOT NULL,
  "storage_url" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "sha256_hash" TEXT NOT NULL,
  "download_status" "OfficialDownloadStatus" NOT NULL DEFAULT 'PENDING',
  "download_log" TEXT NOT NULL DEFAULT '',
  "processing_status" "OfficialProcessingStatus" NOT NULL DEFAULT 'FILE_DOWNLOADED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "official_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "official_answer_keys" (
  "id" TEXT NOT NULL,
  "file_id" TEXT NOT NULL,
  "question_number" INTEGER NOT NULL,
  "correct_alternative" TEXT NOT NULL,
  "statement" TEXT,
  "subject" TEXT,
  "topic" TEXT,
  "difficulty" "Difficulty",
  "official_question_url" TEXT,
  "short_comment" TEXT,
  "full_resolution" TEXT,
  "steps" TEXT NOT NULL DEFAULT '[]',
  "alternative_comments" TEXT NOT NULL DEFAULT '{}',
  "common_error" TEXT,
  "study_tip" TEXT,
  "related_content" TEXT,
  "resolution_status" "OfficialResolutionStatus" NOT NULL DEFAULT 'NOT_GENERATED',
  "generated_by_model" TEXT,
  "generated_at" TIMESTAMP(3),
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "official_answer_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "official_import_logs" (
  "id" TEXT NOT NULL,
  "source_id" TEXT,
  "file_id" TEXT,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "official_import_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "official_sources_source_url_key" ON "official_sources"("source_url");
CREATE INDEX "official_sources_vestibular_year_idx" ON "official_sources"("vestibular", "year");
CREATE INDEX "official_sources_status_source_kind_idx" ON "official_sources"("status", "source_kind");
CREATE UNIQUE INDEX "official_files_sha256_hash_key" ON "official_files"("sha256_hash");
CREATE INDEX "official_files_source_id_download_status_idx" ON "official_files"("source_id", "download_status");
CREATE INDEX "official_files_vestibular_year_file_type_idx" ON "official_files"("vestibular", "year", "file_type");
CREATE INDEX "official_files_processing_status_idx" ON "official_files"("processing_status");
CREATE UNIQUE INDEX "official_answer_keys_file_id_question_number_key" ON "official_answer_keys"("file_id", "question_number");
CREATE INDEX "official_answer_keys_resolution_status_updated_at_idx" ON "official_answer_keys"("resolution_status", "updated_at");
CREATE INDEX "official_import_logs_source_id_created_at_idx" ON "official_import_logs"("source_id", "created_at");
CREATE INDEX "official_import_logs_file_id_created_at_idx" ON "official_import_logs"("file_id", "created_at");

ALTER TABLE "official_files" ADD CONSTRAINT "official_files_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "official_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "official_answer_keys" ADD CONSTRAINT "official_answer_keys_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "official_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "official_import_logs" ADD CONSTRAINT "official_import_logs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "official_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "official_import_logs" ADD CONSTRAINT "official_import_logs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "official_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
