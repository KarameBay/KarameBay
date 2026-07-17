import { createHash } from "crypto";
import { db } from "@/lib/db";
import { DEFAULT_MARKET_IMAGE } from "@/lib/product-images";

export const ESOKO_SOURCE = "ESOKO";
export const ESOKO_TARGET_STORE_SLUG = "kimironko-market";
const DEFAULT_SOURCE_URL = "https://api.esoko.rw/esoko-prices";
const DEFAULT_MARKET_ID = "68";

export function latestKigaliMonday(now = new Date()) {
  const kigaliNow = new Date(now.getTime() + 2 * 60 * 60 * 1_000);
  const daysSinceMonday = (kigaliNow.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(
    kigaliNow.getUTCFullYear(),
    kigaliNow.getUTCMonth(),
    kigaliNow.getUTCDate() - daysSinceMonday,
  ));
}

export function priceSnapshotDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export type StagedPriceRow = {
  externalSourceId?: string | null;
  externalCommodityId?: string | null;
  marketName: string;
  province?: string | null;
  district?: string | null;
  commodityName: string;
  categoryName?: string | null;
  unit?: string | null;
  priceType?: string | null;
  price?: number | null;
  minimumPrice?: number | null;
  maximumPrice?: number | null;
  averagePrice?: number | null;
  priceDate?: Date | null;
  raw: Record<string, unknown>;
};

export function normalizeCommodityName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(tomatoes)\b/g, "tomato")
    .replace(/\b(potatoes)\b/g, "potato")
    .replace(/\b(beans)\b/g, "bean")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function roundUpToNearestTen(value: number) {
  if (!Number.isFinite(value) || value < 0)
    throw new Error("A valid non-negative price is required.");
  return Math.ceil(value / 10) * 10;
}

export function wholesaleSellingPriceRwf(referencePriceRwf: number) {
  if (!Number.isInteger(referencePriceRwf) || referencePriceRwf < 0)
    throw new Error("Wholesale reference prices must be non-negative whole RWF amounts.");
  // Integer arithmetic avoids 400 * 1.1 becoming 440.00000000000006 and
  // incorrectly rounding up to 450. Divide the marked-up hundredths directly
  // into 10-RWF buckets, then round only the incomplete bucket upward.
  return Math.ceil((referencePriceRwf * 110) / 1_000) * 10;
}

function markedUpPriceRoundedUpToTen(referencePriceRwf: number, markupPercent: number) {
  const markupHundredths = Math.round(markupPercent * 100);
  return Math.ceil(
    (referencePriceRwf * (10_000 + markupHundredths)) / 100_000,
  ) * 10;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replaceAll(",", ""));
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function dateOrNull(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseEsokoRows(payload: unknown): StagedPriceRow[] {
  if (!Array.isArray(payload)) throw new Error("e-Soko returned an unexpected data format.");
  return payload.flatMap((entry): StagedPriceRow[] => {
    if (!entry || typeof entry !== "object") return [];
    // e-Soko's legacy payload is not schema-stable and contains deeply nested,
    // optional vendor fields, so parsing remains defensive at this boundary.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = entry as Record<string, any>;
    const product = row.product && typeof row.product === "object" ? row.product : {};
    const market = row.market && typeof row.market === "object" ? row.market : {};
    const commodityName = String(product.commodity_name_en || row.commodity_name_en || product.commodity_name || row.commodity_name || "").trim();
    const marketName = String(market.name || row.market_name || "").trim();
    if (!commodityName || normalizeCommodityName(marketName) !== "kimironko") return [];
    const prices = [row.price_1, row.price_2, row.price_3].map(numberOrNull).filter((value): value is number => value !== null);
    const average = numberOrNull(row.average_price ?? row.q_retailaverageprice);
    return [{
      externalSourceId: row.id === undefined ? null : String(row.id),
      externalCommodityId: product.id === undefined ? (row.commodity_code ? String(row.commodity_code) : null) : String(product.id),
      marketName,
      province: row.different_province || market.province?.name || null,
      district: row.different_district || market.district || null,
      commodityName,
      categoryName: null,
      unit: product.commodity_unit ? String(product.commodity_unit).trim() : null,
      priceType: String(row.price_type || "retail").trim().toUpperCase(),
      price: average,
      minimumPrice: prices.length ? Math.min(...prices) : null,
      maximumPrice: prices.length ? Math.max(...prices) : null,
      averagePrice: average,
      priceDate: dateOrNull(row.entry_date || row.created_on),
      // Deliberately omit agent/user/contact/location fields returned by the API.
      raw: {
        id: row.id ?? null,
        market: { id: market.id ?? null, name: marketName, district: market.district ?? null },
        commodity: {
          id: product.id ?? null,
          code: product.commodity_code ?? row.commodity_code ?? null,
          originalName: product.commodity_name ?? row.commodity_name ?? null,
          englishName: product.commodity_name_en ?? row.commodity_name_en ?? null,
          unit: product.commodity_unit ?? null,
        },
        price1: numberOrNull(row.price_1),
        price2: numberOrNull(row.price_2),
        price3: numberOrNull(row.price_3),
        averagePrice: average,
        priceType: row.price_type ?? null,
        status: row.status ?? null,
        entryDate: row.entry_date ?? null,
      },
    }];
  });
}

function configNumber(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

export async function fetchPublicJson(
  url: string,
  fetchImplementation: typeof fetch = fetch,
) {
  // The public e-Soko endpoint commonly takes around 20 seconds even for a
  // market-filtered response. Keep a bounded timeout, but do not abort a
  // healthy response before the provider has had time to return it.
  const timeout = configNumber("ESOKO_REQUEST_TIMEOUT_MS", 45_000, 5_000, 90_000);
  const retries = configNumber("ESOKO_MAX_RETRIES", 1, 0, 2);
  const delay = configNumber("ESOKO_REQUEST_DELAY_MS", 1_500, 500, 10_000);
  const userAgent = process.env.ESOKO_USER_AGENT || "KarameBay-MarketPriceImporter/1.0 (+manual admin import)";
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    try {
      const response = await fetchImplementation(url, {
        headers: { Accept: "application/json", "User-Agent": userAgent },
        signal: AbortSignal.timeout(timeout),
        cache: "no-store",
      });
      if (response.status === 429) throw new Error("e-Soko rate limit reached. Please wait before trying again.");
      if (!response.ok) throw new Error(`e-Soko returned HTTP ${response.status}.`);
      const text = await response.text();
      if (text.length > 8_000_000) throw new Error("e-Soko response exceeded the safe import size.");
      return JSON.parse(text) as unknown;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not reach e-Soko.");
}

function latestRows(rows: StagedPriceRow[]) {
  const latest = new Map<string, StagedPriceRow>();
  const sorted = [...rows].sort((a, b) => (b.priceDate?.getTime() ?? 0) - (a.priceDate?.getTime() ?? 0));
  for (const row of sorted) {
    const key = `${row.externalCommodityId || normalizeCommodityName(row.commodityName)}|${row.unit || ""}|${String(row.priceType || "RETAIL").toUpperCase()}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.values()];
}

async function findMatch(storeId: string, source: string, row: StagedPriceRow) {
  if (row.externalCommodityId) {
    const external = await db.marketplaceProduct.findFirst({
      where: { storeId, sourceType: source, sourceExternalId: row.externalCommodityId },
      include: { units: { where: { isDefault: true }, take: 1 }, category: { select: { name: true } } },
    });
    if (external) return external;
  }
  const normalized = normalizeCommodityName(row.commodityName);
  const candidates = await db.marketplaceProduct.findMany({
    where: { storeId, OR: [{ normalizedName: normalized }, { name: row.commodityName }] },
    include: { units: { where: { isDefault: true }, take: 1 }, category: { select: { name: true } } },
    take: 5,
  });
  const exact = candidates.find((product) => {
    const nameMatches = (product.normalizedName || normalizeCommodityName(product.name)) === normalized;
    const unitMatches = !row.unit || !product.units[0]?.label || product.units[0].label.toLowerCase() === row.unit.toLowerCase();
    return nameMatches && unitMatches;
  });
  if (exact) return exact;
  const alias = await db.commodityAlias.findUnique({
    where: { storeId_normalizedAlias: { storeId, normalizedAlias: normalized } },
    include: { product: { include: { units: { where: { isDefault: true }, take: 1 }, category: { select: { name: true } } } } },
  });
  return alias?.product ?? null;
}

export async function stagePriceRows(options: {
  adminId: string;
  source: string;
  sourceUrl: string;
  targetStoreSlug?: string;
  snapshotDate?: Date | null;
  rows: StagedPriceRow[];
}) {
  const targetStoreSlug = options.targetStoreSlug || ESOKO_TARGET_STORE_SLUG;
  const store = await db.store.findFirst({
    where: { slug: targetStoreSlug, catalogEngine: "MARKETPLACE" },
    select: { id: true, name: true, slug: true },
  });
  if (!store)
    throw new Error("The selected market catalog is missing or incorrectly configured.");

  const batch = await db.priceImportBatch.create({
    data: {
      source: options.source,
      sourceUrl: options.sourceUrl,
      targetMarket: store.name,
      snapshotDate: options.snapshotDate ?? null,
      storeId: store.id,
      startedById: options.adminId,
      status: "STARTED",
      recordsFetched: options.rows.length,
    },
  });
  const counters = { created: 0, matched: 0, newProducts: 0, changed: 0, unchanged: 0, failed: 0, review: 0 };
  try {
    for (const row of latestRows(options.rows).slice(0, 1_000)) {
      const normalized = normalizeCommodityName(row.commodityName);
      const normalizedRowMarket = normalizeCommodityName(row.marketName);
      const validMarket =
        normalizedRowMarket === normalizeCommodityName(store.name) ||
        (store.slug === ESOKO_TARGET_STORE_SLUG && normalizedRowMarket === "kimironko");
      const validPrice = row.price !== null && row.price !== undefined && Number.isFinite(row.price) && row.price >= 0;
      const validUnit = Boolean(row.unit?.trim());
      const priceType = String(row.priceType || "RETAIL").trim().toUpperCase();
      const isWholesale = priceType === "WHOLESALE";
      const wholesaleProposal = validPrice
        ? isWholesale
          ? wholesaleSellingPriceRwf(row.price!)
          : null
        : null;
      const fallbackKey = `${row.marketName}|${normalized}|${row.unit || "missing"}|${priceType}|${row.priceDate?.toISOString().slice(0, 10) || "no-date"}`;
      const sourceKey = `${options.source}|${store.slug}|${row.externalSourceId || createHash("sha256").update(fallbackKey).digest("hex")}`;
      if (await db.priceImportRecord.findUnique({ where: { sourceKey }, select: { id: true } })) continue;

      const match = validMarket ? await findMatch(store.id, options.source, row) : null;
      const currentPrice = match?.units[0]?.priceRwf ?? null;
      const proposedSellingPrice = isWholesale ? wholesaleProposal : row.price ?? null;
      const comparisonPrice = isWholesale ? wholesaleProposal : row.price;
      const incomplete = !validMarket || !validPrice || !validUnit;
      const matchStatus = incomplete ? "INCOMPLETE" : match ? "MATCHED" : "NEW_PRODUCT";
      const importStatus = incomplete ? "INVALID" : "PENDING_REVIEW";
      if (incomplete) counters.failed += 1;
      if (match) counters.matched += 1;
      else counters.newProducts += 1;
      if (match && currentPrice === comparisonPrice) counters.unchanged += 1;
      else if (match) counters.changed += 1;
      if (!match || incomplete) counters.review += 1;

      await db.priceImportRecord.create({
        data: {
          batchId: batch.id,
          storeId: store.id,
          source: options.source,
          sourceUrl: options.sourceUrl,
          sourceKey,
          externalSourceId: row.externalSourceId || null,
          externalCommodityId: row.externalCommodityId || null,
          marketName: row.marketName,
          province: row.province || null,
          district: row.district || null,
          commodityName: row.commodityName,
          normalizedCommodityName: normalized,
          categoryName: row.categoryName || match?.category.name || null,
          unit: row.unit || null,
          priceType,
          pricingRule: isWholesale ? "WHOLESALE_PLUS_10_PERCENT_ROUND_UP_10" : null,
          importedPriceRwf: row.price ?? null,
          minimumPriceRwf: row.minimumPrice ?? null,
          maximumPriceRwf: row.maximumPrice ?? null,
          averagePriceRwf: row.averagePrice ?? row.price ?? null,
          priceDate: row.priceDate || null,
          importStatus,
          matchStatus,
          matchedProductId: match?.id || null,
          proposedAction: isWholesale ? "MARKUP_PERCENT" : "REPLACE",
          proposedSellingPriceRwf: proposedSellingPrice,
          markupPercent: isWholesale ? 10 : null,
          reviewNote: incomplete
            ? [!validMarket ? `Not ${store.name}` : "", !validPrice ? "Invalid or missing price" : "", !validUnit ? "Missing unit" : ""].filter(Boolean).join("; ")
            : null,
          rawSourcePayload: JSON.stringify(row.raw),
        },
      });
      counters.created += 1;
      if (match && validPrice) {
        await db.marketplaceProduct.update({
          where: { id: match.id },
          data: {
            normalizedName: match.normalizedName || normalizeCommodityName(match.name),
            referenceMarketPriceRwf: row.price,
            lastImportedAt: new Date(),
            ...(row.externalCommodityId && !match.sourceExternalId
              ? { sourceType: options.source, sourceExternalId: row.externalCommodityId }
              : {}),
          },
        });
      }
    }
    return await db.priceImportBatch.update({
      where: { id: batch.id },
      data: {
        status: counters.failed && counters.created > counters.failed ? "PARTIALLY_COMPLETED" : counters.created ? "COMPLETED" : "COMPLETED",
        recordsCreated: counters.created,
        matchedProducts: counters.matched,
        newProducts: counters.newProducts,
        priceChanges: counters.changed,
        unchangedProducts: counters.unchanged,
        failedRecords: counters.failed,
        requiringReview: counters.review,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await db.priceImportBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED", errorDetails: error instanceof Error ? error.message : "Unexpected import failure", completedAt: new Date() },
    });
    if (error && typeof error === "object")
      Object.assign(error, { importBatchLogged: true });
    throw error;
  }
}

export async function fetchAndStageEsokoPrices(
  adminId: string,
  snapshotDate = latestKigaliMonday(),
) {
  const sourceUrl = process.env.ESOKO_PUBLIC_API_URL || DEFAULT_SOURCE_URL;
  const targetMarket = process.env.ESOKO_TARGET_MARKET || "Kimironko";
  if (normalizeCommodityName(targetMarket) !== "kimironko")
    throw new Error("ESOKO_TARGET_MARKET must be Kimironko.");
  const marketId = process.env.ESOKO_KIMIRONKO_MARKET_ID || DEFAULT_MARKET_ID;
  const requestedPriceType = String(process.env.ESOKO_PRICE_TYPE || "wholesale").trim().toLowerCase();
  if (!new Set(["wholesale", "retail"]).has(requestedPriceType))
    throw new Error("ESOKO_PRICE_TYPE must be wholesale or retail.");
  const maximum = configNumber("ESOKO_MAX_RECORDS", 1_000, 1, 1_000);
  const snapshotKey = priceSnapshotDateKey(snapshotDate);
  const url = new URL(sourceUrl);
  url.searchParams.set("market", marketId);
  url.searchParams.set("price_type", requestedPriceType);
  url.searchParams.set("status", "approved");
  url.searchParams.set("entry_date", snapshotKey);
  url.searchParams.set("_limit", String(maximum));
  url.searchParams.set("_sort", "entry_date:DESC,id:DESC");
  const payload = await fetchPublicJson(url.toString());
  const rows = parseEsokoRows(payload).filter(
    (row) => row.priceDate && priceSnapshotDateKey(row.priceDate) === snapshotKey,
  );
  if (!rows.length)
    throw new Error(
      `e-Soko has no approved Kimironko ${requestedPriceType} snapshot for Monday ${snapshotKey}. Older prices were not substituted.`,
    );
  return stagePriceRows({
    adminId,
    source: ESOKO_SOURCE,
    sourceUrl: url.toString(),
    snapshotDate,
    rows,
  });
}

export async function logFailedImportAttempt(
  adminId: string,
  source: string,
  error: unknown,
  snapshotDate: Date | null = null,
) {
  const store = await db.store.findFirst({ where: { slug: ESOKO_TARGET_STORE_SLUG }, select: { id: true } });
  if (!store) return;
  await db.priceImportBatch.create({
    data: {
      source,
      sourceUrl:
        source === ESOKO_SOURCE
          ? process.env.ESOKO_PRICE_TRENDS_URL || "https://esoko.rw/price-trends"
          : "Admin file upload",
      targetMarket: "Karame Bay Market",
      snapshotDate,
      storeId: store.id,
      startedById: adminId,
      status: "FAILED",
      errorDetails: error instanceof Error ? error.message : "Unexpected import failure",
      completedAt: new Date(),
    },
  });
}

export type PriceApprovalInput = {
  recordId: string;
  action: "KEEP_CURRENT" | "REPLACE" | "MARKUP_PERCENT" | "ADD_FIXED" | "CUSTOM" | "CREATE_NEW";
  productId?: string;
  productName?: string;
  categoryId?: string;
  unit?: string;
  sellingPriceRwf?: number;
  markupPercent?: number;
  fixedAmountRwf?: number;
  roundTo?: number;
  createAlias?: boolean;
};

function roundedPrice(value: number, roundTo = 1) {
  const increment = [1, 10, 50, 100].includes(roundTo) ? roundTo : 1;
  return Math.max(0, Math.round(value / increment) * increment);
}

export async function approvePriceRecords(adminId: string, inputs: PriceApprovalInput[]) {
  let approved = 0;
  for (const input of inputs.slice(0, 200)) {
    const record = await db.priceImportRecord.findFirst({
      where: { id: input.recordId, importStatus: "PENDING_REVIEW", store: { catalogEngine: "MARKETPLACE" } },
      include: {
        matchedProduct: { include: { units: { where: { isDefault: true }, take: 1 } } },
      },
    });
    if (!record || record.importedPriceRwf === null || !record.unit) continue;

    let product = record.matchedProduct;
    if (input.productId && input.productId !== product?.id) {
      product = await db.marketplaceProduct.findFirst({
        where: { id: input.productId, storeId: record.storeId },
        include: { units: { where: { isDefault: true }, take: 1 } },
      });
    }

    // Product creation happens before the approval transaction. If a previous
    // approval attempt timed out after creating the product, reconnect the
    // pending record to that product instead of creating a duplicate on retry.
    if (!product && record.externalCommodityId) {
      product = await db.marketplaceProduct.findFirst({
        where: {
          storeId: record.storeId,
          sourceType: record.source,
          sourceExternalId: record.externalCommodityId,
        },
        include: { units: { where: { isDefault: true }, take: 1 } },
      });
    }
    if (!product) {
      const normalizedProductName = normalizeCommodityName(input.productName?.trim() || record.commodityName);
      if (normalizedProductName) {
        product = await db.marketplaceProduct.findFirst({
          where: { storeId: record.storeId, normalizedName: normalizedProductName },
          include: { units: { where: { isDefault: true }, take: 1 } },
        });
      }
    }
    const wasNewProduct = !product;
    const approvalAction = record.source === "TUMA250"
      ? wasNewProduct ? "CREATE_NEW" : "REPLACE"
      : input.action;
    if (!product && approvalAction !== "CREATE_NEW") continue;

    if (!product) {
      const category = await db.marketplaceCategory.findFirst({
        where: input.categoryId
          ? { id: input.categoryId, department: { storeId: record.storeId } }
          : { name: record.categoryName || "", department: { storeId: record.storeId } },
        select: { id: true, departmentId: true },
      });
      if (!category) continue;
      const productName = input.productName?.trim() || record.commodityName;
      const normalizedProductName = normalizeCommodityName(productName);
      if (!normalizedProductName) continue;
      const slugBase = normalizedProductName.replaceAll(" ", "-") || `product-${record.id.slice(-6)}`;
      let slug = slugBase;
      let suffix = 2;
      while (await db.marketplaceProduct.findFirst({ where: { storeId: record.storeId, slug }, select: { id: true } }))
        slug = `${slugBase}-${suffix++}`;
      product = await db.marketplaceProduct.create({
        data: {
          storeId: record.storeId,
          departmentId: category.departmentId,
          categoryId: category.id,
          slug,
          name: productName,
          normalizedName: normalizedProductName,
          description: record.source === "TUMA250" ? null : `Reference market price imported from ${record.source}.`,
          imageUrl: DEFAULT_MARKET_IMAGE,
          isAvailable: record.source === "TUMA250",
          referenceMarketPriceRwf: record.importedPriceRwf,
          sourceType: record.source,
          sourceExternalId: record.externalCommodityId,
          lastImportedAt: record.importedAt,
          units: {
            create: {
              unitType: "SOURCE_UNIT",
              label: input.unit?.trim() || record.unit,
              priceRwf: record.proposedSellingPriceRwf ?? record.importedPriceRwf,
              isDefault: true,
              isAvailable: record.source === "TUMA250",
            },
          },
          inventory: { create: { stockQuantity: record.source === "TUMA250" ? 100 : 0 } },
        },
        include: { units: { where: { isDefault: true }, take: 1 } },
      });
    }

    const unit = product.units[0];
    if (!unit) continue;
    const oldPrice = unit.priceRwf;
    let newPrice = oldPrice;
    if (approvalAction === "REPLACE") newPrice = record.importedPriceRwf;
    if (approvalAction === "CREATE_NEW")
      newPrice = record.proposedSellingPriceRwf ?? record.importedPriceRwf;
    if (approvalAction === "MARKUP_PERCENT")
      newPrice = record.priceType === "WHOLESALE"
        ? markedUpPriceRoundedUpToTen(record.importedPriceRwf, input.markupPercent ?? 0)
        : record.importedPriceRwf * (1 + (input.markupPercent ?? 0) / 100);
    if (approvalAction === "ADD_FIXED") newPrice = record.importedPriceRwf + (input.fixedAmountRwf ?? 0);
    if (approvalAction === "CUSTOM") newPrice = input.sellingPriceRwf ?? oldPrice;
    newPrice = record.source === "TUMA250"
      ? record.importedPriceRwf
      : record.priceType === "WHOLESALE" &&
          (approvalAction === "MARKUP_PERCENT" || approvalAction === "CREATE_NEW")
        ? roundUpToNearestTen(newPrice)
        : roundedPrice(newPrice, input.roundTo);

    await db.$transaction(async (tx) => {
      if (approvalAction !== "KEEP_CURRENT") {
        await tx.marketplaceProductUnit.update({ where: { id: unit.id }, data: { priceRwf: newPrice } });
      }
      await tx.marketplaceProduct.update({
        where: { id: product!.id },
        data: {
          normalizedName: product!.normalizedName || normalizeCommodityName(product!.name),
          referenceMarketPriceRwf: record.importedPriceRwf,
          sourceType: product!.sourceType || record.source,
          sourceExternalId: product!.sourceExternalId || record.externalCommodityId,
          lastImportedAt: record.importedAt,
          lastApprovedAt: new Date(),
        },
      });
      await tx.priceImportRecord.update({
        where: { id: record.id },
        data: {
          ...(approvalAction === "CREATE_NEW" && input.productName?.trim()
            ? {
                commodityName: input.productName.trim(),
                normalizedCommodityName: normalizeCommodityName(input.productName),
              }
            : {}),
          importStatus: "APPROVED",
          matchStatus: "MATCHED",
          matchedProductId: product!.id,
          proposedAction: approvalAction,
          proposedSellingPriceRwf: newPrice,
          markupPercent: input.markupPercent ?? null,
          fixedAmountRwf: input.fixedAmountRwf ?? null,
          approvedById: adminId,
          approvedAt: new Date(),
        },
      });
      await tx.marketplacePriceHistory.create({
        data: {
          productId: product!.id,
          importRecordId: record.id,
          oldPriceRwf: oldPrice,
          newPriceRwf: approvalAction === "KEEP_CURRENT" ? oldPrice : newPrice,
          sourcePriceRwf: record.importedPriceRwf,
          importedAt: record.importedAt,
          approvedById: adminId,
        },
      });
      await tx.priceImportBatch.update({ where: { id: record.batchId }, data: { acceptedRecords: { increment: 1 } } });
      if (input.createAlias) {
        await tx.commodityAlias.upsert({
          where: { storeId_normalizedAlias: { storeId: record.storeId, normalizedAlias: record.normalizedCommodityName } },
          update: { alias: record.commodityName, productId: product!.id },
          create: {
            storeId: record.storeId,
            alias: record.commodityName,
            normalizedAlias: record.normalizedCommodityName,
            productId: product!.id,
          },
        });
      }
    }, {
      // Bulk approvals can be slightly slower on small managed databases.
      // Prisma's 5-second default caused otherwise valid approvals to expire
      // while committing.
      maxWait: 15_000,
      timeout: 60_000,
    });
    approved += 1;
  }
  return approved;
}

export async function rejectPriceRecords(adminId: string, recordIds: string[]) {
  let rejected = 0;
  for (const id of recordIds.slice(0, 200)) {
    const record = await db.priceImportRecord.findFirst({
      where: { id, importStatus: "PENDING_REVIEW", store: { catalogEngine: "MARKETPLACE" } },
      select: { id: true, batchId: true },
    });
    if (!record) continue;
    await db.$transaction([
      db.priceImportRecord.update({
        where: { id: record.id },
        data: { importStatus: "REJECTED", proposedAction: "REJECT", approvedById: adminId, approvedAt: new Date() },
      }),
      db.priceImportBatch.update({ where: { id: record.batchId }, data: { rejectedRecords: { increment: 1 } } }),
    ]);
    rejected += 1;
  }
  return rejected;
}

export async function approvePendingPriceBatch(adminId: string, batchId: string) {
  const batch = await db.priceImportBatch.findFirst({
    where: { id: batchId, store: { catalogEngine: "MARKETPLACE" } },
    select: { id: true },
  });
  if (!batch) throw new Error("Import batch not found.");
  const records = await db.priceImportRecord.findMany({
    where: { batchId: batch.id, importStatus: "PENDING_REVIEW" },
    select: { id: true, matchedProductId: true },
    orderBy: { importedAt: "asc" },
    take: 1_000,
  });
  let approved = 0;
  for (let index = 0; index < records.length; index += 200) {
    approved += await approvePriceRecords(
      adminId,
      records.slice(index, index + 200).map((record) => ({
        recordId: record.id,
        action: record.matchedProductId ? "REPLACE" : "CREATE_NEW",
        roundTo: 1,
      })),
    );
  }
  return approved;
}

export async function rejectPendingPriceBatch(adminId: string, batchId: string) {
  const batch = await db.priceImportBatch.findFirst({
    where: { id: batchId, store: { catalogEngine: "MARKETPLACE" } },
    select: { id: true },
  });
  if (!batch) throw new Error("Import batch not found.");
  const records = await db.priceImportRecord.findMany({
    where: { batchId: batch.id, importStatus: "PENDING_REVIEW" },
    select: { id: true },
    take: 1_000,
  });
  let rejected = 0;
  for (let index = 0; index < records.length; index += 200)
    rejected += await rejectPriceRecords(adminId, records.slice(index, index + 200).map((record) => record.id));
  return rejected;
}

export async function matchPriceRecord(recordId: string, productId: string) {
  const record = await db.priceImportRecord.findFirst({
    where: { id: recordId, importStatus: "PENDING_REVIEW", store: { catalogEngine: "MARKETPLACE" } },
    select: { id: true, storeId: true },
  });
  if (!record) throw new Error("Import record not found.");
  const product = await db.marketplaceProduct.findFirst({ where: { id: productId, storeId: record.storeId }, select: { id: true } });
  if (!product) throw new Error("Choose a product from the selected market.");
  await db.priceImportRecord.update({ where: { id: record.id }, data: { matchedProductId: product.id, matchStatus: "MATCHED" } });
}
