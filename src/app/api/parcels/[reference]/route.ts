import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canCustomerCancelParcel } from "@/lib/parcel";
import { notifyParcelAdmins, notifyParcelCustomer, notifyParcelRider } from "@/lib/parcel-notifications";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const updateSchema = z.object({ action: z.literal("CANCEL"), reason: z.string().trim().max(240).optional() });

function parseRoute(value: string) {
  try {
    const route = JSON.parse(value);
    return Array.isArray(route) ? route : [];
  } catch {
    return [];
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const customer = await getCurrentUser("CUSTOMER");
  if (!customer) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { reference } = await params;
  const parcel = await db.parcelDelivery.findFirst({
    where: { referenceNumber: reference, customerId: customer.id },
    include: {
      payment: { select: { status: true, amountRwf: true, verifiedAt: true } },
      assignedRider: { select: { firstName: true, lastName: true, phone: true, riderProfile: { select: { vehicleType: true, licensePlate: true, currentLatitude: true, currentLongitude: true, lastSeenAt: true } } } },
      confirmation: { select: { verifiedAt: true, recipientConfirmedName: true, overriddenAt: true } },
      events: { select: { id: true, status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      media: { select: { id: true, kind: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      problems: { where: { status: "OPEN" }, select: { category: true, description: true, createdAt: true } },
      notifications: {
        where: { userId: customer.id, type: "PARCEL_APPROVED" },
        select: { message: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!parcel) return NextResponse.json({ error: "Parcel delivery not found." }, { status: 404 });
  const confirmationCode =
    parcel.confirmation &&
    !["DELIVERED", "CANCELLED", "REJECTED", "FAILED_DELIVERY"].includes(parcel.status)
      ? parcel.notifications[0]?.message.match(
          /delivery confirmation code is (\d{6})/i,
        )?.[1] ?? null
      : null;
  return NextResponse.json({
    parcel: {
      ...parcel,
      id: undefined,
      customerId: undefined,
      assignedRiderId: undefined,
      categoryId: undefined,
      sizeDefinitionId: undefined,
      pickupPhone: undefined,
      recipientPhone: undefined,
      quotedRoute: parseRoute(parcel.quotedRouteJson),
      riderRoute: parseRoute(parcel.riderRouteJson),
      quotedRouteJson: undefined,
      riderRouteJson: undefined,
      pricingSnapshotJson: undefined,
      prohibitedRulesSnapshotJson: undefined,
      notifications: undefined,
      canCancel: canCustomerCancelParcel(parcel.status),
      deliveryConfirmationCode: confirmationCode,
      confirmation: parcel.confirmation
        ? { ...parcel.confirmation, codeIssued: true }
        : null,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const customer = await getCurrentUser("CUSTOMER");
  if (!customer) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!rateLimit(`parcel-cancel:${customer.id}`, 6, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid parcel update." }, { status: 400 });
  const { reference } = await params;
  const parcel = await db.parcelDelivery.findFirst({
    where: { referenceNumber: reference, customerId: customer.id },
    select: { id: true, referenceNumber: true, customerId: true, status: true, assignedRiderId: true },
  });
  if (!parcel) return NextResponse.json({ error: "Parcel delivery not found." }, { status: 404 });
  if (!canCustomerCancelParcel(parcel.status))
    return NextResponse.json({ error: "This parcel can no longer be cancelled online. Contact support." }, { status: 409 });
  const changed = await db.$transaction(async (tx) => {
    const result = await tx.parcelDelivery.updateMany({
      where: { id: parcel.id, status: parcel.status },
      data: { status: "CANCELLED", cancelledAt: new Date(), closedReason: parsed.data.reason || "Cancelled by customer" },
    });
    if (!result.count) return false;
    await tx.parcelStatusEvent.create({ data: { parcelDeliveryId: parcel.id, status: "CANCELLED", actorId: customer.id, note: parsed.data.reason || "Cancelled by customer." } });
    await notifyParcelCustomer(tx, parcel, "PARCEL_CANCELLED", "Parcel request cancelled", `${parcel.referenceNumber} was cancelled.`);
    await notifyParcelAdmins(tx, parcel, "PARCEL_CANCELLED", "Parcel request cancelled", `${parcel.referenceNumber} was cancelled by the customer.`);
    if (parcel.assignedRiderId)
      await notifyParcelRider(tx, parcel, parcel.assignedRiderId, "PARCEL_CANCELLED", "Parcel assignment cancelled", `${parcel.referenceNumber} has been cancelled.`);
    return true;
  });
  if (!changed) return NextResponse.json({ error: "The parcel changed. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ ok: true, status: "CANCELLED" });
}
