-- Selecting a study objective is free; full preparation access requires a purchase.
-- Preserve purchased, manual and promotional access. Revoke only legacy automatic free grants.
UPDATE "Preparation" SET "isFree" = false WHERE "slug" IN ('enem-2027', 'oab-1-fase');
UPDATE "Entitlement" e SET "revokedAt" = CURRENT_TIMESTAMP
FROM "Preparation" p
WHERE e."preparationId" = p."id"
  AND p."slug" IN ('enem-2027', 'oab-1-fase')
  AND e."sourceKey" = 'free:' || p."id"
  AND e."sourceType" = 'PROMOTION'
  AND e."purchaseId" IS NULL AND e."revokedAt" IS NULL;
