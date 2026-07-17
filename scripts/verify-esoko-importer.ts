import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  approvePriceRecords,
  fetchPublicJson,
  latestKigaliMonday,
  normalizeCommodityName,
  parseEsokoRows,
  priceSnapshotDateKey,
  rejectPriceRecords,
  roundUpToNearestTen,
  stagePriceRows,
  wholesaleSellingPriceRwf,
  type StagedPriceRow,
} from "../src/lib/esoko-importer";
import { parsePriceImportFile } from "../src/lib/price-import-file";

const db = new PrismaClient();

function sourceRow(overrides: Partial<StagedPriceRow> = {}): StagedPriceRow {
  return {
    externalSourceId: `test-price-${Date.now()}-${Math.random()}`,
    externalCommodityId: `test-product-${Date.now()}-${Math.random()}`,
    marketName: "Kimironko",
    province: "Kigali City",
    district: "Gasabo",
    commodityName: "Importer Test Tomato",
    categoryName: "Vegetables",
    unit: "kg",
    price: 1_250,
    minimumPrice: 1_200,
    maximumPrice: 1_300,
    averagePrice: 1_250,
    priceDate: new Date("2026-07-14"),
    raw: { fixture: true },
    ...overrides,
  };
}

async function main() {
  assert.equal(normalizeCommodityName("Tomatoes"), "tomato");
  assert.equal(normalizeCommodityName("Irish Potatoes"), "irish potato");
  assert.equal(
    priceSnapshotDateKey(latestKigaliMonday(new Date("2026-07-14T10:00:00.000Z"))),
    "2026-07-13",
    "Weekly snapshots resolve to the most recent Kigali Monday",
  );
  assert.equal(wholesaleSellingPriceRwf(1_083), 1_200, "Wholesale prices receive 10% and round upward to 10 RWF");
  assert.equal(wholesaleSellingPriceRwf(400), 440, "Exact 10-RWF wholesale results are not over-rounded");
  assert.equal(wholesaleSellingPriceRwf(6_000), 6_600, "Whole-price markup uses integer arithmetic without floating-point inflation");
  assert.equal(roundUpToNearestTen(835), 840, "Calculated prices ending in 5 round upward");
  assert.equal(roundUpToNearestTen(833), 840, "Odd calculated prices round upward to a clean 10 RWF amount");

  const parsed = parseEsokoRows([
    {
      id: 11,
      market_name: "Kimironko",
      average_price: 1000,
      price_1: 900,
      price_2: 1100,
      entry_date: "2026-07-14",
      price_type: "wholesale",
      product: { id: 9, commodity_name: "Inyanya", commodity_name_en: "Tomatoes", commodity_unit: "kg" },
      market: { id: 68, name: "Kimironko", district: "Gasabo" },
    },
    {
      id: 12,
      market_name: "Nyabugogo",
      average_price: 900,
      product: { id: 10, commodity_name: "Beans", commodity_unit: "kg" },
      market: { id: 2, name: "Nyabugogo" },
    },
  ]);
  assert.equal(parsed.length, 1, "Only Kimironko records are extracted");
  assert.equal(parsed[0].commodityName, "Tomatoes");
  assert.equal(parsed[0].minimumPrice, 900);
  assert.equal(parsed[0].maximumPrice, 1100);
  assert.equal(parsed[0].priceType, "WHOLESALE");

  const invalid = parseEsokoRows([{ id: 13, market_name: "Kimironko", average_price: "bad", product: { id: 11, commodity_name: "Test" }, market: { name: "Kimironko" } }]);
  assert.equal(invalid[0].price, null, "Invalid prices remain null");
  assert.equal(invalid[0].unit, null, "Missing units remain null");
  assert.throws(() => parseEsokoRows({ changed: "shape" }), /unexpected data format/i);

  const mockFetch = (async () => new Response(JSON.stringify([{ ok: true }]), { status: 200 })) as typeof fetch;
  const mockPayload = await fetchPublicJson("https://example.test/prices", mockFetch);
  assert.deepEqual(mockPayload, [{ ok: true }], "Public endpoint extraction accepts JSON responses");
  const previousRetries = process.env.ESOKO_MAX_RETRIES;
  process.env.ESOKO_MAX_RETRIES = "0";
  const failingFetch = (async () => { throw new Error("network timeout"); }) as typeof fetch;
  await assert.rejects(fetchPublicJson("https://example.test/prices", failingFetch), /network timeout/);
  process.env.ESOKO_MAX_RETRIES = previousRetries;

  const csv = [
    "Commodity name,Category,Market,Unit,Price,Price date",
    "Tomato,Vegetables,Karame Bay Market,kg,1000,2026-07-14",
  ].join("\n");
  const csvRows = await parsePriceImportFile(new File([csv], "prices.csv", { type: "text/csv" }));
  assert.equal(csvRows.length, 1);
  assert.equal(csvRows[0].price, 1000, "CSV fallback parses prices");
  await assert.rejects(
    parsePriceImportFile(new File([csv.replace("Karame Bay Market", "Nyabugogo")], "wrong-market.csv", { type: "text/csv" })),
    /Karame Bay Market/,
  );

  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } });
  const store = await db.store.findFirstOrThrow({ where: { slug: "kimironko-market" }, select: { id: true } });
  const category = await db.marketplaceCategory.findFirstOrThrow({
    where: { department: { storeId: store.id } },
    select: { id: true, departmentId: true },
  });
  const stamp = Date.now();
  const product = await db.marketplaceProduct.create({
    data: {
      storeId: store.id,
      departmentId: category.departmentId,
      categoryId: category.id,
      slug: `importer-test-${stamp}`,
      name: `Importer Test ${stamp}`,
      normalizedName: normalizeCommodityName(`Importer Test ${stamp}`),
      isAvailable: false,
      units: { create: { unitType: "kg", label: "kg", priceRwf: 1000, isDefault: true, isAvailable: false } },
      inventory: { create: { stockQuantity: 0 } },
    },
  });
  const batchIds: string[] = [];
  const createdProductIds: string[] = [];
  try {
    const matchingRow = sourceRow({
      externalSourceId: `match-price-${stamp}`,
      externalCommodityId: `match-commodity-${stamp}`,
      commodityName: product.name,
      price: 1200,
      averagePrice: 1200,
    });
    const first = await stagePriceRows({ adminId: admin.id, source: "TEST", sourceUrl: "mock://prices", rows: [matchingRow] });
    batchIds.push(first.id);
    assert.equal(first.recordsCreated, 1);
    assert.equal(first.matchedProducts, 1, "Exact normalized name and unit match existing products");
    assert.equal(first.priceChanges, 1);

    const duplicate = await stagePriceRows({ adminId: admin.id, source: "TEST", sourceUrl: "mock://prices", rows: [matchingRow] });
    batchIds.push(duplicate.id);
    assert.equal(duplicate.recordsCreated, 0, "Re-running the same source record is idempotent");

    const record = await db.priceImportRecord.findFirstOrThrow({ where: { batchId: first.id } });
    const approved = await approvePriceRecords(admin.id, [{ recordId: record.id, action: "REPLACE", roundTo: 1 }]);
    assert.equal(approved, 1);
    const updatedUnit = await db.marketplaceProductUnit.findFirstOrThrow({ where: { productId: product.id, isDefault: true } });
    assert.equal(updatedUnit.priceRwf, 1200, "Approved price changes update the selling unit");
    assert.equal(await db.marketplacePriceHistory.count({ where: { importRecordId: record.id } }), 1, "Approval creates one price-history row");

    const wholesaleBatch = await stagePriceRows({
      adminId: admin.id,
      source: "TEST",
      sourceUrl: "mock://wholesale-prices",
      rows: [sourceRow({
        externalSourceId: `wholesale-price-${stamp}`,
        externalCommodityId: `wholesale-commodity-${stamp}`,
        commodityName: `Wholesale Commodity ${stamp}`,
        priceType: "WHOLESALE",
        price: 1_083,
        averagePrice: 1_083,
      })],
    });
    batchIds.push(wholesaleBatch.id);
    const wholesaleRecord = await db.priceImportRecord.findFirstOrThrow({ where: { batchId: wholesaleBatch.id } });
    assert.equal(wholesaleRecord.proposedAction, "MARKUP_PERCENT");
    assert.equal(wholesaleRecord.markupPercent, 10);
    assert.equal(wholesaleRecord.proposedSellingPriceRwf, 1_200);
    assert.equal(wholesaleRecord.pricingRule, "WHOLESALE_PLUS_10_PERCENT_ROUND_UP_10");
    assert.equal(await approvePriceRecords(admin.id, [{
      recordId: wholesaleRecord.id,
      action: "CREATE_NEW",
      productName: `Edited Wholesale Product ${stamp}`,
      categoryId: category.id,
      unit: "kg",
      markupPercent: 10,
      roundTo: 10,
    }]), 1);
    const approvedWholesaleRecord = await db.priceImportRecord.findUniqueOrThrow({ where: { id: wholesaleRecord.id } });
    createdProductIds.push(approvedWholesaleRecord.matchedProductId!);
    const wholesaleUnit = await db.marketplaceProductUnit.findFirstOrThrow({
      where: { productId: approvedWholesaleRecord.matchedProductId!, isDefault: true },
    });
    assert.equal(wholesaleUnit.priceRwf, 1_200, "New wholesale products use the approved rounded 10% selling price");
    const renamedWholesaleProduct = await db.marketplaceProduct.findUniqueOrThrow({
      where: { id: approvedWholesaleRecord.matchedProductId! },
      select: { name: true },
    });
    assert.equal(renamedWholesaleProduct.name, `Edited Wholesale Product ${stamp}`, "Admin-edited import names are used for new products");

    const newBatch = await stagePriceRows({
      adminId: admin.id,
      source: "TEST",
      sourceUrl: "mock://prices",
      rows: [sourceRow({ externalSourceId: `new-price-${stamp}`, externalCommodityId: `new-commodity-${stamp}`, commodityName: `Unmatched Commodity ${stamp}` })],
    });
    batchIds.push(newBatch.id);
    const newRecord = await db.priceImportRecord.findFirstOrThrow({ where: { batchId: newBatch.id } });
    assert.equal(newRecord.matchStatus, "NEW_PRODUCT", "Unmatched commodities require product review");
    assert.equal(await rejectPriceRecords(admin.id, [newRecord.id]), 1);
    assert.equal((await db.priceImportRecord.findUniqueOrThrow({ where: { id: newRecord.id } })).importStatus, "REJECTED");

    const invalidBatch = await stagePriceRows({
      adminId: admin.id,
      source: "TEST",
      sourceUrl: "mock://prices",
      rows: [sourceRow({ externalSourceId: `invalid-${stamp}`, commodityName: `Invalid ${stamp}`, unit: null, price: null })],
    });
    batchIds.push(invalidBatch.id);
    assert.equal(invalidBatch.failedRecords, 1, "Invalid prices and missing units are flagged without publication");
  } finally {
    await db.priceImportBatch.deleteMany({ where: { id: { in: batchIds } } });
    await db.marketplaceProduct.deleteMany({ where: { id: { in: [product.id, ...createdProductIds] } } });
  }

  console.log("e-Soko importer verification passed: filtering, extraction, validation, idempotency, matching, approval, rejection, timeout, source change, and CSV fallback.");
}

main().finally(() => db.$disconnect());
