import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
export async function getRider() {
  const user = await getCurrentUser("RIDER");
  if (!user) return { error: "Unauthenticated", status: 401 as const };
  if (user.role !== "RIDER")
    return { error: "Rider access required", status: 403 as const };
  return { user };
}

const deliveryInclude = {
  store: {
    select: { name: true, latitude: true, longitude: true, phone: true },
  },
  customer: { select: { firstName: true, lastName: true, phone: true } },
  payment: { select: { status: true } },
  items: { select: { id: true, productName: true, quantity: true } },
} as const;

export function parseStoredRoute(value: string | null | undefined): [number, number][] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number",
    );
  } catch {
    return [];
  }
}

export function serializeRiderDelivery<
  T extends {
    createdAt: Date;
    status: string;
    customer?: { phone: string | null };
    riderRouteJson?: string | null;
    riderLocationUpdatedAt?: Date | null;
  },
>(order: T) {
  const { riderRouteJson, ...rest } = order;
  const customer = order.customer
    ? {
        ...order.customer,
        phone: ["READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY"].includes(order.status)
          ? order.customer.phone
          : null,
      }
    : undefined;
  return {
    ...rest,
    ...(customer ? { customer } : {}),
    createdAt: order.createdAt.toISOString(),
    riderLocationUpdatedAt: order.riderLocationUpdatedAt?.toISOString() ?? null,
    liveRoute: parseStoredRoute(riderRouteJson),
  };
}

export async function getRiderDashboardData(riderId: string) {
  const [profileRow, availableRows, assignedRows] = await Promise.all([
    db.riderProfile.findUnique({
      where: { userId: riderId },
    }),
    db.order.findMany({
      where: {
        riderId,
        status: "READY_FOR_PICKUP",
        payment: { status: "PAID" },
        riderAssignments: {
          some: {
            riderId,
            status: "ASSIGNED",
            assignedById: { not: null },
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryFeeRwf: true,
        drivingDistanceM: true,
        estimatedDurationS: true,
        createdAt: true,
        store: { select: { name: true, latitude: true, longitude: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.order.findMany({
      where: {
        riderId,
        OR: [
          {
            status: "READY_FOR_PICKUP",
            riderAssignments: {
              some: { riderId, status: "ACKNOWLEDGED" },
            },
          },
          { status: "PICKED_UP" },
          { status: "ON_THE_WAY" },
          { status: "DELIVERED" },
        ],
      },
      include: {
        ...deliveryInclude,
        riderAssignments: {
          where: { riderId },
          orderBy: { assignedAt: "desc" as const },
          take: 1,
          select: { status: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return {
    profile: profileRow
      ? {
          ...profileRow,
          onlineSinceAt: profileRow.onlineSinceAt?.toISOString() ?? null,
          lastSeenAt: profileRow.lastSeenAt?.toISOString() ?? null,
        }
      : null,
    available: availableRows.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
    })),
    assigned: assignedRows.map(({ riderAssignments, ...order }) => ({
      ...serializeRiderDelivery(order),
      assignmentStatus: riderAssignments[0]?.status ?? null,
    })),
    earnings: assignedRows
      .filter((order) => order.status === "DELIVERED")
      .reduce((sum, order) => sum + order.deliveryFeeRwf, 0),
  };
}
