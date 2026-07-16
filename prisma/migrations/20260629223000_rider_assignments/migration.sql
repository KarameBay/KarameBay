ALTER TABLE "Order" ADD COLUMN "riderId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Order_riderId_status_createdAt_idx" ON "Order"("riderId", "status", "createdAt");
