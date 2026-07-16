-- AlterTable
ALTER TABLE "MarketplaceProduct" ADD COLUMN "normalizedName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MarketplaceProduct" ADD COLUMN "referenceMarketPriceRwf" INTEGER;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "sourceExternalId" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "lastImportedAt" DATETIME;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "lastApprovedAt" DATETIME;

-- CreateTable
CREATE TABLE "PriceImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "targetMarket" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "matchedProducts" INTEGER NOT NULL DEFAULT 0,
    "newProducts" INTEGER NOT NULL DEFAULT 0,
    "priceChanges" INTEGER NOT NULL DEFAULT 0,
    "unchangedProducts" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "requiringReview" INTEGER NOT NULL DEFAULT 0,
    "acceptedRecords" INTEGER NOT NULL DEFAULT 0,
    "rejectedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "PriceImportBatch_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceImportBatch_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PriceImportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "externalSourceId" TEXT,
    "externalCommodityId" TEXT,
    "marketName" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "commodityName" TEXT NOT NULL,
    "normalizedCommodityName" TEXT NOT NULL,
    "categoryName" TEXT,
    "unit" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "importedPriceRwf" INTEGER,
    "minimumPriceRwf" INTEGER,
    "maximumPriceRwf" INTEGER,
    "averagePriceRwf" INTEGER,
    "priceDate" DATETIME,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "matchStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "matchedProductId" TEXT,
    "proposedAction" TEXT NOT NULL DEFAULT 'KEEP_CURRENT',
    "proposedSellingPriceRwf" INTEGER,
    "markupPercent" REAL,
    "fixedAmountRwf" INTEGER,
    "reviewNote" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rawSourcePayload" TEXT NOT NULL,
    CONSTRAINT "PriceImportRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PriceImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceImportRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceImportRecord_matchedProductId_fkey" FOREIGN KEY ("matchedProductId") REFERENCES "MarketplaceProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceImportRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "MarketplacePriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "importRecordId" TEXT NOT NULL,
    "oldPriceRwf" INTEGER,
    "newPriceRwf" INTEGER NOT NULL,
    "sourcePriceRwf" INTEGER,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedAt" DATETIME NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplacePriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketplacePriceHistory_importRecordId_fkey" FOREIGN KEY ("importRecordId") REFERENCES "PriceImportRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketplacePriceHistory_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CommodityAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommodityAlias_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommodityAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PriceImportRecord_sourceKey_key" ON "PriceImportRecord"("sourceKey");
CREATE INDEX "PriceImportBatch_storeId_startedAt_idx" ON "PriceImportBatch"("storeId", "startedAt");
CREATE INDEX "PriceImportBatch_status_startedAt_idx" ON "PriceImportBatch"("status", "startedAt");
CREATE INDEX "PriceImportBatch_startedById_startedAt_idx" ON "PriceImportBatch"("startedById", "startedAt");
CREATE INDEX "PriceImportRecord_batchId_importStatus_idx" ON "PriceImportRecord"("batchId", "importStatus");
CREATE INDEX "PriceImportRecord_storeId_normalizedCommodityName_unit_idx" ON "PriceImportRecord"("storeId", "normalizedCommodityName", "unit");
CREATE INDEX "PriceImportRecord_matchedProductId_matchStatus_idx" ON "PriceImportRecord"("matchedProductId", "matchStatus");
CREATE INDEX "PriceImportRecord_approvedById_approvedAt_idx" ON "PriceImportRecord"("approvedById", "approvedAt");
CREATE UNIQUE INDEX "MarketplacePriceHistory_importRecordId_key" ON "MarketplacePriceHistory"("importRecordId");
CREATE INDEX "MarketplacePriceHistory_productId_effectiveAt_idx" ON "MarketplacePriceHistory"("productId", "effectiveAt");
CREATE INDEX "MarketplacePriceHistory_approvedById_approvedAt_idx" ON "MarketplacePriceHistory"("approvedById", "approvedAt");
CREATE UNIQUE INDEX "CommodityAlias_storeId_normalizedAlias_key" ON "CommodityAlias"("storeId", "normalizedAlias");
CREATE INDEX "CommodityAlias_productId_idx" ON "CommodityAlias"("productId");
CREATE INDEX "MarketplaceProduct_storeId_normalizedName_idx" ON "MarketplaceProduct"("storeId", "normalizedName");
CREATE INDEX "MarketplaceProduct_storeId_sourceType_sourceExternalId_idx" ON "MarketplaceProduct"("storeId", "sourceType", "sourceExternalId");
