-- CreateTable
CREATE TABLE "RiderProfile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "photoUrl" TEXT,
    "vehicleType" TEXT NOT NULL DEFAULT 'MOTORCYCLE',
    "licensePlate" TEXT,
    "riderStatus" TEXT NOT NULL DEFAULT 'OFFLINE',
    "currentLatitude" REAL,
    "currentLongitude" REAL,
    "currentLocationLabel" TEXT,
    "onlineSinceAt" DATETIME,
    "lastSeenAt" DATETIME,
    "rating" REAL NOT NULL DEFAULT 0,
    "averageDeliveryMinutes" REAL NOT NULL DEFAULT 0,
    "averagePickupMinutes" REAL NOT NULL DEFAULT 0,
    "completedDeliveriesCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledDeliveriesCount" INTEGER NOT NULL DEFAULT 0,
    "totalEarningsRwf" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RiderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiderAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "assignedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    "pickedUpAt" DATETIME,
    "onTheWayAt" DATETIME,
    "deliveredAt" DATETIME,
    "completedAt" DATETIME,
    "note" TEXT,
    CONSTRAINT "RiderAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RiderAssignment_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RiderAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "riderAssignmentMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "RiderProfile_riderStatus_idx" ON "RiderProfile"("riderStatus");

-- CreateIndex
CREATE INDEX "RiderProfile_vehicleType_idx" ON "RiderProfile"("vehicleType");

-- CreateIndex
CREATE INDEX "RiderAssignment_orderId_assignedAt_idx" ON "RiderAssignment"("orderId", "assignedAt");

-- CreateIndex
CREATE INDEX "RiderAssignment_riderId_assignedAt_idx" ON "RiderAssignment"("riderId", "assignedAt");

-- CreateIndex
CREATE INDEX "RiderAssignment_assignedById_assignedAt_idx" ON "RiderAssignment"("assignedById", "assignedAt");
