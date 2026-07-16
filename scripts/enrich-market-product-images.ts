import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const RETRY_FAILED_ONLY = process.argv.includes("--retry-failed");
const OUTPUT_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "images",
  "market-products",
  "open-food-facts",
);
const MANIFEST_PATH = path.join(
  process.cwd(),
  "data",
  "market-product-image-sources.json",
);
const USER_AGENT = "KarameBay/0.1 (karamebay3@gmail.com)";
const FALLBACKS = new Set([
  "",
  "/images/default-market.svg",
  "/images/default-product.jpg",
]);

// One search per brand can match several local products while staying well
// inside Open Food Facts' documented search rate limit.
const BRAND_QUERIES = [
  "Akabanga",
  "Anny",
  "ASAD",
  "Azam",
  "Barilla",
  "Basso",
  "Bella",
  "Boni",
  "Butterfly",
  "Cirio",
  "Cock Brand",
  "Colavita",
  "Costa d'Oro",
  "Don Cici",
  "Ecomil",
  "Everyday",
  "Farmer's Choice",
  "Foreway",
  "Freshly",
  "Fruit of the Earth",
  "Goya",
  "Jambo",
  "Kaset Brand",
  "Lima",
  "Lobo",
  "Macarico",
  "Mayfair",
  "Mr Naga",
  "Mutti",
  "Nando's",
  "Nezo",
  "Plant'njoy",
  "Rummo",
  "Savor",
  "Smiling Fish",
  "Sofra",
  "Soyfresh",
  "Sriracha",
  "Tropiway",
  "Zwan",
] as const;

const RETRY_QUERIES = [
  "Akabanga",
  "Anny",
  "Basso",
  "Cirio",
  "Costa d'Oro",
  "Farmer's Choice",
  "Foreway",
  "Jambo",
  "Lobo",
  "Mr Naga",
  "Nezo",
  "Savor",
  "Smiling Fish",
  "Soyfresh",
  "Tropiway",
] as const;

type OffProduct = {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  image_url?: string;
};

type ManifestEntry = {
  productId: string;
  productName: string;
  localPath: string;
  source: "Open Food Facts";
  sourceProductCode: string;
  sourceImageUrl: string;
  matchedName: string;
  score: number;
  license: "CC BY-SA";
  importedAt: string;
};

const STOP_WORDS = new Set([
  "a",
  "and",
  "au",
  "avec",
  "de",
  "des",
  "du",
  "en",
  "in",
  "la",
  "le",
  "of",
  "or",
  "the",
  "with",
]);

function normalizedTokens(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|cl|l|litre|liter|pcs?|pieces?)\b/g, " $1$2 ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function quantityTokens(value: string) {
  return new Set(
    normalizedTokens(value).filter((token) => /^\d+(?:[.,]\d+)?(?:kg|g|gr|ml|cl|l)?$/.test(token)),
  );
}

function scoreMatch(localName: string, candidate: OffProduct) {
  const candidateName = [candidate.product_name, candidate.generic_name, candidate.brands]
    .filter(Boolean)
    .join(" ");
  const localTokens = new Set(normalizedTokens(localName));
  const candidateTokens = new Set(normalizedTokens(candidateName));
  const shared = [...localTokens].filter((token) => candidateTokens.has(token));
  const union = new Set([...localTokens, ...candidateTokens]);
  const overlap = shared.length / Math.max(1, union.size);
  const coverage = shared.length / Math.max(1, Math.min(localTokens.size, candidateTokens.size));

  const localQuantities = quantityTokens(localName);
  const candidateQuantities = quantityTokens(
    `${candidate.product_name ?? ""} ${candidate.quantity ?? ""}`,
  );
  const quantityConflict =
    localQuantities.size > 0 &&
    candidateQuantities.size > 0 &&
    ![...localQuantities].some((quantity) => candidateQuantities.has(quantity));

  if (quantityConflict) return 0;
  if (shared.length < 2 && coverage < 0.99) return 0;

  return Math.min(1, overlap * 0.45 + coverage * 0.55);
}

async function searchOpenFoodFacts(query: string) {
  const parameters = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "50",
    fields:
      "code,product_name,generic_name,brands,quantity,image_front_url,image_url",
  });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${parameters}`,
      { headers: { "User-Agent": USER_AGENT } },
    );
    if (response.ok) {
      const payload = (await response.json()) as { products?: OffProduct[] };
      return (payload.products ?? []).filter(
        (product) => product.code && (product.image_front_url || product.image_url),
      );
    }
    if (response.status !== 503 || attempt === 3)
      throw new Error(`Open Food Facts returned ${response.status} for ${query}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 10_000));
  }
  return [];
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ManifestEntry[];
  } catch {
    return [];
  }
}

async function main() {
  const store = await db.store.findFirst({
    where: { OR: [{ slug: "kimironko-market" }, { name: "Karame Bay Market" }] },
    select: { id: true, name: true },
  });
  if (!store) throw new Error("Karame Bay Market was not found.");

  const products = await db.marketplaceProduct.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true, imageUrl: true },
    orderBy: { name: "asc" },
  });
  const unmatched = products.filter((product) =>
    FALLBACKS.has(product.imageUrl?.trim() ?? ""),
  );
  const candidates: OffProduct[] = [];

  const queries = RETRY_FAILED_ONLY ? RETRY_QUERIES : BRAND_QUERIES;
  for (const [index, query] of queries.entries()) {
    try {
      const results = await searchOpenFoodFacts(query);
      candidates.push(...results);
      console.log(`[${index + 1}/${queries.length}] ${query}: ${results.length} image candidates`);
    } catch (error) {
      console.warn(`[${index + 1}/${queries.length}] ${query}: ${String(error)}`);
    }
    if (index < queries.length - 1) await new Promise((resolve) => setTimeout(resolve, 7_500));
  }

  const uniqueCandidates = [
    ...new Map(candidates.map((candidate) => [candidate.code, candidate])).values(),
  ];
  const matches = unmatched
    .map((product) => {
      const ranked = uniqueCandidates
        .map((candidate) => ({ candidate, score: scoreMatch(product.name, candidate) }))
        .sort((left, right) => right.score - left.score);
      return { product, ...ranked[0] };
    })
    .filter(
      (match): match is typeof match & { candidate: OffProduct } =>
        Boolean(match.candidate?.code) && match.score >= 0.72,
    );

  console.log(`Found ${matches.length} high-confidence matches for ${unmatched.length} fallback products.`);
  if (!APPLY) {
    for (const match of matches.slice(0, 50)) {
      console.log(
        `${match.product.name} -> ${match.candidate.product_name} (${match.score.toFixed(2)})`,
      );
    }
    console.log("Dry run only. Re-run with --apply to download and save matches.");
    return;
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  const manifest = await loadManifest();
  const manifestByProduct = new Map(manifest.map((entry) => [entry.productId, entry]));
  let saved = 0;

  for (const match of matches) {
    const sourceImageUrl =
      match.candidate.image_front_url ?? match.candidate.image_url;
    if (!sourceImageUrl || !match.candidate.code) continue;

    try {
      const response = await fetch(sourceImageUrl, { headers: { "User-Agent": USER_AGENT } });
      if (!response.ok) throw new Error(`image returned ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) throw new Error("source did not return an image");
      const extension = contentType.includes("png") ? "png" : "jpg";
      const filename = `${match.product.id}.${extension}`;
      const diskPath = path.join(OUTPUT_DIRECTORY, filename);
      const publicPath = `/images/market-products/open-food-facts/${filename}`;
      await writeFile(diskPath, Buffer.from(await response.arrayBuffer()));
      await db.marketplaceProduct.update({
        where: { id: match.product.id },
        data: { imageUrl: publicPath },
      });
      manifestByProduct.set(match.product.id, {
        productId: match.product.id,
        productName: match.product.name,
        localPath: publicPath,
        source: "Open Food Facts",
        sourceProductCode: match.candidate.code,
        sourceImageUrl,
        matchedName: match.candidate.product_name ?? match.candidate.generic_name ?? "",
        score: Number(match.score.toFixed(3)),
        license: "CC BY-SA",
        importedAt: new Date().toISOString(),
      });
      saved += 1;
      console.log(`Saved ${match.product.name}`);
    } catch (error) {
      console.warn(`Skipped ${match.product.name}: ${String(error)}`);
    }
  }

  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify([...manifestByProduct.values()], null, 2)}\n`,
    "utf8",
  );
  console.log(`Saved ${saved} verified local product images.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
