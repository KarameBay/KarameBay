import { notFound, redirect } from "next/navigation";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { OrderTrackingClient } from "@/components/orders/order-tracking-client";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parseStoredRoute } from "@/lib/rider";

export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user) redirect("/customer/login");
  const { orderNumber } = await params;
  const row = await db.order.findFirst({
    where: {
      orderNumber,
      ...(user.role === "ADMIN" ? {} : { customerId: user.id }),
    },
    select: {
      orderNumber: true,
      status: true,
      deliveryAddress: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
      drivingDistanceM: true,
      estimatedDurationS: true,
      riderCurrentLatitude: true,
      riderCurrentLongitude: true,
      riderLocationUpdatedAt: true,
      riderRoutePhase: true,
      riderRouteJson: true,
      remainingDistanceM: true,
      remainingDurationS: true,
      grandTotalRwf: true,
      createdAt: true,
      store: { select: { name: true, latitude: true, longitude: true } },
      rider: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          riderProfile: {
            select: {
              vehicleType: true,
              riderStatus: true,
              currentLocationLabel: true,
              currentLatitude: true,
              currentLongitude: true,
              lastSeenAt: true,
            },
          },
        },
      },
      payment: { select: { status: true } },
      events: {
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, note: true, createdAt: true },
      },
    },
  });
  if (!row) notFound();
  const { riderRouteJson, ...rowWithoutRouteJson } = row;
  const order = {
    ...rowWithoutRouteJson,
    createdAt: row.createdAt.toISOString(),
    riderLocationUpdatedAt: row.riderLocationUpdatedAt?.toISOString() ?? null,
    liveRoute: parseStoredRoute(riderRouteJson),
    rider: row.rider
      ? {
          ...row.rider,
          riderProfile: row.rider.riderProfile
            ? {
                ...row.rider.riderProfile,
                lastSeenAt: row.rider.riderProfile.lastSeenAt?.toISOString() ?? null,
              }
            : null,
        }
      : null,
    events: row.events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
  return (
    <>
      <BrowseHeader />
      <OrderTrackingClient initial={order} />
    </>
  );
}
