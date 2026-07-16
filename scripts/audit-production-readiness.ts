import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();
const testMarker = /\b(test|testing|demo|sample|mock|fake|placeholder|temporary|dummy|development|prototype|seed)\b/i;
const launchStoreNames = [
  "Java House Kigali Heights",
  "Kimironko Market",
  "Zinia Kicukiro Market",
];

function localAssetExists(url: string | null) {
  if (!url || !url.startsWith("/")) return true;
  const cleanPath = url.split(/[?#]/, 1)[0].replace(/^\/+/, "");
  return existsSync(join(process.cwd(), "public", cleanPath));
}

function stringify(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? Number(item) : item),
    2,
  );
}

async function main() {
  const stores = await db.store.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      catalogEngine: true,
      status: true,
      isOpen: true,
      latitude: true,
      longitude: true,
      address: true,
      opensAt: true,
      closesAt: true,
      rating: true,
      logoUrl: true,
      coverUrl: true,
      estimatedDeliveryMinutes: true,
      minimumOrderRwf: true,
      preparationMinutes: true,
      owner: {
        select: { id: true, email: true, role: true, status: true },
      },
      _count: {
        select: {
          products: true,
          restaurantCategories: true,
          restaurantProducts: true,
          restaurantAddOns: true,
          marketplaceDepartments: true,
          marketplaceProducts: true,
          orders: true,
        },
      },
    },
  });

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  const suspectUsers = users.filter((user) =>
    testMarker.test(`${user.email} ${user.firstName} ${user.lastName}`),
  );

  const orders = await db.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveryAddress: true,
      itemsSubtotalRwf: true,
      deliveryFeeRwf: true,
      grandTotalRwf: true,
      drivingDistanceM: true,
      customer: {
        select: { email: true, firstName: true, lastName: true },
      },
      store: { select: { name: true } },
      payment: { select: { status: true, amountRwf: true } },
      _count: { select: { items: true } },
      createdAt: true,
    },
  });
  const suspectOrders = orders.filter((order) =>
    testMarker.test(
      `${order.orderNumber} ${order.deliveryAddress} ${order.customer.email} ${order.customer.firstName} ${order.customer.lastName}`,
    ),
  );

  const notifications = await db.notification.findMany({
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      user: { select: { email: true } },
      order: { select: { orderNumber: true } },
    },
  });
  const suspectNotifications = notifications.filter((notification) =>
    testMarker.test(
      `${notification.type} ${notification.title} ${notification.message} ${notification.user.email} ${notification.order.orderNumber}`,
    ),
  );

  const [restaurantImages, marketplaceImages] = await Promise.all([
    db.restaurantProduct.findMany({
      select: { id: true, name: true, imageUrl: true, store: { select: { name: true } } },
    }),
    db.marketplaceProduct.findMany({
      select: { id: true, name: true, imageUrl: true, store: { select: { name: true } } },
    }),
  ]);
  const brokenLocalImages = [...restaurantImages, ...marketplaceImages].filter(
    (product) => !localAssetExists(product.imageUrl),
  );
  const brokenStoreAssets = stores.flatMap((store) =>
    [
      { store: store.name, kind: "logo", url: store.logoUrl },
      { store: store.name, kind: "cover", url: store.coverUrl },
    ].filter((asset) => !localAssetExists(asset.url)),
  );
  const currentStoreNames = new Set(stores.map((store) => store.name));

  const queries = {
    foreignKeyCheck: "PRAGMA foreign_key_check",
    integrityCheck: "PRAGMA integrity_check",
    restaurantCategoryStoreMismatch:
      "SELECT COUNT(*) count FROM RestaurantProduct p JOIN RestaurantCategory c ON c.id=p.categoryId WHERE p.storeId<>c.storeId",
    restaurantInvalidPrice:
      "SELECT COUNT(*) count FROM RestaurantProduct WHERE basePriceRwf<0",
    restaurantMissingImage:
      "SELECT COUNT(*) count FROM RestaurantProduct WHERE imageUrl IS NULL OR TRIM(imageUrl)=''",
    restaurantDuplicateDefaultVariant:
      "SELECT COUNT(*) count FROM (SELECT productId FROM RestaurantVariant WHERE isDefault=1 GROUP BY productId HAVING COUNT(*)>1)",
    choiceGroupInvalidLimits:
      "SELECT COUNT(*) count FROM RestaurantChoiceGroup WHERE minChoices<0 OR maxChoices<1 OR minChoices>maxChoices OR (required=1 AND minChoices<1)",
    choiceGroupsInsufficientOptions:
      "SELECT COUNT(*) count FROM RestaurantChoiceGroup g WHERE (SELECT COUNT(*) FROM RestaurantChoiceOption o WHERE o.groupId=g.id AND o.isAvailable=1)<g.minChoices",
    addOnInvalidLimits:
      "SELECT COUNT(*) count FROM RestaurantAddOn WHERE minSelections<0 OR maxSelections<1 OR minSelections>maxSelections OR (required=1 AND minSelections<1)",
    addOnLinkStoreMismatch:
      "SELECT COUNT(*) count FROM RestaurantProductAddOn l JOIN RestaurantProduct p ON p.id=l.productId JOIN RestaurantAddOn a ON a.id=l.addOnId WHERE p.storeId<>a.storeId",
    marketplaceDepartmentStoreMismatch:
      "SELECT COUNT(*) count FROM MarketplaceProduct p JOIN MarketplaceDepartment d ON d.id=p.departmentId WHERE p.storeId<>d.storeId",
    marketplaceCategoryDepartmentMismatch:
      "SELECT COUNT(*) count FROM MarketplaceProduct p JOIN MarketplaceCategory c ON c.id=p.categoryId WHERE p.departmentId<>c.departmentId",
    marketplaceMissingUnits:
      "SELECT COUNT(*) count FROM MarketplaceProduct p WHERE NOT EXISTS (SELECT 1 FROM MarketplaceProductUnit u WHERE u.productId=p.id)",
    marketplaceDuplicateDefaultUnits:
      "SELECT COUNT(*) count FROM (SELECT productId FROM MarketplaceProductUnit WHERE isDefault=1 GROUP BY productId HAVING COUNT(*)>1)",
    marketplaceInvalidPrices:
      "SELECT COUNT(*) count FROM MarketplaceProductUnit WHERE priceRwf<0",
    marketplaceMissingImage:
      "SELECT COUNT(*) count FROM MarketplaceProduct WHERE imageUrl IS NULL OR TRIM(imageUrl)=''",
    legacyProductInvalidPrice:
      "SELECT COUNT(*) count FROM Product WHERE priceRwf<0",
    orderTotalMismatch:
      'SELECT COUNT(*) count FROM "Order" WHERE grandTotalRwf<>itemsSubtotalRwf+deliveryFeeRwf',
    orderItemTotalMismatch:
      "SELECT COUNT(*) count FROM OrderItem WHERE lineTotalRwf<>unitPriceRwf*quantity OR quantity<1",
    paymentAmountMismatch:
      'SELECT COUNT(*) count FROM Payment p JOIN "Order" o ON o.id=p.orderId WHERE p.amountRwf<>o.grandTotalRwf',
    unsupportedRoles:
      "SELECT COUNT(*) count FROM User WHERE role NOT IN ('CUSTOMER','ADMIN','RIDER')",
    nonManualRiderAssignment:
      "SELECT COUNT(*) count FROM PlatformSetting WHERE riderAssignmentMode<>'MANUAL'",
  } as const;

  const anomalies: Record<string, unknown> = {};
  for (const [name, query] of Object.entries(queries)) {
    anomalies[name] = await db.$queryRawUnsafe(query);
  }

  const countModels = [
    "user",
    "store",
    "restaurantCategory",
    "restaurantProduct",
    "restaurantVariant",
    "restaurantChoiceGroup",
    "restaurantChoiceOption",
    "restaurantAddOn",
    "restaurantAddOnOption",
    "restaurantProductAddOn",
    "marketplaceDepartment",
    "marketplaceCategory",
    "marketplaceProduct",
    "marketplaceProductUnit",
    "order",
    "payment",
    "riderAssignment",
    "notification",
    "emailNotificationLog",
    "parcelDelivery",
  ] as const;
  const counts: Record<string, number> = {};
  for (const model of countModels) {
    // The selected Prisma delegates all provide the same zero-argument count.
    counts[model] = await (db[model].count as () => Promise<number>)();
  }

  console.log(
    stringify({
      generatedAt: new Date().toISOString(),
      stores,
      counts,
      anomalies,
      needsReview: {
        missingLaunchStores: launchStoreNames.filter(
          (name) => !currentStoreNames.has(name),
        ),
        storesOutsideLaunchList: stores
          .map((store) => store.name)
          .filter((name) => !launchStoreNames.includes(name)),
        restaurantProductsUsingFallbackImage: restaurantImages
          .filter((product) => !product.imageUrl)
          .map((product) => ({ id: product.id, name: product.name, store: product.store.name })),
        brokenLocalImages,
        brokenStoreAssets,
        suspectUsers,
        suspectOrders,
        suspectNotifications,
      },
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
