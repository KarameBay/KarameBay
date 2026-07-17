-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderProfile" (
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "vehicleType" TEXT NOT NULL DEFAULT 'MOTORCYCLE',
    "licensePlate" TEXT,
    "riderStatus" TEXT NOT NULL DEFAULT 'OFFLINE',
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "currentLocationLabel" TEXT,
    "onlineSinceAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageDeliveryMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePickupMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedDeliveriesCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledDeliveriesCount" INTEGER NOT NULL DEFAULT 0,
    "totalEarningsRwf" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storeTypeId" TEXT,
    "catalogEngine" TEXT NOT NULL DEFAULT 'MARKETPLACE',
    "description" TEXT NOT NULL,
    "phone" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "estimatedDeliveryMinutes" INTEGER NOT NULL DEFAULT 35,
    "address" TEXT NOT NULL DEFAULT '',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "minimumOrderRwf" INTEGER NOT NULL DEFAULT 0,
    "preparationMinutes" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreType" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantProfile" (
    "storeId" TEXT NOT NULL,
    "acceptsSpecialInstructions" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantProfile_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "RestaurantCategory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantProduct" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "basePriceRwf" INTEGER NOT NULL,
    "containerChargePerUnitRwf" INTEGER NOT NULL DEFAULT 0,
    "containerChargeFlatRwf" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "seasonal" BOOLEAN NOT NULL DEFAULT false,
    "preparationMinutes" INTEGER,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "allergensJson" TEXT NOT NULL DEFAULT '[]',
    "dietaryLabelsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceRwf" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RestaurantVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantChoiceGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minChoices" INTEGER NOT NULL DEFAULT 0,
    "maxChoices" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RestaurantChoiceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantChoiceOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAdjustmentRwf" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RestaurantChoiceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantAddOn" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceRwf" INTEGER NOT NULL,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "selectionMode" TEXT NOT NULL DEFAULT 'SINGLE',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RestaurantAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantAddOnOption" (
    "id" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAdjustmentRwf" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RestaurantAddOnOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantProductAddOn" (
    "productId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "groupName" TEXT,
    "required" BOOLEAN,
    "selectionMode" TEXT NOT NULL DEFAULT 'SINGLE',
    "minSelections" INTEGER,
    "maxSelections" INTEGER,
    "hiddenOptionIds" JSONB,
    "optionPriceOverrides" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RestaurantProductAddOn_pkey" PRIMARY KEY ("productId","addOnId")
);

-- CreateTable
CREATE TABLE "RestaurantComboComponent" (
    "id" TEXT NOT NULL,
    "comboProductId" TEXT NOT NULL,
    "includedProductId" TEXT,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "swappable" BOOLEAN NOT NULL DEFAULT false,
    "upgradePriceRwf" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RestaurantComboComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceProfile" (
    "storeId" TEXT NOT NULL,
    "tracksInventory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceProfile_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "MarketplaceDepartment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MarketplaceDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceProduct" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "imageUrl" TEXT,
    "brand" TEXT,
    "containerChargePerUnitRwf" INTEGER NOT NULL DEFAULT 0,
    "containerChargeFlatRwf" INTEGER NOT NULL DEFAULT 0,
    "referenceMarketPriceRwf" INTEGER,
    "sourceType" TEXT,
    "sourceExternalId" TEXT,
    "lastImportedAt" TIMESTAMP(3),
    "lastApprovedAt" TIMESTAMP(3),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "discountType" TEXT,
    "discountValue" INTEGER,
    "discountStartsAt" TIMESTAMP(3),
    "discountEndsAt" TIMESTAMP(3),
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceImportBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "targetMarket" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3),
    "storeId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "matchedProducts" INTEGER NOT NULL DEFAULT 0,
    "newProducts" INTEGER NOT NULL DEFAULT 0,
    "priceChanges" INTEGER NOT NULL DEFAULT 0,
    "unchangedProducts" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "requiringReview" INTEGER NOT NULL DEFAULT 0,
    "acceptedRecords" INTEGER NOT NULL DEFAULT 0,
    "rejectedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PriceImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceImportRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "externalSourceId" TEXT,
    "externalCommodityId" TEXT,
    "marketName" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "commodityName" TEXT NOT NULL,
    "normalizedCommodityName" TEXT NOT NULL,
    "categoryName" TEXT,
    "unit" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "priceType" TEXT NOT NULL DEFAULT 'RETAIL',
    "pricingRule" TEXT,
    "importedPriceRwf" INTEGER,
    "minimumPriceRwf" INTEGER,
    "maximumPriceRwf" INTEGER,
    "averagePriceRwf" INTEGER,
    "priceDate" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "matchStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "matchedProductId" TEXT,
    "proposedAction" TEXT NOT NULL DEFAULT 'KEEP_CURRENT',
    "proposedSellingPriceRwf" INTEGER,
    "markupPercent" DOUBLE PRECISION,
    "fixedAmountRwf" INTEGER,
    "reviewNote" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rawSourcePayload" TEXT NOT NULL,

    CONSTRAINT "PriceImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplacePriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "importRecordId" TEXT NOT NULL,
    "oldPriceRwf" INTEGER,
    "newPriceRwf" INTEGER NOT NULL,
    "sourcePriceRwf" INTEGER,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedAt" TIMESTAMP(3) NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplacePriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommodityAlias" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommodityAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceProductUnit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "packSize" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "priceRwf" INTEGER NOT NULL,
    "allowsDecimal" BOOLEAN NOT NULL DEFAULT false,
    "minimumQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "quantityStep" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MarketplaceProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceInventory" (
    "productId" TEXT NOT NULL,
    "stockQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceInventory_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "MarketplaceInventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT,
    "quantityChange" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceInventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "riderId" TEXT,
    "storeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "itemsSubtotalRwf" INTEGER NOT NULL,
    "deliveryFeeRwf" INTEGER NOT NULL,
    "grandTotalRwf" INTEGER NOT NULL,
    "drivingDistanceM" INTEGER NOT NULL,
    "estimatedDurationS" INTEGER NOT NULL,
    "deliveryLatitude" DOUBLE PRECISION NOT NULL,
    "deliveryLongitude" DOUBLE PRECISION NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "riderCurrentLatitude" DOUBLE PRECISION,
    "riderCurrentLongitude" DOUBLE PRECISION,
    "riderLocationAccuracyM" DOUBLE PRECISION,
    "riderHeadingDegrees" DOUBLE PRECISION,
    "riderSpeedMps" DOUBLE PRECISION,
    "riderLocationUpdatedAt" TIMESTAMP(3),
    "riderRoutePhase" TEXT,
    "riderRouteJson" TEXT NOT NULL DEFAULT '[]',
    "remainingDistanceM" INTEGER,
    "remainingDurationS" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MTN_MOMO',
    "payeeName" TEXT NOT NULL DEFAULT 'Theo',
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "amountRwf" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "assignedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "onTheWayAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "RiderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "riderAssignmentMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL DEFAULT 'business',
    "businessName" TEXT NOT NULL DEFAULT 'Karame Bay',
    "supportEmail" TEXT NOT NULL DEFAULT 'karamebay3@gmail.com',
    "supportPhone" TEXT NOT NULL DEFAULT '+250789950707',
    "whatsappNumber" TEXT NOT NULL DEFAULT '+250789950707',
    "businessAddress" TEXT NOT NULL DEFAULT 'Gikondo, Kigali, Rwanda',
    "businessHours" TEXT NOT NULL DEFAULT 'Open daily, 24 hours',
    "instagramUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "riderId" TEXT,
    "storeRating" INTEGER NOT NULL,
    "writtenReview" TEXT,
    "foodQualityRating" INTEGER,
    "packagingRating" INTEGER,
    "orderAccuracyRating" INTEGER,
    "riderOverallRating" INTEGER,
    "friendlinessRating" INTEGER,
    "deliverySpeedRating" INTEGER,
    "professionalismRating" INTEGER,
    "riderComment" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'VISIBLE',
    "moderationReason" TEXT,
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "adminReply" TEXT,
    "adminRepliedAt" TIMESTAMP(3),
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "photoUrlsJson" TEXT NOT NULL DEFAULT '[]',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "editableUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelSizeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "examplesJson" TEXT NOT NULL DEFAULT '[]',
    "maxWeightKg" DOUBLE PRECISION NOT NULL,
    "maxLengthCm" DOUBLE PRECISION NOT NULL,
    "maxWidthCm" DOUBLE PRECISION NOT NULL,
    "maxHeightCm" DOUBLE PRECISION NOT NULL,
    "surchargeRwf" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelSizeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelVehicleCapacity" (
    "id" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "maxWeightKg" DOUBLE PRECISION NOT NULL,
    "maxLengthCm" DOUBLE PRECISION NOT NULL,
    "maxWidthCm" DOUBLE PRECISION NOT NULL,
    "maxHeightCm" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelVehicleCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelPricingSetting" (
    "id" TEXT NOT NULL DEFAULT 'parcel',
    "version" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "baseFeeRwf" INTEGER NOT NULL DEFAULT 500,
    "perKmRwf" INTEGER NOT NULL DEFAULT 250,
    "roundingIncrementRwf" INTEGER NOT NULL DEFAULT 1,
    "sizeSurchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weightSurchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weightFreeAllowanceKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelPricingSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelProhibitedItemRule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelProhibitedItemRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelReferenceCounter" (
    "id" TEXT NOT NULL DEFAULT 'parcel',
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelReferenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelDelivery" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedRiderId" TEXT,
    "categoryId" TEXT,
    "sizeDefinitionId" TEXT,
    "pickupContactName" TEXT NOT NULL,
    "pickupPhone" TEXT NOT NULL,
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupAddressDetails" TEXT NOT NULL DEFAULT '',
    "pickupInstructions" TEXT,
    "pickupPreference" TEXT NOT NULL DEFAULT 'NOW',
    "scheduledPickupAt" TIMESTAMP(3),
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "deliveryLatitude" DOUBLE PRECISION NOT NULL,
    "deliveryLongitude" DOUBLE PRECISION NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryAddressDetails" TEXT NOT NULL DEFAULT '',
    "deliveryInstructions" TEXT,
    "categoryName" TEXT NOT NULL,
    "parcelDescription" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedWeightKg" DOUBLE PRECISION NOT NULL,
    "estimatedLengthCm" DOUBLE PRECISION,
    "estimatedWidthCm" DOUBLE PRECISION,
    "estimatedHeightCm" DOUBLE PRECISION,
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
    "detailsConfirmedAt" TIMESTAMP(3),
    "prohibitedItemsConfirmedAt" TIMESTAMP(3),
    "safePackagingConfirmedAt" TIMESTAMP(3),
    "recipientAvailableConfirmedAt" TIMESTAMP(3),
    "prohibitedRulesSnapshotJson" TEXT NOT NULL DEFAULT '[]',
    "confirmedAt" TIMESTAMP(3),
    "goingToPickupAt" TIMESTAMP(3),
    "arrivedAtPickupAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "closedReason" TEXT,
    "riderCurrentLatitude" DOUBLE PRECISION,
    "riderCurrentLongitude" DOUBLE PRECISION,
    "riderLocationAccuracyM" DOUBLE PRECISION,
    "riderHeadingDegrees" DOUBLE PRECISION,
    "riderSpeedMps" DOUBLE PRECISION,
    "riderLocationUpdatedAt" TIMESTAMP(3),
    "riderRoutePhase" TEXT,
    "riderRouteJson" TEXT NOT NULL DEFAULT '[]',
    "remainingDistanceM" INTEGER,
    "remainingDurationS" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelPayment" (
    "id" TEXT NOT NULL,
    "parcelDeliveryId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MTN_MOMO',
    "payeeName" TEXT NOT NULL DEFAULT 'Theo',
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amountRwf" INTEGER NOT NULL,
    "customerConfirmedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelDeliveryConfirmation" (
    "id" TEXT NOT NULL,
    "parcelDeliveryId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 6,
    "expiresAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 6,
    "lastAttemptAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedByRiderId" TEXT,
    "recipientConfirmedName" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "overriddenByAdminId" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelDeliveryConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelStatusEvent" (
    "id" TEXT NOT NULL,
    "parcelDeliveryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParcelStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelRiderAssignment" (
    "id" TEXT NOT NULL,
    "parcelDeliveryId" TEXT NOT NULL,
    "riderId" TEXT,
    "riderName" TEXT NOT NULL,
    "riderPhone" TEXT,
    "assignedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "goingToPickupAt" TIMESTAMP(3),
    "arrivedAtPickupAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "onTheWayAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "ParcelRiderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parcelDeliveryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParcelNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelMedia" (
    "id" TEXT NOT NULL,
    "parcelDeliveryId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParcelMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelDeliveryProblem" (
    "id" TEXT NOT NULL,
    "parcelDeliveryId" TEXT NOT NULL,
    "reportedByRiderId" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelDeliveryProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailNotificationLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "userId" TEXT,
    "orderId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationChallenge_userId_key" ON "EmailVerificationChallenge"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_expiresAt_idx" ON "EmailVerificationChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetChallenge_userId_key" ON "PasswordResetChallenge"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetChallenge_expiresAt_idx" ON "PasswordResetChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "RiderProfile_riderStatus_idx" ON "RiderProfile"("riderStatus");

-- CreateIndex
CREATE INDEX "RiderProfile_vehicleType_idx" ON "RiderProfile"("vehicleType");

-- CreateIndex
CREATE INDEX "Address_userId_updatedAt_idx" ON "Address"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_label_key" ON "Address"("userId", "label");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Store_status_isOpen_idx" ON "Store"("status", "isOpen");

-- CreateIndex
CREATE INDEX "Store_catalogEngine_status_isOpen_idx" ON "Store"("catalogEngine", "status", "isOpen");

-- CreateIndex
CREATE INDEX "Store_storeTypeId_status_isOpen_idx" ON "Store"("storeTypeId", "status", "isOpen");

-- CreateIndex
CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreType_slug_key" ON "StoreType"("slug");

-- CreateIndex
CREATE INDEX "StoreType_isActive_displayOrder_idx" ON "StoreType"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "StoreType_commerceEngine_isActive_idx" ON "StoreType"("commerceEngine", "isActive");

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
CREATE INDEX "RestaurantAddOnOption_addOnId_sortOrder_idx" ON "RestaurantAddOnOption"("addOnId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantAddOnOption_addOnId_name_key" ON "RestaurantAddOnOption"("addOnId", "name");

-- CreateIndex
CREATE INDEX "RestaurantProductAddOn_addOnId_idx" ON "RestaurantProductAddOn"("addOnId");

-- CreateIndex
CREATE INDEX "RestaurantProductAddOn_productId_groupName_sortOrder_idx" ON "RestaurantProductAddOn"("productId", "groupName", "sortOrder");

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
CREATE INDEX "MarketplaceProduct_storeId_isAvailable_departmentId_categor_idx" ON "MarketplaceProduct"("storeId", "isAvailable", "departmentId", "categoryId");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_storeId_name_idx" ON "MarketplaceProduct"("storeId", "name");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_storeId_normalizedName_idx" ON "MarketplaceProduct"("storeId", "normalizedName");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_storeId_sourceType_sourceExternalId_idx" ON "MarketplaceProduct"("storeId", "sourceType", "sourceExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProduct_storeId_slug_key" ON "MarketplaceProduct"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProduct_storeId_sku_key" ON "MarketplaceProduct"("storeId", "sku");

-- CreateIndex
CREATE INDEX "PriceImportBatch_storeId_startedAt_idx" ON "PriceImportBatch"("storeId", "startedAt");

-- CreateIndex
CREATE INDEX "PriceImportBatch_storeId_snapshotDate_status_idx" ON "PriceImportBatch"("storeId", "snapshotDate", "status");

-- CreateIndex
CREATE INDEX "PriceImportBatch_status_startedAt_idx" ON "PriceImportBatch"("status", "startedAt");

-- CreateIndex
CREATE INDEX "PriceImportBatch_startedById_startedAt_idx" ON "PriceImportBatch"("startedById", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceImportRecord_sourceKey_key" ON "PriceImportRecord"("sourceKey");

-- CreateIndex
CREATE INDEX "PriceImportRecord_batchId_importStatus_idx" ON "PriceImportRecord"("batchId", "importStatus");

-- CreateIndex
CREATE INDEX "PriceImportRecord_storeId_normalizedCommodityName_unit_idx" ON "PriceImportRecord"("storeId", "normalizedCommodityName", "unit");

-- CreateIndex
CREATE INDEX "PriceImportRecord_storeId_priceType_priceDate_idx" ON "PriceImportRecord"("storeId", "priceType", "priceDate");

-- CreateIndex
CREATE INDEX "PriceImportRecord_matchedProductId_matchStatus_idx" ON "PriceImportRecord"("matchedProductId", "matchStatus");

-- CreateIndex
CREATE INDEX "PriceImportRecord_approvedById_approvedAt_idx" ON "PriceImportRecord"("approvedById", "approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplacePriceHistory_importRecordId_key" ON "MarketplacePriceHistory"("importRecordId");

-- CreateIndex
CREATE INDEX "MarketplacePriceHistory_productId_effectiveAt_idx" ON "MarketplacePriceHistory"("productId", "effectiveAt");

-- CreateIndex
CREATE INDEX "MarketplacePriceHistory_approvedById_approvedAt_idx" ON "MarketplacePriceHistory"("approvedById", "approvedAt");

-- CreateIndex
CREATE INDEX "CommodityAlias_productId_idx" ON "CommodityAlias"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CommodityAlias_storeId_normalizedAlias_key" ON "CommodityAlias"("storeId", "normalizedAlias");

-- CreateIndex
CREATE INDEX "MarketplaceProductUnit_productId_isDefault_idx" ON "MarketplaceProductUnit"("productId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProductUnit_productId_label_key" ON "MarketplaceProductUnit"("productId", "label");

-- CreateIndex
CREATE INDEX "MarketplaceInventoryMovement_productId_createdAt_idx" ON "MarketplaceInventoryMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceInventoryMovement_unitId_idx" ON "MarketplaceInventoryMovement"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_riderId_status_createdAt_idx" ON "Order"("riderId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_storeId_status_createdAt_idx" ON "Order"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_riderId_riderLocationUpdatedAt_idx" ON "Order"("riderId", "riderLocationUpdatedAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_restaurantProductId_idx" ON "OrderItem"("restaurantProductId");

-- CreateIndex
CREATE INDEX "OrderItem_marketplaceProductId_idx" ON "OrderItem"("marketplaceProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_verifiedById_idx" ON "Payment"("verifiedById");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_actorId_idx" ON "OrderStatusEvent"("actorId");

-- CreateIndex
CREATE INDEX "RiderAssignment_orderId_assignedAt_idx" ON "RiderAssignment"("orderId", "assignedAt");

-- CreateIndex
CREATE INDEX "RiderAssignment_riderId_assignedAt_idx" ON "RiderAssignment"("riderId", "assignedAt");

-- CreateIndex
CREATE INDEX "RiderAssignment_assignedById_assignedAt_idx" ON "RiderAssignment"("assignedById", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");

-- CreateIndex
CREATE INDEX "Review_storeId_moderationStatus_createdAt_idx" ON "Review"("storeId", "moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Review_riderId_moderationStatus_createdAt_idx" ON "Review"("riderId", "moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Review_customerId_createdAt_idx" ON "Review"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_moderationStatus_createdAt_idx" ON "Review"("moderationStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelCategory_slug_key" ON "ParcelCategory"("slug");

-- CreateIndex
CREATE INDEX "ParcelCategory_isActive_sortOrder_name_idx" ON "ParcelCategory"("isActive", "sortOrder", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelSizeDefinition_code_key" ON "ParcelSizeDefinition"("code");

-- CreateIndex
CREATE INDEX "ParcelSizeDefinition_isActive_sortOrder_idx" ON "ParcelSizeDefinition"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelVehicleCapacity_vehicleType_key" ON "ParcelVehicleCapacity"("vehicleType");

-- CreateIndex
CREATE INDEX "ParcelVehicleCapacity_isActive_vehicleType_idx" ON "ParcelVehicleCapacity"("isActive", "vehicleType");

-- CreateIndex
CREATE INDEX "ParcelPricingSetting_updatedById_idx" ON "ParcelPricingSetting"("updatedById");

-- CreateIndex
CREATE INDEX "ParcelProhibitedItemRule_isActive_sortOrder_idx" ON "ParcelProhibitedItemRule"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelDelivery_referenceNumber_key" ON "ParcelDelivery"("referenceNumber");

-- CreateIndex
CREATE INDEX "ParcelDelivery_customerId_createdAt_idx" ON "ParcelDelivery"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelDelivery_status_createdAt_idx" ON "ParcelDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelDelivery_status_assignedRiderId_createdAt_idx" ON "ParcelDelivery"("status", "assignedRiderId", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelDelivery_assignedRiderId_status_updatedAt_idx" ON "ParcelDelivery"("assignedRiderId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ParcelDelivery_assignedRiderId_riderLocationUpdatedAt_idx" ON "ParcelDelivery"("assignedRiderId", "riderLocationUpdatedAt");

-- CreateIndex
CREATE INDEX "ParcelDelivery_scheduledPickupAt_status_idx" ON "ParcelDelivery"("scheduledPickupAt", "status");

-- CreateIndex
CREATE INDEX "ParcelDelivery_categoryId_createdAt_idx" ON "ParcelDelivery"("categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelDelivery_sizeDefinitionId_createdAt_idx" ON "ParcelDelivery"("sizeDefinitionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelPayment_parcelDeliveryId_key" ON "ParcelPayment"("parcelDeliveryId");

-- CreateIndex
CREATE INDEX "ParcelPayment_status_createdAt_idx" ON "ParcelPayment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelPayment_verifiedById_verifiedAt_idx" ON "ParcelPayment"("verifiedById", "verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelDeliveryConfirmation_parcelDeliveryId_key" ON "ParcelDeliveryConfirmation"("parcelDeliveryId");

-- CreateIndex
CREATE INDEX "ParcelDeliveryConfirmation_expiresAt_idx" ON "ParcelDeliveryConfirmation"("expiresAt");

-- CreateIndex
CREATE INDEX "ParcelDeliveryConfirmation_verifiedByRiderId_verifiedAt_idx" ON "ParcelDeliveryConfirmation"("verifiedByRiderId", "verifiedAt");

-- CreateIndex
CREATE INDEX "ParcelDeliveryConfirmation_overriddenByAdminId_overriddenAt_idx" ON "ParcelDeliveryConfirmation"("overriddenByAdminId", "overriddenAt");

-- CreateIndex
CREATE INDEX "ParcelStatusEvent_parcelDeliveryId_createdAt_idx" ON "ParcelStatusEvent"("parcelDeliveryId", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelStatusEvent_status_createdAt_idx" ON "ParcelStatusEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelStatusEvent_actorId_createdAt_idx" ON "ParcelStatusEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelRiderAssignment_parcelDeliveryId_assignedAt_idx" ON "ParcelRiderAssignment"("parcelDeliveryId", "assignedAt");

-- CreateIndex
CREATE INDEX "ParcelRiderAssignment_riderId_status_assignedAt_idx" ON "ParcelRiderAssignment"("riderId", "status", "assignedAt");

-- CreateIndex
CREATE INDEX "ParcelRiderAssignment_assignedById_assignedAt_idx" ON "ParcelRiderAssignment"("assignedById", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelNotification_dedupeKey_key" ON "ParcelNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "ParcelNotification_userId_readAt_createdAt_idx" ON "ParcelNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelNotification_parcelDeliveryId_createdAt_idx" ON "ParcelNotification"("parcelDeliveryId", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelNotification_type_createdAt_idx" ON "ParcelNotification"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelMedia_storageKey_key" ON "ParcelMedia"("storageKey");

-- CreateIndex
CREATE INDEX "ParcelMedia_parcelDeliveryId_kind_createdAt_idx" ON "ParcelMedia"("parcelDeliveryId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelMedia_uploadedById_createdAt_idx" ON "ParcelMedia"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelDeliveryProblem_parcelDeliveryId_status_createdAt_idx" ON "ParcelDeliveryProblem"("parcelDeliveryId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelDeliveryProblem_reportedByRiderId_createdAt_idx" ON "ParcelDeliveryProblem"("reportedByRiderId", "createdAt");

-- CreateIndex
CREATE INDEX "ParcelDeliveryProblem_resolvedByAdminId_resolvedAt_idx" ON "ParcelDeliveryProblem"("resolvedByAdminId", "resolvedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_orderId_idx" ON "Notification"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_orderId_type_key" ON "Notification"("userId", "orderId", "type");

-- CreateIndex
CREATE INDEX "EmailNotificationLog_userId_createdAt_idx" ON "EmailNotificationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailNotificationLog_orderId_createdAt_idx" ON "EmailNotificationLog"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailNotificationLog_status_createdAt_idx" ON "EmailNotificationLog"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_sortOrder_name_idx" ON "Category"("sortOrder", "name");

-- CreateIndex
CREATE INDEX "Category_createdById_idx" ON "Category"("createdById");

-- CreateIndex
CREATE INDEX "Product_storeId_isAvailable_categoryId_idx" ON "Product"("storeId", "isAvailable", "categoryId");

-- CreateIndex
CREATE INDEX "Product_storeId_name_idx" ON "Product"("storeId", "name");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_slug_key" ON "Product"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_sku_key" ON "Product"("storeId", "sku");

-- AddForeignKey
ALTER TABLE "EmailVerificationChallenge" ADD CONSTRAINT "EmailVerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetChallenge" ADD CONSTRAINT "PasswordResetChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderProfile" ADD CONSTRAINT "RiderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_storeTypeId_fkey" FOREIGN KEY ("storeTypeId") REFERENCES "StoreType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantProfile" ADD CONSTRAINT "RestaurantProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantCategory" ADD CONSTRAINT "RestaurantCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantCategory" ADD CONSTRAINT "RestaurantCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RestaurantCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantProduct" ADD CONSTRAINT "RestaurantProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantProduct" ADD CONSTRAINT "RestaurantProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RestaurantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantVariant" ADD CONSTRAINT "RestaurantVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RestaurantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantChoiceGroup" ADD CONSTRAINT "RestaurantChoiceGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RestaurantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantChoiceOption" ADD CONSTRAINT "RestaurantChoiceOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RestaurantChoiceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantAddOn" ADD CONSTRAINT "RestaurantAddOn_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantAddOnOption" ADD CONSTRAINT "RestaurantAddOnOption_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "RestaurantAddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantProductAddOn" ADD CONSTRAINT "RestaurantProductAddOn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RestaurantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantProductAddOn" ADD CONSTRAINT "RestaurantProductAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "RestaurantAddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantComboComponent" ADD CONSTRAINT "RestaurantComboComponent_comboProductId_fkey" FOREIGN KEY ("comboProductId") REFERENCES "RestaurantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantComboComponent" ADD CONSTRAINT "RestaurantComboComponent_includedProductId_fkey" FOREIGN KEY ("includedProductId") REFERENCES "RestaurantProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProfile" ADD CONSTRAINT "MarketplaceProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceDepartment" ADD CONSTRAINT "MarketplaceDepartment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCategory" ADD CONSTRAINT "MarketplaceCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "MarketplaceDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCategory" ADD CONSTRAINT "MarketplaceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketplaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "MarketplaceDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceImportBatch" ADD CONSTRAINT "PriceImportBatch_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceImportBatch" ADD CONSTRAINT "PriceImportBatch_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceImportRecord" ADD CONSTRAINT "PriceImportRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PriceImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceImportRecord" ADD CONSTRAINT "PriceImportRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceImportRecord" ADD CONSTRAINT "PriceImportRecord_matchedProductId_fkey" FOREIGN KEY ("matchedProductId") REFERENCES "MarketplaceProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceImportRecord" ADD CONSTRAINT "PriceImportRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePriceHistory" ADD CONSTRAINT "MarketplacePriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePriceHistory" ADD CONSTRAINT "MarketplacePriceHistory_importRecordId_fkey" FOREIGN KEY ("importRecordId") REFERENCES "PriceImportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePriceHistory" ADD CONSTRAINT "MarketplacePriceHistory_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommodityAlias" ADD CONSTRAINT "CommodityAlias_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommodityAlias" ADD CONSTRAINT "CommodityAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProductUnit" ADD CONSTRAINT "MarketplaceProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInventory" ADD CONSTRAINT "MarketplaceInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInventoryMovement" ADD CONSTRAINT "MarketplaceInventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInventoryMovement" ADD CONSTRAINT "MarketplaceInventoryMovement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MarketplaceProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_restaurantProductId_fkey" FOREIGN KEY ("restaurantProductId") REFERENCES "RestaurantProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_marketplaceProductId_fkey" FOREIGN KEY ("marketplaceProductId") REFERENCES "MarketplaceProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderAssignment" ADD CONSTRAINT "RiderAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderAssignment" ADD CONSTRAINT "RiderAssignment_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderAssignment" ADD CONSTRAINT "RiderAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelPricingSetting" ADD CONSTRAINT "ParcelPricingSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDelivery" ADD CONSTRAINT "ParcelDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDelivery" ADD CONSTRAINT "ParcelDelivery_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDelivery" ADD CONSTRAINT "ParcelDelivery_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ParcelCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDelivery" ADD CONSTRAINT "ParcelDelivery_sizeDefinitionId_fkey" FOREIGN KEY ("sizeDefinitionId") REFERENCES "ParcelSizeDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelPayment" ADD CONSTRAINT "ParcelPayment_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelPayment" ADD CONSTRAINT "ParcelPayment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDeliveryConfirmation" ADD CONSTRAINT "ParcelDeliveryConfirmation_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDeliveryConfirmation" ADD CONSTRAINT "ParcelDeliveryConfirmation_verifiedByRiderId_fkey" FOREIGN KEY ("verifiedByRiderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDeliveryConfirmation" ADD CONSTRAINT "ParcelDeliveryConfirmation_overriddenByAdminId_fkey" FOREIGN KEY ("overriddenByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelStatusEvent" ADD CONSTRAINT "ParcelStatusEvent_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelStatusEvent" ADD CONSTRAINT "ParcelStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelRiderAssignment" ADD CONSTRAINT "ParcelRiderAssignment_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelRiderAssignment" ADD CONSTRAINT "ParcelRiderAssignment_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelRiderAssignment" ADD CONSTRAINT "ParcelRiderAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelNotification" ADD CONSTRAINT "ParcelNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelNotification" ADD CONSTRAINT "ParcelNotification_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelMedia" ADD CONSTRAINT "ParcelMedia_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelMedia" ADD CONSTRAINT "ParcelMedia_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDeliveryProblem" ADD CONSTRAINT "ParcelDeliveryProblem_parcelDeliveryId_fkey" FOREIGN KEY ("parcelDeliveryId") REFERENCES "ParcelDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDeliveryProblem" ADD CONSTRAINT "ParcelDeliveryProblem_reportedByRiderId_fkey" FOREIGN KEY ("reportedByRiderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelDeliveryProblem" ADD CONSTRAINT "ParcelDeliveryProblem_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailNotificationLog" ADD CONSTRAINT "EmailNotificationLog_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailNotificationLog" ADD CONSTRAINT "EmailNotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailNotificationLog" ADD CONSTRAINT "EmailNotificationLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

