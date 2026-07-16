import Link from "next/link";
import { AdminStoreManager } from "@/components/admin/admin-store-manager";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  const user = await requireRole("ADMIN");
  const stores = await db.store.findMany({
    include: { _count: { select: { products: true, orders: true } } },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });

  const storeRows = stores.map((store) => ({
    id: store.id,
    slug: store.slug,
    name: store.name,
    type: store.type,
    catalogEngine: store.catalogEngine,
    description: store.description,
    phone: store.phone,
    address: store.address,
    latitude: store.latitude,
    longitude: store.longitude,
    opensAt: store.opensAt,
    closesAt: store.closesAt,
    status: store.status,
    isOpen: store.isOpen,
    logoUrl: store.logoUrl ?? null,
    coverUrl: store.coverUrl ?? null,
    estimatedDeliveryMinutes: store.estimatedDeliveryMinutes,
    preparationMinutes: store.preparationMinutes,
    minimumOrderRwf: store.minimumOrderRwf,
    rating: store.rating,
    _count: store._count,
  }));

  return (
    <>
      <main className="admin-orders-page">
        <header className="admin-dashboard-header">
          <div>
            <span className="catalog-kicker">KARAME BAY ADMIN</span>
            <h1>Store and market management</h1>
            <p>
              Create stores, set GPS locations, and keep delivery routing tied
              to Admin.
            </p>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/menus">Restaurant menus</Link>
            <Link href="/admin/products">Market engine</Link>
            <Link href="/admin/riders">Riders</Link>
          </div>
        </header>

        <AdminStoreManager stores={storeRows} />
      </main>
      <OperationsPortalBadge role={`${user.firstName} · Admin`} destination="/admin/login" />
    </>
  );
}
