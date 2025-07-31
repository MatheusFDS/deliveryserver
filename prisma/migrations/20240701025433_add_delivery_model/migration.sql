/*
  Warnings:

  - You are about to drop the column `driverId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `motorista` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `veiculo` on the `Delivery` table. All the data in the column will be lost.
  - Added the required column `motoristaId` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `veiculoId` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Made the column `categoryId` on table `Vehicle` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_driverId_fkey";

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "driverId",
DROP COLUMN "motorista",
DROP COLUMN "veiculo",
ADD COLUMN     "dataFim" TIMESTAMP(3),
ADD COLUMN     "motoristaId" INTEGER NOT NULL,
ADD COLUMN     "veiculoId" INTEGER NOT NULL,
ALTER COLUMN "dataInicio" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "categoryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Category" ADD COLUMN "valor" Float NOT NULL DEFAULT 0;
