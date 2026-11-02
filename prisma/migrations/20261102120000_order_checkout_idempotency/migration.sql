ALTER TABLE "Order"
ADD COLUMN "checkoutRequestId" TEXT,
ADD COLUMN "checkoutRequestFingerprint" TEXT;

CREATE UNIQUE INDEX "Order_customerId_checkoutRequestId_key"
ON "Order"("customerId", "checkoutRequestId");
