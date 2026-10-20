-- Retired teaching roles become teachers, without granting administrative privileges.
DELETE FROM "AuthSession" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role"::text IN ('MENTOR', 'COORDINATOR'));
UPDATE "User" SET "role" = 'TEACHER' WHERE "role"::text IN ('MENTOR', 'COORDINATOR');
CREATE TYPE "Role_new" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
