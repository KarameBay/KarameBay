import "server-only";
import { db } from "@/lib/db";

export async function getRestaurantMenuBuilderStores(ownerId?: string) {
  const stores = await db.store.findMany({
    where: {
      catalogEngine: "RESTAURANT",
      ...(ownerId ? { ownerId } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      restaurantCategories: {
        include: { _count: { select: { products: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      restaurantAddOns: {
        include: {
          options: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      },
      restaurantProducts: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
          choiceGroups: {
            include: {
              choices: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
          addOnLinks: {
            include: {
              addOn: {
                include: {
                  options: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
                },
              },
            },
            orderBy: [{ sortOrder: "asc" }],
          },
        },
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  return stores.map((store) => ({
    ...store,
    restaurantAddOns: store.restaurantAddOns.map((addOn) => ({
      ...addOn,
      selectionMode: (addOn.selectionMode === "MULTIPLE" ? "MULTIPLE" : "SINGLE") as
        | "SINGLE"
        | "MULTIPLE",
    })),
    restaurantProducts: store.restaurantProducts.map((product) => ({
      ...product,
      choiceGroups: product.choiceGroups.map((group) => ({
        ...group,
        options: group.choices,
      })),
      addOns: product.addOnLinks.map((link) => ({
        ...link.addOn,
        groupName: link.groupName,
        required: link.required ?? link.addOn.required,
        groupSelectionMode: (link.selectionMode === "MULTIPLE" ? "MULTIPLE" : "SINGLE") as
          | "SINGLE"
          | "MULTIPLE",
        selectionMode: (link.addOn.selectionMode === "MULTIPLE" ? "MULTIPLE" : "SINGLE") as
          | "SINGLE"
          | "MULTIPLE",
        minSelections: link.minSelections ?? link.addOn.minSelections,
        maxSelections: link.maxSelections ?? link.addOn.maxSelections,
        requiredOverride: link.required,
        minSelectionsOverride: link.minSelections,
        maxSelectionsOverride: link.maxSelections,
        hiddenOptionIds: link.hiddenOptionIds,
        optionPriceOverrides: link.optionPriceOverrides,
      })),
    })),
  }));
}

export type RestaurantMenuBuilderStore = Awaited<
  ReturnType<typeof getRestaurantMenuBuilderStores>
>[number];

