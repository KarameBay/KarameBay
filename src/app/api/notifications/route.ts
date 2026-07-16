import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { customerOrderHref, operationsOrderHref } from "@/lib/order-notifications";
import type { Role } from "@/lib/auth/constants";

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("MARK_ALL_READ") }),
  z.object({ action: z.literal("MARK_READ"), id: z.string().min(1) }),
]);
const roleByPortal = { customer: "CUSTOMER", admin: "ADMIN", rider: "RIDER" } as const;

async function contextFor(request: Request) {
  const portal = new URL(request.url).searchParams.get("portal") as keyof typeof roleByPortal | null;
  const role = portal && roleByPortal[portal] ? roleByPortal[portal] : "CUSTOMER";
  const user = await getCurrentUser(role);
  return user ? { user, role } : { error: "Unauthenticated", status: 401 as const };
}

function parcelHref(role: Role, reference: string) {
  if (role === "ADMIN") return `/admin/parcels?parcel=${encodeURIComponent(reference)}`;
  if (role === "RIDER") return `/rider/parcels?parcel=${encodeURIComponent(reference)}`;
  return `/customer/parcels/${encodeURIComponent(reference)}`;
}

export async function GET(request: Request) {
  const context = await contextFor(request);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? "20") || 20, 1), 50);
  const [orders, parcels, orderUnread, parcelUnread] = await Promise.all([
    db.notification.findMany({
      where: { userId: context.user.id },
      select: { id: true, type: true, title: true, message: true, readAt: true, createdAt: true, order: { select: { id: true, orderNumber: true, status: true, store: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" }, take: limit,
    }),
    db.parcelNotification.findMany({
      where: { userId: context.user.id },
      select: { id: true, type: true, title: true, message: true, readAt: true, createdAt: true, parcelDelivery: { select: { referenceNumber: true, status: true } } },
      orderBy: { createdAt: "desc" }, take: limit,
    }),
    db.notification.count({ where: { userId: context.user.id, readAt: null } }),
    db.parcelNotification.count({ where: { userId: context.user.id, readAt: null } }),
  ]);
  const items = [
    ...orders.map((item) => ({
      id: `order:${item.id}`, type: item.type, title: item.title, message: item.message,
      readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(),
      contextLabel: `${item.order.store.name} · ${item.order.orderNumber}`,
      status: item.order.status,
      href: context.role === "CUSTOMER" ? customerOrderHref(item.order.orderNumber) : operationsOrderHref(context.role as "ADMIN" | "RIDER", item.order.id),
    })),
    ...parcels.map((item) => ({
      id: `parcel:${item.id}`, type: item.type, title: item.title, message: item.message,
      readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(),
      contextLabel: `Parcel Delivery · ${item.parcelDelivery.referenceNumber}`,
      status: item.parcelDelivery.status,
      href: parcelHref(context.role, item.parcelDelivery.referenceNumber),
    })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit);
  return NextResponse.json({ notifications: items, unreadCount: orderUnread + parcelUnread, role: context.role });
}

export async function PATCH(request: Request) {
  const context = await contextFor(request);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification update" }, { status: 400 });
  const readAt = new Date();
  if (parsed.data.action === "MARK_ALL_READ") {
    await db.$transaction([
      db.notification.updateMany({ where: { userId: context.user.id, readAt: null }, data: { readAt } }),
      db.parcelNotification.updateMany({ where: { userId: context.user.id, readAt: null }, data: { readAt } }),
    ]);
  } else {
    const [kind, id] = parsed.data.id.split(":", 2);
    const updated = kind === "parcel"
      ? await db.parcelNotification.updateMany({ where: { id, userId: context.user.id, readAt: null }, data: { readAt } })
      : await db.notification.updateMany({ where: { id: kind === "order" ? id : parsed.data.id, userId: context.user.id, readAt: null }, data: { readAt } });
    if (!updated.count) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, readAt });
}

