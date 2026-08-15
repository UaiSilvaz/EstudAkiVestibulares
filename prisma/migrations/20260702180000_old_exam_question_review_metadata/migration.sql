ALTER TABLE "prova_antiga_questoes"
ADD COLUMN "extracted_statement" TEXT,
ADD COLUMN "extraction_confidence" DOUBLE PRECISION,
ADD COLUMN "page_start" INTEGER,
ADD COLUMN "page_end" INTEGER,
ADD COLUMN "has_image" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "needs_human_review" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "provas_antigas"
ADD COLUMN "official_exam_file_id" TEXT,
ADD COLUMN "official_key_file_id" TEXT,
ADD COLUMN "file_hash" TEXT;

CREATE UNIQUE INDEX "provas_antigas_official_exam_file_id_key" ON "provas_antigas"("official_exam_file_id");
CREATE UNIQUE INDEX "provas_antigas_official_key_file_id_key" ON "provas_antigas"("official_key_file_id");

ALTER TABLE "provas_antigas" ADD CONSTRAINT "provas_antigas_official_exam_file_id_fkey" FOREIGN KEY ("official_exam_file_id") REFERENCES "official_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "provas_antigas" ADD CONSTRAINT "provas_antigas_official_key_file_id_fkey" FOREIGN KEY ("official_key_file_id") REFERENCES "official_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
