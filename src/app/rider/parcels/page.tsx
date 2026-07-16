import { RiderParcelDashboard } from "@/components/rider/rider-parcel-dashboard";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { getRiderParcelDashboardData } from "@/lib/rider-parcels";

export const dynamic = "force-dynamic";

export default async function RiderParcelsPage() {
  const rider = await requireRole("RIDER");
  const data = await getRiderParcelDashboardData(rider.id);
  return (
    <>
      <RiderParcelDashboard
        riderName={`${rider.firstName} ${rider.lastName}`}
        initialActive={data.active}
        initialCompleted={data.completed}
        initialClosed={data.closed}
        initialEarningsRwf={data.earningsRwf}
      />
      <OperationsPortalBadge role="Rider" destination="/rider/login" />
    </>
  );
}
