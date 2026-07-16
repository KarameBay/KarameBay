import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { PASSWORD_HASH_ROUNDS } from "../src/lib/auth/constants";

const db = new PrismaClient();
if (process.env.NODE_ENV === "production") {
  throw new Error("Database seeding is disabled in production.");
}
if (process.env.ALLOW_DEVELOPMENT_SEED !== "true") {
  throw new Error(
    "Development seeding is locked. Set ALLOW_DEVELOPMENT_SEED=true only for a disposable database.",
  );
}
function requiredSeedPassword() {
  const value = process.env.SEED_ACCOUNT_PASSWORD;
  if (!value || value.length < 12) {
    throw new Error("SEED_ACCOUNT_PASSWORD must contain at least 12 characters.");
  }
  return value;
}
const password = requiredSeedPassword();

function normalizedProductName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function user(
  email: string,
  phone: string,
  firstName: string,
  lastName: string,
  role: string,
) {
  return db.user.upsert({
    where: { email },
    update: { phone, firstName, lastName, role, status: "ACTIVE", ...(role === "CUSTOMER" ? { emailVerifiedAt: new Date() } : {}) },
    create: {
      email,
      phone,
      firstName,
      lastName,
      role,
      status: "ACTIVE",
      passwordHash: await hash(password, PASSWORD_HASH_ROUNDS),
      ...(role === "CUSTOMER" ? { emailVerifiedAt: new Date() } : {}),
    },
  });
}

async function main() {
  const admin = await user(
    "admin@karamebay.rw",
    "+250788000001",
    "Karame",
    "Admin",
    "ADMIN",
  );
  const rider = await user(
    "rider@karamebay.rw",
    "+250788000002",
    "Eric",
    "Rider",
    "RIDER",
  );
  await db.riderProfile.upsert({
    where: { userId: rider.id },
    update: {
      riderStatus: "AVAILABLE",
      vehicleType: "MOTORCYCLE",
      licensePlate: "RAC 2026",
      photoUrl: null,
      onlineSinceAt: new Date(),
      lastSeenAt: new Date(),
      rating: 4.8,
      averageDeliveryMinutes: 24,
      averagePickupMinutes: 8,
      completedDeliveriesCount: 0,
      cancelledDeliveriesCount: 0,
      totalEarningsRwf: 0,
    },
    create: {
      userId: rider.id,
      riderStatus: "AVAILABLE",
      vehicleType: "MOTORCYCLE",
      licensePlate: "RAC 2026",
      photoUrl: null,
      onlineSinceAt: new Date(),
      lastSeenAt: new Date(),
      rating: 4.8,
      averageDeliveryMinutes: 24,
      averagePickupMinutes: 8,
      completedDeliveriesCount: 0,
      cancelledDeliveriesCount: 0,
      totalEarningsRwf: 0,
    },
  });
  const customer = await user(
    "customer@karamebay.rw",
    "+250788000003",
    "Aline",
    "Customer",
    "CUSTOMER",
  );

  const stores = [
    {
      ownerId: admin.id,
      slug: "java-house-kigali-heights",
      name: "Java House Kigali Heights",
      type: "RESTAURANT",
      catalogEngine: "RESTAURANT",
      description: "Coffee, breakfast and casual dining at Kigali Heights.",
      address: "Kigali Heights, KG 7 Avenue, Kigali",
      rating: 4.8,
      featured: true,
      minimumOrderRwf: 3000,
      preparationMinutes: 20,
      phone: "+250788300000",
      latitude: -1.9536,
      longitude: 30.0935,
      opensAt: "07:00",
      closesAt: "22:00",
    },
    {
      ownerId: admin.id,
      slug: "kimironko-market",
      name: "Kimironko Market",
      type: "MARKET",
      catalogEngine: "MARKETPLACE",
      description:
        "Fresh produce and daily essentials from Kigali's trusted market.",
      address: "Kimironko Market, Gasabo, Kigali",
      rating: 4.7,
      featured: true,
      minimumOrderRwf: 2000,
      preparationMinutes: 25,
      phone: "+250788300001",
      latitude: -1.9487,
      longitude: 30.1265,
      opensAt: "06:00",
      closesAt: "20:00",
    },
    {
      ownerId: admin.id,
      slug: "zinia-kicukiro-market",
      name: "Zinia Kicukiro Market",
      type: "MARKET",
      catalogEngine: "MARKETPLACE",
      description: "Fresh groceries and household essentials in Kicukiro.",
      address: "Zinia Market, Kicukiro, Kigali",
      rating: 4.6,
      featured: true,
      minimumOrderRwf: 2000,
      preparationMinutes: 25,
      phone: "+250788300002",
      latitude: -1.9858,
      longitude: 30.1044,
      opensAt: "06:00",
      closesAt: "20:00",
    },
  ];
  for (const store of stores) {
    await db.store.upsert({
      where: { slug: store.slug },
      update: store,
      create: store,
    });
  }

  const categories = [
    { slug: "coffee-tea", name: "Coffee & Tea", sortOrder: 1 },
    { slug: "tea-chocolate", name: "Tea & Chocolate", sortOrder: 2 },
    { slug: "breakfast", name: "Breakfast", sortOrder: 3 },
    { slug: "bakery", name: "Bakery", sortOrder: 4 },
    { slug: "beverages", name: "Beverages", sortOrder: 5 },
    { slug: "desserts", name: "Desserts", sortOrder: 6 },
    { slug: "burgers", name: "Burgers", sortOrder: 7 },
    { slug: "sandwiches-wraps", name: "Sandwiches & Wraps", sortOrder: 8 },
    {
      slug: "salads-snacks-sides",
      name: "Salads, Snacks & Sides",
      sortOrder: 9,
    },
    { slug: "signature-dishes", name: "Signature Dishes", sortOrder: 10 },
    { slug: "soups", name: "Soups", sortOrder: 11 },
    { slug: "smoothies-shakes", name: "Smoothies & Shakes", sortOrder: 12 },
    { slug: "roast-coffee", name: "Roast Coffee", sortOrder: 13 },
    { slug: "fruits", name: "Fruits", sortOrder: 14 },
    { slug: "vegetables", name: "Vegetables", sortOrder: 15 },
    { slug: "dairy-eggs", name: "Dairy & Eggs", sortOrder: 16 },
    { slug: "pantry", name: "Pantry", sortOrder: 17 },
  ];
  const categoryIds: Record<string, string> = {};
  for (const category of categories) {
    const saved = await db.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    categoryIds[category.slug] = saved.id;
  }

  const storeRows = await db.store.findMany({
    select: { id: true, slug: true },
  });
  const storeIds = Object.fromEntries(
    storeRows.map((store) => [store.slug, store.id]),
  );
  const marketProducts = [
    ["fresh-avocados", "Fresh Avocados", "fruits", 1500, "Pack of 3"],
    ["ripe-bananas", "Ripe Bananas", "fruits", 1200, "1 kg"],
    ["fresh-tomatoes", "Fresh Tomatoes", "vegetables", 1000, "1 kg"],
    ["passion-fruit", "Passion Fruit", "fruits", 1800, "500 g"],
    ["garden-carrots", "Garden Carrots", "vegetables", 900, "1 kg"],
    ["country-eggs", "Country Eggs", "dairy-eggs", 3500, "Tray of 12"],
    ["whole-milk", "Whole Milk", "dairy-eggs", 1400, "1 litre"],
    ["artisan-bread", "Artisan Bread", "bakery", 2200, "1 loaf"],
  ] as const;
  const javaProducts = [
    ["house-coffee", "House Coffee", "coffee-tea", 2500, "Cup"],
    ["espresso", "Espresso", "coffee-tea", 2500, "Cup"],
    ["macchiato", "Macchiato", "coffee-tea", 3000, "Cup"],
    ["americano", "Americano", "coffee-tea", 2500, "Cup"],
    ["cappuccino", "Cappuccino", "coffee-tea", 3000, "Cup"],
    ["cafe-latte", "Café Latte", "coffee-tea", 3500, "Cup"],
    ["vanilla-latte", "Vanilla Latte", "coffee-tea", 3500, "Cup"],
    ["mocha", "Mocha", "coffee-tea", 3500, "Cup"],
    ["malindi-macchiato", "Malindi Macchiato", "coffee-tea", 3500, "Cup"],
    ["caramel-macchiato", "Caramel Macchiato", "coffee-tea", 3500, "Cup"],
    ["masala-tea", "Regular / Masala Tea", "tea-chocolate", 2500, "Pot"],
    ["green-herbal-tea", "Green Tea / Herbal", "tea-chocolate", 2500, "Cup"],
    ["malindi-chai-latte", "Malindi Chai Latte", "tea-chocolate", 3500, "Cup"],
    ["hot-chocolate", "Hot Chocolate", "tea-chocolate", 3000, "Cup"],
    ["tea-pot", "Tea Pot", "tea-chocolate", 3500, "Pot"],
    ["java-dawa", "Java Dawa", "tea-chocolate", 3000, "Cup"],
    [
      "hot-lemon-ginger-honey",
      "Hot Lemon & Ginger with Honey",
      "tea-chocolate",
      3000,
      "Cup",
    ],
    ["java-full-breakfast", "Java Full Breakfast", "breakfast", 11000, "1 serving"],
    [
      "breakfast-sandwich-combo",
      "Breakfast Sandwich Combo",
      "breakfast",
      10000,
      "1 serving",
    ],
    ["steak-and-eggs", "Steak and Eggs", "breakfast", 10000, "1 serving"],
    ["build-your-own-omelette", "Build Your Own Omelette", "breakfast", 5000, "1 serving"],
    ["rolex", "Rolex", "breakfast", 5000, "1 serving"],
    ["hot-oatmeal-porridge", "Hot Oatmeal Porridge", "breakfast", 6000, "1 bowl"],
    ["java-continental-breakfast", "Java Continental Breakfast", "breakfast", 11000, "1 serving"],
    ["chicken-fajita-wrap", "Chicken Fajita Wrap", "sandwiches-wraps", 9000, "1 serving"],
    ["bbq-chicken-wings", "BBQ Chicken Wings", "salads-snacks-sides", 5500, "1 serving"],
    ["breakfast-combo-drink-choice", "Breakfast Combo Drink Choice", "breakfast", 10000, "1 serving"],
    ["black-forest-cake", "Black Forest Cake", "bakery", 4500, "Slice"],
    ["chocolate-fudge-cake", "Chocolate Fudge Cake", "bakery", 4500, "Slice"],
    ["carrot-cake", "Carrot Cake", "bakery", 4500, "Slice"],
    ["red-velvet-cake", "Red Velvet Cake", "bakery", 5500, "Slice"],
    ["plain-croissant", "Plain Croissant", "bakery", 2500, "1 piece"],
    ["banana-bread", "Banana Bread", "bakery", 3500, "1 piece"],
    ["scoop-of-ice-cream", "Scoop of Ice Cream", "desserts", 2500, "1 scoop"],
    ["hot-fudge-sundae", "Hot Fudge Sundae", "desserts", 5000, "1 serving"],
    ["banana-split", "Banana Split", "desserts", 6000, "1 serving"],
    ["brownie-fudge-sundae", "Brownie Fudge Sundae", "desserts", 6500, "1 serving"],
    ["double-double-burger", "Double Double Burger", "burgers", 12000, "1 serving"],
    ["hawaiian-burger", "Hawaiian Burger", "burgers", 12500, "1 serving"],
    ["crunchy-chicken-burger", "Crunchy Chicken Burger", "burgers", 10000, "1 serving"],
    ["chicken-burger", "Chicken Burger", "burgers", 9000, "1 serving"],
    ["beef-burger", "Beef Burger", "burgers", 9000, "1 serving"],
    ["beef-cheese-burger", "Beef Cheese Burger", "burgers", 9500, "1 serving"],
    [
      "bbq-chicken-club-sandwich",
      "BBQ Chicken Club Sandwich",
      "sandwiches-wraps",
      6500,
      "1 serving",
    ],
    ["halloumi-avocado", "Halloumi & Avocado", "sandwiches-wraps", 7500, "1 serving"],
    ["chicken-cheese", "Chicken & Cheese", "sandwiches-wraps", 6500, "1 serving"],
    ["croque-monsieur", "Croque Monsieur", "sandwiches-wraps", 6500, "1 serving"],
    ["tuna-melt-sandwich", "Tuna Melt Sandwich", "sandwiches-wraps", 9000, "1 serving"],
    ["chicken-avocado-wrap", "Chicken & Avocado Wrap", "sandwiches-wraps", 8000, "1 serving"],
    ["caesar-salad", "Caesar Salad", "salads-snacks-sides", 5500, "1 bowl"],
    [
      "california-garden-salad",
      "California Garden Salad with spicy chicken",
      "salads-snacks-sides",
      7000,
      "1 bowl",
    ],
    ["giant-samosa", "Giant Samosa", "salads-snacks-sides", 3000, "1 piece"],
    ["chicken-pie", "Chicken Pie", "salads-snacks-sides", 4500, "1 piece"],
    ["loaded-fries", "Loaded Fries", "salads-snacks-sides", 11000, "1 serving"],
    ["chips-masala", "Chips Masala", "salads-snacks-sides", 4500, "1 serving"],
    [
      "swahili-coconut-fish-curry",
      "Swahili Coconut Fish Curry",
      "signature-dishes",
      11000,
      "1 serving",
    ],
    ["grilled-fish", "Grilled Fish", "signature-dishes", 11000, "1 serving"],
    ["quarter-chicken-and-chips", "1/4 Chicken and Chips", "signature-dishes", 6000, "1 serving"],
    ["java-special-chicken-curry", "Java Special Chicken Curry", "signature-dishes", 10000, "1 serving"],
    ["grilled-chicken-breast", "Grilled Chicken Breast", "signature-dishes", 10000, "1 serving"],
    ["roast-half-chicken", "Roast Half Chicken", "signature-dishes", 11000, "1 serving"],
    ["iced-tea", "Iced Tea", "beverages", 3500, "Glass"],
    ["iced-coffee", "Iced Coffee", "beverages", 3500, "Glass"],
    ["iced-latte", "Iced Latte", "beverages", 4000, "Glass"],
    ["tropical-smoothie", "Tropical Smoothie", "smoothies-shakes", 4500, "Glass"],
    ["mango-smoothie", "Mango Smoothie", "smoothies-shakes", 4500, "Glass"],
    ["rwanda-lake-kivu", "Rwanda Lake Kivu", "roast-coffee", 7000, "Pack"],
    ["kenya-aa", "Kenya AA", "roast-coffee", 7500, "Pack"],
    ["ethiopia-yirgacheffe", "Ethiopia Yirgacheffe", "roast-coffee", 8500, "Pack"],
  ] as const;
  const productSets: Record<
    string,
    readonly (readonly [string, string, string, number, string])[]
  > = {
    "java-house-kigali-heights": javaProducts,
    "kimironko-market": marketProducts,
    "zinia-kicukiro-market": marketProducts,
  };
  const javaStoreId = storeIds["java-house-kigali-heights"];
  await db.product.deleteMany({ where: { storeId: javaStoreId } });
  await db.restaurantProduct.deleteMany({ where: { storeId: javaStoreId } });
  await db.restaurantCategory.deleteMany({ where: { storeId: javaStoreId } });
  for (const [storeSlug, items] of Object.entries(productSets)) {
    for (const [slug, name, category, priceRwf, unitLabel] of items) {
      await db.product.upsert({
        where: { storeId_slug: { storeId: storeIds[storeSlug], slug } },
        update: {
          name,
          categoryId: categoryIds[category],
          priceRwf,
          unitLabel,
          isAvailable: true,
        },
        create: {
          storeId: storeIds[storeSlug],
          categoryId: categoryIds[category],
          slug,
          name,
          priceRwf,
          unitLabel,
          isAvailable: true,
          description: `Fresh ${name.toLowerCase()} from ${storeSlug === "java-house-kigali-heights" ? "Java House Kigali Heights" : "a trusted Kigali market"}.`,
        },
      });
    }
  }

  const javaRestaurantCategorySlugs = [
    ...new Set(javaProducts.map((item) => item[2])),
  ];
  await db.restaurantProfile.upsert({
    where: { storeId: javaStoreId },
    update: { acceptsSpecialInstructions: true },
    create: { storeId: javaStoreId, acceptsSpecialInstructions: true },
  });
  const restaurantCategoryIds: Record<string, string> = {};
  for (const categorySlug of javaRestaurantCategorySlugs) {
    const category = categories.find((item) => item.slug === categorySlug)!;
    const saved = await db.restaurantCategory.upsert({
      where: { storeId_slug: { storeId: javaStoreId, slug: category.slug } },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: {
        storeId: javaStoreId,
        slug: category.slug,
        name: category.name,
        sortOrder: category.sortOrder,
      },
    });
    restaurantCategoryIds[category.slug] = saved.id;
  }
  for (const [slug, name, category, priceRwf] of javaProducts) {
    await db.restaurantProduct.upsert({
      where: { storeId_slug: { storeId: javaStoreId, slug } },
      update: {
        name,
        categoryId: restaurantCategoryIds[category],
        basePriceRwf: priceRwf,
        isAvailable: true,
      },
      create: {
        storeId: javaStoreId,
        categoryId: restaurantCategoryIds[category],
        slug,
        name,
        description: `${name} from Java House Kigali Heights.`,
        basePriceRwf: priceRwf,
        isAvailable: true,
      },
    });
  }

  const javaMenuAddOns = [
    { name: "Extra Egg", priceRwf: 1000, category: "Breakfast" },
    { name: "Extra Bacon", priceRwf: 1500, category: "Breakfast" },
    { name: "House Sauce", priceRwf: 500, category: "Kitchen" },
    { name: "Plastic Spoon", priceRwf: 0, category: "Cutlery" },
    { name: "Plastic Knife", priceRwf: 0, category: "Cutlery" },
  ] as const;
  const javaMenuAddonIds: Record<string, string> = {};
  for (const addOn of javaMenuAddOns) {
    const saved = await db.restaurantAddOn.upsert({
      where: { storeId_name: { storeId: javaStoreId, name: addOn.name } },
      update: {
        category: addOn.category,
        priceRwf: addOn.priceRwf,
        isAvailable: true,
      },
      create: {
        storeId: javaStoreId,
        name: addOn.name,
        category: addOn.category,
        priceRwf: addOn.priceRwf,
        isAvailable: true,
      },
    });
    javaMenuAddonIds[addOn.name] = saved.id;
  }

  async function upsertChoiceGroup(
    productSlug: string,
    group: {
      name: string;
      required: boolean;
      minChoices: number;
      maxChoices: number;
      sortOrder: number;
      options: readonly {
        name: string;
        priceAdjustmentRwf: number;
        sortOrder: number;
      }[];
    },
  ) {
    const product = await db.restaurantProduct.findUniqueOrThrow({
      where: { storeId_slug: { storeId: javaStoreId, slug: productSlug } },
    });
    const existingGroup = await db.restaurantChoiceGroup.findFirst({
      where: { productId: product.id, name: group.name },
      select: { id: true },
    });
    const savedGroup = existingGroup
      ? await db.restaurantChoiceGroup.update({
          where: { id: existingGroup.id },
          data: {
            required: group.required,
            minChoices: group.minChoices,
            maxChoices: group.maxChoices,
            sortOrder: group.sortOrder,
          },
        })
      : await db.restaurantChoiceGroup.create({
          data: {
            productId: product.id,
            name: group.name,
            required: group.required,
            minChoices: group.minChoices,
            maxChoices: group.maxChoices,
            sortOrder: group.sortOrder,
          },
        });
    for (const option of group.options) {
      const existingOption = await db.restaurantChoiceOption.findFirst({
        where: { groupId: savedGroup.id, name: option.name },
        select: { id: true },
      });
      if (existingOption) {
        await db.restaurantChoiceOption.update({
          where: { id: existingOption.id },
          data: {
            priceAdjustmentRwf: option.priceAdjustmentRwf,
            isAvailable: true,
            sortOrder: option.sortOrder,
          },
        });
      } else {
        await db.restaurantChoiceOption.create({
          data: {
            groupId: savedGroup.id,
            name: option.name,
            priceAdjustmentRwf: option.priceAdjustmentRwf,
            isAvailable: true,
            sortOrder: option.sortOrder,
          },
        });
      }
    }
  }

  await upsertChoiceGroup("chicken-fajita-wrap", {
    name: "Choice of accompaniment",
    required: true,
    minChoices: 1,
    maxChoices: 1,
    sortOrder: 1,
    options: [
      { name: "Garden Salad", priceAdjustmentRwf: 0, sortOrder: 1 },
      { name: "Steamed Vegetables", priceAdjustmentRwf: 0, sortOrder: 2 },
      { name: "Chips", priceAdjustmentRwf: 0, sortOrder: 3 },
      { name: "Fruit Salad", priceAdjustmentRwf: 0, sortOrder: 4 },
    ],
  });
  await upsertChoiceGroup("chicken-fajita-wrap", {
    name: "Choice of cutlery / crockery",
    required: false,
    minChoices: 0,
    maxChoices: 2,
    sortOrder: 2,
    options: [
      { name: "Plastic Spoon", priceAdjustmentRwf: 0, sortOrder: 1 },
      { name: "Plastic Knife", priceAdjustmentRwf: 0, sortOrder: 2 },
    ],
  });
  await upsertChoiceGroup("java-continental-breakfast", {
    name: "Choice of meat",
    required: true,
    minChoices: 1,
    maxChoices: 1,
    sortOrder: 1,
    options: [
      { name: "Beef Sausage", priceAdjustmentRwf: 0, sortOrder: 1 },
      { name: "Pork Sausage", priceAdjustmentRwf: 0, sortOrder: 2 },
    ],
  });
  await upsertChoiceGroup("java-continental-breakfast", {
    name: "Choice of accompaniment",
    required: true,
    minChoices: 1,
    maxChoices: 1,
    sortOrder: 2,
    options: [
      { name: "Potato Wedges", priceAdjustmentRwf: 0, sortOrder: 1 },
      { name: "Chips", priceAdjustmentRwf: 0, sortOrder: 2 },
      { name: "Homefries", priceAdjustmentRwf: 0, sortOrder: 3 },
    ],
  });
  await upsertChoiceGroup("breakfast-combo-drink-choice", {
    name: "Choose one drink",
    required: true,
    minChoices: 1,
    maxChoices: 1,
    sortOrder: 1,
    options: [
      { name: "Single Americano", priceAdjustmentRwf: 0, sortOrder: 1 },
      { name: "Single Cappuccino", priceAdjustmentRwf: 0, sortOrder: 2 },
      { name: "Single Caffe Latte", priceAdjustmentRwf: 0, sortOrder: 3 },
      { name: "Mango Juice", priceAdjustmentRwf: 0, sortOrder: 4 },
      { name: "Watermelonade", priceAdjustmentRwf: 0, sortOrder: 5 },
      { name: "Pineapple Juice", priceAdjustmentRwf: 0, sortOrder: 6 },
      { name: "Passion Juice", priceAdjustmentRwf: 0, sortOrder: 7 },
      {
        name: "Single House Coffee Without Milk",
        priceAdjustmentRwf: 0,
        sortOrder: 8,
      },
      {
        name: "Single House Coffee With Milk",
        priceAdjustmentRwf: 0,
        sortOrder: 9,
      },
      {
        name: "Regular Red Tea Without Milk",
        priceAdjustmentRwf: 0,
        sortOrder: 10,
      },
      {
        name: "Regular Masala Tea With Milk",
        priceAdjustmentRwf: 0,
        sortOrder: 11,
      },
    ],
  });

  const bbqWings = await db.restaurantProduct.findUniqueOrThrow({
    where: { storeId_slug: { storeId: javaStoreId, slug: "bbq-chicken-wings" } },
  });
  const existingFive = await db.restaurantVariant.findFirst({
    where: { productId: bbqWings.id, name: "5pcs" },
    select: { id: true },
  });
  if (existingFive) {
    await db.restaurantVariant.update({
      where: { id: existingFive.id },
      data: { priceRwf: 5500, isDefault: true, isAvailable: true, sortOrder: 1 },
    });
  } else {
    await db.restaurantVariant.create({
      data: {
        productId: bbqWings.id,
        name: "5pcs",
        priceRwf: 5500,
        isDefault: true,
        isAvailable: true,
        sortOrder: 1,
      },
    });
  }
  const existingTen = await db.restaurantVariant.findFirst({
    where: { productId: bbqWings.id, name: "10pcs" },
    select: { id: true },
  });
  if (existingTen) {
    await db.restaurantVariant.update({
      where: { id: existingTen.id },
      data: { priceRwf: 10000, isDefault: false, isAvailable: true, sortOrder: 2 },
    });
  } else {
    await db.restaurantVariant.create({
      data: {
        productId: bbqWings.id,
        name: "10pcs",
        priceRwf: 10000,
        isDefault: false,
        isAvailable: true,
        sortOrder: 2,
      },
    });
  }

  for (const [productSlug, addOnName] of [
    ["chicken-fajita-wrap", "Plastic Spoon"],
    ["chicken-fajita-wrap", "Plastic Knife"],
    ["java-continental-breakfast", "Extra Egg"],
    ["java-continental-breakfast", "Extra Bacon"],
    ["java-continental-breakfast", "Plastic Spoon"],
    ["java-continental-breakfast", "Plastic Knife"],
    ["breakfast-combo-drink-choice", "Plastic Spoon"],
  ] as const) {
    const product = await db.restaurantProduct.findUniqueOrThrow({
      where: { storeId_slug: { storeId: javaStoreId, slug: productSlug } },
    });
    await db.restaurantProductAddOn.upsert({
      where: {
        productId_addOnId: {
          productId: product.id,
          addOnId: javaMenuAddonIds[addOnName],
        },
      },
      update: {},
      create: {
        productId: product.id,
        addOnId: javaMenuAddonIds[addOnName],
      },
    });
  }

  for (const marketSlug of ["kimironko-market", "zinia-kicukiro-market"]) {
    const marketId = storeIds[marketSlug];
    await db.marketplaceProfile.upsert({
      where: { storeId: marketId },
      update: { tracksInventory: true },
      create: { storeId: marketId, tracksInventory: true },
    });
    const departmentIds: Record<string, string> = {};
    const marketplaceCategoryIds: Record<string, string> = {};
    for (const categorySlug of [
      ...new Set(marketProducts.map((item) => item[2])),
    ]) {
      const category = categories.find((item) => item.slug === categorySlug)!;
      const department = await db.marketplaceDepartment.upsert({
        where: { storeId_slug: { storeId: marketId, slug: category.slug } },
        update: { name: category.name, sortOrder: category.sortOrder },
        create: {
          storeId: marketId,
          slug: category.slug,
          name: category.name,
          sortOrder: category.sortOrder,
        },
      });
      departmentIds[category.slug] = department.id;
      const marketplaceCategory = await db.marketplaceCategory.upsert({
        where: {
          departmentId_slug: {
            departmentId: department.id,
            slug: category.slug,
          },
        },
        update: { name: category.name, sortOrder: category.sortOrder },
        create: {
          departmentId: department.id,
          slug: category.slug,
          name: category.name,
          sortOrder: category.sortOrder,
        },
      });
      marketplaceCategoryIds[category.slug] = marketplaceCategory.id;
    }
    for (const [slug, name, category, priceRwf, unitLabel] of marketProducts) {
      const product = await db.marketplaceProduct.upsert({
        where: { storeId_slug: { storeId: marketId, slug } },
        update: {
          name,
          normalizedName: normalizedProductName(name),
          departmentId: departmentIds[category],
          categoryId: marketplaceCategoryIds[category],
          isAvailable: true,
        },
        create: {
          storeId: marketId,
          departmentId: departmentIds[category],
          categoryId: marketplaceCategoryIds[category],
          slug,
          name,
          normalizedName: normalizedProductName(name),
          description: `${name} from a trusted Kigali market.`,
          isAvailable: true,
        },
      });
      const weightBased = unitLabel.includes("kg") || unitLabel.includes("g");
      await db.marketplaceProductUnit.upsert({
        where: { productId_label: { productId: product.id, label: unitLabel } },
        update: {
          priceRwf,
          unitType: unitLabel.toLowerCase().replaceAll(" ", "_"),
          allowsDecimal: weightBased,
          minimumQuantity: weightBased ? 0.5 : 1,
          quantityStep: weightBased ? 0.5 : 1,
          isDefault: true,
          isAvailable: true,
        },
        create: {
          productId: product.id,
          label: unitLabel,
          unitType: unitLabel.toLowerCase().replaceAll(" ", "_"),
          priceRwf,
          allowsDecimal: weightBased,
          minimumQuantity: weightBased ? 0.5 : 1,
          quantityStep: weightBased ? 0.5 : 1,
          isDefault: true,
          isAvailable: true,
        },
      });
      await db.marketplaceInventory.upsert({
        where: { productId: product.id },
        update: {},
        create: {
          productId: product.id,
          stockQuantity: 100,
          lowStockThreshold: 10,
        },
      });
      const initialMovement = await db.marketplaceInventoryMovement.findFirst({
        where: { productId: product.id, reference: "INITIAL_SEED" },
      });
      if (!initialMovement)
        await db.marketplaceInventoryMovement.create({
          data: {
            productId: product.id,
            quantityChange: 100,
            reason: "INITIAL_STOCK",
            reference: "INITIAL_SEED",
          },
        });
    }
  }
  await db.platformSetting.upsert({
    where: { id: "global" },
    update: { riderAssignmentMode: "MANUAL" },
    create: { id: "global", riderAssignmentMode: "MANUAL" },
  });
  await db.parcelPricingSetting.upsert({
    where: { id: "parcel" },
    update: {},
    create: {
      id: "parcel",
      version: 1,
      currency: "RWF",
      baseFeeRwf: 500,
      perKmRwf: 250,
      roundingIncrementRwf: 1,
      updatedById: admin.id,
    },
  });
  await db.parcelReferenceCounter.upsert({
    where: { id: "parcel" },
    update: {},
    create: { id: "parcel", lastValue: 0 },
  });
  const parcelCategories = [
    ["parcel-category-documents", "documents", "Documents"],
    ["parcel-category-clothes", "clothes", "Clothes"],
    ["parcel-category-food-package", "food-package", "Food package"],
    ["parcel-category-electronics", "electronics", "Electronics"],
    ["parcel-category-household-item", "household-item", "Household item"],
    ["parcel-category-small-package", "small-package", "Small package"],
    ["parcel-category-medium-package", "medium-package", "Medium package"],
    ["parcel-category-large-package", "large-package", "Large package"],
    ["parcel-category-other", "other", "Other"],
  ] as const;
  for (const [id, slug, name] of parcelCategories) {
    const sortOrder = parcelCategories.findIndex((item) => item[0] === id) + 1;
    await db.parcelCategory.upsert({
      where: { slug },
      update: { name, sortOrder, isActive: true },
      create: { id, slug, name, sortOrder, isActive: true },
    });
  }
  const parcelSizes = [
    {
      id: "parcel-size-small",
      code: "SMALL",
      name: "Small",
      description: "Documents, a small shopping bag, or a small box.",
      examplesJson: JSON.stringify([
        "Documents",
        "Small shopping bag",
        "Small box",
      ]),
      maxWeightKg: 5,
      maxLengthCm: 40,
      maxWidthCm: 30,
      maxHeightCm: 20,
      sortOrder: 1,
    },
    {
      id: "parcel-size-medium",
      code: "MEDIUM",
      name: "Medium",
      description:
        "A backpack-sized parcel, medium box, or several grocery bags.",
      examplesJson: JSON.stringify([
        "Backpack-sized parcel",
        "Medium box",
        "Several grocery bags",
      ]),
      maxWeightKg: 15,
      maxLengthCm: 60,
      maxWidthCm: 45,
      maxHeightCm: 40,
      sortOrder: 2,
    },
    {
      id: "parcel-size-large",
      code: "LARGE",
      name: "Large",
      description: "A large box or bulky parcel that may require a larger vehicle.",
      examplesJson: JSON.stringify(["Large box", "Bulky parcel"]),
      maxWeightKg: 50,
      maxLengthCm: 100,
      maxWidthCm: 80,
      maxHeightCm: 80,
      sortOrder: 3,
    },
  ] as const;
  for (const size of parcelSizes) {
    await db.parcelSizeDefinition.upsert({
      where: { code: size.code },
      update: { ...size, isActive: true },
      create: { ...size, surchargeRwf: 0, isActive: true },
    });
  }
  for (const capacity of [
    {
      id: "parcel-capacity-motorcycle",
      vehicleType: "MOTORCYCLE",
      maxWeightKg: 20,
      maxLengthCm: 65,
      maxWidthCm: 50,
      maxHeightCm: 50,
    },
    {
      id: "parcel-capacity-van",
      vehicleType: "VAN",
      maxWeightKg: 500,
      maxLengthCm: 200,
      maxWidthCm: 150,
      maxHeightCm: 150,
    },
  ]) {
    await db.parcelVehicleCapacity.upsert({
      where: { vehicleType: capacity.vehicleType },
      update: { ...capacity, isActive: true },
      create: { ...capacity, isActive: true },
    });
  }
  const prohibitedParcelItems = [
    ["parcel-rule-illegal-drugs", "Illegal drugs"],
    ["parcel-rule-weapons", "Weapons"],
    ["parcel-rule-explosives", "Explosives"],
    ["parcel-rule-dangerous-chemicals", "Dangerous chemicals"],
    ["parcel-rule-stolen-goods", "Stolen goods"],
    ["parcel-rule-cash", "Cash"],
    ["parcel-rule-live-animals", "Live animals"],
    [
      "parcel-rule-temperature-controlled-perishables",
      "Perishable goods requiring special temperature control",
    ],
    ["parcel-rule-prohibited-by-law", "Items prohibited by law"],
    ["parcel-rule-unsafe-for-rider", "Any item unsafe for the rider"],
  ] as const;
  for (const [id, title] of prohibitedParcelItems) {
    const sortOrder = prohibitedParcelItems.findIndex((item) => item[0] === id) + 1;
    await db.parcelProhibitedItemRule.upsert({
      where: { id },
      update: { title, sortOrder, isActive: true },
      create: { id, title, sortOrder, isActive: true },
    });
  }
  console.log(
    `Seed complete: ${stores.length} stores, ${categories.length} categories, ${Object.values(productSets).reduce((sum, items) => sum + items.length, 0)} products, test users: ${[admin, rider, customer].length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
