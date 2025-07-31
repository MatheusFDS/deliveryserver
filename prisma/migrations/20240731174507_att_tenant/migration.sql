/*
  Warnings:

  - You are about to drop the column `databaseSchema` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `databaseUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `domain` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `port` on the `Tenant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "databaseSchema",
DROP COLUMN "databaseUrl",
DROP COLUMN "domain",
DROP COLUMN "port",
ADD COLUMN     "minOrders" DOUBLE PRECISION,
ADD COLUMN     "minPeso" DOUBLE PRECISION,
ADD COLUMN     "minValue" DOUBLE PRECISION;
