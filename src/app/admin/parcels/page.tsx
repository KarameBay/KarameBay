import Link from "next/link";
import { AdminParcelDeliveriesClient } from "@/components/admin/admin-parcel-deliveries-client";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PARCEL_ACTIVE_RIDER_STATUSES } from "@/lib/parcel";

export const dynamic = "force-dynamic";

const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1_000;

function kigaliBoundary(kind: "day" | "week" | "month") {
  const shifted = new Date(Date.now() + KIGALI_OFFSET_MS);
  if (kind === "month") {
    shifted.setUTCDate(1);
  } else if (kind === "week") {
    const offset = (shifted.getUTCDay() + 6) % 7;
    shifted.setUTCDate(shifted.getUTCDate() - offset);
  }
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - KIGALI_OFFSET_MS);
}

export default async function AdminParcelsPage() {
  await requireRole("ADMIN");
  const today = kigaliBoundary("day");
  const week = kigaliBoundary("week");
  const month = kigaliBoundary("month");

  const [
    parcels,
    riders,
    pricing,
    todayCount,
    weekCount,
    monthCount,
    awaitingReview,
    awaitingAssignment,
    activeCount,
    deliveredCount,
    closedCount,
    revenue,
  ] = await Promise.all([
    db.parcelDelivery.findMany({
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedRider: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        payment: { select: { status: true, verifiedAt: true } },
        events: { orderBy: { createdAt: "desc" }, take: 20 },
        media: { select: { id: true, kind: true, originalName: true } },
        problems: {
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.user.findMany({
      where: { role: "RIDER", status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        riderProfile: {
          select: { riderStatus: true, vehicleType: true, licensePlate: true },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.parcelPricingSetting.findUnique({ where: { id: "parcel" } }),
    db.parcelDelivery.count({ where: { createdAt: { gte: today } } }),
    db.parcelDelivery.count({ where: { createdAt: { gte: week } } }),
    db.parcelDelivery.count({ where: { createdAt: { gte: month } } }),
    db.parcelDelivery.count({ where: { status: "AWAITING_ADMIN_REVIEW" } }),
    db.parcelDelivery.count({
      where: { status: "CONFIRMED", assignedRiderId: null },
    }),
    db.parcelDelivery.count({
      where: { status: { in: [...PARCEL_ACTIVE_RIDER_STATUSES] } },
    }),
    db.parcelDelivery.count({ where: { status: "DELIVERED" } }),
    db.parcelDelivery.count({
      where: { status: { in: ["CANCELLED", "REJECTED"] } },
    }),
    db.parcelPayment.aggregate({
      where: { status: "PAID" },
      _sum: { amountRwf: true },
    }),
  ]);

  const metrics = [
    { label: "Parcel requests today", value: todayCount },
    { label: "This week", value: weekCount },
    { label: "This month", value: monthCount },
    { label: "Awaiting review", value: awaitingReview },
    { label: "Waiting for rider", value: awaitingAssignment },
    { label: "Active deliveries", value: activeCount },
    { label: "Delivered parcels", value: deliveredCount },
    { label: "Cancelled / rejected", value: closedCount },
  ];

  const serialized = parcels.map((parcel) => ({
    ...parcel,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
    scheduledPickupAt: parcel.scheduledPickupAt?.toISOString() ?? null,
    riderLocationUpdatedAt:
      parcel.riderLocationUpdatedAt?.toISOString() ?? null,
    payment: parcel.payment
      ? {
          ...parcel.payment,
          verifiedAt: parcel.payment.verifiedAt?.toISOString() ?? null,
        }
      : null,
    events: parcel.events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
    problems: parcel.problems.map((problem) => ({
      ...problem,
      createdAt: problem.createdAt.toISOString(),
      updatedAt: problem.updatedAt.toISOString(),
      resolvedAt: problem.resolvedAt?.toISOString() ?? null,
    })),
  }));

  return (
    <>
      <main className="admin-orders-page">
        <header className="admin-dashboard-header">
          <div>
            <span className="catalog-kicker">PARCEL OPERATIONS</span>
            <h1>Parcel deliveries</h1>
            <p>
              Verify payments, review requests, assign riders manually, and
              monitor every parcel handover.
            </p>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/orders">Food &amp; market orders</Link>
            <Link href="/admin/riders">Riders</Link>
            <Link href="/admin/settings#parcel-pricing">Parcel settings</Link>
          </div>
        </header>

        <section
          className="admin-dashboard-grid"
          aria-label="Parcel delivery statistics"
        >
          {metrics.map((metric) => (
            <article className="admin-dashboard-card" key={metric.label}>
              <small>{metric.label}</small>
              <b>{metric.value}</b>
            </article>
          ))}
          <article className="admin-dashboard-card">
            <small>Verified parcel revenue</small>
            <b>{(revenue._sum.amountRwf ?? 0).toLocaleString("en-RW")} RWF</b>
          </article>
        </section>

        <AdminParcelDeliveriesClient
          initialParcels={serialized}
          riders={riders}
          pricing={
            pricing
              ? {
                  version: pricing.version,
                  active: pricing.isActive,
                  sizeSurchargeEnabled: pricing.sizeSurchargeEnabled,
                  weightSurchargeEnabled: pricing.weightSurchargeEnabled,
                  fragileSurchargeEnabled: pricing.fragileSurchargeEnabled,
                  scheduledSurchargeEnabled: pricing.scheduledSurchargeEnabled,
                  updatedAt: pricing.updatedAt.toISOString(),
                }
              : null
          }
        />
      </main>
      <OperationsPortalBadge role="Admin" destination="/admin/login" />
    </>
  );
}
