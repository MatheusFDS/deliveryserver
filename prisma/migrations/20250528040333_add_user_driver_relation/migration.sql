/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
