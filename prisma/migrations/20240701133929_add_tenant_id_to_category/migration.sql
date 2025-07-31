-- AlterTable
ALTER TABLE "Category" ADD COLUMN "tenantId" INTEGER;

-- Defina um valor padrão temporário para tenantId
UPDATE "Category" SET "tenantId" = 1 WHERE "tenantId" IS NULL;

-- Adicione uma restrição NOT NULL depois de definir os valores padrão
ALTER TABLE "Category" ALTER COLUMN "tenantId" SET NOT NULL;

-- Adicionar a relação com a tabela Tenant
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AccountsPayable" (
    "id" SERIAL NOT NULL,
    "deliveryId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountsPayable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
