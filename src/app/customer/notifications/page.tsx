import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { customerOrderHref } from "@/lib/order-notifications";

export const dynamic = "force-dynamic";

export default async function CustomerNotificationsPage() {
  const user = await requireRole("CUSTOMER");
  const [orderRows, parcelRows] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      select: {
        id: true, type: true, title: true, message: true, readAt: true, createdAt: true,
        order: { select: { orderNumber: true, status: true, store: { select: { name: true } } } },
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
      href: customerOrderHref(item.order.orderNumber),
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
      href: `/customer/parcels/${encodeURIComponent(item.parcelDelivery.referenceNumber)}`,
    })),
  ]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell
        active="notifications"
        title="Notifications"
        description="See order, payment, parcel, and delivery updates."
      >
        <NotificationsClient
          initialNotifications={notifications}
          asPage={false}
          portal="customer"
        />
      </CustomerPortalShell>
    </>
  );
}
