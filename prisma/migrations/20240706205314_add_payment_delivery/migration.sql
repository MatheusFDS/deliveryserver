/*
  Warnings:

  - You are about to drop the column `deliveryId` on the `AccountsPayable` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "AccountsPayable" DROP CONSTRAINT "AccountsPayable_deliveryId_fkey";

-- DropIndex
DROP INDEX "AccountsPayable_deliveryId_idx";

-- DropIndex
DROP INDEX "AccountsPayable_motoristaId_idx";

-- DropIndex
DROP INDEX "AccountsPayable_tenantId_idx";

-- AlterTable
ALTER TABLE "AccountsPayable" DROP COLUMN "deliveryId";

-- AlterTable
ALTER TABLE "UserSettings" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "PaymentDelivery" (
    "paymentId" INTEGER NOT NULL,
    "deliveryId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "PaymentDelivery_pkey" PRIMARY KEY ("paymentId","deliveryId")
);

-- AddForeignKey
ALTER TABLE "PaymentDelivery" ADD CONSTRAINT "PaymentDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDelivery" ADD CONSTRAINT "PaymentDelivery_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "AccountsPayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDelivery" ADD CONSTRAINT "PaymentDelivery_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
