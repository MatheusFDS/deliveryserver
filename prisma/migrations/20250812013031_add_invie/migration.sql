/*
  Warnings:

  - You are about to drop the `UserInvite` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "InviteStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "UserInvite" DROP CONSTRAINT "UserInvite_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserInvite" DROP CONSTRAINT "UserInvite_tenantId_fkey";

-- DropTable
DROP TABLE "UserInvite";

-- CreateTable
CREATE TABLE "user_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "tenantId" TEXT,
    "invitedBy" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invites_email_tenantId_status_key" ON "user_invites"("email", "tenantId", "status");

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
