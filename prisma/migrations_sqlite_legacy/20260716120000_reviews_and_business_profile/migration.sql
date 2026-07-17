-- Central business contact configuration used by all public support surfaces.
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'business',
    "businessName" TEXT NOT NULL DEFAULT 'Karame Bay',
    "supportEmail" TEXT NOT NULL DEFAULT 'karamebay3@gmail.com',
    "supportPhone" TEXT NOT NULL DEFAULT '+250789950707',
    "whatsappNumber" TEXT NOT NULL DEFAULT '+250789950707',
    "businessAddress" TEXT NOT NULL DEFAULT 'Gikondo, Kigali, Rwanda',
    "businessHours" TEXT NOT NULL DEFAULT 'Open daily, 24 hours',
    "instagramUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "BusinessProfile" (
    "id", "businessName", "supportEmail", "supportPhone", "whatsappNumber",
    "businessAddress", "businessHours", "instagramUrl", "updatedAt"
) VALUES (
    'business', 'Karame Bay', 'karamebay3@gmail.com', '+250789950707',
    '+250789950707', 'Gikondo, Kigali, Rwanda', 'Open daily, 24 hours',
    'https://www.instagram.com/karame_transport_delivery?igsh=bHh4Mjdya2M2c2lp', CURRENT_TIMESTAMP
);

-- One verified review per delivered order, with independent store and rider scores.
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "riderId" TEXT,
    "storeRating" INTEGER NOT NULL,
    "writtenReview" TEXT,
    "foodQualityRating" INTEGER,
    "packagingRating" INTEGER,
    "orderAccuracyRating" INTEGER,
    "riderOverallRating" INTEGER,
    "friendlinessRating" INTEGER,
    "deliverySpeedRating" INTEGER,
    "professionalismRating" INTEGER,
    "riderComment" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'VISIBLE',
    "moderationReason" TEXT,
    "moderatedById" TEXT,
    "moderatedAt" DATETIME,
    "adminReply" TEXT,
    "adminRepliedAt" DATETIME,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "photoUrlsJson" TEXT NOT NULL DEFAULT '[]',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "editableUntil" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");
CREATE INDEX "Review_storeId_moderationStatus_createdAt_idx" ON "Review"("storeId", "moderationStatus", "createdAt");
CREATE INDEX "Review_riderId_moderationStatus_createdAt_idx" ON "Review"("riderId", "moderationStatus", "createdAt");
CREATE INDEX "Review_customerId_createdAt_idx" ON "Review"("customerId", "createdAt");
CREATE INDEX "Review_moderationStatus_createdAt_idx" ON "Review"("moderationStatus", "createdAt");
