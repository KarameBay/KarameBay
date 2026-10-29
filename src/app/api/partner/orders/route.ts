import { NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedPartner } from "@/lib/partner";
import { db } from "@/lib/db";
import { canTransitionOrder } from "@/lib/order-status";
import { createOrderNotification, notifyOrderAccepted, notifyReadyForPickup, notifyCancelled, notifyRejected } from "@/lib/order-notifications";

const partnerStatuses = ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED", "REJECTED"] as const;
const updateSchema = z.object({ orderId: z.string().min(1), status: z.enum(partnerStatuses) });

const orderInclude = {
  customer: { select: { firstName: true, lastName: true, phone: true } },
  store: { select: { id: true, name: true } },
  payment: { select: { status: true } },
  items: { select: { id: true, productName: true, quantity: true, unitPriceRwf: true, lineTotalRwf: true } },
  rider: { select: { firstName: true, lastName: true, phone: true } },
} as const;

export async function GET() {
  const partner = await getVerifiedPartner();
  if (!partner) return NextResponse.json({ error: "Partner access required" }, { status: 401 });
  const orders = await db.order.findMany({
    where: { store: { ownerId: partner.id } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ orders: orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() })) });
}

export async function PATCH(request: Request) {
  const partner = await getVerifiedPartner();
  if (!partner) return NextResponse.json({ error: "Partner access required" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Order and status are required" }, { status: 400 });
  const orderId = parsed.data.orderId;

  const order = await db.order.findFirst({ where: { id: orderId, store: { ownerId: partner.id } }, include: { payment: true, customer: { select: { firstName: true, lastName: true, email: true } }, store: { select: { name: true, ownerId: true, preparationMinutes: true } } } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const targetStatus = parsed.data.status;
  if (targetStatus === "ACCEPTED" && order.payment?.status !== "PAID") return NextResponse.json({ error: "Admin must verify payment before the order can be accepted." }, { status: 409 });
  if (!canTransitionOrder(order.status, targetStatus)) return NextResponse.json({ error: `Cannot change ${order.status} to ${targetStatus}.` }, { status: 409 });

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: targetStatus } });
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: targetStatus, actorId: partner.id, note: `Updated by partner ${partner.firstName} ${partner.lastName}.` } });
    if (targetStatus === "ACCEPTED") {
      await notifyOrderAccepted(tx, { order: { id: order.id, customerId: order.customerId, orderNumber: order.orderNumber, grandTotalRwf: order.grandTotalRwf }, store: order.store, customer: order.customer });
    } else if (targetStatus === "PREPARING") {
      await createOrderNotification(tx, order, targetStatus);
    } else if (targetStatus === "READY_FOR_PICKUP") {
      await notifyReadyForPickup(tx, { order: { id: order.id, customerId: order.customerId, orderNumber: order.orderNumber }, store: order.store });
    } else if (targetStatus === "CANCELLED") {
      await notifyCancelled(tx, { order: { id: order.id, customerId: order.customerId, orderNumber: order.orderNumber }, store: order.store });
    } else if (targetStatus === "REJECTED") {
      await notifyRejected(tx, { order: { id: order.id, customerId: order.customerId, orderNumber: order.orderNumber }, store: order.store });
    }
  });
  return NextResponse.json({ ok: true, status: targetStatus });
}
