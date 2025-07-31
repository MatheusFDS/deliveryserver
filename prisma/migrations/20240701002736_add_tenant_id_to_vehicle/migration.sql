-- AlterTable
ALTER TABLE "Driver" ADD COLUMN "cpf" TEXT;
UPDATE "Driver" SET "cpf" = 'default_cpf_value' WHERE "cpf" IS NULL;
ALTER TABLE "Driver" ALTER COLUMN "cpf" SET NOT NULL;

ALTER TABLE "Vehicle" ADD COLUMN "tenantId" INTEGER;
UPDATE "Vehicle" SET "tenantId" = 1 WHERE "tenantId" IS NULL; -- Ajuste para um valor válido de tenantId
ALTER TABLE "Vehicle" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Driver_cpf_tenantId_key" ON "Driver"("cpf", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_tenantId_key" ON "Vehicle"("plate", "tenantId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
