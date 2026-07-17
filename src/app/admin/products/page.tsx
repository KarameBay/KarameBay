import Link from "next/link";
import { AdminMarketplaceCatalogBuilder } from "@/components/admin/admin-marketplace-catalog-builder";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { storeTypeCapabilities } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await requireRole("ADMIN");
  const stores = await db.store.findMany({
    where: { catalogEngine: "MARKETPLACE" },
    select: {
      id: true,
      name: true,
      slug: true,
      storeType: true,
      _count: { select: { marketplaceProducts: true } },
      marketplaceDepartments: {
        select: {
          id: true,
          name: true,
          description: true,
          categories: {
            select: { id: true, name: true, description: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  const retailStores = stores.map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    departments: store.marketplaceDepartments,
    productCount: store._count.marketplaceProducts,
    storeTypeName: store.storeType?.name ?? "Retail",
    capabilities: store.storeType
      ? storeTypeCapabilities(store.storeType)
      : {
          optionalProductFields: ["description", "image", "sku", "featured"] as Array<
            "description" | "image" | "sku" | "featured"
          >,
          stockTrackingRequired: true,
          ageConfirmationRequired: false,
          productUnitsEnabled: true,
          brandsEnabled: true,
          departmentsEnabled: true,
        },
  }));

  return (
    <>
      <main className="admin-orders-page">
        <header className="admin-dashboard-header">
          <div>
            <span className="catalog-kicker">KARAME BAY ADMIN</span>
            <h1>Retail catalog engine</h1>
            <p>
              Manage products for every store type assigned to the reusable
              Retail Catalog Engine.
            </p>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/stores">Stores</Link>
            <Link href="/admin/menus">Restaurant menus</Link>
            <Link href="/admin/products/import">Price import</Link>
            <Link href="/admin/riders">Riders</Link>
          </div>
        </header>

        <AdminMarketplaceCatalogBuilder markets={retailStores} />
      </main>
      <OperationsPortalBadge
        role={`${user.firstName} · Admin`}
        destination="/admin/login"
      />
    </>
  );
}
