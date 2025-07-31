-- AlterTable
ALTER TABLE "AccountsPayable" ADD COLUMN "motoristaId" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
