/*
  Warnings:

  - A unique constraint covering the columns `[code,tenantId]` on the table `AccountsPayable` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,tenantId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,tenantId]` on the table `Delivery` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,tenantId]` on the table `Directions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,tenantId]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,tenantId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,tenantId]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AccountsPayable" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Directions" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "code" TEXT;

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sequence_tenantId_idx" ON "Sequence"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_entityType_tenantId_key" ON "Sequence"("entityType", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsPayable_code_tenantId_key" ON "AccountsPayable"("code", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_tenantId_key" ON "Category"("code", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_code_tenantId_key" ON "Delivery"("code", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Directions_code_tenantId_key" ON "Directions"("code", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_code_tenantId_key" ON "Driver"("code", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_code_tenantId_key" ON "User"("code", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_code_tenantId_key" ON "Vehicle"("code", "tenantId");

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
