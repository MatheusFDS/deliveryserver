/*
  Warnings:

  - A unique constraint covering the columns `[deliveryId]` on the table `AccountsPayable` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AccountsPayable_deliveryId_key" ON "AccountsPayable"("deliveryId");
