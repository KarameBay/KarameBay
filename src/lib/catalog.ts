import { cache } from "react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { RestaurantMenuProduct } from "@/lib/restaurant-menu";
import { isStoreOpenInKigali } from "@/lib/store-hours";

export const CATALOG_PAGE_SIZE = 24;
export type CatalogEngine = "RESTAURANT" | "MARKETPLACE";

const storeCount = {
  select: { restaurantProducts: true, marketplaceProducts: true },
} as const;

const containsInsensitive = (term: string) => ({
  contains: term,
  mode: Prisma.QueryMode.insensitive,
});

function withProductCount<
  T extends {
    isOpen: boolean;
    opensAt: string;
    closesAt: string;
    _count: { restaurantProducts: number; marketplaceProducts: number };
  },
>(store: T) {
  return {
    ...store,
    isOpen: isStoreOpenInKigali(store),
    _count: {
      products:
        store._count.restaurantProducts + store._count.marketplaceProducts,
    },
  };
}

export const getStores = cache(async (query = "", storeTypeSlug = "") => {
  const term = query.trim();
  const stores = await db.store.findMany({
    where: {
      status: "APPROVED",
      storeType: {
        is: {
          isActive: true,
          ...(storeTypeSlug ? { slug: storeTypeSlug } : {}),
        },
      },
      ...(term
        ? {
            OR: [
              { name: containsInsensitive(term) },
              { description: containsInsensitive(term) },
              { type: containsInsensitive(term) },
              { storeType: { is: { name: containsInsensitive(term) } } },
              { storeType: { is: { customerSectionName: containsInsensitive(term) } } },
              {
                restaurantProducts: {
                  some: {
                    OR: [
                      { name: containsInsensitive(term) },
                      { category: { name: containsInsensitive(term) } },
                    ],
                  },
                },
              },
              {
                marketplaceProducts: {
                  some: {
                    OR: [
                      { name: containsInsensitive(term) },
                      { brand: containsInsensitive(term) },
                      { category: { name: containsInsensitive(term) } },
                      { department: { name: containsInsensitive(term) } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [
      { storeType: { displayOrder: "asc" } },
      { featured: "desc" },
      { name: "asc" },
    ],
    include: { storeType: true, _count: storeCount },
  });
  return stores.map(withProductCount);
});

export const getStoreBySlug = cache(async (slug: string) => {
  const store = await db.store.findFirst({
    where: { slug, status: "APPROVED", storeType: { is: { isActive: true } } },
    include: { storeType: true, _count: storeCount },
  });
  return store ? withProductCount(store) : null;
});

export const getActiveStoreTypes = cache(async () =>
  db.storeType.findMany({
    where: {
      isActive: true,
      stores: { some: { status: "APPROVED" } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { stores: { where: { status: "APPROVED" } } } },
    },
  }),
);

export const getStoreTypeBySlug = cache(async (slug: string) =>
  db.storeType.findFirst({
    where: { slug, isActive: true, stores: { some: { status: "APPROVED" } } },
  }),
);

export async function getStoreCatalog(
  storeId: string,
  options: { category?: string; query?: string; page?: number },
) {
  const store = await db.store.findUniqueOrThrow({
    where: { id: storeId },
    select: {
      catalogEngine: true,
      storeType: { select: { stockTrackingRequired: true } },
    },
  });
  return store.catalogEngine === "RESTAURANT"
    ? getRestaurantCatalog(storeId, options)
    : getMarketplaceCatalog(
        storeId,
        options,
        store.storeType?.stockTrackingRequired ?? true,
      );
}

export const getRestaurantProductDetails = cache(async function getRestaurantProductDetails(
  storeSlug: string,
  productId: string,
) {
  const product = await db.restaurantProduct.findFirst({
    where: {
      id: productId,
      store: { slug: storeSlug, status: "APPROVED", storeType: { is: { isActive: true } } },
    },
    include: {
      store: { include: { storeType: true } },
      category: true,
      variants: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      choiceGroups: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          choices: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
      },
      addOnLinks: {
        orderBy: [{ sortOrder: "asc" }],
        include: {
          addOn: {
            include: {
              options: {
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    basePriceRwf: product.basePriceRwf,
    containerChargePerUnitRwf: product.containerChargePerUnitRwf,
    containerChargeFlatRwf: product.containerChargeFlatRwf,
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable && !product.seasonal,
    category: { name: product.category.name },
    store: {
      id: product.store.id,
      name: product.store.name,
      slug: product.store.slug,
      type: product.store.type,
      catalogEngine: product.store.catalogEngine,
      ageConfirmationRequired: product.store.storeType?.ageConfirmationRequired ?? false,
    },
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceRwf: variant.priceRwf,
      isDefault: variant.isDefault,
      isAvailable: variant.isAvailable,
      sortOrder: variant.sortOrder,
    })),
    choiceGroups: product.choiceGroups.map((group) => ({
      id: group.id,
      name: group.name,
      required: group.required,
      minChoices: group.minChoices,
      maxChoices: group.maxChoices,
      sortOrder: group.sortOrder,
      options: group.choices.map((choice) => ({
        id: choice.id,
        name: choice.name,
        priceAdjustmentRwf: choice.priceAdjustmentRwf,
        isAvailable: choice.isAvailable,
        sortOrder: choice.sortOrder,
      })),
    })),
    addOns: product.addOnLinks.map((link) => ({
      id: link.addOn.id,
      name: link.addOn.name,
      priceRwf: link.addOn.priceRwf,
      isAvailable: link.addOn.isAvailable,
      category: link.addOn.category,
      description: link.addOn.description,
      required: link.required ?? link.addOn.required,
      minSelections: link.minSelections ?? link.addOn.minSelections,
      maxSelections: link.maxSelections ?? link.addOn.maxSelections,
      sortOrder: link.sortOrder ?? link.addOn.sortOrder,
      groupName: link.groupName,
      groupSelectionMode: (link.selectionMode === "MULTIPLE" ? "MULTIPLE" : "SINGLE") as
        | "SINGLE"
        | "MULTIPLE",
      selectionMode: link.addOn.selectionMode as "SINGLE" | "MULTIPLE" | undefined,
      options: link.addOn.options
        .filter((option) => !(Array.isArray(link.hiddenOptionIds) && link.hiddenOptionIds.includes(option.id)))
        .map((option) => {
          const override =
            link.optionPriceOverrides &&
            typeof link.optionPriceOverrides === "object" &&
            !Array.isArray(link.optionPriceOverrides)
              ? (link.optionPriceOverrides as Record<string, unknown>)[option.id]
              : undefined;
          return {
            id: option.id,
            name: option.name,
            priceAdjustmentRwf:
              typeof override === "number" && Number.isFinite(override)
                ? Math.round(override)
                : option.priceAdjustmentRwf,
            isAvailable: option.isAvailable,
            sortOrder: option.sortOrder,
          };
        }),
    })),
  } satisfies RestaurantMenuProduct;
});

async function getRestaurantCatalog(
  storeId: string,
  options: { category?: string; query?: string; page?: number },
) {
  const page = Math.max(1, options.page ?? 1);
  const where: Prisma.RestaurantProductWhereInput = {
    storeId,
    ...(options.category ? { category: { slug: options.category } } : {}),
    ...(options.query
      ? {
          OR: [
            { name: containsInsensitive(options.query) },
            { description: containsInsensitive(options.query) },
            { category: { name: containsInsensitive(options.query) } },
          ],
        }
      : {}),
  };
  const [rows, total, categoryRows] = await Promise.all([
    db.restaurantProduct.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { variants: true, choiceGroups: true, addOnLinks: true },
        },
      },
      orderBy: [{ isAvailable: "desc" }, { featured: "desc" }, { name: "asc" }],
      skip: (page - 1) * CATALOG_PAGE_SIZE,
      take: CATALOG_PAGE_SIZE,
    }),
    db.restaurantProduct.count({ where }),
    db.restaurantCategory.findMany({
      where: { storeId, isActive: true, products: { some: {} } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    }),
  ]);
  return {
    engine: "RESTAURANT" as const,
    products: rows.map((product) => ({
      id: product.id,
      storeId: product.storeId,
      catalogEngine: "RESTAURANT" as const,
      name: product.name,
      priceRwf: product.basePriceRwf + product.containerChargePerUnitRwf,
      containerChargePerUnitRwf: product.containerChargePerUnitRwf,
      containerChargeFlatRwf: product.containerChargeFlatRwf,
      unitLabel:
        product._count.variants +
          product._count.choiceGroups +
          product._count.addOnLinks >
        0
          ? "Options available"
          : "Per item",
      imageUrl: product.imageUrl,
      isAvailable: product.isAvailable && !product.seasonal,
      category: { name: product.category.name },
    })),
    total,
    categories: categoryRows,
    page,
    pages: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
  };
}

async function getMarketplaceCatalog(
  storeId: string,
  options: { category?: string; query?: string; page?: number },
  stockTrackingRequired: boolean,
) {
  const page = Math.max(1, options.page ?? 1);
  const where: Prisma.MarketplaceProductWhereInput = {
    storeId,
    ...(options.category ? { category: { slug: options.category } } : {}),
    ...(options.query
      ? {
          OR: [
            { name: containsInsensitive(options.query) },
            { description: containsInsensitive(options.query) },
            { brand: containsInsensitive(options.query) },
            { category: { name: containsInsensitive(options.query) } },
            { department: { name: containsInsensitive(options.query) } },
          ],
        }
      : {}),
  };
  const [rows, total, categoryRows] = await Promise.all([
    db.marketplaceProduct.findMany({
      where,
      include: {
        category: true,
        inventory: true,
        units: {
          where: { isDefault: true, isAvailable: true },
          take: 1,
        },
      },
      orderBy: [{ isAvailable: "desc" }, { featured: "desc" }, { name: "asc" }],
      skip: (page - 1) * CATALOG_PAGE_SIZE,
      take: CATALOG_PAGE_SIZE,
    }),
    db.marketplaceProduct.count({ where }),
    db.marketplaceCategory.findMany({
      where: {
        department: { storeId },
        products: { some: { storeId } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { products: { where: { storeId } } } },
      },
    }),
  ]);
  return {
    engine: "MARKETPLACE" as const,
    products: rows.flatMap((product) => {
      const unit = product.units[0];
      if (!unit) return [];
      return [
        {
          id: product.id,
          storeId: product.storeId,
          catalogEngine: "MARKETPLACE" as const,
          name: product.name,
          priceRwf: unit.priceRwf + product.containerChargePerUnitRwf,
          containerChargePerUnitRwf: product.containerChargePerUnitRwf,
          containerChargeFlatRwf: product.containerChargeFlatRwf,
          unitLabel: unit.label,
          imageUrl: product.imageUrl,
          isAvailable:
            product.isAvailable &&
            unit.isAvailable &&
            (!stockTrackingRequired || (product.inventory?.stockQuantity ?? 0) > 0),
          category: { name: product.category.name },
        },
      ];
    }),
    total,
    categories: categoryRows,
    page,
    pages: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
  };
}

export function formatRwf(value: number) {
  return `${new Intl.NumberFormat("en-RW").format(value)} RWF`;
}
