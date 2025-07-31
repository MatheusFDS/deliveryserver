-- CreateTable
CREATE TABLE "InvalidatedToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invalidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvalidatedToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvalidatedToken_token_key" ON "InvalidatedToken"("token");

-- CreateIndex
CREATE INDEX "InvalidatedToken_token_idx" ON "InvalidatedToken"("token");

-- CreateIndex
CREATE INDEX "InvalidatedToken_expiresAt_idx" ON "InvalidatedToken"("expiresAt");
