ALTER TABLE "Achievement"
  ADD COLUMN IF NOT EXISTS "lockedDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS "rarity" TEXT NOT NULL DEFAULT 'COMMON',
  ADD COLUMN IF NOT EXISTS "metric" TEXT NOT NULL DEFAULT 'questions',
  ADD COLUMN IF NOT EXISTS "target" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "requirement" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "subjectId" TEXT,
  ADD COLUMN IF NOT EXISTS "examId" TEXT,
  ADD COLUMN IF NOT EXISTS "contentId" TEXT,
  ADD COLUMN IF NOT EXISTS "coinReward" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "titleReward" TEXT,
  ADD COLUMN IF NOT EXISTS "cosmeticReward" TEXT,
  ADD COLUMN IF NOT EXISTS "iconKey" TEXT NOT NULL DEFAULT 'trophy',
  ADD COLUMN IF NOT EXISTS "iconDescription" TEXT NOT NULL DEFAULT 'Emblema original do EstudAki.',
  ADD COLUMN IF NOT EXISTS "unlockedIconPath" TEXT,
  ADD COLUMN IF NOT EXISTS "lockedIconPath" TEXT,
  ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isRepeatable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "UserAchievement"
  ADD COLUMN IF NOT EXISTS "rewardClaimed" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Achievement_category_status_idx" ON "Achievement"("category", "status");
CREATE INDEX IF NOT EXISTS "Achievement_metric_status_idx" ON "Achievement"("metric", "status");
CREATE INDEX IF NOT EXISTS "Achievement_rarity_status_idx" ON "Achievement"("rarity", "status");
CREATE INDEX IF NOT EXISTS "UserAchievement_user_unlocked_idx" ON "UserAchievement"("userId", "unlockedAt");
