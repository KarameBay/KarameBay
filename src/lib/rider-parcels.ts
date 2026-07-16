import { db } from "@/lib/db";
import {
  PARCEL_ACTIVE_RIDER_STATUSES,
  parcelRiderMaySeeContacts,
} from "@/lib/parcel";

export function parseParcelRoute(value: string | null | undefined) {
  if (!value) return [] as [number, number][];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [] as [number, number][];
    return parsed.filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number",
    );
  } catch {
    return [] as [number, number][];
  }
}

const riderParcelSelect = {
  id: true,
  referenceNumber: true,
  status: true,
  pickupContactName: true,
  pickupPhone: true,
  pickupLatitude: true,
  pickupLongitude: true,
  pickupAddress: true,
  pickupAddressDetails: true,
  pickupInstructions: true,
  pickupPreference: true,
  scheduledPickupAt: true,
  recipientName: true,
  recipientPhone: true,
  deliveryLatitude: true,
  deliveryLongitude: true,
  deliveryAddress: true,
  deliveryAddressDetails: true,
  deliveryInstructions: true,
  categoryName: true,
  parcelDescription: true,
  quantity: true,
  estimatedWeightKg: true,
  sizeCode: true,
  sizeName: true,
  fragile: true,
  requiresCarefulHandling: true,
  distanceM: true,
  estimatedDurationS: true,
  deliveryFeeRwf: true,
  totalRwf: true,
  riderCurrentLatitude: true,
  riderCurrentLongitude: true,
  riderLocationUpdatedAt: true,
  riderRoutePhase: true,
  riderRouteJson: true,
  remainingDistanceM: true,
  remainingDurationS: true,
  createdAt: true,
  updatedAt: true,
  payment: { select: { status: true } },
  problems: {
    where: { status: "OPEN" },
    select: {
      id: true,
      category: true,
      description: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

export async function getRiderParcelDashboardData(riderId: string) {
  const rows = await db.parcelDelivery.findMany({
    where: { assignedRiderId: riderId },
    select: riderParcelSelect,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  const parcels = rows.map(({ riderRouteJson, ...parcel }) => {
    const maySeeContacts = parcelRiderMaySeeContacts(parcel.status);
    return {
      ...parcel,
      pickupPhone: maySeeContacts ? parcel.pickupPhone : null,
      recipientPhone: maySeeContacts ? parcel.recipientPhone : null,
      scheduledPickupAt: parcel.scheduledPickupAt?.toISOString() ?? null,
      riderLocationUpdatedAt:
        parcel.riderLocationUpdatedAt?.toISOString() ?? null,
      createdAt: parcel.createdAt.toISOString(),
      updatedAt: parcel.updatedAt.toISOString(),
      liveRoute: parseParcelRoute(riderRouteJson),
      problems: parcel.problems.map((problem) => ({
        ...problem,
        createdAt: problem.createdAt.toISOString(),
      })),
    };
  });
  return {
    active: parcels.filter((parcel) =>
      PARCEL_ACTIVE_RIDER_STATUSES.includes(
        parcel.status as (typeof PARCEL_ACTIVE_RIDER_STATUSES)[number],
      ),
    ),
    completed: parcels.filter((parcel) => parcel.status === "DELIVERED"),
    closed: parcels.filter((parcel) =>
      ["CANCELLED", "REJECTED", "FAILED_DELIVERY"].includes(parcel.status),
    ),
    earningsRwf: parcels
      .filter((parcel) => parcel.status === "DELIVERED")
      .reduce((sum, parcel) => sum + parcel.deliveryFeeRwf, 0),
  };
}
