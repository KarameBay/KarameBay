import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getRider } from "@/lib/rider";
import { getDrivingRoute } from "@/lib/routing";
import { PARCEL_ACTIVE_RIDER_STATUSES } from "@/lib/parcel";
import { parseParcelRoute } from "@/lib/rider-parcels";
import { rateLimit } from "@/lib/rate-limit";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(10_000).nullable().optional(),
  headingDegrees: z.number().min(0).max(360).nullable().optional(),
  speedMps: z.number().min(0).max(100).nullable().optional(),
});

const pickupStatuses = [
  "RIDER_ASSIGNED",
  "RIDER_GOING_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getRider();
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  const parsed = locationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid GPS location." }, { status: 400 });

  const { id } = await params;
  if (!rateLimit(`parcel-gps:${context.user.id}:${id}`, 20, 60_000))
    return NextResponse.json(
      { error: "Location updates are arriving too quickly." },
      { status: 429 },
    );
  const parcel = await db.parcelDelivery.findFirst({
    where: {
      id,
      assignedRiderId: context.user.id,
      status: { in: [...PARCEL_ACTIVE_RIDER_STATUSES] },
    },
    select: {
      id: true,
      status: true,
      pickupLatitude: true,
      pickupLongitude: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
      riderRouteJson: true,
      remainingDistanceM: true,
      remainingDurationS: true,
    },
  });
  if (!parcel)
    return NextResponse.json(
      { error: "This active parcel is not assigned to you." },
      { status: 404 },
    );

  const current = {
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
  };
  const headingToPickup = pickupStatuses.includes(parcel.status);
  const destination = headingToPickup
    ? {
        latitude: parcel.pickupLatitude,
        longitude: parcel.pickupLongitude,
      }
    : {
        latitude: parcel.deliveryLatitude,
        longitude: parcel.deliveryLongitude,
      };
  const phase = headingToPickup ? "PICKUP" : "DELIVERY";

  let route: Awaited<ReturnType<typeof getDrivingRoute>> | null = null;
  try {
    route = await getDrivingRoute(current, destination);
  } catch {}

  const now = new Date();
  const changed = await db.$transaction(async (tx) => {
    const result = await tx.parcelDelivery.updateMany({
      where: {
        id,
        assignedRiderId: context.user.id,
        status: parcel.status,
      },
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
    if (result.count !== 1) return false;
    await tx.riderProfile.upsert({
      where: { userId: context.user.id },
      update: {
        currentLatitude: current.latitude,
        currentLongitude: current.longitude,
        currentLocationLabel: headingToPickup
          ? "Heading to parcel pickup"
          : "Delivering parcel",
        riderStatus: headingToPickup ? "BUSY" : "ON_DELIVERY",
        lastSeenAt: now,
      },
      create: {
        userId: context.user.id,
        currentLatitude: current.latitude,
        currentLongitude: current.longitude,
        currentLocationLabel: headingToPickup
          ? "Heading to parcel pickup"
          : "Delivering parcel",
        riderStatus: headingToPickup ? "BUSY" : "ON_DELIVERY",
        onlineSinceAt: now,
        lastSeenAt: now,
      },
    });
    return true;
  });

  if (!changed)
    return NextResponse.json(
      { error: "The parcel status changed. Refresh before continuing." },
      { status: 409 },
    );
  return NextResponse.json({
    location: { ...current, updatedAt: now.toISOString() },
    phase,
    remainingDistanceM: route?.distanceMeters ?? parcel.remainingDistanceM,
    remainingDurationS: route?.durationSeconds ?? parcel.remainingDurationS,
    route: route?.route ?? parseParcelRoute(parcel.riderRouteJson),
    routeStale: !route,
    warning: route
      ? null
      : "GPS was shared, but the driving route could not be refreshed yet.",
  });
}
