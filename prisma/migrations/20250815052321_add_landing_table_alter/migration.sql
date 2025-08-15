/*
  Warnings:

  - You are about to drop the column `fleetSize` on the `leads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "leads" DROP COLUMN "fleetSize",
ADD COLUMN     "cnpj" TEXT NOT NULL DEFAULT '';
