import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { getActiveStoreTypes, getStores } from "../src/lib/catalog";
import { catalogEngineFor, parseOptionalProductFields } from "../src/lib/store-types";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!/audit-store-types\.db$/i.test(databaseUrl)) {
  throw new Error("Dynamic store-type verification may run only against audit-store-types.db.");
}

async function main() {
  const suffix = Date.now().toString(36);
  const slug = `flowers-${suffix}`;
  const emptySlug = `empty-${suffix}`;
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } });

  const flowerType = await db.storeType.create({
    data: {
      name: "Flowers",
      customerSectionName: "Flowers",
      slug,
      description: "Fresh flowers and arrangements.",
      displayOrder: 35,
      isActive: true,
      commerceEngine: "RETAIL",
      optionalProductFieldsJson: JSON.stringify(["description", "image", "sku"]),
      stockTrackingRequired: true,
      productUnitsEnabled: true,
      brandsEnabled: false,
      departmentsEnabled: false,
    },
  });
  const emptyType = await db.storeType.create({
    data: {
      name: "Empty test type",
      customerSectionName: "Empty test types",
      slug: emptySlug,
      description: "Must stay hidden without active stores.",
      displayOrder: 999,
      isActive: true,
      commerceEngine: "RETAIL",
    },
  });

  try {
    const store = await db.store.create({
      data: {
        ownerId: admin.id,
        storeTypeId: flowerType.id,
        slug: `audit-flower-store-${suffix}`,
        name: "Audit Flower Store",
        type: "FLOWERS",
        catalogEngine: catalogEngineFor(flowerType.commerceEngine),
        description: "Temporary store used only in the isolated audit database.",
        address: "Kigali",
        latitude: -1.95,
        longitude: 30.06,
        opensAt: "08:00",
        closesAt: "18:00",
        status: "APPROVED",
      },
    });

    const [types, stores] = await Promise.all([
      getActiveStoreTypes(),
      getStores("", flowerType.slug),
    ]);
    assert(types.some((type) => type.id === flowerType.id), "Active type with a store appears in Explore");
    assert(!types.some((type) => type.id === emptyType.id), "Type without stores stays hidden");
    assert.equal(stores.length, 1, "Type directory returns only assigned stores");
    assert.equal(stores[0].id, store.id);
    assert.equal(stores[0].storeType?.customerSectionName, "Flowers");
    assert.deepEqual(parseOptionalProductFields(flowerType.optionalProductFieldsJson), ["description", "image", "sku"]);
  } finally {
    await db.store.deleteMany({ where: { storeTypeId: flowerType.id } });
    await db.storeType.deleteMany({ where: { id: { in: [flowerType.id, emptyType.id] } } });
  }

  console.log("Dynamic store-type verification passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
