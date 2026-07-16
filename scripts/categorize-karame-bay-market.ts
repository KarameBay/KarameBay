import { db } from "../src/lib/db";

type TaxonomyItem = {
  department: string;
  departmentOrder: number;
  category: string;
  categoryOrder: number;
};

const TAXONOMY = {
  fruits: ["Fresh Produce", 10, "Fresh Fruits", 10],
  leafy: ["Fresh Produce", 10, "Leafy Greens", 20],
  herbs: ["Fresh Produce", 10, "Fresh Herbs", 30],
  vegetables: ["Fresh Produce", 10, "Fresh Vegetables", 40],
  roots: ["Fresh Produce", 10, "Roots, Tubers & Plantains", 50],
  freshLegumes: ["Fresh Produce", 10, "Fresh Beans, Peas & Peanuts", 60],
  preparedProduce: ["Fresh Produce", 10, "Prepared & Chopped Produce", 70],

  beef: ["Meat, Poultry & Seafood", 20, "Beef", 10],
  chicken: ["Meat, Poultry & Seafood", 20, "Chicken & Poultry", 20],
  pork: ["Meat, Poultry & Seafood", 20, "Pork", 30],
  goatRabbit: ["Meat, Poultry & Seafood", 20, "Goat & Rabbit", 40],
  fish: ["Meat, Poultry & Seafood", 20, "Fish & Seafood", 50],
  processedMeat: ["Meat, Poultry & Seafood", 20, "Sausages & Processed Meat", 60],

  rice: ["Pantry & Staples", 30, "Rice", 10],
  pasta: ["Pantry & Staples", 30, "Pasta, Noodles & Couscous", 20],
  legumes: ["Pantry & Staples", 30, "Beans, Lentils & Pulses", 30],
  oils: ["Pantry & Staples", 30, "Cooking Oils & Fats", 40],
  sugar: ["Pantry & Staples", 30, "Sugar & Sweeteners", 50],
  salt: ["Pantry & Staples", 30, "Salt", 60],
  plantProtein: ["Pantry & Staples", 30, "Plant-Based Protein", 70],
  pantryOther: ["Pantry & Staples", 30, "Other Pantry Essentials", 90],

  flour: ["Breakfast & Baking", 40, "Flour & Baking Ingredients", 10],
  porridge: ["Breakfast & Baking", 40, "Porridge & Breakfast Cereals", 20],
  nutsSeeds: ["Breakfast & Baking", 40, "Nuts & Seeds", 30],

  spices: ["Cooking Essentials", 50, "Spices & Seasonings", 10],
  sauces: ["Cooking Essentials", 50, "Sauces & Condiments", 20],
  mayonnaise: ["Cooking Essentials", 50, "Mayonnaise & Mustard", 30],
  vinegar: ["Cooking Essentials", 50, "Vinegar & Salad Dressings", 40],
  soups: ["Cooking Essentials", 50, "Soups, Stock & Bouillon", 50],

  tomato: ["Canned & Preserved", 60, "Tomatoes & Pasta Sauces", 10],
  cannedBeans: ["Canned & Preserved", 60, "Canned Beans & Vegetables", 20],
  olives: ["Canned & Preserved", 60, "Olives, Pickles & Capers", 30],
  mushrooms: ["Canned & Preserved", 60, "Canned Mushrooms", 40],
  cannedOther: ["Canned & Preserved", 60, "Other Canned & Jarred Foods", 50],

  dairy: ["Dairy & Chilled", 70, "Cream & Dairy", 10],
  wellness: ["Natural & Wellness", 80, "Natural Powders & Herbal Products", 10],
} satisfies Record<string, readonly [string, number, string, number]>;

type TaxonomyKey = keyof typeof TAXONOMY;

function clean(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "");
}

function includesAny(name: string, terms: string[]) {
  return terms.some((term) => name.includes(term));
}

function classify(productName: string, currentCategory: string): TaxonomyKey {
  const name = clean(productName);
  const current = clean(currentCategory);

  if (includesAny(name, ["sausage", "saucisse", "frankfurter", "vienna", "smokie", "bacon", "ham ", "jambon", "salami", "luncheon meat", "corned beef", "meatball", "pate de foie"]))
    return "processedMeat";
  if (includesAny(name, ["fish", "poisson", "tilapia", "sardine", "tuna", "thon", "isambaza", "indagara", "pangasius", "anchovy"]))
    return "fish";
  if (includesAny(name, ["pork", "porc"])) return "pork";
  if (includesAny(name, ["goat", "rabbit", "lapin"])) return "goatRabbit";
  if (includesAny(name, ["chicken", "poulet", "poultry"])) return "chicken";
  if (current.includes("meat") || includesAny(name, ["beef", "boeuf", "steak", "bone marrow", "viande hachee"]))
    return "beef";

  if (current.includes("fruit") || current.includes("vegetable")) {
    if (includesAny(name, ["chopped", "peeled", "pounded", "cooked", "dried cassava leaves", "zikase", "bihase", "ihase"]))
      return "preparedProduce";
    if (includesAny(name, ["apple", "avocado", "banana", "blackberr", "coconut fruit", "gaperi", "physalis", "grape", "grapefruit", "kiwi", "lemon", "lime", "mandarine", "mango", "orange", "papaya", "passion fruit", "pineapple", "raspberr", "strawberr", "sugar cane", "tangerine", "tree tomato", "watermelon", "pear fruit", "mixed fruit"]))
      return "fruits";
    if (includesAny(name, ["basil", "chive", "coriander", "dill", "mint", "parsley", "rosemary", "thyme", "herb", "ciboulette", "persil", "aneth"]))
      return "herbs";
    if (includesAny(name, ["cabbage", "epinard", "spinach", "amaranth", "dodo", "lettuce", "sukuma", "swiss chard", "cassava leaves", "isombe"]))
      return "leafy";
    if (includesAny(name, ["cassava root", "potato", "yam", "igname", "plantain", "green banana", "igitoke", "sweet potatoes", "ibijumba", "imyumbati"]))
      return "roots";
    if (includesAny(name, ["bean", "peas", "petit pois", "peanut", "ubunyobwa", "ibitonore", "amashaza"]))
      return "freshLegumes";
    return "vegetables";
  }

  if (includesAny(name, ["fresh cream", "milk powder", "dairy"])) return "dairy";
  if (includesAny(name, ["textured soya protein", "soya protein"])) return "plantProtein";
  if (includesAny(name, ["porridge", "bushera", "sosoma", "breakfast cereal"])) return "porridge";
  if (includesAny(name, ["rice", "riz ", "risotto"])) return "rice";
  if (includesAny(name, ["pasta", "spaghetti", "macaroni", "lasagne", "lasagna", "fusilli", "farfalle", "rigatoni", "penne", "tagliatelle", "fettuccine", "bucatini", "gnocchi", "cavatappi", "couscous", "noodle", "schiaffoni", "spirelli", "zitoni", "pennoni"]))
    return "pasta";
  if (includesAny(name, ["beans", "bean ", "lentil", " dal", "dal ", "gram", "chick pea", "chickpea", "pigeon peas", "cow peas", "pulses", "urad", "chana", "mung", "njahi"]))
    return "legumes";
  if (includesAny(name, ["flour", "semolina", "icing sugar", "baking flour", "corn flour"])) return "flour";
  if (includesAny(name, ["olive oil", "cooking oil", "sunflower oil", "vegetable oil", "pomace oil", "sesame oil", "avocado oil", "pumpkin seed oil", "chili oil", "chilli oil", "cooking fat", "oil blend"]))
    return "oils";
  if (includesAny(name, ["sugar", "sweetener", "edulcorant", "canderel"])) return "sugar";
  if (includesAny(name, ["salt", "sel de cuisine"])) return "salt";
  if (includesAny(name, ["mayonnaise", "mustard", "moutarde", "mayo "])) return "mayonnaise";
  if (includesAny(name, ["vinegar", "vinaigre", "aceto", "vinaigrette", "salad dressing", "dressing miel"])) return "vinegar";
  if (includesAny(name, ["tomato paste", "tomato passata", "passata tomato", "passata di", "peeled tomato", "peeled tomatoes", "chopped tomato", "diced tomato", "crushed tomato", "tomates concass", "pomodori pelati", "polpa di pomodoro", "pasta sauce", "bolognese sauce", "basilico sugo"]))
    return "tomato";
  if (includesAny(name, ["olive", "pickle", "cornichon", "caper", "petits oignons"])) return "olives";
  if (name.includes("mushroom") && includesAny(name, ["can", "400g", "390g", "sliced", "whole", "pieces & stems", "paris mushroom"]))
    return "mushrooms";
  if (includesAny(name, ["baked beans", "beans in tomato", "canned", "sweet corn", "green peas -", "chick peas 330", "chick peas 400", "fruit cocktail", "cassoulet", "asparagus", "whole paris mushrooms"]))
    return "cannedBeans";
  if (includesAny(name, ["soup", "broth", "bouillon", "flavour cubes", "cubes(", "aromat condiment", "mchuzi mix"]))
    return "soups";
  if (includesAny(name, ["ketchup", "sauce", "pesto", "soy sauce", "soja sauce", "lemon juice", "worcestershire", "seasoning sauce", "chilli sauce", "chili sauce"]))
    return "sauces";
  if (includesAny(name, ["chia seed", "flax seed", "pumpkin seed", "sunflower seed", "sesame", "popcorn kernels", "peanut flour", "peanuts flour"]))
    return "nutsSeeds";
  if (includesAny(name, ["moringa", "bitter leaf", "hibiscus", "phyllanthus", "chanca piedra", "igikukuru", "gikukuru", "lantana camara", "herbe a bouc", "igisura", "turkey berry", "coeur de boeuf", "natural powder", "in glass jar"]) && !includesAny(name, ["pepper", "paprika", "cinnamon", "clove", "garlic", "ginger", "turmeric", "spice", "seed"]))
    return "wellness";
  if (includesAny(name, ["spice", "masala", "seasoning", "pepper", "paprika", "cinnamon", "clove", "garlic powder", "ginger powder", "turmeric", "curry", "nutmeg", "saffron", "bay leaves", "oregano", "fennel seed", "fenugreek", "star anise", "cayenne", "pilipili manga", "chilli powder", "chili powder", "herbs ", "herb mint"]))
    return "spices";
  if (includesAny(name, ["tomato", "mushroom", "beans", "corn", "chickpeas", "jar", "preserved"])) return "cannedOther";
  return "pantryOther";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const store = await db.store.findFirst({
    where: { name: { contains: "Karame Bay Market" }, catalogEngine: "MARKETPLACE" },
    select: { id: true, name: true },
  });
  if (!store) throw new Error("Karame Bay Market was not found.");

  const products = await db.marketplaceProduct.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true, category: { select: { name: true } } },
  });

  const usedKeys = new Set<TaxonomyKey>();
  const assignments = products.map((product) => {
    const key = classify(product.name, product.category.name);
    usedKeys.add(key);
    return { product, key };
  });

  const departmentIds = new Map<string, string>();
  const categoryIds = new Map<TaxonomyKey, string>();

  for (const key of usedKeys) {
    const [departmentName, departmentOrder, categoryName, categoryOrder] = TAXONOMY[key];
    let departmentId = departmentIds.get(departmentName);
    if (!departmentId) {
      const department = await db.marketplaceDepartment.upsert({
        where: { storeId_slug: { storeId: store.id, slug: slugify(departmentName) } },
        update: { name: departmentName, sortOrder: departmentOrder },
        create: {
          storeId: store.id,
          slug: slugify(departmentName),
          name: departmentName,
          sortOrder: departmentOrder,
        },
      });
      departmentId = department.id;
      departmentIds.set(departmentName, departmentId);
    }
    const category = await db.marketplaceCategory.upsert({
      where: {
        departmentId_slug: { departmentId, slug: slugify(categoryName) },
      },
      update: { name: categoryName, sortOrder: categoryOrder },
      create: {
        departmentId,
        slug: slugify(categoryName),
        name: categoryName,
        sortOrder: categoryOrder,
      },
    });
    categoryIds.set(key, category.id);
  }

  for (let index = 0; index < assignments.length; index += 100) {
    const batch = assignments.slice(index, index + 100);
    await db.$transaction(
      batch.map(({ product, key }) => {
        const [departmentName] = TAXONOMY[key];
        return db.marketplaceProduct.update({
          where: { id: product.id },
          data: {
            departmentId: departmentIds.get(departmentName)!,
            categoryId: categoryIds.get(key)!,
          },
        });
      }),
    );
  }

  const emptyCategories = await db.marketplaceCategory.findMany({
    where: { department: { storeId: store.id }, products: { none: {} }, children: { none: {} } },
    select: { id: true },
  });
  if (emptyCategories.length)
    await db.marketplaceCategory.deleteMany({ where: { id: { in: emptyCategories.map((item) => item.id) } } });

  const emptyDepartments = await db.marketplaceDepartment.findMany({
    where: { storeId: store.id, products: { none: {} }, categories: { none: {} } },
    select: { id: true },
  });
  if (emptyDepartments.length)
    await db.marketplaceDepartment.deleteMany({
      where: { id: { in: emptyDepartments.map((item) => item.id) } },
    });

  const counts = await db.marketplaceCategory.findMany({
    where: { department: { storeId: store.id }, products: { some: {} } },
    orderBy: [{ department: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: { name: true, department: { select: { name: true } }, _count: { select: { products: true } } },
  });
  console.log(`Categorized ${products.length} products in ${store.name}.`);
  for (const item of counts)
    console.log(`${item.department.name} > ${item.name}: ${item._count.products}`);
}

main().finally(() => db.$disconnect());
