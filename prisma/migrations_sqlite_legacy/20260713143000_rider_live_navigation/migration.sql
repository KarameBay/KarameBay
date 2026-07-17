-- Persist the latest rider navigation snapshot per order so customer and admin
-- tracking can read one indexed row instead of replaying GPS history.
ALTER TABLE "Order" ADD COLUMN "riderCurrentLatitude" REAL;
ALTER TABLE "Order" ADD COLUMN "riderCurrentLongitude" REAL;
ALTER TABLE "Order" ADD COLUMN "riderLocationAccuracyM" REAL;
ALTER TABLE "Order" ADD COLUMN "riderHeadingDegrees" REAL;
ALTER TABLE "Order" ADD COLUMN "riderSpeedMps" REAL;
ALTER TABLE "Order" ADD COLUMN "riderLocationUpdatedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "riderRoutePhase" TEXT;
ALTER TABLE "Order" ADD COLUMN "riderRouteJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Order" ADD COLUMN "remainingDistanceM" INTEGER;
ALTER TABLE "Order" ADD COLUMN "remainingDurationS" INTEGER;

CREATE INDEX "Order_riderId_riderLocationUpdatedAt_idx"
ON "Order"("riderId", "riderLocationUpdatedAt");
