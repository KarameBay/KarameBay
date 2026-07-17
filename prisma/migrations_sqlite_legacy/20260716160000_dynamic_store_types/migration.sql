-- Store types are business taxonomy. They are deliberately separate from the
-- two reusable commerce engines so Admin can add new customer sections later.
CREATE TABLE "StoreType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "customerSectionName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "commerceEngine" TEXT NOT NULL,
    "optionalProductFieldsJson" TEXT NOT NULL DEFAULT '[]',
    "stockTrackingRequired" BOOLEAN NOT NULL DEFAULT false,
    "ageConfirmationRequired" BOOLEAN NOT NULL DEFAULT false,
    "productUnitsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "brandsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "departmentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "StoreType_slug_key" ON "StoreType"("slug");
CREATE INDEX "StoreType_isActive_displayOrder_idx" ON "StoreType"("isActive", "displayOrder");
CREATE INDEX "StoreType_commerceEngine_isActive_idx" ON "StoreType"("commerceEngine", "isActive");

INSERT INTO "StoreType" (
    "id", "name", "customerSectionName", "slug", "description", "displayOrder",
    "isActive", "isFeatured", "commerceEngine", "optionalProductFieldsJson",
    "stockTrackingRequired", "ageConfirmationRequired", "productUnitsEnabled",
    "brandsEnabled", "departmentsEnabled", "updatedAt"
) VALUES (
    'storetype-restaurant', 'Restaurant', 'Restaurants', 'restaurants',
    'Prepared meals, coffee, and restaurant menus.', 10, true, true, 'RESTAURANT',
    '["description","image","featured","specialInstructions"]',
    false, false, false, false, false, CURRENT_TIMESTAMP
);

INSERT INTO "StoreType" (
    "id", "name", "customerSectionName", "slug", "description", "displayOrder",
    "isActive", "isFeatured", "commerceEngine", "optionalProductFieldsJson",
    "stockTrackingRequired", "ageConfirmationRequired", "productUnitsEnabled",
    "brandsEnabled", "departmentsEnabled", "updatedAt"
) VALUES (
    'storetype-market', 'Market', 'Markets', 'markets',
    'Groceries, produce, household products, and everyday essentials.', 20, true, true, 'RETAIL',
    '["description","image","sku","featured"]',
    true, false, true, true, true, CURRENT_TIMESTAMP
);

ALTER TABLE "Store" ADD COLUMN "storeTypeId" TEXT REFERENCES "StoreType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Store"
SET "storeTypeId" = CASE
    WHEN "catalogEngine" = 'RESTAURANT' THEN 'storetype-restaurant'
    ELSE 'storetype-market'
END;

CREATE INDEX "Store_storeTypeId_status_isOpen_idx" ON "Store"("storeTypeId", "status", "isOpen");
