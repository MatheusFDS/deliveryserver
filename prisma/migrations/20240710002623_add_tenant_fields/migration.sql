-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "address" TEXT,
ADD COLUMN     "databaseSchema" TEXT,
ADD COLUMN     "databaseUrl" TEXT,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "minDeliveryValue" DOUBLE PRECISION,
ADD COLUMN     "port" INTEGER;
