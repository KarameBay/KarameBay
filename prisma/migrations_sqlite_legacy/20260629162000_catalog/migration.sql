ALTER TABLE "Store" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN "estimatedDeliveryMinutes" INTEGER NOT NULL DEFAULT 35;

CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_sortOrder_name_idx" ON "Category"("sortOrder", "name");

CREATE TABLE "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sku" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceRwf" INTEGER NOT NULL,
  "unitLabel" TEXT,
  "imageUrl" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Product_storeId_slug_key" ON "Product"("storeId", "slug");
CREATE UNIQUE INDEX "Product_storeId_sku_key" ON "Product"("storeId", "sku");
CREATE INDEX "Product_storeId_isAvailable_categoryId_idx" ON "Product"("storeId", "isAvailable", "categoryId");
CREATE INDEX "Product_storeId_name_idx" ON "Product"("storeId", "name");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
