-- Preserve existing purchases, progress and achievement indexes.
ALTER TABLE "Product" DROP CONSTRAINT "Product_materialId_fkey";
ALTER TABLE "Product" ALTER COLUMN "materialId" DROP NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ALTER COLUMN "league" SET DEFAULT 'Aluno';
ALTER TABLE "UserProduct" ADD COLUMN "revokedAt" TIMESTAMP(3);
