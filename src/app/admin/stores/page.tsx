import Link from "next/link";
import { AdminStoreManager } from "@/components/admin/admin-store-manager";
import { AdminStoreTypeManager } from "@/components/admin/admin-store-type-manager";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parseOptionalProductFields } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  const user = await requireRole("ADMIN");
  const [stores, storeTypes] = await Promise.all([
    db.store.findMany({
      include: {
        storeType: { select: { id: true, name: true, customerSectionName: true, commerceEngine: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    }),
    db.storeType.findMany({
      include: { _count: { select: { stores: true } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const storeRows = stores.map((store) => ({
    id: store.id,
    slug: store.slug,
    name: store.name,
    type: store.type,
    catalogEngine: store.catalogEngine,
    storeTypeId: store.storeTypeId,
    storeType: store.storeType,
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
    logoPublicId: store.logoPublicId ?? null,
    coverUrl: store.coverUrl ?? null,
    coverPublicId: store.coverPublicId ?? null,
    estimatedDeliveryMinutes: store.estimatedDeliveryMinutes,
    preparationMinutes: store.preparationMinutes,
    minimumOrderRwf: store.minimumOrderRwf,
    rating: store.rating,
    _count: store._count,
  }));

  const storeTypeRows = storeTypes.map((storeType) => ({
    id: storeType.id,
    name: storeType.name,
    customerSectionName: storeType.customerSectionName,
    slug: storeType.slug,
    description: storeType.description,
    iconUrl: storeType.iconUrl,
    iconPublicId: storeType.iconPublicId,
    imageUrl: storeType.imageUrl,
    imagePublicId: storeType.imagePublicId,
    displayOrder: storeType.displayOrder,
    isActive: storeType.isActive,
    isFeatured: storeType.isFeatured,
    commerceEngine: storeType.commerceEngine,
    optionalProductFields: parseOptionalProductFields(storeType.optionalProductFieldsJson),
    stockTrackingRequired: storeType.stockTrackingRequired,
    ageConfirmationRequired: storeType.ageConfirmationRequired,
    productUnitsEnabled: storeType.productUnitsEnabled,
    brandsEnabled: storeType.brandsEnabled,
    departmentsEnabled: storeType.departmentsEnabled,
    storeCount: storeType._count.stores,
  }));

  return (
    <>
      <main className="admin-orders-page">
        <header className="admin-dashboard-header">
          <div>
            <span className="catalog-kicker">KARAME BAY ADMIN</span>
            <h1>Stores and store types</h1>
            <p>
              Create unlimited customer sections, assign a reusable commerce
              engine, and manage every store from Admin.
            </p>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/menus">Restaurant menus</Link>
            <Link href="/admin/products">Retail catalog</Link>
            <Link href="/admin/riders">Riders</Link>
          </div>
        </header>

        <AdminStoreTypeManager storeTypes={storeTypeRows} />
        <AdminStoreManager
          stores={storeRows}
          storeTypes={storeTypeRows.map(({ id, name, customerSectionName, commerceEngine, isActive }) => ({ id, name, customerSectionName, commerceEngine, isActive }))}
        />
      </main>
      <OperationsPortalBadge role={`${user.firstName} · Admin`} destination="/admin/login" />
    </>
  );
}
