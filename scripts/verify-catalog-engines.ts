import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const stores = await db.store.findMany({
    include: {
      storeType: true,
      restaurantProfile: true,
      marketplaceProfile: true,
      restaurantProducts: true,
      marketplaceProducts: {
        include: { units: true, inventory: true },
      },
    },
  });
  const restaurant = stores.find(
    (store) => store.slug === "java-house-kigali-heights",
  );
  const market = stores.find((store) => store.slug === "kimironko-market");
  if (!restaurant || restaurant.catalogEngine !== "RESTAURANT")
    throw new Error("Java House is not using the restaurant engine");
  if (
    restaurant.storeType?.slug !== "restaurants" ||
    restaurant.storeType.commerceEngine !== "RESTAURANT"
  )
    throw new Error("Java House is not assigned to the Restaurant store type");
  if (!restaurant.restaurantProfile || !restaurant.restaurantProducts.length)
    throw new Error("Restaurant profile or menu products are missing");
  if (restaurant.marketplaceProducts.length)
    throw new Error("Restaurant contains marketplace products");
  if (!market || market.name !== "Karame Bay Market")
    throw new Error("Karame Bay Market is missing");
  if (market.catalogEngine !== "MARKETPLACE" || !market.marketplaceProfile)
    throw new Error("Karame Bay Market is not using the marketplace engine");
  if (
    market.storeType?.slug !== "markets" ||
    market.storeType.commerceEngine !== "RETAIL"
  )
    throw new Error("Karame Bay Market is not assigned to the Market store type");
  if (market.restaurantProducts.length)
    throw new Error("Karame Bay Market contains restaurant products");
  if (market.marketplaceProducts.some((product) => !product.units.length || !product.inventory))
    throw new Error("Karame Bay Market has products without units or inventory");
  console.log(
    JSON.stringify(
      {
        restaurant: {
          name: restaurant.name,
          products: restaurant.restaurantProducts.length,
        },
        markets: [market].map((market) => ({
          name: market.name,
          products: market.marketplaceProducts.length,
          units: market.marketplaceProducts.reduce(
            (sum, product) => sum + product.units.length,
            0,
          ),
        })),
        result: "PASS",
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
