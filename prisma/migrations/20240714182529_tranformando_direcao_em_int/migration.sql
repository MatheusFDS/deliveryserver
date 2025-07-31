/*
  Warnings:

  - Made the column `valorDirecao` on table `Directions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Directions" ALTER COLUMN "valorDirecao" SET NOT NULL;
