-- AlterTable
ALTER TABLE "Driver" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "updatedAt" DROP DEFAULT;
