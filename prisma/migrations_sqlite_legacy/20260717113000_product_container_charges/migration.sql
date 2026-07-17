ALTER TABLE "RestaurantProduct" ADD COLUMN "containerChargePerUnitRwf" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RestaurantProduct" ADD COLUMN "containerChargeFlatRwf" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "containerChargePerUnitRwf" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "containerChargeFlatRwf" INTEGER NOT NULL DEFAULT 0;
