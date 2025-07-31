/*
  Warnings:

  - You are about to drop the column `value` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `dataFim` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `dataInicio` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `totalPeso` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `totalValor` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `veiculoId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the `Directions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `totalValue` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalWeight` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleId` to the `Delivery` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_veiculoId_fkey";

-- DropForeignKey
ALTER TABLE "Directions" DROP CONSTRAINT "Directions_tenantId_fkey";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "value",
ALTER COLUMN "valor" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "dataFim",
DROP COLUMN "dataInicio",
DROP COLUMN "totalPeso",
DROP COLUMN "totalValor",
DROP COLUMN "veiculoId",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "totalValue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalWeight" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "vehicleId" INTEGER NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'Em rota';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Directions";

-- CreateTable
CREATE TABLE "Direction" (
    "id" SERIAL NOT NULL,
    "rangeInicio" TEXT NOT NULL,
    "rangeFim" TEXT NOT NULL,
    "valorDirecao" DOUBLE PRECISION NOT NULL,
    "regiao" TEXT NOT NULL,

    CONSTRAINT "Direction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
