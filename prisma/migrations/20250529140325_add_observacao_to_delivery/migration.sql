/*
  Warnings:

  - You are about to alter the column `minOrders` on the `Tenant` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[numero,tenantId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Approval" DROP CONSTRAINT "Approval_deliveryId_fkey";

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "observacao" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "codigoMotivoNaoEntrega" TEXT,
ADD COLUMN     "motivoNaoEntrega" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "minOrders" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE INDEX "Approval_deliveryId_idx" ON "Approval"("deliveryId");

-- CreateIndex
CREATE INDEX "Approval_userId_idx" ON "Approval"("userId");

-- CreateIndex
CREATE INDEX "Order_deliveryId_idx" ON "Order"("deliveryId");

-- CreateIndex
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_numero_tenantId_key" ON "Order"("numero", "tenantId");

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
