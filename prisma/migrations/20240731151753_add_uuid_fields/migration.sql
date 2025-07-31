/*
  Warnings:

  - The primary key for the `AccountsPayable` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Approval` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Category` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Delivery` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `DeliveryProof` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Directions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Driver` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Payment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PaymentDelivery` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Role` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Tenant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserSettings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Vehicle` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "AccountsPayable" DROP CONSTRAINT "AccountsPayable_motoristaId_fkey";

-- DropForeignKey
ALTER TABLE "AccountsPayable" DROP CONSTRAINT "AccountsPayable_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Approval" DROP CONSTRAINT "Approval_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "Approval" DROP CONSTRAINT "Approval_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Approval" DROP CONSTRAINT "Approval_userId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_motoristaId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_veiculoId_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryProof" DROP CONSTRAINT "DeliveryProof_driverId_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryProof" DROP CONSTRAINT "DeliveryProof_orderId_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryProof" DROP CONSTRAINT "DeliveryProof_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Directions" DROP CONSTRAINT "Directions_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentDelivery" DROP CONSTRAINT "PaymentDelivery_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentDelivery" DROP CONSTRAINT "PaymentDelivery_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentDelivery" DROP CONSTRAINT "PaymentDelivery_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "UserSettings" DROP CONSTRAINT "UserSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_tenantId_fkey";

-- AlterTable
ALTER TABLE "AccountsPayable" DROP CONSTRAINT "AccountsPayable_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ALTER COLUMN "motoristaId" SET DATA TYPE TEXT,
ALTER COLUMN "groupedPaymentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AccountsPayable_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AccountsPayable_id_seq";

-- AlterTable
ALTER TABLE "Approval" DROP CONSTRAINT "Approval_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "deliveryId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Approval_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Approval_id_seq";

-- AlterTable
ALTER TABLE "Category" DROP CONSTRAINT "Category_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Category_id_seq";

-- AlterTable
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ALTER COLUMN "motoristaId" SET DATA TYPE TEXT,
ALTER COLUMN "veiculoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Delivery_id_seq";

-- AlterTable
ALTER TABLE "DeliveryProof" DROP CONSTRAINT "DeliveryProof_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "orderId" SET DATA TYPE TEXT,
ALTER COLUMN "driverId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "DeliveryProof_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "DeliveryProof_id_seq";

-- AlterTable
ALTER TABLE "Directions" DROP CONSTRAINT "Directions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Directions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Directions_id_seq";

-- AlterTable
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Driver_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Driver_id_seq";

-- AlterTable
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ALTER COLUMN "deliveryId" SET DATA TYPE TEXT,
ALTER COLUMN "driverId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Order_id_seq";

-- AlterTable
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "driverId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Payment_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Payment_id_seq";

-- AlterTable
ALTER TABLE "PaymentDelivery" DROP CONSTRAINT "PaymentDelivery_pkey",
ALTER COLUMN "paymentId" SET DATA TYPE TEXT,
ALTER COLUMN "deliveryId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "PaymentDelivery_pkey" PRIMARY KEY ("paymentId", "deliveryId");

-- AlterTable
ALTER TABLE "Role" DROP CONSTRAINT "Role_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Role_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Role_id_seq";

-- AlterTable
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Tenant_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "roleId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "UserSettings" DROP CONSTRAINT "UserSettings_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "UserSettings_id_seq";

-- AlterTable
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "driverId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ALTER COLUMN "categoryId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Vehicle_id_seq";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Directions" ADD CONSTRAINT "Directions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDelivery" ADD CONSTRAINT "PaymentDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDelivery" ADD CONSTRAINT "PaymentDelivery_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "AccountsPayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDelivery" ADD CONSTRAINT "PaymentDelivery_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProof" ADD CONSTRAINT "DeliveryProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProof" ADD CONSTRAINT "DeliveryProof_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProof" ADD CONSTRAINT "DeliveryProof_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
