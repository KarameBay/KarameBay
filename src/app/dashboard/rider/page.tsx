import { RiderDashboard } from "@/components/rider/rider-dashboard";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { getRiderDashboardData } from "@/lib/rider";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rider = await requireRole("RIDER");
  const data = await getRiderDashboardData(rider.id);
  return (
    <>
      <RiderDashboard
        rider={rider}
        riderName={rider.firstName}
        riderProfile={data.profile}
        initialAvailable={data.available}
        initialAssigned={data.assigned}
        earnings={data.earnings}
      />
      <OperationsPortalBadge role="Rider" destination="/rider/login" />
    </>
  );
}
