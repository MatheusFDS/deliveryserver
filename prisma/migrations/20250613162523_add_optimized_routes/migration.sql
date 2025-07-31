-- CreateTable
CREATE TABLE "OptimizedRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startingPoint" TEXT NOT NULL,
    "routeData" TEXT NOT NULL,
    "mapUrl" TEXT,
    "totalDistance" DOUBLE PRECISION NOT NULL,
    "totalTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizedRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OptimizedRoute_tenantId_idx" ON "OptimizedRoute"("tenantId");

-- CreateIndex
CREATE INDEX "OptimizedRoute_createdAt_idx" ON "OptimizedRoute"("createdAt");

-- AddForeignKey
ALTER TABLE "OptimizedRoute" ADD CONSTRAINT "OptimizedRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
