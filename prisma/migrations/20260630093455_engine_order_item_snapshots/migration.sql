-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "restaurantProductId" TEXT,
    "marketplaceProductId" TEXT,
    "catalogEngine" TEXT NOT NULL DEFAULT 'LEGACY',
    "productName" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "unitPriceRwf" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalRwf" INTEGER NOT NULL,
    "variantName" TEXT,
    "customizationsJson" TEXT NOT NULL DEFAULT '[]',
    "specialInstructions" TEXT,
    "unitLabel" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_restaurantProductId_fkey" FOREIGN KEY ("restaurantProductId") REFERENCES "RestaurantProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_marketplaceProductId_fkey" FOREIGN KEY ("marketplaceProductId") REFERENCES "MarketplaceProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "lineTotalRwf", "orderId", "productId", "productImageUrl", "productName", "quantity", "unitPriceRwf") SELECT "id", "lineTotalRwf", "orderId", "productId", "productImageUrl", "productName", "quantity", "unitPriceRwf" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "OrderItem_restaurantProductId_idx" ON "OrderItem"("restaurantProductId");
CREATE INDEX "OrderItem_marketplaceProductId_idx" ON "OrderItem"("marketplaceProductId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
