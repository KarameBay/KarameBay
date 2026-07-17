import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CONFIRMATION = "CLEAN_KARAME_PRODUCTION_OPERATIONAL_DATA";

type CountMap = Record<string, number>;

async function countAll() {
  const [
    admins,
    customers,
    riders,
    activeCustomers,
    activeRiders,
    stores,
    storeTypes,
    restaurantProducts,
    marketplaceProducts,
    restaurantCategories,
    marketplaceDepartments,
    marketplaceCategories,
    restaurantVariants,
    restaurantChoiceGroups,
    restaurantChoiceOptions,
    restaurantAddOns,
    restaurantAddOnOptions,
    restaurantProductAddOns,
    marketplaceUnits,
    orders,
    orderItems,
    payments,
    orderEvents,
    riderAssignments,
    notifications,
    emailLogs,
    addresses,
    sessions,
    emailChallenges,
    passwordChallenges,
    riderProfiles,
    parcels,
    parcelPayments,
    parcelEvents,
    parcelNotifications,
    parcelAssignments,
    parcelMedia,
    parcelProblems,
    parcelConfirmations,
    reviews,
    priceImportBatches,
    priceImportRecords,
    marketplacePriceHistories,
    commodityAliases,
  ] = await Promise.all([
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "RIDER" } }),
    db.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
    db.user.count({ where: { role: "RIDER", status: "ACTIVE" } }),
    db.store.count(),
    db.storeType.count(),
    db.restaurantProduct.count(),
    db.marketplaceProduct.count(),
    db.restaurantCategory.count(),
    db.marketplaceDepartment.count(),
    db.marketplaceCategory.count(),
    db.restaurantVariant.count(),
    db.restaurantChoiceGroup.count(),
    db.restaurantChoiceOption.count(),
    db.restaurantAddOn.count(),
    db.restaurantAddOnOption.count(),
    db.restaurantProductAddOn.count(),
    db.marketplaceProductUnit.count(),
    db.order.count(),
    db.orderItem.count(),
    db.payment.count(),
    db.orderStatusEvent.count(),
    db.riderAssignment.count(),
    db.notification.count(),
    db.emailNotificationLog.count(),
    db.address.count(),
    db.session.count(),
    db.emailVerificationChallenge.count(),
    db.passwordResetChallenge.count(),
    db.riderProfile.count(),
    db.parcelDelivery.count(),
    db.parcelPayment.count(),
    db.parcelStatusEvent.count(),
    db.parcelNotification.count(),
    db.parcelRiderAssignment.count(),
    db.parcelMedia.count(),
    db.parcelDeliveryProblem.count(),
    db.parcelDeliveryConfirmation.count(),
    db.review.count(),
    db.priceImportBatch.count(),
    db.priceImportRecord.count(),
    db.marketplacePriceHistory.count(),
    db.commodityAlias.count(),
  ]);
  return {
    admins,
    customers,
    riders,
    activeCustomers,
    activeRiders,
    stores,
    storeTypes,
    restaurantProducts,
    marketplaceProducts,
    restaurantCategories,
    marketplaceDepartments,
    marketplaceCategories,
    restaurantVariants,
    restaurantChoiceGroups,
    restaurantChoiceOptions,
    restaurantAddOns,
    restaurantAddOnOptions,
    restaurantProductAddOns,
    marketplaceUnits,
    orders,
    orderItems,
    payments,
    orderEvents,
    riderAssignments,
    notifications,
    emailLogs,
    addresses,
    sessions,
    emailChallenges,
    passwordChallenges,
    riderProfiles,
    parcels,
    parcelPayments,
    parcelEvents,
    parcelNotifications,
    parcelAssignments,
    parcelMedia,
    parcelProblems,
    parcelConfirmations,
    reviews,
    priceImportBatches,
    priceImportRecords,
    marketplacePriceHistories,
    commodityAliases,
  } satisfies CountMap;
}

async function assertPreservedData() {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  if (admins.length !== 1) {
    console.log("Admin accounts found:");
    for (const admin of admins) {
      console.log(
        `- id=${admin.id} email=${admin.email} phone=${admin.phone} name=${admin.firstName} ${admin.lastName} status=${admin.status}`,
      );
    }
    throw new Error(
      "Cleanup stopped: expected exactly one real Admin account. No data was deleted.",
    );
  }

  if (admins[0].status !== "ACTIVE") {
    throw new Error("Cleanup stopped: the only Admin account is not ACTIVE.");
  }

  const java = await db.store.findUnique({
    where: { slug: "java-house-kigali-heights" },
    select: {
      id: true,
      name: true,
      _count: { select: { restaurantProducts: true } },
    },
  });
  const market = await db.store.findUnique({
    where: { slug: "kimironko-market" },
    select: {
      id: true,
      name: true,
      _count: { select: { marketplaceProducts: true } },
    },
  });

  if (!java || java.name !== "Java House Kigali Heights") {
    throw new Error("Cleanup stopped: Java House Kigali Heights was not found.");
  }
  if (!market || market.name !== "Karame Bay Market") {
    throw new Error("Cleanup stopped: Karame Bay Market was not found.");
  }
  if (java._count.restaurantProducts < 1) {
    throw new Error("Cleanup stopped: Java House has no restaurant products.");
  }
  if (market._count.marketplaceProducts < 1) {
    throw new Error("Cleanup stopped: Karame Bay Market has no retail products.");
  }

  return { admin: admins[0], java, market };
}

function printCounts(title: string, counts: CountMap) {
  console.log(`\n${title}`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`${key}: ${value}`);
  }
}

async function cleanup() {
  await db.$transaction(
    async (tx) => {
      await tx.emailNotificationLog.deleteMany();
      await tx.notification.deleteMany();
      await tx.riderAssignment.deleteMany();
      await tx.orderStatusEvent.deleteMany();
      await tx.review.deleteMany();
      await tx.payment.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();

      await tx.parcelDeliveryProblem.deleteMany();
      await tx.parcelDeliveryConfirmation.deleteMany();
      await tx.parcelMedia.deleteMany();
      await tx.parcelNotification.deleteMany();
      await tx.parcelRiderAssignment.deleteMany();
      await tx.parcelStatusEvent.deleteMany();
      await tx.parcelPayment.deleteMany();
      await tx.parcelDelivery.deleteMany();

      await tx.address.deleteMany();
      await tx.session.deleteMany();
      await tx.emailVerificationChallenge.deleteMany();
      await tx.passwordResetChallenge.deleteMany();
      await tx.riderProfile.deleteMany();

      await tx.priceImportRecord.deleteMany();
      await tx.priceImportBatch.deleteMany();
      await tx.marketplacePriceHistory.deleteMany();
      await tx.commodityAlias.deleteMany();

      await tx.user.deleteMany({ where: { role: { in: ["CUSTOMER", "RIDER"] } } });

      await tx.platformSetting.upsert({
        where: { id: "global" },
        update: { riderAssignmentMode: "MANUAL" },
        create: { id: "global", riderAssignmentMode: "MANUAL" },
      });
      await tx.parcelReferenceCounter.upsert({
        where: { id: "parcel" },
        update: { lastValue: 0 },
        create: { id: "parcel", lastValue: 0 },
      });
    },
    { timeout: 60_000 },
  );
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const confirmed = process.env.PRODUCTION_CLEANUP_CONFIRM === CONFIRMATION;

  const preserved = await assertPreservedData();
  const before = await countAll();
  printCounts("Before cleanup", before);
  console.log("\nPreserved records:");
  console.log(`Admin: id=${preserved.admin.id} email=${preserved.admin.email}`);
  console.log(
    `Store: ${preserved.java.name} (${preserved.java._count.restaurantProducts} restaurant products)`,
  );
  console.log(
    `Store: ${preserved.market.name} (${preserved.market._count.marketplaceProducts} marketplace products)`,
  );

  if (dryRun) {
    console.log("\nDry run only. No records were deleted.");
    return;
  }

  if (!confirmed) {
    throw new Error(
      `Cleanup stopped: set PRODUCTION_CLEANUP_CONFIRM=${CONFIRMATION} to run. No data was deleted.`,
    );
  }

  await cleanup();
  const after = await countAll();
  printCounts("After cleanup", after);

  if (
    after.admins !== 1 ||
    after.customers !== 0 ||
    after.riders !== 0 ||
    after.orders !== 0 ||
    after.orderItems !== 0 ||
    after.parcels !== 0 ||
    after.riderAssignments !== 0 ||
    after.notifications !== 0
  ) {
    throw new Error("Cleanup finished but verification counts are not clean.");
  }

  console.log("\nProduction operational cleanup completed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
