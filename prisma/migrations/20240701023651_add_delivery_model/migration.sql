/*
  Warnings:

  - You are about to drop the column `roteiroId` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "roteiroId",
ADD COLUMN     "deliveryId" INTEGER;

-- CreateTable
CREATE TABLE "Delivery" (
    "id" SERIAL NOT NULL,
    "motorista" TEXT NOT NULL,
    "veiculo" TEXT NOT NULL,
    "valorFrete" DOUBLE PRECISION NOT NULL,
    "totalPeso" DOUBLE PRECISION NOT NULL,
    "totalValor" DOUBLE PRECISION NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "categoryId" INTEGER;

-- Create the new category table
CREATE TABLE "Category" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "value" FLOAT NOT NULL
);

-- Create the foreign key constraint after updating existing rows
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
