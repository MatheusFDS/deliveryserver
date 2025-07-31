-- CreateTable
CREATE TABLE "Directions" (
    "id" SERIAL NOT NULL,
    "rangeInicio" TEXT NOT NULL,
    "rangeFim" TEXT NOT NULL,
    "valorDirecao" TEXT NOT NULL,
    "regiao" TEXT NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Directions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Directions" ADD CONSTRAINT "Directions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
