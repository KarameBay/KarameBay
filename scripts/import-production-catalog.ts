import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  IMPORT_ORDER,
  PRESERVED_TABLE_LABELS,
  PRODUCTION_CATALOG_TRANSFER_VERSION,
  revivePrismaDates,
  type PreservedTable,
  type ProductionCatalogExport,
} from "./production-data-transfer";

const db = new PrismaClient();

const CONFIRMATION = "IMPORT_KARAME_PRODUCTION_CATALOG";

function getInputPath() {
  const arg = process.argv.find((value) => value.startsWith("--in="));
  if (!arg) {
    throw new Error("Missing export file. Usage: npm run data:import-production-catalog -- --in=backups/export.json");
  }
  return path.resolve(arg.slice("--in=".length));
}

async function countCurrentOperationalData() {
  const [
    customers,
    riders,
    orders,
    parcels,
    notifications,
    riderAssignments,
  ] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "RIDER" } }),
    db.order.count(),
    db.parcelDelivery.count(),
    db.notification.count(),
    db.riderAssignment.count(),
  ]);
  return { customers, riders, orders, parcels, notifications, riderAssignments };
}

async function importRows(tx: PrismaClient, table: PreservedTable, rows: unknown[]) {
  if (!rows.length) return 0;
  const delegate = (tx as unknown as Record<string, { createMany: (args: unknown) => Promise<{ count: number }> }>)[table];
  if (!delegate) throw new Error(`Missing Prisma delegate for ${table}`);
  const data = revivePrismaDates(rows);
  const result = await delegate.createMany({ data, skipDuplicates: true });
  return result.count;
}

async function main() {
  const inputPath = getInputPath();
  const payload = JSON.parse(await readFile(inputPath, "utf8")) as ProductionCatalogExport;

  if (payload.version !== PRODUCTION_CATALOG_TRANSFER_VERSION) {
    throw new Error(`Unsupported export version ${payload.version}.`);
  }

  const adminRows = payload.data.user ?? [];
  if (adminRows.length !== 1) {
    throw new Error(`Expected exactly one Admin account in the export, found ${adminRows.length}.`);
  }
  if ((payload.data.store?.length ?? 0) < 1) {
    throw new Error("The export contains no stores. Refusing import.");
  }
  if (
    (payload.data.restaurantProduct?.length ?? 0) < 1 &&
    (payload.data.marketplaceProduct?.length ?? 0) < 1 &&
    (payload.data.product?.length ?? 0) < 1
  ) {
    throw new Error("The export contains no products. Refusing import.");
  }

  const operational = await countCurrentOperationalData();
  if (Object.values(operational).some((count) => count > 0)) {
    console.table(operational);
    throw new Error("Target database contains operational data. Run this only against a clean production database.");
  }

  console.log(`Ready to import ${inputPath}`);
  console.table(payload.counts);
  if (process.env.PRODUCTION_CATALOG_IMPORT_CONFIRM !== CONFIRMATION) {
    console.log(`Dry run only. Set PRODUCTION_CATALOG_IMPORT_CONFIRM=${CONFIRMATION} to import.`);
    return;
  }

  await db.$transaction(
    async (tx) => {
      for (const table of IMPORT_ORDER) {
        const rows = payload.data[table] ?? [];
        const inserted = await importRows(tx as unknown as PrismaClient, table, rows);
        console.log(`${PRESERVED_TABLE_LABELS[table]}: inserted ${inserted}/${rows.length}`);
      }

      const [admins, customers, riders, stores, restaurantProducts, marketplaceProducts, orders] =
        await Promise.all([
          tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } }),
          tx.user.count({ where: { role: "CUSTOMER" } }),
          tx.user.count({ where: { role: "RIDER" } }),
          tx.store.count(),
          tx.restaurantProduct.count(),
          tx.marketplaceProduct.count(),
          tx.order.count(),
        ]);

      if (admins !== 1) throw new Error(`Expected one active Admin after import, found ${admins}.`);
      if (customers !== 0 || riders !== 0 || orders !== 0) {
        throw new Error("Import created operational users or orders. Rolling back.");
      }
      if (stores < 1 || restaurantProducts + marketplaceProducts < 1) {
        throw new Error("Preserved catalog data is missing after import. Rolling back.");
      }
    },
    { timeout: 120_000 },
  );

  console.log("Production catalog import completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
