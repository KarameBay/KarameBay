import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canTransitionOrder, ORDER_STATUSES } from "@/lib/order-status";
import {
  createOrderNotification,
  createRiderAssignmentNotifications,
  notifyCancelled,
  notifyDelivered,
  notifyOrderAccepted,
  notifyPaymentVerified,
  notifyReadyForPickup,
  notifyRejected,
} from "@/lib/order-notifications";

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("VERIFY_PAYMENT") }),
  z.object({
    action: z.literal("ASSIGN_RIDER"),
    riderId: z.string().min(1),
  }),
  z.object({
    action: z.literal("UPDATE_STATUS"),
    status: z.enum(ORDER_STATUSES),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid order update" },
      { status: 400 },
    );
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      payment: true,
      rider: { select: { firstName: true, lastName: true, email: true, phone: true } },
      customer: { select: { firstName: true, lastName: true, email: true } },
      store: {
        select: { name: true, ownerId: true, preparationMinutes: true },
      },
      riderAssignments: {
        orderBy: { assignedAt: "desc" },
        take: 1,
        select: { acknowledgedAt: true },
      },
    },
  });
  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (parsed.data.action === "VERIFY_PAYMENT") {
    if (!order.payment)
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 },
      );
    if (order.payment.status === "PAID")
      return NextResponse.json({
        order: { id, status: order.status, paymentStatus: "PAID" },
      });
    if (order.payment.status !== "PENDING_VERIFICATION")
      return NextResponse.json(
        { error: "Only pending payments can be verified" },
        { status: 409 },
      );
    if (["CANCELLED", "REJECTED"].includes(order.status))
      return NextResponse.json(
        { error: "A cancelled or rejected order cannot be marked paid." },
        { status: 409 },
      );
    const payment = await db.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { orderId: id },
        data: {
          status: "PAID",
          verifiedAt: new Date(),
          verifiedById: admin.id,
        },
      });
      await notifyPaymentVerified(tx, {
        order: {
          id: order.id,
          customerId: order.customerId,
          orderNumber: order.orderNumber,
          grandTotalRwf: order.grandTotalRwf,
        },
        store: {
          ownerId: order.store.ownerId,
          name: order.store.name,
        },
        customer: {
          firstName: order.customer.firstName,
          email: order.customer.email,
        },
      });
      return updated;
    });
    return NextResponse.json({
      order: { id, status: order.status, paymentStatus: payment.status },
    });
  }
  if (parsed.data.action === "ASSIGN_RIDER") {
    if (order.riderId)
      return NextResponse.json(
        { error: "This order already has a rider assigned." },
        { status: 409 },
      );
    if (order.status !== "READY_FOR_PICKUP")
      return NextResponse.json(
        { error: "Only ready-for-pickup orders can be assigned." },
        { status: 409 },
      );
    const rider = await db.user.findFirst({
      where: {
        id: parsed.data.riderId,
        role: "RIDER",
        status: "ACTIVE",
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    if (!rider)
      return NextResponse.json(
        { error: "Select an active rider account." },
        { status: 404 },
      );
    const now = new Date();
    const changed = await db.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id, riderId: null, status: "READY_FOR_PICKUP" },
        data: { riderId: rider.id },
      });
      if (result.count !== 1) return false;
      await tx.riderAssignment.create({
        data: {
          orderId: id,
          riderId: rider.id,
          assignedById: admin.id,
          status: "ASSIGNED",
          assignedAt: now,
        },
      });
      await tx.riderProfile.upsert({
        where: { userId: rider.id },
        update: {
          riderStatus: "BUSY",
          lastSeenAt: now,
        },
        create: {
          userId: rider.id,
          riderStatus: "BUSY",
          lastSeenAt: now,
        },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: id,
          status: "READY_FOR_PICKUP",
          actorId: admin.id,
          note: `Rider ${rider.firstName} ${rider.lastName} assigned by administrator ${admin.firstName} ${admin.lastName}.`,
        },
      });
      await createRiderAssignmentNotifications(tx, {
        order: { id, customerId: order.customerId, orderNumber: order.orderNumber },
        storeName: order.store.name,
        storeOwnerId: order.store.ownerId,
        rider,
        admin,
      });
      return true;
    });
    if (!changed)
      return NextResponse.json(
        {
          error:
            "The order changed while you were assigning a rider. Refresh and try again.",
        },
        { status: 409 },
      );
    return NextResponse.json({
      order: {
        id,
        status: order.status,
        rider: {
          id: rider.id,
          firstName: rider.firstName,
          lastName: rider.lastName,
          phone: rider.phone,
        },
      },
    });
  }
  const targetStatus = parsed.data.status;
  const riderHasAccepted = Boolean(
    order.riderAssignments[0]?.acknowledgedAt,
  );
  if (riderHasAccepted && targetStatus !== "CANCELLED")
    return NextResponse.json(
      {
        error:
          "The rider has accepted this delivery. Further delivery status updates must come from the assigned rider.",
      },
      { status: 409 },
    );
  if (order.status === targetStatus)
    return NextResponse.json({
      order: {
        id,
        status: order.status,
        paymentStatus: order.payment?.status ?? "PENDING_VERIFICATION",
      },
    });
  if (!canTransitionOrder(order.status, targetStatus))
    return NextResponse.json(
      { error: `Cannot change ${order.status} to ${parsed.data.status}.` },
      { status: 409 },
    );
  if (["PICKED_UP", "ON_THE_WAY", "DELIVERED"].includes(targetStatus))
    return NextResponse.json(
      {
        error:
          "Only the assigned rider can update pickup and delivery statuses after accepting the delivery.",
      },
      { status: 403 },
    );
  if (targetStatus === "ACCEPTED" && order.payment?.status !== "PAID")
    return NextResponse.json(
      { error: "Verify the payment before accepting this order." },
      { status: 409 },
    );
  const changed = await db.$transaction(async (tx) => {
    const now = new Date();
    const result = await tx.order.updateMany({
      where: { id, status: order.status },
      data: { status: targetStatus },
    });
    if (result.count !== 1) return false;
    await tx.orderStatusEvent.create({
      data: {
        orderId: id,
        status: targetStatus,
        actorId: admin.id,
        note: `Status updated by administrator ${admin.firstName} ${admin.lastName}.`,
        },
      });
      if (targetStatus === "ACCEPTED") {
        await notifyOrderAccepted(tx, {
          order: {
            id: order.id,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
            grandTotalRwf: order.grandTotalRwf,
          },
          store: {
            name: order.store.name,
            ownerId: order.store.ownerId,
            preparationMinutes: order.store.preparationMinutes,
          },
          customer: {
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            email: order.customer.email,
          },
        });
      } else if (targetStatus === "PREPARING") {
        await createOrderNotification(tx, order, targetStatus);
      } else if (targetStatus === "READY_FOR_PICKUP") {
        await notifyReadyForPickup(tx, {
          order: {
            id: order.id,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
          },
          store: {
            name: order.store.name,
            ownerId: order.store.ownerId,
          },
        });
      } else if (targetStatus === "CANCELLED") {
        await notifyCancelled(tx, {
          order: {
            id: order.id,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
          },
          store: {
            name: order.store.name,
            ownerId: order.store.ownerId,
          },
        });
      } else if (targetStatus === "REJECTED") {
        await notifyRejected(tx, {
          order: {
            id: order.id,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
          },
          store: {
            name: order.store.name,
            ownerId: order.store.ownerId,
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
            firstName: order.rider?.firstName ?? "Karame",
            lastName: order.rider?.lastName ?? "Rider",
          },
        });
      } else {
        await createOrderNotification(tx, order, targetStatus);
      }
      if (order.riderId) {
        const latestAssignment = await tx.riderAssignment.findFirst({
          where: { orderId: id, riderId: order.riderId },
          orderBy: { assignedAt: "desc" },
        });
        if (latestAssignment) {
          await tx.riderAssignment.update({
            where: { id: latestAssignment.id },
            data: {
              status:
                targetStatus === "PICKED_UP"
                  ? "PICKED_UP"
                  : targetStatus === "ON_THE_WAY"
                    ? "ON_THE_WAY"
                    : targetStatus === "DELIVERED"
                      ? "DELIVERED"
                      : targetStatus === "CANCELLED"
                        ? "CANCELLED"
                      : latestAssignment.status,
              ...(targetStatus === "PICKED_UP" ? { pickedUpAt: now } : {}),
              ...(targetStatus === "ON_THE_WAY" ? { onTheWayAt: now } : {}),
              ...(targetStatus === "DELIVERED" ? { deliveredAt: now, completedAt: now } : {}),
              ...(targetStatus === "CANCELLED" ? { completedAt: now } : {}),
            },
          });
        }
        const remainingActive = await tx.order.count({
          where: {
            riderId: order.riderId,
            status: { in: ["READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY"] },
          },
        });
        await tx.riderProfile.upsert({
          where: { userId: order.riderId },
          update: {
            riderStatus:
              ["DELIVERED", "CANCELLED"].includes(targetStatus)
                ? remainingActive > 0
                  ? "BUSY"
                  : "AVAILABLE"
                : "ON_DELIVERY",
            lastSeenAt: now,
            ...(targetStatus === "DELIVERED"
              ? {
                  completedDeliveriesCount: { increment: 1 },
                  totalEarningsRwf: { increment: order.deliveryFeeRwf },
                }
              : {}),
          },
          create: {
            userId: order.riderId,
            riderStatus:
              ["DELIVERED", "CANCELLED"].includes(targetStatus)
                ? "AVAILABLE"
                : "ON_DELIVERY",
            lastSeenAt: now,
            ...(targetStatus === "DELIVERED"
              ? {
                  completedDeliveriesCount: 1,
                  totalEarningsRwf: order.deliveryFeeRwf,
                }
              : {}),
          },
        });
      }
      return true;
    });
  if (!changed)
    return NextResponse.json(
      {
        error:
          "The order changed while you were editing it. Refresh and try again.",
      },
      { status: 409 },
    );
  return NextResponse.json({
    order: {
      id,
      status: targetStatus,
      paymentStatus: order.payment?.status ?? "PENDING_VERIFICATION",
    },
  });
}
