-- Parcel delivery is a separate aggregate. Existing marketplace/restaurant
-- Order, Payment, Notification and RiderAssignment tables are not modified.

CREATE TABLE "ParcelCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ParcelSizeDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "examplesJson" TEXT NOT NULL DEFAULT '[]',
    "maxWeightKg" REAL NOT NULL,
    "maxLengthCm" REAL NOT NULL,
    "maxWidthCm" REAL NOT NULL,
    "maxHeightCm" REAL NOT NULL,
    "surchargeRwf" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ParcelVehicleCapacity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleType" TEXT NOT NULL,
    "maxWeightKg" REAL NOT NULL,
    "maxLengthCm" REAL NOT NULL,
    "maxWidthCm" REAL NOT NULL,
    "maxHeightCm" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ParcelPricingSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'parcel',
    "version" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "baseFeeRwf" INTEGER NOT NULL DEFAULT 500,
    "perKmRwf" INTEGER NOT NULL DEFAULT 250,
    "roundingIncrementRwf" INTEGER NOT NULL DEFAULT 1,
    "sizeSurchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weightSurchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weightFreeAllowanceKg" REAL NOT NULL DEFAULT 0,
    "weightSurchargePerKgRwf" INTEGER NOT NULL DEFAULT 0,
    "fragileSurchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fragileSurchargeRwf" INTEGER NOT NULL DEFAULT 0,
    "carefulHandlingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "carefulHandlingRwf" INTEGER NOT NULL DEFAULT 0,
    "waitingTimeChargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "waitingGraceMinutes" INTEGER NOT NULL DEFAULT 0,
    "waitingPerMinuteRwf" INTEGER NOT NULL DEFAULT 0,
    "scheduledSurchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledSurchargeRwf" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParcelPricingSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ParcelProhibitedItemRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ParcelReferenceCounter" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'parcel',
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ParcelDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedRiderId" TEXT,
    "categoryId" TEXT,
    "sizeDefinitionId" TEXT,
    "pickupContactName" TEXT NOT NULL,
    "pickupPhone" TEXT NOT NULL,
    "pickupLatitude" REAL NOT NULL,
    "pickupLongitude" REAL NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupAddressDetails" TEXT NOT NULL DEFAULT '',
    "pickupInstructions" TEXT,
    "pickupPreference" TEXT NOT NULL DEFAULT 'NOW',
    "scheduledPickupAt" DATETIME,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "deliveryLatitude" REAL NOT NULL,
    "deliveryLongitude" REAL NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryAddressDetails" TEXT NOT NULL DEFAULT '',
    "deliveryInstructions" TEXT,
    "categoryName" TEXT NOT NULL,
    "parcelDescription" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedWeightKg" REAL NOT NULL,
    "estimatedLengthCm" REAL,
    "estimatedWidthCm" REAL,
    "estimatedHeightCm" REAL,
    "sizeCode" TEXT NOT NULL,
    "sizeName" TEXT NOT NULL,
    "fragile" BOOLEAN NOT NULL DEFAULT false,
    "requiresCarefulHandling" BOOLEAN NOT NULL DEFAULT false,
    "declaredValueRwf" INTEGER,
    "distanceM" INTEGER NOT NULL,
    "estimatedDurationS" INTEGER NOT NULL,
    "quotedRouteJson" TEXT NOT NULL DEFAULT '[]',
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "pricingVersion" INTEGER NOT NULL,
    "baseFeeRwf" INTEGER NOT NULL,
    "distanceFeeRwf" INTEGER NOT NULL,
    "sizeSurchargeRwf" INTEGER NOT NULL DEFAULT 0,
    "weightSurchargeRwf" INTEGER NOT NULL DEFAULT 0,
    "fragileSurchargeRwf" INTEGER NOT NULL DEFAULT 0,
    "carefulHandlingRwf" INTEGER NOT NULL DEFAULT 0,
    "waitingTimeChargeRwf" INTEGER NOT NULL DEFAULT 0,
    "scheduledSurchargeRwf" INTEGER NOT NULL DEFAULT 0,
    "extraFeesRwf" INTEGER NOT NULL DEFAULT 0,
    "deliveryFeeRwf" INTEGER NOT NULL,
    "totalRwf" INTEGER NOT NULL,
    "pricingSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "detailsConfirmedAt" DATETIME,
    "prohibitedItemsConfirmedAt" DATETIME,
    "safePackagingConfirmedAt" DATETIME,
    "recipientAvailableConfirmedAt" DATETIME,
    "prohibitedRulesSnapshotJson" TEXT NOT NULL DEFAULT '[]',
    "confirmedAt" DATETIME,
    "goingToPickupAt" DATETIME,
    "arrivedAtPickupAt" DATETIME,
    "pickedUpAt" DATETIME,
    "deliveredAt" DATETIME,
    "cancelledAt" DATETIME,
    "rejectedAt" DATETIME,
    "failedAt" DATETIME,
    "closedReason" TEXT,
    "riderCurrentLatitude" REAL,
    "riderCurrentLongitude" REAL,
    "riderLocationAccuracyM" REAL,
    "riderHeadingDegrees" REAL,
    "riderSpeedMps" REAL,
    "riderLocationUpdatedAt" DATETIME,
    "riderRoutePhase" TEXT,
    "riderRouteJson" TEXT NOT NULL DEFAULT '[]',
    "remainingDistanceM" INTEGER,
    "remainingDurationS" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParcelDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParcelDelivery_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParcelDelivery_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ParcelCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParcelDelivery_sizeDefinitionId_fkey" FOREIGN KEY ("sizeDefinitionId") REFERENCES "ParcelSizeDefinition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ParcelPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelDeliveryId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MTN_MOMO',
    "payeeName" TEXT NOT NULL DEFAULT 'Theo',
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amountRwf" INTEGER NOT NULL,
    "customerConfirmedAt" DATETIME,
    "verifiedAt" DATETIME,
    "verifiedById" TEXT,
    "failedAt" DATETIME,
    "refundedAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParcelPayment_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParcelPayment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ParcelDeliveryConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelDeliveryId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 6,
    "expiresAt" DATETIME,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 6,
    "lastAttemptAt" DATETIME,
    "verifiedAt" DATETIME,
    "verifiedByRiderId" TEXT,
    "recipientConfirmedName" TEXT,
    "overriddenAt" DATETIME,
    "overriddenByAdminId" TEXT,
    "overrideReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParcelDeliveryConfirmation_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParcelDeliveryConfirmation_verifiedByRiderId_fkey" FOREIGN KEY ("verifiedByRiderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParcelDeliveryConfirmation_overriddenByAdminId_fkey" FOREIGN KEY ("overriddenByAdminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ParcelStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelDeliveryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParcelStatusEvent_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParcelStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ParcelRiderAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelDeliveryId" TEXT NOT NULL,
    "riderId" TEXT,
    "riderName" TEXT NOT NULL,
    "riderPhone" TEXT,
    "assignedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    "goingToPickupAt" DATETIME,
    "arrivedAtPickupAt" DATETIME,
    "pickedUpAt" DATETIME,
    "onTheWayAt" DATETIME,
    "deliveredAt" DATETIME,
    "endedAt" DATETIME,
    "note" TEXT,
    CONSTRAINT "ParcelRiderAssignment_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParcelRiderAssignment_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParcelRiderAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ParcelNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "parcelDeliveryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParcelNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParcelNotification_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ParcelMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelDeliveryId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParcelMedia_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParcelMedia_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ParcelDeliveryProblem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelDeliveryId" TEXT NOT NULL,
    "reportedByRiderId" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" DATETIME,
    "resolvedByAdminId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParcelDeliveryProblem_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParcelDeliveryProblem_reportedByRiderId_fkey" FOREIGN KEY ("reportedByRiderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParcelDeliveryProblem_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ParcelCategory_slug_key" ON "ParcelCategory"("slug");
CREATE INDEX "ParcelCategory_isActive_sortOrder_name_idx" ON "ParcelCategory"("isActive", "sortOrder", "name");
CREATE UNIQUE INDEX "ParcelSizeDefinition_code_key" ON "ParcelSizeDefinition"("code");
CREATE INDEX "ParcelSizeDefinition_isActive_sortOrder_idx" ON "ParcelSizeDefinition"("isActive", "sortOrder");
CREATE UNIQUE INDEX "ParcelVehicleCapacity_vehicleType_key" ON "ParcelVehicleCapacity"("vehicleType");
CREATE INDEX "ParcelVehicleCapacity_isActive_vehicleType_idx" ON "ParcelVehicleCapacity"("isActive", "vehicleType");
CREATE INDEX "ParcelPricingSetting_updatedById_idx" ON "ParcelPricingSetting"("updatedById");
CREATE INDEX "ParcelProhibitedItemRule_isActive_sortOrder_idx" ON "ParcelProhibitedItemRule"("isActive", "sortOrder");
CREATE UNIQUE INDEX "ParcelDelivery_referenceNumber_key" ON "ParcelDelivery"("referenceNumber");
CREATE INDEX "ParcelDelivery_customerId_createdAt_idx" ON "ParcelDelivery"("customerId", "createdAt");
CREATE INDEX "ParcelDelivery_status_createdAt_idx" ON "ParcelDelivery"("status", "createdAt");
CREATE INDEX "ParcelDelivery_status_assignedRiderId_createdAt_idx" ON "ParcelDelivery"("status", "assignedRiderId", "createdAt");
CREATE INDEX "ParcelDelivery_assignedRiderId_status_updatedAt_idx" ON "ParcelDelivery"("assignedRiderId", "status", "updatedAt");
CREATE INDEX "ParcelDelivery_assignedRiderId_riderLocationUpdatedAt_idx" ON "ParcelDelivery"("assignedRiderId", "riderLocationUpdatedAt");
CREATE INDEX "ParcelDelivery_scheduledPickupAt_status_idx" ON "ParcelDelivery"("scheduledPickupAt", "status");
CREATE INDEX "ParcelDelivery_categoryId_createdAt_idx" ON "ParcelDelivery"("categoryId", "createdAt");
CREATE INDEX "ParcelDelivery_sizeDefinitionId_createdAt_idx" ON "ParcelDelivery"("sizeDefinitionId", "createdAt");
CREATE UNIQUE INDEX "ParcelPayment_parcelDeliveryId_key" ON "ParcelPayment"("parcelDeliveryId");
CREATE INDEX "ParcelPayment_status_createdAt_idx" ON "ParcelPayment"("status", "createdAt");
CREATE INDEX "ParcelPayment_verifiedById_verifiedAt_idx" ON "ParcelPayment"("verifiedById", "verifiedAt");
CREATE UNIQUE INDEX "ParcelDeliveryConfirmation_parcelDeliveryId_key" ON "ParcelDeliveryConfirmation"("parcelDeliveryId");
CREATE INDEX "ParcelDeliveryConfirmation_expiresAt_idx" ON "ParcelDeliveryConfirmation"("expiresAt");
CREATE INDEX "ParcelDeliveryConfirmation_verifiedByRiderId_verifiedAt_idx" ON "ParcelDeliveryConfirmation"("verifiedByRiderId", "verifiedAt");
CREATE INDEX "ParcelDeliveryConfirmation_overriddenByAdminId_overriddenAt_idx" ON "ParcelDeliveryConfirmation"("overriddenByAdminId", "overriddenAt");
CREATE INDEX "ParcelStatusEvent_parcelDeliveryId_createdAt_idx" ON "ParcelStatusEvent"("parcelDeliveryId", "createdAt");
CREATE INDEX "ParcelStatusEvent_status_createdAt_idx" ON "ParcelStatusEvent"("status", "createdAt");
CREATE INDEX "ParcelStatusEvent_actorId_createdAt_idx" ON "ParcelStatusEvent"("actorId", "createdAt");
CREATE INDEX "ParcelRiderAssignment_parcelDeliveryId_assignedAt_idx" ON "ParcelRiderAssignment"("parcelDeliveryId", "assignedAt");
CREATE INDEX "ParcelRiderAssignment_riderId_status_assignedAt_idx" ON "ParcelRiderAssignment"("riderId", "status", "assignedAt");
CREATE INDEX "ParcelRiderAssignment_assignedById_assignedAt_idx" ON "ParcelRiderAssignment"("assignedById", "assignedAt");
CREATE UNIQUE INDEX "ParcelNotification_dedupeKey_key" ON "ParcelNotification"("dedupeKey");
CREATE INDEX "ParcelNotification_userId_readAt_createdAt_idx" ON "ParcelNotification"("userId", "readAt", "createdAt");
CREATE INDEX "ParcelNotification_parcelDeliveryId_createdAt_idx" ON "ParcelNotification"("parcelDeliveryId", "createdAt");
CREATE INDEX "ParcelNotification_type_createdAt_idx" ON "ParcelNotification"("type", "createdAt");
CREATE UNIQUE INDEX "ParcelMedia_storageKey_key" ON "ParcelMedia"("storageKey");
CREATE INDEX "ParcelMedia_parcelDeliveryId_kind_createdAt_idx" ON "ParcelMedia"("parcelDeliveryId", "kind", "createdAt");
CREATE INDEX "ParcelMedia_uploadedById_createdAt_idx" ON "ParcelMedia"("uploadedById", "createdAt");
CREATE INDEX "ParcelDeliveryProblem_parcelDeliveryId_status_createdAt_idx" ON "ParcelDeliveryProblem"("parcelDeliveryId", "status", "createdAt");
CREATE INDEX "ParcelDeliveryProblem_reportedByRiderId_createdAt_idx" ON "ParcelDeliveryProblem"("reportedByRiderId", "createdAt");
CREATE INDEX "ParcelDeliveryProblem_resolvedByAdminId_resolvedAt_idx" ON "ParcelDeliveryProblem"("resolvedByAdminId", "resolvedAt");

-- Required operational defaults. Surcharges remain disabled for Phase 1.
INSERT INTO "ParcelPricingSetting" (
  "id", "version", "currency", "baseFeeRwf", "perKmRwf",
  "roundingIncrementRwf", "updatedAt"
) VALUES ('parcel', 1, 'RWF', 500, 250, 1, CURRENT_TIMESTAMP);

INSERT INTO "ParcelReferenceCounter" ("id", "lastValue", "updatedAt")
VALUES ('parcel', 0, CURRENT_TIMESTAMP);

INSERT INTO "ParcelCategory" ("id", "slug", "name", "sortOrder", "updatedAt") VALUES
  ('parcel-category-documents', 'documents', 'Documents', 1, CURRENT_TIMESTAMP),
  ('parcel-category-clothes', 'clothes', 'Clothes', 2, CURRENT_TIMESTAMP),
  ('parcel-category-food-package', 'food-package', 'Food package', 3, CURRENT_TIMESTAMP),
  ('parcel-category-electronics', 'electronics', 'Electronics', 4, CURRENT_TIMESTAMP),
  ('parcel-category-household-item', 'household-item', 'Household item', 5, CURRENT_TIMESTAMP),
  ('parcel-category-small-package', 'small-package', 'Small package', 6, CURRENT_TIMESTAMP),
  ('parcel-category-medium-package', 'medium-package', 'Medium package', 7, CURRENT_TIMESTAMP),
  ('parcel-category-large-package', 'large-package', 'Large package', 8, CURRENT_TIMESTAMP),
  ('parcel-category-other', 'other', 'Other', 9, CURRENT_TIMESTAMP);

INSERT INTO "ParcelSizeDefinition" (
  "id", "code", "name", "description", "examplesJson", "maxWeightKg",
  "maxLengthCm", "maxWidthCm", "maxHeightCm", "surchargeRwf",
  "sortOrder", "updatedAt"
) VALUES
  ('parcel-size-small', 'SMALL', 'Small', 'Documents, a small shopping bag, or a small box.', '["Documents","Small shopping bag","Small box"]', 5, 40, 30, 20, 0, 1, CURRENT_TIMESTAMP),
  ('parcel-size-medium', 'MEDIUM', 'Medium', 'A backpack-sized parcel, medium box, or several grocery bags.', '["Backpack-sized parcel","Medium box","Several grocery bags"]', 15, 60, 45, 40, 0, 2, CURRENT_TIMESTAMP),
  ('parcel-size-large', 'LARGE', 'Large', 'A large box or bulky parcel that may require a larger vehicle.', '["Large box","Bulky parcel"]', 50, 100, 80, 80, 0, 3, CURRENT_TIMESTAMP);

INSERT INTO "ParcelVehicleCapacity" (
  "id", "vehicleType", "maxWeightKg", "maxLengthCm", "maxWidthCm",
  "maxHeightCm", "updatedAt"
) VALUES
  ('parcel-capacity-motorcycle', 'MOTORCYCLE', 20, 65, 50, 50, CURRENT_TIMESTAMP),
  ('parcel-capacity-van', 'VAN', 500, 200, 150, 150, CURRENT_TIMESTAMP);

INSERT INTO "ParcelProhibitedItemRule" (
  "id", "title", "sortOrder", "updatedAt"
) VALUES
  ('parcel-rule-illegal-drugs', 'Illegal drugs', 1, CURRENT_TIMESTAMP),
  ('parcel-rule-weapons', 'Weapons', 2, CURRENT_TIMESTAMP),
  ('parcel-rule-explosives', 'Explosives', 3, CURRENT_TIMESTAMP),
  ('parcel-rule-dangerous-chemicals', 'Dangerous chemicals', 4, CURRENT_TIMESTAMP),
  ('parcel-rule-stolen-goods', 'Stolen goods', 5, CURRENT_TIMESTAMP),
  ('parcel-rule-cash', 'Cash', 6, CURRENT_TIMESTAMP),
  ('parcel-rule-live-animals', 'Live animals', 7, CURRENT_TIMESTAMP),
  ('parcel-rule-temperature-controlled-perishables', 'Perishable goods requiring special temperature control', 8, CURRENT_TIMESTAMP),
  ('parcel-rule-prohibited-by-law', 'Items prohibited by law', 9, CURRENT_TIMESTAMP),
  ('parcel-rule-unsafe-for-rider', 'Any item unsafe for the rider', 10, CURRENT_TIMESTAMP);
