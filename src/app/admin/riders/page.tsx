import Link from "next/link";
import { AdminRiderManager } from "@/components/admin/admin-rider-manager";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminRidersPage() {
  const user = await requireRole("ADMIN");
  const riders = await db.user.findMany({
    where: { role: "RIDER" },
    include: {
      riderProfile: true,
      _count: { select: { deliveries: true } },
    },
    orderBy: [{ status: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
  });

  const riderRows = riders.map((rider) => ({
    id: rider.id,
    firstName: rider.firstName,
    lastName: rider.lastName,
    email: rider.email,
    phone: rider.phone,
    status: rider.status,
    riderProfile: rider.riderProfile
      ? {
          riderStatus: rider.riderProfile.riderStatus,
          vehicleType: rider.riderProfile.vehicleType,
          licensePlate: rider.riderProfile.licensePlate,
          photoUrl: rider.riderProfile.photoUrl,
          lastSeenAt: rider.riderProfile.lastSeenAt?.toISOString() ?? null,
        }
      : null,
    _count: rider._count,
  }));

  return (
    <>
      <main className="admin-orders-page">
        <header className="admin-dashboard-header">
          <div>
            <span className="catalog-kicker">KARAME BAY ADMIN</span>
            <h1>Rider management</h1>
            <p>
              Create rider accounts, set statuses, and keep delivery assignments
              inside Admin only.
            </p>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/stores">Stores</Link>
          </div>
        </header>

        <AdminRiderManager riders={riderRows} />
      </main>
      <OperationsPortalBadge role={`${user.firstName} · Admin`} destination="/admin/login" />
    </>
  );
}
