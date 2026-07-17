-- CreateTable
CREATE TABLE "RestaurantProfile" (
    "storeId" TEXT NOT NULL PRIMARY KEY,
    "acceptsSpecialInstructions" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RestaurantCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "basePriceRwf" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "seasonal" BOOLEAN NOT NULL DEFAULT false,
    "preparationMinutes" INTEGER,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "allergensJson" TEXT NOT NULL DEFAULT '[]',
    "dietaryLabelsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RestaurantCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceRwf" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RestaurantVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RestaurantProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantChoiceGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minChoices" INTEGER NOT NULL DEFAULT 0,
    "maxChoices" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RestaurantChoiceGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RestaurantProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantChoiceOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAdjustmentRwf" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RestaurantChoiceOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RestaurantChoiceGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantAddOn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "priceRwf" INTEGER NOT NULL,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "RestaurantAddOn_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantProductAddOn" (
    "productId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("productId", "addOnId"),
    CONSTRAINT "RestaurantProductAddOn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RestaurantProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantProductAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "RestaurantAddOn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantComboComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comboProductId" TEXT NOT NULL,
    "includedProductId" TEXT,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "swappable" BOOLEAN NOT NULL DEFAULT false,
    "upgradePriceRwf" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RestaurantComboComponent_comboProductId_fkey" FOREIGN KEY ("comboProductId") REFERENCES "RestaurantProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantComboComponent_includedProductId_fkey" FOREIGN KEY ("includedProductId") REFERENCES "RestaurantProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceProfile" (
    "storeId" TEXT NOT NULL PRIMARY KEY,
    "tracksInventory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketplaceProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MarketplaceDepartment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MarketplaceCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "MarketplaceDepartment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketplaceCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "brand" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "discountType" TEXT,
    "discountValue" INTEGER,
    "discountStartsAt" DATETIME,
    "discountEndsAt" DATETIME,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketplaceProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceProduct_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "MarketplaceDepartment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceProductUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "packSize" REAL NOT NULL DEFAULT 1,
    "priceRwf" INTEGER NOT NULL,
    "allowsDecimal" BOOLEAN NOT NULL DEFAULT false,
    "minimumQuantity" REAL NOT NULL DEFAULT 1,
    "quantityStep" REAL NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MarketplaceProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceInventory" (
    "productId" TEXT NOT NULL PRIMARY KEY,
    "stockQuantity" REAL NOT NULL DEFAULT 0,
    "lowStockThreshold" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketplaceInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceInventoryMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "unitId" TEXT,
    "quantityChange" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceInventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceInventoryMovement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MarketplaceProductUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "catalogEngine" TEXT NOT NULL DEFAULT 'MARKETPLACE',
    "description" TEXT NOT NULL,
    "phone" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "estimatedDeliveryMinutes" INTEGER NOT NULL DEFAULT 35,
    "address" TEXT NOT NULL DEFAULT '',
    "rating" REAL NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "minimumOrderRwf" INTEGER NOT NULL DEFAULT 0,
    "preparationMinutes" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Store" ("closesAt", "coverUrl", "createdAt", "description", "estimatedDeliveryMinutes", "id", "isOpen", "latitude", "logoUrl", "longitude", "name", "opensAt", "ownerId", "phone", "slug", "status", "type", "updatedAt") SELECT "closesAt", "coverUrl", "createdAt", "description", "estimatedDeliveryMinutes", "id", "isOpen", "latitude", "logoUrl", "longitude", "name", "opensAt", "ownerId", "phone", "slug", "status", "type", "updatedAt" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE INDEX "Store_status_isOpen_idx" ON "Store"("status", "isOpen");
CREATE INDEX "Store_catalogEngine_status_isOpen_idx" ON "Store"("catalogEngine", "status", "isOpen");
CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RestaurantCategory_storeId_parentId_sortOrder_idx" ON "RestaurantCategory"("storeId", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantCategory_storeId_slug_key" ON "RestaurantCategory"("storeId", "slug");

-- CreateIndex
CREATE INDEX "RestaurantProduct_storeId_isAvailable_categoryId_idx" ON "RestaurantProduct"("storeId", "isAvailable", "categoryId");

-- CreateIndex
CREATE INDEX "RestaurantProduct_storeId_name_idx" ON "RestaurantProduct"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantProduct_storeId_slug_key" ON "RestaurantProduct"("storeId", "slug");

-- CreateIndex
CREATE INDEX "RestaurantVariant_productId_sortOrder_idx" ON "RestaurantVariant"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantVariant_productId_name_key" ON "RestaurantVariant"("productId", "name");

-- CreateIndex
CREATE INDEX "RestaurantChoiceGroup_productId_sortOrder_idx" ON "RestaurantChoiceGroup"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "RestaurantChoiceOption_groupId_sortOrder_idx" ON "RestaurantChoiceOption"("groupId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantChoiceOption_groupId_name_key" ON "RestaurantChoiceOption"("groupId", "name");

-- CreateIndex
CREATE INDEX "RestaurantAddOn_storeId_isAvailable_idx" ON "RestaurantAddOn"("storeId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantAddOn_storeId_name_key" ON "RestaurantAddOn"("storeId", "name");

-- CreateIndex
CREATE INDEX "RestaurantProductAddOn_addOnId_idx" ON "RestaurantProductAddOn"("addOnId");

-- CreateIndex
CREATE INDEX "RestaurantComboComponent_comboProductId_sortOrder_idx" ON "RestaurantComboComponent"("comboProductId", "sortOrder");

-- CreateIndex
CREATE INDEX "RestaurantComboComponent_includedProductId_idx" ON "RestaurantComboComponent"("includedProductId");

-- CreateIndex
CREATE INDEX "MarketplaceDepartment_storeId_sortOrder_idx" ON "MarketplaceDepartment"("storeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceDepartment_storeId_slug_key" ON "MarketplaceDepartment"("storeId", "slug");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_departmentId_parentId_sortOrder_idx" ON "MarketplaceCategory"("departmentId", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCategory_departmentId_slug_key" ON "MarketplaceCategory"("departmentId", "slug");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_storeId_isAvailable_departmentId_categoryId_idx" ON "MarketplaceProduct"("storeId", "isAvailable", "departmentId", "categoryId");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_storeId_name_idx" ON "MarketplaceProduct"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProduct_storeId_slug_key" ON "MarketplaceProduct"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProduct_storeId_sku_key" ON "MarketplaceProduct"("storeId", "sku");

-- CreateIndex
CREATE INDEX "MarketplaceProductUnit_productId_isDefault_idx" ON "MarketplaceProductUnit"("productId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProductUnit_productId_label_key" ON "MarketplaceProductUnit"("productId", "label");

-- CreateIndex
CREATE INDEX "MarketplaceInventoryMovement_productId_createdAt_idx" ON "MarketplaceInventoryMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceInventoryMovement_unitId_idx" ON "MarketplaceInventoryMovement"("unitId");
