-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_groupedPaymentId_fkey" FOREIGN KEY ("groupedPaymentId") REFERENCES "AccountsPayable"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
