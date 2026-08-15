ALTER TABLE "Question"
  ADD COLUMN "pilotTestPublishedAt" TIMESTAMP(3),
  ADD COLUMN "pilotTestPublishedBy" TEXT;

ALTER TABLE "provas_antigas"
  ADD COLUMN "pilot_test_available_at" TIMESTAMP(3),
  ADD COLUMN "pilot_test_previous_status" "ProvaAntigaStatus";

CREATE INDEX "Question_pilotTestPublishedAt_idx"
  ON "Question"("pilotTestPublishedAt");
