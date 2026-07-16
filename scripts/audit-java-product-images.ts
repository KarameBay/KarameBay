import { PrismaClient } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();
const imageRoot = "/images/java-house-products/";
const manifestPath = path.join(process.cwd(), "public", "images", "java-house-products", "sources.json");

const verified: Record<string, string> = {
  "Java Continental Breakfast": `${imageRoot}full-breakfast-plate-eggs-toast-vegetables.jpg`,
  "Full Java Breakfast": `${imageRoot}full-breakfast-plate-eggs-toast-vegetables.jpg`,
  "Full Java Breakfast Combo": `${imageRoot}full-breakfast-plate-eggs-toast-vegetables.jpg`,
  "Breakfast Maxi Combo": `${imageRoot}full-breakfast-plate-eggs-toast-vegetables.jpg`,
  "Breakfast Sandwich": `${imageRoot}egg-breakfast-sandwich-2.jpg`,
  "Breakfast Egg and Cheese Sandwich": `${imageRoot}breakfast-egg-and-cheese-sandwich-food.jpg`,
  "Breakfast Burritos": `${imageRoot}egg-cheese-breakfast-burrito.jpg`,
  "Burrito with Egg & Cheese and Meat": `${imageRoot}egg-cheese-breakfast-burrito.jpg`,
  "Breakfast Burrito Combo": `${imageRoot}egg-cheese-breakfast-burrito.jpg`,
  Pancakes: `${imageRoot}stack-of-pancakes.jpg`,
  "Pancake Combo": `${imageRoot}pancakes-breakfast-plate.jpg`,
  "Plain Omelette": `${imageRoot}omelette-breakfast-plate.jpg`,
  "Denver Omelette": `${imageRoot}omelette-breakfast-plate.jpg`,
  "Mushroom Basil and Cheese": `${imageRoot}omelette-breakfast-plate.jpg`,
  "Build Your Own Omelette": `${imageRoot}omelette-breakfast-plate.jpg`,
  "Spanish Omelette": `${imageRoot}spanish-omelette-breakfast-food.jpg`,
  Macchiato: `${imageRoot}macchiato-coffee-drink.jpg`,
  "Caramel Macchiato": `${imageRoot}caramel-macchiato-coffee-drink.jpg`,
  Cappuccino: `${imageRoot}cappuccino-coffee-drink.jpg`,
  "Malindi Macchiato": `${imageRoot}macchiato-coffee-glass.jpg`,
  "Lemon Tea": `${imageRoot}lemon-tea-hot-tea-drink.jpg`,
  "Flavored Dawas Minty": `${imageRoot}hot-tea-cup.jpg`,
  "Masala Tea": `${imageRoot}hot-tea-cup.jpg`,
  "Malindi Chai Latte": `${imageRoot}hot-tea-cup.jpg`,
  "Java Dawa": `${imageRoot}hot-tea-cup.jpg`,
  "Green Tea Pot": `${imageRoot}hot-tea-cup.jpg`,
  "Hot Chocolate": `${imageRoot}verified-hot-chocolate.jpg`,
  "Cinnamon Dawa": `${imageRoot}hot-tea-cup.jpg`,
  "Tumeric Dawa": `${imageRoot}hot-tea-cup.jpg`,
  "Iced Coffee": `${imageRoot}iced-coffee-cold-iced-drink.webp`,
  "Iced Latte": `${imageRoot}iced-latte-cold-iced-drink.jpg`,
  "Iced Vanilla Latte": `${imageRoot}iced-latte-cold-iced-drink.jpg`,
  "Iced Mocha": `${imageRoot}iced-latte-cold-iced-drink.jpg`,
  "Iced White Chocolate Mocha": `${imageRoot}iced-latte-cold-iced-drink.jpg`,
  "Iced Malindi Macchiato": `${imageRoot}iced-latte-cold-iced-drink.jpg`,
  "Iced Caramel Macchiato": `${imageRoot}iced-latte-cold-iced-drink.jpg`,
  "Strawberry milkshake": `${imageRoot}verified-strawberry-milkshake.jpg`,
  "Green Smoothie": `${imageRoot}green-smoothie-smoothie-glass.jpg`,
  "Caesar Salad": `${imageRoot}caesar-salad-salad-bowl-food.jpg`,
  "Caesar Salad with grilled chicken": `${imageRoot}caesar-salad-with-grilled-chicken-salad-bowl-food.jpg`,
  "Caribbean Chicken Salad": `${imageRoot}grilled-chicken-salad-bowl.jpg`,
  "Califonia Garden Salad": `${imageRoot}fresh-garden-salad-bowl.jpg`,
  "Crispy Chicken Breast Salad": `${imageRoot}grilled-chicken-salad-bowl.jpg`,
  "BBQ chicken loaded fries": `${imageRoot}loaded-chicken-fries.jpg`,
  "Tuna Sandwich": `${imageRoot}tuna-sandwich-sandwich-food.jpg`,
  "Avocado, Cheese & Tomato Sandwich": `${imageRoot}avocado-cheese-tomato-sandwich-sandwich-food.jpg`,
  "Chicken & Cheese": `${imageRoot}chicken-cheese-sandwich-food.jpg`,
  "Roast Half Chicken": `${imageRoot}roast-half-chicken-food-dish.jpg`,
  "Beef Burger": `${imageRoot}beef-burger-burger-food.jpg`,
  "Beef Cheese Burger": `${imageRoot}beef-cheese-burger-burger-food.jpg`,
  "Ben's Burger": `${imageRoot}ben-s-burger-burger-food.jpg`,
  "Bacon Cheese Burger": `${imageRoot}bacon-cheese-burger-burger-food.jpg`,
  "Double-Double Burger": `${imageRoot}double-double-burger-burger-food.jpg`,
  "Grilled Chicken Burger": `${imageRoot}grilled-chicken-burger-burger-food.jpg`,
  "Grilled Chicken Cheese Burger": `${imageRoot}grilled-chicken-burger-burger-food.jpg`,
  "Veggie Burger": `${imageRoot}vegetable-burger.jpg`,
  "Veggie Cheese Burger": `${imageRoot}vegetable-burger.jpg`,
  "Cheese Quesadilla": `${imageRoot}cheese-quesadilla-mexican-food.jpg`,
  "Chicken Quesadilla": `${imageRoot}chicken-quesadilla-mexican-food.jpg`,
  "Chocolate Fudge Cake": `${imageRoot}verified-chocolate-fudge-cake.jpg`,
  "Banana Split": `${imageRoot}banana-split-dessert-food.jpg`,
  "Chocolate Chip Cookie Sundae": `${imageRoot}ice-cream-sundae.jpg`,
  "Brownie Fudge Sundae": `${imageRoot}ice-cream-sundae.jpg`,
  Spinach: `${imageRoot}spinach-food-side-dish.jpg`,
  Bacon: `${imageRoot}cooked-bacon.jpg`,
  Egg: `${imageRoot}egg-food-side-dish.jpg`,
  "White Rice": `${imageRoot}white-rice-food-side-dish.jpg`,
  Chapati: `${imageRoot}chapati-flatbread.jpg`,
  "Chai Latte": `${imageRoot}hot-tea-cup.jpg`,
  "Peach tea": `${imageRoot}hot-tea-cup.jpg`,
  "Crispy Crown Beef Burger": `${imageRoot}beef-cheese-burger-burger-food.jpg`,
  "Crispy Crown Chicken Burger": `${imageRoot}grilled-chicken-burger-burger-food.jpg`,
  "Chicken Masala Burger": `${imageRoot}grilled-chicken-burger-burger-food.jpg`,
  "Mineral Water": `${imageRoot}rwanda-inyange-water-500ml.jpg`,
};

async function main() {
  const store = await db.store.findFirst({ where: { name: { contains: "Java House" } }, select: { id: true, name: true } });
  if (!store) throw new Error("Java House store was not found.");

  // Only clear images created by the automated matcher. Admin uploads and external URLs are preserved.
  await db.restaurantProduct.updateMany({
    where: { storeId: store.id, imageUrl: { startsWith: imageRoot } },
    data: { imageUrl: null },
  });

  let assigned = 0;
  for (const [name, imageUrl] of Object.entries(verified)) {
    const result = await db.restaurantProduct.updateMany({ where: { storeId: store.id, name }, data: { imageUrl } });
    assigned += result.count;
  }

  const products = await db.restaurantProduct.findMany({
    where: { storeId: store.id },
    select: { imageUrl: true },
  });

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
  manifest[`${imageRoot}verified-hot-chocolate.jpg`] = {
    query: "cup hot chocolate drink",
    localPath: `${imageRoot}verified-hot-chocolate.jpg`,
    title: "Hot Chocolate",
    license: "cc0",
    sourceImage: "https://cdn.stocksnap.io/img-thumbs/960w/NOXXUWUBGJ.jpg",
    openverseId: "a02c14a3-5fb8-4981-b3c5-d21f91358bed",
  };
  manifest[`${imageRoot}verified-strawberry-milkshake.jpg`] = {
    query: "strawberry milkshake glass",
    localPath: `${imageRoot}verified-strawberry-milkshake.jpg`,
    title: "Strawberry mint milkshake",
    license: "cc0",
    sourceImage: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1Yi0wMjU2LXN0cmF3YmVycnktbWludC1taWxrc2hha2UuanBn.jpg",
    openverseId: "b6738722-7895-4012-b230-9f6f88aa9c35",
  };
  manifest[`${imageRoot}verified-chocolate-fudge-cake.jpg`] = {
    query: "chocolate fudge cake slice",
    localPath: `${imageRoot}verified-chocolate-fudge-cake.jpg`,
    title: "A piece of chocolate fudge cake with whipped cream and strawberry",
    license: "cc0",
    sourceImage: "https://pd.w.org/2024/02/42065bde310971e20.84713582-2048x1536.jpeg",
    openverseId: "8da104ca-bb0d-4859-97eb-6bc81bbadfc7",
  };
  manifest[`${imageRoot}rwanda-inyange-water.png`] = {
    query: "Inyange mineral water Rwanda",
    localPath: `${imageRoot}rwanda-inyange-water.png`,
    title: "Inyange Natural Mineral Water",
    license: "official product image",
    sourcePage: "https://www.inyangeindustries.com/products",
    sourceImage: "https://www.inyangeindustries.com/img/products/Inyange-Water-image-1.png",
    publisher: "Inyange Industries",
    country: "Rwanda",
  };
  manifest[`${imageRoot}rwanda-inyange-water-500ml.jpg`] = {
    query: "Inyange mineral water 500ml Rwanda",
    localPath: `${imageRoot}rwanda-inyange-water-500ml.jpg`,
    title: "Inyange Mineral Water 500ML",
    license: "local retailer product image",
    sourcePage: "https://rwandamart.rw/product/inyange-mineral-water-500ml-2/",
    sourceImage: "https://rwandamart.rw/wp-content/uploads/2026/02/inyangeSmall-500x500-1.jpg",
    publisher: "RwandaMart",
    country: "Rwanda",
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const matched = products.filter((product) => product.imageUrl).length;
  console.log(`${store.name}: ${matched} visually verified assignments; ${products.length - matched} use the default image. (${assigned} rows assigned in this pass)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
