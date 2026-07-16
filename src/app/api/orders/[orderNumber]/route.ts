import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parseStoredRoute } from "@/lib/rider";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { orderNumber } = await params;
  const order = await db.order.findFirst({
    where: {
      orderNumber,
      ...(user.role === "ADMIN" ? {} : { customerId: user.id }),
    },
    select: {
      id: true,
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
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const { riderRouteJson, ...publicOrder } = order;
  return NextResponse.json({
    order: { ...publicOrder, liveRoute: parseStoredRoute(riderRouteJson) },
  });
}
