/*
  Warnings:

  - You are about to drop the column `motoristaId` on the `AccountsPayable` table. All the data in the column will be lost.
  - The `status` column on the `AccountsPayable` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `motoristaId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `veiculoId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `routeData` on the `OptimizedRoute` table. All the data in the column will be lost.
  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[name,tenantId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `driverId` to the `AccountsPayable` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `action` on the `Approval` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `driverId` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleId` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Delivery` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `provider` to the `OptimizedRoute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerData` to the `OptimizedRoute` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('SEM_ROTA', 'EM_ROTA_AGUARDANDO_LIBERACAO', 'EM_ROTA', 'EM_ENTREGA', 'ENTREGUE', 'NAO_ENTREGUE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('A_LIBERAR', 'INICIADO', 'FINALIZADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVED', 'REJECTED', 'RE_APPROVAL_NEEDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDENTE', 'PAGO', 'BAIXADO', 'CANCELADO');

-- DropForeignKey
ALTER TABLE "AccountsPayable" DROP CONSTRAINT "AccountsPayable_motoristaId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_motoristaId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_veiculoId_fkey";

-- DropForeignKey
ALTER TABLE "UserSettings" DROP CONSTRAINT "UserSettings_userId_fkey";

-- AlterTable
ALTER TABLE "AccountsPayable" DROP COLUMN "motoristaId",
ADD COLUMN     "driverId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDENTE';

-- AlterTable
ALTER TABLE "Approval" DROP COLUMN "action",
ADD COLUMN     "action" "ApprovalAction" NOT NULL;

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "motoristaId",
DROP COLUMN "veiculoId",
ADD COLUMN     "driverId" TEXT NOT NULL,
ADD COLUMN     "vehicleId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "DeliveryStatus" NOT NULL;

-- AlterTable
ALTER TABLE "OptimizedRoute" DROP COLUMN "routeData",
ADD COLUMN     "provider" TEXT NOT NULL,
ADD COLUMN     "providerData" JSONB NOT NULL,
ALTER COLUMN "totalDistance" DROP NOT NULL,
ALTER COLUMN "totalTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'SEM_ROTA';

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_tenantId_key" ON "Category"("name", "tenantId");

-- CreateIndex
CREATE INDEX "Delivery_tenantId_idx" ON "Delivery"("tenantId");

-- CreateIndex
CREATE INDEX "Delivery_driverId_idx" ON "Delivery"("driverId");

-- CreateIndex
CREATE INDEX "Directions_tenantId_idx" ON "Directions"("tenantId");

-- CreateIndex
CREATE INDEX "Driver_tenantId_idx" ON "Driver"("tenantId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_idx" ON "Vehicle"("tenantId");

-- CreateIndex
CREATE INDEX "Vehicle_driverId_idx" ON "Vehicle"("driverId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
