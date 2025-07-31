/*
  Warnings:

  - You are about to drop the column `endDate` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `totalValue` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `totalWeight` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the `Direction` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `totalPeso` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalValor` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `veiculoId` to the `Delivery` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_vehicleId_fkey";

-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "valor" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "endDate",
DROP COLUMN "startDate",
DROP COLUMN "totalValue",
DROP COLUMN "totalWeight",
DROP COLUMN "vehicleId",
ADD COLUMN     "dataFim" TIMESTAMP(3),
ADD COLUMN     "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "totalPeso" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalValor" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "veiculoId" INTEGER NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "Direction";

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

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
