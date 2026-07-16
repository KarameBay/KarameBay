import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const stores = await db.store.findMany({
    include: {
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
  const markets = stores.filter((store) =>
    ["kimironko-market", "zinia-kicukiro-market"].includes(store.slug),
  );
  if (!restaurant || restaurant.catalogEngine !== "RESTAURANT")
    throw new Error("Java House is not using the restaurant engine");
  if (!restaurant.restaurantProfile || !restaurant.restaurantProducts.length)
    throw new Error("Restaurant profile or menu products are missing");
  if (restaurant.marketplaceProducts.length)
    throw new Error("Restaurant contains marketplace products");
  if (markets.length !== 2) throw new Error("Phase 1 markets are missing");
  for (const market of markets) {
    if (market.catalogEngine !== "MARKETPLACE" || !market.marketplaceProfile)
      throw new Error(`${market.name} is not using the marketplace engine`);
    if (market.restaurantProducts.length)
      throw new Error(`${market.name} contains restaurant products`);
    if (
      market.marketplaceProducts.some(
        (product) => !product.units.length || !product.inventory,
      )
    )
      throw new Error(`${market.name} has products without units or inventory`);
  }
  const [kimironko, zinia] = markets;
  const ziniaIds = new Set(
    zinia.marketplaceProducts.map((product) => product.id),
  );
  if (kimironko.marketplaceProducts.some((product) => ziniaIds.has(product.id)))
    throw new Error("Market catalogs are not independent");
  console.log(
    JSON.stringify(
      {
        restaurant: {
          name: restaurant.name,
          products: restaurant.restaurantProducts.length,
        },
        markets: markets.map((market) => ({
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
