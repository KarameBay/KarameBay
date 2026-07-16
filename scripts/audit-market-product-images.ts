import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const FALLBACKS = new Set([
  "",
  "/images/default-market.svg",
  "/images/default-product.jpg",
]);

async function main() {
  const store = await db.store.findFirst({
    where: { OR: [{ slug: "kimironko-market" }, { name: "Karame Bay Market" }] },
    select: { id: true, name: true },
  });

  if (!store) throw new Error("Karame Bay Market was not found.");

  const products = await db.marketplaceProduct.findMany({
    where: { storeId: store.id },
    select: { imageUrl: true },
  });

  const verified = products.filter(
    (product) => !FALLBACKS.has(product.imageUrl?.trim() ?? ""),
  ).length;

  console.log(
    JSON.stringify(
      {
        store: store.name,
        totalProducts: products.length,
        verifiedImages: verified,
        fallbackImages: products.length - verified,
      },
      null,
      2,
    ),
  );

}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
