import { redirect } from "next/navigation";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { customerOrderHref, operationsOrderHref } from "@/lib/order-notifications";

export const dynamic = "force-dynamic";

const roleByPortal = {
  customer: "CUSTOMER",
  admin: "ADMIN",
  rider: "RIDER",
} as const;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const requested = (await searchParams).portal;
  const portal = requested === "admin" || requested === "rider" ? requested : "customer";
  const role = roleByPortal[portal];
  const user = await getCurrentUser(role);
  if (!user) redirect(portal === "customer" ? "/login" : "/staff/login");

  const [orderRows, parcelRows] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      select: {
        id: true, type: true, title: true, message: true, readAt: true, createdAt: true,
        order: { select: { id: true, orderNumber: true, status: true, store: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.parcelNotification.findMany({
      where: { userId: user.id },
      select: {
        id: true, type: true, title: true, message: true, readAt: true, createdAt: true,
        parcelDelivery: { select: { referenceNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const parcelHref = (reference: string) =>
    role === "ADMIN"
      ? `/admin/parcels?parcel=${encodeURIComponent(reference)}`
      : role === "RIDER"
        ? `/rider/parcels?parcel=${encodeURIComponent(reference)}`
        : `/customer/parcels/${encodeURIComponent(reference)}`;

  const notifications = [
    ...orderRows.map((item) => ({
      id: `order:${item.id}`,
      type: item.type,
      title: item.title,
      message: item.message,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      contextLabel: `${item.order.store.name} · ${item.order.orderNumber}`,
      status: item.order.status,
      href:
        role === "CUSTOMER"
          ? customerOrderHref(item.order.orderNumber)
          : operationsOrderHref(role as "ADMIN" | "RIDER", item.order.id),
    })),
    ...parcelRows.map((item) => ({
      id: `parcel:${item.id}`,
      type: item.type,
      title: item.title,
      message: item.message,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      contextLabel: `Parcel delivery · ${item.parcelDelivery.referenceNumber}`,
      status: item.parcelDelivery.status,
      href: parcelHref(item.parcelDelivery.referenceNumber),
    })),
  ]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);

  return (
    <main className="notifications-page">
      <header>
        <div>
          <span className="catalog-kicker">NOTIFICATION CENTER</span>
          <h1>
            {role === "CUSTOMER" ? "Customer" : role === "ADMIN" ? "Admin" : "Rider"} notifications
          </h1>
          <p>Internal order and parcel delivery updates for your account.</p>
        </div>
      </header>
      <NotificationsClient initialNotifications={notifications} portal={portal} />
    </main>
  );
}
