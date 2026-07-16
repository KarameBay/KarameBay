import { db } from "@/lib/db";
import { stagePriceRows, type StagedPriceRow } from "@/lib/esoko-importer";

export const TUMA250_SOURCE = "TUMA250";
export const TUMA250_PRODUCTS_URL = "https://tuma250.com/wp-json/wc/store/v1/products";
export const TUMA250_ALLOWED_STORE_SLUGS = ["kimironko-market", "zinia-kicukiro-market"] as const;

type TargetStoreSlug = (typeof TUMA250_ALLOWED_STORE_SLUGS)[number];
type TumaPrices = {
  price?: string;
  currency_code?: string;
  currency_minor_unit?: number;
};
type TumaAttribute = { name?: string; value?: string };
type TumaVariationReference = { id?: number; attributes?: TumaAttribute[] };
type TumaProduct = {
  id?: number;
  name?: string;
  type?: string;
  prices?: TumaPrices;
  variations?: TumaVariationReference[];
  attributes?: TumaAttribute[];
};

const CATEGORY_CONFIG = [
  { sourceId: 152, sourceName: "Meat, Fish & Poultry", departmentName: "Fresh Food", departmentSlug: "fresh-food", categorySlug: "meat-fish-poultry" },
  { sourceId: 295, sourceName: "Fruits & Vegetables", departmentName: "Fresh Food", departmentSlug: "fresh-food", categorySlug: "fruits-vegetables" },
  { sourceId: 156, sourceName: "Groceries", departmentName: "Groceries", departmentSlug: "groceries", categorySlug: "groceries" },
] as const;

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—",
  };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function exactRwf(prices: TumaPrices | undefined) {
  if (!prices || prices.currency_code !== "RWF" || prices.price === undefined) return null;
  const raw = Number(prices.price);
  const divisor = 10 ** Math.max(0, prices.currency_minor_unit ?? 0);
  const amount = raw / divisor;
  return Number.isFinite(amount) && amount >= 0 && Number.isInteger(amount) ? amount : null;
}

function inferredUnit(name: string) {
  const match = name.match(/\b\d+(?:[.,]\d+)?\s?(?:kg|g|ml|cl|l|pcs?|pieces?|pack|bunch)\b/i);
  return match ? match[0].replace(/\s+/g, " ") : "Item";
}

function variationUnit(attributes: TumaAttribute[] | undefined, fallbackName: string) {
  const values = (attributes ?? []).map((attribute) => decodeHtml(String(attribute.value || ""))).filter(Boolean);
  return values.length ? values.join(" / ") : inferredUnit(fallbackName);
}

async function fetchTumaJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "KarameBay-CatalogImporter/1.0 (+manual admin review; no images; contact karamebay3@gmail.com)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (response.status === 429) throw new Error("Tuma250 is limiting requests. Please wait before trying again.");
  if (!response.ok) throw new Error(`Tuma250 returned HTTP ${response.status}.`);
  const text = await response.text();
  if (text.length > 8_000_000) throw new Error("Tuma250 returned more catalog data than the safe import limit.");
  return { payload: JSON.parse(text) as unknown, headers: response.headers };
}

function asProducts(payload: unknown) {
  if (!Array.isArray(payload)) throw new Error("Tuma250 returned an unexpected catalog format.");
  return payload.filter((value): value is TumaProduct => Boolean(value && typeof value === "object"));
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function fetchCategoryProducts(categoryId: number) {
  const firstUrl = new URL(TUMA250_PRODUCTS_URL);
  firstUrl.searchParams.set("category", String(categoryId));
  firstUrl.searchParams.set("per_page", "100");
  firstUrl.searchParams.set("page", "1");
  const first = await fetchTumaJson(firstUrl.toString());
  const pages = Math.max(1, Number(first.headers.get("x-wp-totalpages")) || 1);
  const remaining = await mapWithConcurrency(
    Array.from({ length: pages - 1 }, (_, index) => index + 2),
    3,
    async (page) => {
      const url = new URL(firstUrl);
      url.searchParams.set("page", String(page));
      return asProducts((await fetchTumaJson(url.toString())).payload);
    },
  );
  return [...asProducts(first.payload), ...remaining.flat()];
}

async function ensureTargetCategories(storeId: string) {
  for (const config of CATEGORY_CONFIG) {
    const department = await db.marketplaceDepartment.upsert({
      where: { storeId_slug: { storeId, slug: config.departmentSlug } },
      update: { name: config.departmentName },
      create: { storeId, slug: config.departmentSlug, name: config.departmentName },
    });
    await db.marketplaceCategory.upsert({
      where: { departmentId_slug: { departmentId: department.id, slug: config.categorySlug } },
      update: { name: config.sourceName },
      create: { departmentId: department.id, slug: config.categorySlug, name: config.sourceName },
    });
  }
}

export function parseTumaProductRow(options: {
  product: TumaProduct;
  categoryName: string;
  marketName: string;
  observedAt: Date;
  parentId?: number;
  inheritedName?: string;
  inheritedAttributes?: TumaAttribute[];
}): StagedPriceRow | null {
  const id = Number(options.product.id);
  const baseName = decodeHtml(String(options.inheritedName || options.product.name || ""));
  const price = exactRwf(options.product.prices);
  if (!Number.isInteger(id) || id <= 0 || !baseName || price === null) return null;
  const unit = variationUnit(options.product.attributes || options.inheritedAttributes, baseName);
  const isVariation = options.product.type === "variation" || Boolean(options.parentId);
  const commodityName = isVariation && unit !== "Item" ? `${baseName} — ${unit}` : baseName;
  const observedDate = options.observedAt.toISOString().slice(0, 10);
  return {
    externalSourceId: `${id}:${observedDate}`,
    externalCommodityId: String(id),
    marketName: options.marketName,
    commodityName,
    categoryName: options.categoryName,
    unit,
    priceType: "RETAIL",
    price,
    minimumPrice: price,
    maximumPrice: price,
    averagePrice: price,
    priceDate: options.observedAt,
    // Only factual identifiers, category, unit and price are retained. Tuma250
    // descriptions, images and other editorial content are deliberately omitted.
    raw: {
      productId: options.parentId ?? id,
      variationId: options.parentId ? id : null,
      category: options.categoryName,
      unit,
      priceRwf: price,
      observedAt: options.observedAt.toISOString(),
    },
  };
}

export async function fetchAndStageTuma250Catalog(adminId: string, targetStoreSlug: string) {
  if (!TUMA250_ALLOWED_STORE_SLUGS.includes(targetStoreSlug as TargetStoreSlug))
    throw new Error("Choose Kimironko Market or Zinia Kicukiro Market.");
  const store = await db.store.findFirst({
    where: { slug: targetStoreSlug, catalogEngine: "MARKETPLACE" },
    select: { id: true, name: true },
  });
  if (!store) throw new Error("The selected market is not configured.");

  const observedAt = new Date();
  const categoryResults = await mapWithConcurrency([...CATEGORY_CONFIG], 2, async (config) => ({
    config,
    products: await fetchCategoryProducts(config.sourceId),
  }));
  const parents = new Map<number, { product: TumaProduct; categoryName: string }>();
  for (const result of categoryResults) {
    for (const product of result.products) {
      const id = Number(product.id);
      if (Number.isInteger(id) && id > 0 && !parents.has(id))
        parents.set(id, { product, categoryName: result.config.sourceName });
    }
  }

  const rows: StagedPriceRow[] = [];
  const variableParents: Array<{ product: TumaProduct; categoryName: string; variation: TumaVariationReference }> = [];
  for (const { product, categoryName } of parents.values()) {
    if (product.variations?.length) {
      for (const variation of product.variations) variableParents.push({ product, categoryName, variation });
      continue;
    }
    const row = parseTumaProductRow({ product, categoryName, marketName: store.name, observedAt });
    if (row) rows.push(row);
  }

  const variationRows = await mapWithConcurrency(variableParents, 5, async ({ product, categoryName, variation }) => {
    const variationId = Number(variation.id);
    if (!Number.isInteger(variationId) || variationId <= 0) return null;
    const payload = asProducts([(await fetchTumaJson(`${TUMA250_PRODUCTS_URL}/${variationId}`)).payload])[0];
    return parseTumaProductRow({
      product: payload,
      categoryName,
      marketName: store.name,
      observedAt,
      parentId: Number(product.id),
      inheritedName: product.name,
      inheritedAttributes: variation.attributes,
    });
  });
  rows.push(...variationRows.filter((row): row is StagedPriceRow => row !== null));
  if (!rows.length) throw new Error("Tuma250 returned no valid RWF product prices for the selected categories.");

  await ensureTargetCategories(store.id);
  return stagePriceRows({
    adminId,
    source: TUMA250_SOURCE,
    sourceUrl: TUMA250_PRODUCTS_URL,
    targetStoreSlug,
    snapshotDate: observedAt,
    rows,
  });
}
