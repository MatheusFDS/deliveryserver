/*
  Warnings:

  - A unique constraint covering the columns `[mobileDomain]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "mobileDomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_mobileDomain_key" ON "Tenant"("mobileDomain");
