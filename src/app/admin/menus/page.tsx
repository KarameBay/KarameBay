import Link from "next/link";
import { AdminRestaurantMenuBuilder } from "@/components/admin/admin-restaurant-menu-builder";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminMenusPage() {
  await requireRole("ADMIN");

  const stores = (await db.store.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      catalogEngine: true,
      status: true,
      isOpen: true,
      restaurantCategories: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          sortOrder: true,
          _count: {
            select: { products: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      restaurantAddOns: {
        select: {
          id: true,
          name: true,
          category: true,
          priceRwf: true,
          description: true,
          required: true,
          minSelections: true,
          maxSelections: true,
          sortOrder: true,
          selectionMode: true,
          isAvailable: true,
          options: {
            select: {
              id: true,
              name: true,
              priceAdjustmentRwf: true,
              isAvailable: true,
              sortOrder: true,
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      },
      restaurantProducts: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          basePriceRwf: true,
          imageUrl: true,
          isAvailable: true,
          categoryId: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variants: {
            select: {
              id: true,
              name: true,
              priceRwf: true,
              isDefault: true,
              isAvailable: true,
              sortOrder: true,
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
          choiceGroups: {
            select: {
              id: true,
              name: true,
              required: true,
              minChoices: true,
              maxChoices: true,
              sortOrder: true,
              choices: {
                select: {
                  id: true,
                  name: true,
                  priceAdjustmentRwf: true,
                  isAvailable: true,
                  sortOrder: true,
                },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              },
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
          addOnLinks: {
            select: {
              groupName: true,
              required: true,
              selectionMode: true,
              minSelections: true,
              maxSelections: true,
              hiddenOptionIds: true,
              optionPriceOverrides: true,
              addOn: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  priceRwf: true,
                  description: true,
                  required: true,
                  minSelections: true,
                  maxSelections: true,
                  sortOrder: true,
                  selectionMode: true,
                  isAvailable: true,
                  options: {
                    select: {
                      id: true,
                      name: true,
                      priceAdjustmentRwf: true,
                      isAvailable: true,
                      sortOrder: true,
                    },
                    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                  },
                },
              },
            },
            orderBy: [{ sortOrder: "asc" }],
          },
        },
        orderBy: [{ createdAt: "desc" }],
      },
    },
    orderBy: { name: "asc" },
  })).filter((store) => store.catalogEngine === "RESTAURANT");

  const builderStores = stores.map((store) => ({
    ...store,
    restaurantCategories: store.restaurantCategories,
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

  return (
    <main className="admin-orders-page">
      <header className="admin-dashboard-header">
        <div>
          <span className="catalog-kicker">KARAME BAY ADMIN</span>
          <h1>Restaurant menu engine</h1>
          <p>
            Build restaurant menus, variants, choice groups, and add-ons from one
            place.
          </p>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/stores">Stores</Link>
          <Link href="/admin/products">Market engine</Link>
          <Link href="/admin/riders">Riders</Link>
        </div>
      </header>

      <section className="admin-dashboard-grid">
        <article className="admin-dashboard-card">
          <small>Restaurant stores</small>
          <b>{builderStores.length}</b>
        </article>
        <article className="admin-dashboard-card">
          <small>Total categories</small>
          <b>{builderStores.reduce((total, store) => total + store.restaurantCategories.length, 0)}</b>
        </article>
        <article className="admin-dashboard-card">
          <small>Total menu items</small>
          <b>{builderStores.reduce((total, store) => total + store.restaurantProducts.length, 0)}</b>
        </article>
      </section>

      <div style={{ marginTop: "20px" }}>
        <AdminRestaurantMenuBuilder stores={builderStores} />
      </div>
    </main>
  );
}
