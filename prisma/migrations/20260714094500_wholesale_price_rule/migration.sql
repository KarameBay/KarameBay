-- Record whether a staged market price is retail or wholesale and preserve
-- the pricing rule used to generate the admin's proposed selling price.
ALTER TABLE "PriceImportRecord" ADD COLUMN "priceType" TEXT NOT NULL DEFAULT 'RETAIL';
ALTER TABLE "PriceImportRecord" ADD COLUMN "pricingRule" TEXT;

CREATE INDEX "PriceImportRecord_storeId_priceType_priceDate_idx"
ON "PriceImportRecord"("storeId", "priceType", "priceDate");
