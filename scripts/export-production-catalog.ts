import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  PRESERVED_TABLES,
  PRODUCTION_CATALOG_TRANSFER_VERSION,
  type PreservedTable,
  type ProductionCatalogExport,
} from "./production-data-transfer";

const db = new PrismaClient();

function getOutputPath() {
  const arg = process.argv.find((value) => value.startsWith("--out="));
  if (arg) return path.resolve(arg.slice("--out=".length));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve("backups", `production-catalog-export-${stamp}.json`);
}

async function readTable(table: PreservedTable) {
  const delegate = (db as unknown as Record<string, { findMany: (args?: unknown) => Promise<unknown[]> }>)[table];
  if (!delegate) throw new Error(`Missing Prisma delegate for ${table}`);
  if (table === "user") {
    return delegate.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
  }
  return delegate.findMany();
}

async function main() {
  const outputPath = getOutputPath();
  const data = {} as ProductionCatalogExport["data"];
  const counts = {} as ProductionCatalogExport["counts"];

  for (const table of PRESERVED_TABLES) {
    const rows = await readTable(table);
    data[table] = rows;
    counts[table] = rows.length;
  }

  if (counts.user !== 1) {
    throw new Error(`Expected exactly one active Admin user to export, found ${counts.user}.`);
  }
  if (counts.store < 1) {
    throw new Error("No stores found. Refusing to create a production catalog export.");
  }
  if (counts.restaurantProduct < 1 && counts.marketplaceProduct < 1 && counts.product < 1) {
    throw new Error("No products found. Refusing to create a production catalog export.");
  }

  const payload: ProductionCatalogExport = {
    version: PRODUCTION_CATALOG_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    source: {
      app: "karame-bay",
      purpose: "production-catalog-transfer",
    },
    counts,
    data,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2));

  console.log(`Production catalog export written to ${outputPath}`);
  console.table(counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
