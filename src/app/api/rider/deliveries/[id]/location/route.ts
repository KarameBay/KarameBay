import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getRider, parseStoredRoute } from "@/lib/rider";
import { getDrivingRoute } from "@/lib/routing";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(10_000).nullable().optional(),
  headingDegrees: z.number().min(0).max(360).nullable().optional(),
  speedMps: z.number().min(0).max(100).nullable().optional(),
});

const activeStatuses = ["READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getRider();
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const parsed = locationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid GPS location." }, { status: 400 });
  }

  const { id } = await params;
  const order = await db.order.findFirst({
    where: {
      id,
      riderId: context.user.id,
      status: { in: activeStatuses },
    },
    select: {
      id: true,
      status: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
      riderRouteJson: true,
      remainingDistanceM: true,
      remainingDurationS: true,
      store: { select: { latitude: true, longitude: true } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "This active delivery is not assigned to you." },
      { status: 404 },
    );
  }

  const current = {
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
  };
  const headingToPickup = order.status === "READY_FOR_PICKUP";
  const destination = headingToPickup
    ? order.store
    : {
        latitude: order.deliveryLatitude,
        longitude: order.deliveryLongitude,
      };
  const phase = headingToPickup ? "PICKUP" : "DELIVERY";

  let route = null;
  try {
    route = await getDrivingRoute(current, destination);
  } catch {}

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: order.id, riderId: context.user.id, status: order.status },
      data: {
        riderCurrentLatitude: current.latitude,
        riderCurrentLongitude: current.longitude,
        riderLocationAccuracyM: parsed.data.accuracyM ?? null,
        riderHeadingDegrees: parsed.data.headingDegrees ?? null,
        riderSpeedMps: parsed.data.speedMps ?? null,
        riderLocationUpdatedAt: now,
        riderRoutePhase: phase,
        ...(route
          ? {
              riderRouteJson: JSON.stringify(route.route),
              remainingDistanceM: route.distanceMeters,
              remainingDurationS: route.durationSeconds,
            }
          : {}),
      },
    });
    if (changed.count !== 1) return false;
    await tx.riderProfile.upsert({
      where: { userId: context.user.id },
      update: {
        currentLatitude: current.latitude,
        currentLongitude: current.longitude,
        currentLocationLabel: headingToPickup ? "Heading to pickup" : "Heading to customer",
        riderStatus: headingToPickup ? "BUSY" : "ON_DELIVERY",
        lastSeenAt: now,
      },
      create: {
        userId: context.user.id,
        currentLatitude: current.latitude,
        currentLongitude: current.longitude,
        currentLocationLabel: headingToPickup ? "Heading to pickup" : "Heading to customer",
        riderStatus: headingToPickup ? "BUSY" : "ON_DELIVERY",
        onlineSinceAt: now,
        lastSeenAt: now,
      },
    });
    return true;
  });

  if (!updated) {
    return NextResponse.json(
      { error: "The delivery status changed. Refresh before continuing." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    location: {
      ...current,
      accuracyM: parsed.data.accuracyM ?? null,
      updatedAt: now.toISOString(),
    },
    phase,
    remainingDistanceM: route?.distanceMeters ?? order.remainingDistanceM,
    remainingDurationS: route?.durationSeconds ?? order.remainingDurationS,
    route: route?.route ?? parseStoredRoute(order.riderRouteJson),
    routeStale: !route,
    warning: route
      ? null
      : "GPS was shared, but the driving route could not be refreshed yet.",
  });
}
