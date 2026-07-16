import Link from "next/link";
import Image from "next/image";
import { AdminOrdersClient } from "@/components/admin/admin-orders-client";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const trackedStatuses = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
] as const;

const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1_000;
const ORDER_PAGE_SIZE = 30;

function kigaliBoundary(kind: "day" | "week" | "month") {
  const shifted = new Date(Date.now() + KIGALI_OFFSET_MS);
  if (kind === "month") shifted.setUTCDate(1);
  if (kind === "week") {
    const offset = (shifted.getUTCDay() + 6) % 7;
    shifted.setUTCDate(shifted.getUTCDate() - offset);
  }
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - KIGALI_OFFSET_MS);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireRole("ADMIN");
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const today = kigaliBoundary("day");
  const week = kigaliBoundary("week");
  const month = kigaliBoundary("month");

  const [
    orders,
    statusRows,
    totalOrders,
    todayOrders,
    weekOrders,
    monthOrders,
    waitingForAssignment,
    riders,
    activeStores,
    totalMenuItems,
    customerCount,
    adminCount,
    riderCount,
    unreadNotifications,
    unreadParcelNotifications,
    setting,
    parcelStatusRows,
    totalParcels,
    todayParcels,
    weekParcels,
    monthParcels,
    parcelsWaitingForAssignment,
    parcelRevenue,
  ] = await Promise.all([
    db.order.findMany({
      include: {
        customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
        store: { select: { name: true, latitude: true, longitude: true } },
        rider: { select: { firstName: true, lastName: true, phone: true } },
        riderAssignments: {
          orderBy: { assignedAt: "desc" },
          take: 1,
          select: { status: true, acknowledgedAt: true },
        },
        payment: { select: { status: true } },
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            unitPriceRwf: true,
            lineTotalRwf: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDER_PAGE_SIZE,
      take: ORDER_PAGE_SIZE,
    }),
    db.order.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: today } } }),
    db.order.count({ where: { createdAt: { gte: week } } }),
    db.order.count({ where: { createdAt: { gte: month } } }),
    db.order.count({ where: { status: "READY_FOR_PICKUP", riderId: null } }),
    db.user.findMany({
      where: { role: "RIDER", status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        riderProfile: true,
        _count: {
          select: {
            deliveries: {
              where: {
                status: {
                  in: ["READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY"],
                },
              },
            },
            assignedParcelDeliveries: {
              where: {
                status: {
                  in: [
                    "RIDER_ASSIGNED",
                    "RIDER_GOING_TO_PICKUP",
                    "ARRIVED_AT_PICKUP",
                    "PARCEL_PICKED_UP",
                    "ON_THE_WAY",
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.store.count({ where: { status: "APPROVED" } }),
    Promise.all([
      db.restaurantProduct.count(),
      db.marketplaceProduct.count(),
    ]).then(([restaurantCount, marketplaceCount]) => restaurantCount + marketplaceCount),
    db.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
    db.user.count({ where: { role: "ADMIN", status: "ACTIVE" } }),
    db.user.count({ where: { role: "RIDER", status: "ACTIVE" } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.parcelNotification.count({ where: { userId: user.id, readAt: null } }),
    db.platformSetting.findUnique({ where: { id: "global" } }),
    db.parcelDelivery.groupBy({ by: ["status"], _count: { status: true } }),
    db.parcelDelivery.count(),
    db.parcelDelivery.count({ where: { createdAt: { gte: today } } }),
    db.parcelDelivery.count({ where: { createdAt: { gte: week } } }),
    db.parcelDelivery.count({ where: { createdAt: { gte: month } } }),
    db.parcelDelivery.count({
      where: { status: "CONFIRMED", assignedRiderId: null },
    }),
    db.parcelPayment.aggregate({
      where: { status: "PAID" },
      _sum: { amountRwf: true },
    }),
  ]);

  const orderStatusCounts = Object.fromEntries(
    trackedStatuses.map((status) => [status, 0]),
  ) as Record<(typeof trackedStatuses)[number], number>;
  for (const row of statusRows) {
    orderStatusCounts[row.status as keyof typeof orderStatusCounts] =
      row._count.status;
  }

  const parcelCounts = Object.fromEntries(
    parcelStatusRows.map((row) => [row.status, row._count.status]),
  ) as Record<string, number>;

  const platformCards = [
    { label: "Today's platform requests", value: todayOrders + todayParcels },
    { label: "This week's platform requests", value: weekOrders + weekParcels },
    { label: "This month's platform requests", value: monthOrders + monthParcels },
    { label: "All platform requests", value: totalOrders + totalParcels },
  ];

  const dashboardCards = [
    { label: "Food / market orders today", value: todayOrders },
    { label: "Food / market orders this week", value: weekOrders },
    { label: "Food / market orders this month", value: monthOrders },
    { label: "Total food / market orders", value: totalOrders },
    { label: "Pending orders", value: orderStatusCounts.PENDING },
    { label: "Accepted orders", value: orderStatusCounts.ACCEPTED },
    { label: "Preparing orders", value: orderStatusCounts.PREPARING },
    {
      label: "Ready for pickup",
      value: orderStatusCounts.READY_FOR_PICKUP,
    },
    {
      label: "Waiting for rider assignment",
      value: waitingForAssignment,
    },
    { label: "Delivered orders", value: orderStatusCounts.DELIVERED },
    {
      label: "Cancelled / rejected",
      value: orderStatusCounts.CANCELLED + orderStatusCounts.REJECTED,
    },
    { label: "Approved stores", value: activeStores },
    { label: "Menu items", value: totalMenuItems },
    { label: "Customers", value: customerCount },
    { label: "Admin accounts", value: adminCount },
    { label: "Riders", value: riderCount },
    {
      label: "Unread notifications",
      value: unreadNotifications + unreadParcelNotifications,
    },
  ];

  const parcelCards = [
    { label: "Parcel requests today", value: todayParcels },
    { label: "Parcel requests this week", value: weekParcels },
    { label: "Parcel requests this month", value: monthParcels },
    { label: "Total parcel requests", value: totalParcels },
    { label: "Awaiting review", value: parcelCounts.AWAITING_ADMIN_REVIEW ?? 0 },
    { label: "Waiting for parcel rider", value: parcelsWaitingForAssignment },
    {
      label: "Active parcel deliveries",
      value:
        (parcelCounts.RIDER_ASSIGNED ?? 0) +
        (parcelCounts.RIDER_GOING_TO_PICKUP ?? 0) +
        (parcelCounts.ARRIVED_AT_PICKUP ?? 0) +
        (parcelCounts.PARCEL_PICKED_UP ?? 0) +
        (parcelCounts.ON_THE_WAY ?? 0),
    },
    { label: "Delivered parcels", value: parcelCounts.DELIVERED ?? 0 },
    {
      label: "Cancelled / rejected parcels",
      value: (parcelCounts.CANCELLED ?? 0) + (parcelCounts.REJECTED ?? 0),
    },
    {
      label: "Verified parcel revenue",
      value: `${(parcelRevenue._sum.amountRwf ?? 0).toLocaleString("en-RW")} RWF`,
    },
  ];

  const ordersView = orders.map(({ riderAssignments, ...order }) => ({
    ...order,
    riderAccepted: Boolean(riderAssignments[0]?.acknowledgedAt),
    riderAssignmentStatus: riderAssignments[0]?.status ?? null,
    createdAt: order.createdAt.toISOString(),
    riderLocationUpdatedAt: order.riderLocationUpdatedAt?.toISOString() ?? null,
  }));

  const riderWidgets = {
    available: riders.filter(
      (rider) => rider.riderProfile?.riderStatus === "AVAILABLE",
    ).length,
    busy: riders.filter((rider) => rider.riderProfile?.riderStatus === "BUSY")
      .length,
    onDelivery: riders.filter(
      (rider) => rider.riderProfile?.riderStatus === "ON_DELIVERY",
    ).length,
    offline: riders.filter((rider) => rider.riderProfile?.riderStatus === "OFFLINE")
      .length,
  };

  return (
    <>
      <main className="admin-orders-page">
        <header className="admin-dashboard-header">
          <div>
            <span className="catalog-kicker">KARAME BAY ADMIN</span>
            <h1>Admin dashboard</h1>
            <p>
              Welcome, {user.firstName}. Monitor orders, payment verification,
              rider assignment, and store activity from one place.
            </p>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin/stores">Stores</Link>
            <Link href="/admin/parcels">Parcel deliveries</Link>
            <Link href="/admin/menus">Restaurant menus</Link>
            <Link href="/admin/products">Market engine</Link>
            <Link href="/admin/products/import">Price import</Link>
            <Link href="/admin/riders">Riders</Link>
            <Link href="/admin/customers">Customers</Link>
            <Link href="/admin/reports">Reports</Link>
            <NotificationBell />
            <Link href="/admin/login">Admin sign-in</Link>
          </div>
        </header>

        <section className="admin-dashboard-grid" aria-label="Overall platform statistics">
          {platformCards.map((card) => (
            <article className="admin-dashboard-card" key={card.label}>
              <small>{card.label}</small>
              <b>{card.value}</b>
            </article>
          ))}
        </section>

        <h2 className="admin-section-title">Food and market operations</h2>
        <section className="admin-dashboard-grid" aria-label="Food and market statistics">
          {dashboardCards.map((card) => (
            <article className="admin-dashboard-card" key={card.label}>
              <small>{card.label}</small>
              <b>{card.value}</b>
            </article>
          ))}
        </section>

        <div className="admin-section-heading">
          <h2 className="admin-section-title">Parcel delivery operations</h2>
          <Link href="/admin/parcels">Open parcel deliveries</Link>
        </div>
        <section className="admin-dashboard-grid" aria-label="Parcel delivery statistics">
          {parcelCards.map((card) => (
            <article className="admin-dashboard-card" key={card.label}>
              <small>{card.label}</small>
              <b>{card.value}</b>
            </article>
          ))}
        </section>

        <section className="admin-rider-overview">
          <div className="admin-rider-mode">
            <span className="catalog-kicker">RIDER ASSIGNMENT</span>
            <b>{setting?.riderAssignmentMode ?? "MANUAL"}</b>
            <p>Manual assignment is enabled for Phase 1.</p>
          </div>

          <div className="admin-rider-widgets">
            <article>
              <small>Available</small>
              <b>{riderWidgets.available}</b>
            </article>
            <article>
              <small>Busy</small>
              <b>{riderWidgets.busy}</b>
            </article>
            <article>
              <small>On delivery</small>
              <b>{riderWidgets.onDelivery}</b>
            </article>
            <article>
              <small>Offline</small>
              <b>{riderWidgets.offline}</b>
            </article>
          </div>

          <div className="admin-rider-grid">
            {riders.map((rider) => {
              const profile = rider.riderProfile;
              const status = profile?.riderStatus ?? "OFFLINE";
              return (
                <article className="admin-rider-card" key={rider.id}>
                  <div className="admin-rider-avatar">
                    {profile?.photoUrl ? (
                      <Image src={profile.photoUrl} alt="" width={56} height={56} />
                    ) : (
                      <span>
                        {rider.firstName[0]}
                        {rider.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div className="admin-rider-copy">
                    <b>
                      {rider.firstName} {rider.lastName}
                    </b>
                    <small>{rider.phone}</small>
                    <span className={`rider-status-pill ${status.toLowerCase()}`}>
                      {status.replaceAll("_", " ")}
                    </span>
                    <small>{profile?.vehicleType ?? "Motorcycle"}</small>
                    <small>{profile?.licensePlate || "No plate set"}</small>
                    <small>
                      Active deliveries: {rider._count.deliveries + rider._count.assignedParcelDeliveries}
                    </small>
                    <small>
                      Location: {profile?.currentLocationLabel ?? "Unavailable"}
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <AdminOrdersClient orders={ordersView} riders={riders} />
        <nav className="catalog-pages" aria-label="Order pages">
          <Link
            href={`/admin/orders?page=${Math.max(1, page - 1)}`}
            aria-disabled={page <= 1}
          >
            Previous
          </Link>
          <span>
            Page {page} of {Math.max(1, Math.ceil(totalOrders / ORDER_PAGE_SIZE))}
          </span>
          <Link
            href={`/admin/orders?page=${Math.min(Math.max(1, Math.ceil(totalOrders / ORDER_PAGE_SIZE)), page + 1)}`}
            aria-disabled={page >= Math.ceil(totalOrders / ORDER_PAGE_SIZE)}
          >
            Next
          </Link>
        </nav>
      </main>
      <OperationsPortalBadge role="Admin" destination="/admin/login" />
    </>
  );
}
