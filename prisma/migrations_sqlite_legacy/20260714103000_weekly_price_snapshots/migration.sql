-- Weekly imports use a single exact Monday source date so records from
-- different dates can never be mixed into one catalog review batch.
ALTER TABLE "PriceImportBatch" ADD COLUMN "snapshotDate" DATETIME;

CREATE INDEX "PriceImportBatch_storeId_snapshotDate_status_idx"
ON "PriceImportBatch"("storeId", "snapshotDate", "status");
