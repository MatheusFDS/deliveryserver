-- DropIndex
DROP INDEX "AccountsPayable_deliveryId_key";

-- AlterTable
ALTER TABLE "AccountsPayable" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AccountsPayable_tenantId_idx" ON "AccountsPayable"("tenantId");

-- CreateIndex
CREATE INDEX "AccountsPayable_motoristaId_idx" ON "AccountsPayable"("motoristaId");

-- CreateIndex
CREATE INDEX "AccountsPayable_deliveryId_idx" ON "AccountsPayable"("deliveryId");
