import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PartnerApproval } from "@/components/admin/partner-approval";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";

export const dynamic = "force-dynamic";
export default async function AdminPartnersPage() {
  const user = await requireRole("ADMIN");
  const stores = await db.store.findMany({
    where: { owner: { role: "PARTNER" } },
    include: {
      owner: { select: { firstName: true, lastName: true, email: true } },
      storeType: { select: { name: true } },
      _count: {
        select: { marketplaceProducts: true, restaurantProducts: true },
      },
    },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
  });
  return (
    <>
      <main className="admin-orders-page">
        <header className="admin-dashboard-header">
          <div>
            <span className="catalog-kicker">KARAME BAY ADMIN</span>
            <h1>Partner stores</h1>
            <p>
              Review new shops and manage partner listings through the shared
              catalogs.
            </p>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/stores">All stores</Link>
            <Link href="/admin/products">Retail catalog</Link>
            <Link href="/admin/menus">Restaurant menus</Link>
          </div>
        </header>
        <PartnerApproval
          stores={stores.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            description: s.description,
            address: s.address,
            phone: s.phone,
            ownerName: `${s.owner.firstName} ${s.owner.lastName}`,
            email: s.owner.email,
            type: s.storeType?.name ?? s.type,
            productCount:
              s._count.marketplaceProducts + s._count.restaurantProducts,
          }))}
        />
      </main>
      <OperationsPortalBadge role={`${user.firstName} · Admin`} />
    </>
  );
}
