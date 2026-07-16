import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getRider, serializeRiderDelivery } from "@/lib/rider";
import {
  notifyDelivered,
  notifyOnTheWay,
  notifyPickedUp,
} from "@/lib/order-notifications";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ACCEPT") }),
  z.object({
    action: z.literal("UPDATE_STATUS"),
    status: z.enum(["PICKED_UP", "ON_THE_WAY", "DELIVERED"]),
  }),
]);
const transitions: Record<string, string> = {
  READY_FOR_PICKUP: "PICKED_UP",
  PICKED_UP: "ON_THE_WAY",
  ON_THE_WAY: "DELIVERED",
};
const requiredAssignmentStatus: Record<string, string> = {
  PICKED_UP: "ACKNOWLEDGED",
  ON_THE_WAY: "PICKED_UP",
  DELIVERED: "ON_THE_WAY",
};

class DeliveryTransitionConflict extends Error {}
const include = {
  store: {
    select: {
      name: true,
      latitude: true,
      longitude: true,
      phone: true,
    },
  },
  customer: {
    select: { firstName: true, lastName: true, phone: true },
  },
  payment: { select: { status: true } },
  items: { select: { id: true, productName: true, quantity: true } },
} as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getRider();
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid delivery update" },
      { status: 400 },
    );
  const { id } = await params;
  if (parsed.data.action === "ACCEPT") {
    const changed = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id,
          riderId: context.user.id,
          status: "READY_FOR_PICKUP",
          payment: { status: "PAID" },
        },
        select: { id: true },
      });
      if (!order) return false;
      const now = new Date();
      const assignment = await tx.riderAssignment.findFirst({
        where: {
          orderId: id,
          riderId: context.user.id,
          status: "ASSIGNED",
          assignedById: { not: null },
        },
        orderBy: { assignedAt: "desc" },
      });
      if (!assignment) return false;
      const accepted = await tx.riderAssignment.updateMany({
        where: { id: assignment.id, status: "ASSIGNED" },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: assignment.acknowledgedAt ?? now,
        },
      });
      if (accepted.count !== 1) return false;
      await tx.riderProfile.upsert({
        where: { userId: context.user.id },
        update: { riderStatus: "BUSY", lastSeenAt: now },
        create: {
          userId: context.user.id,
          riderStatus: "BUSY",
          lastSeenAt: now,
        },
      });
      return true;
    });
    if (!changed)
      return NextResponse.json(
        { error: "This delivery is no longer available" },
        { status: 409 },
      );
  } else {
    const targetStatus = parsed.data.status;
    const order = await db.order.findFirst({
      where: { id, riderId: context.user.id },
      select: {
        id: true,
        customerId: true,
        orderNumber: true,
        status: true,
        deliveryFeeRwf: true,
        grandTotalRwf: true,
        store: {
          select: {
            name: true,
            ownerId: true,
          },
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });
    if (!order)
      return NextResponse.json(
        { error: "This delivery is not assigned to you" },
        { status: 404 },
      );
    if (transitions[order.status] !== targetStatus)
      return NextResponse.json(
        {
          error: `The next delivery status must be ${transitions[order.status]?.replaceAll("_", " ") ?? "none"}`,
        },
        { status: 409 },
      );
    const assignment = await db.riderAssignment.findFirst({
      where: { orderId: id, riderId: context.user.id },
      orderBy: { assignedAt: "desc" },
      select: { id: true, status: true },
    });
    const expectedAssignmentStatus = requiredAssignmentStatus[targetStatus];
    if (!assignment || assignment.status !== expectedAssignmentStatus)
      return NextResponse.json(
        {
          error:
            targetStatus === "PICKED_UP"
              ? "Accept this delivery before marking it picked up."
              : "Complete the previous rider step before continuing.",
        },
        { status: 409 },
      );
    try {
      await db.$transaction(async (tx) => {
        const now = new Date();
        const result = await tx.order.updateMany({
          where: { id, riderId: context.user.id, status: order.status },
          data: { status: targetStatus },
        });
        if (result.count !== 1) throw new DeliveryTransitionConflict();
        const assignmentChanged = await tx.riderAssignment.updateMany({
          where: {
            id: assignment.id,
            riderId: context.user.id,
            status: expectedAssignmentStatus,
          },
          data: {
            status: targetStatus,
            ...(targetStatus === "PICKED_UP" ? { pickedUpAt: now } : {}),
            ...(targetStatus === "ON_THE_WAY" ? { onTheWayAt: now } : {}),
            ...(targetStatus === "DELIVERED"
              ? { deliveredAt: now, completedAt: now }
              : {}),
          },
        });
        if (assignmentChanged.count !== 1)
          throw new DeliveryTransitionConflict();
        await tx.orderStatusEvent.create({
          data: {
            orderId: id,
            status: targetStatus,
            actorId: context.user.id,
            note: `Updated by rider ${context.user.firstName} ${context.user.lastName}.`,
          },
        });
        if (targetStatus === "PICKED_UP") {
          await notifyPickedUp(tx, {
          order: {
            id: order.id,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
          },
          store: {
            name: order.store.name,
            ownerId: order.store.ownerId,
          },
          rider: {
            id: context.user.id,
            firstName: context.user.firstName,
            lastName: context.user.lastName,
          },
          });
        } else if (targetStatus === "ON_THE_WAY") {
          await notifyOnTheWay(tx, {
          order: {
            id: order.id,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
          },
          });
        } else if (targetStatus === "DELIVERED") {
          await notifyDelivered(tx, {
          order: {
            id: order.id,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
            grandTotalRwf: order.grandTotalRwf,
          },
          store: {
            name: order.store.name,
            ownerId: order.store.ownerId,
          },
          customer: {
            firstName: order.customer.firstName,
            email: order.customer.email,
          },
          rider: {
            firstName: context.user.firstName,
            lastName: context.user.lastName,
          },
          });
        }
        const remainingActive = await tx.order.count({
          where: {
            riderId: context.user.id,
            status: { in: ["READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY"] },
          },
        });
        await tx.riderProfile.upsert({
        where: { userId: context.user.id },
        update: {
          riderStatus:
            targetStatus === "DELIVERED"
              ? remainingActive > 0
                ? "BUSY"
                : "AVAILABLE"
              : "ON_DELIVERY",
          lastSeenAt: now,
          ...(targetStatus === "DELIVERED"
            ? {
                completedDeliveriesCount: { increment: 1 },
                totalEarningsRwf: { increment: order.deliveryFeeRwf ?? 0 },
              }
            : {}),
        },
        create: {
          userId: context.user.id,
          riderStatus:
            targetStatus === "DELIVERED" ? "AVAILABLE" : "ON_DELIVERY",
          lastSeenAt: now,
          ...(targetStatus === "DELIVERED"
            ? {
                completedDeliveriesCount: 1,
                totalEarningsRwf: order.deliveryFeeRwf ?? 0,
              }
            : {}),
        },
        });
      });
    } catch (error) {
      if (error instanceof DeliveryTransitionConflict)
        return NextResponse.json(
          { error: "The delivery changed. Refresh and try again." },
          { status: 409 },
        );
      throw error;
    }
  }
  const [delivery, latestAssignment] = await Promise.all([
    db.order.findUniqueOrThrow({ where: { id }, include }),
    db.riderAssignment.findFirst({
      where: { orderId: id, riderId: context.user.id },
      orderBy: { assignedAt: "desc" },
      select: { status: true },
    }),
  ]);
  return NextResponse.json({
    delivery: {
      ...serializeRiderDelivery(delivery),
      assignmentStatus: latestAssignment?.status ?? null,
    },
  });
}
