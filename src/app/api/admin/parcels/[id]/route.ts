import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  PARCEL_ACTIVE_RIDER_STATUSES,
  PARCEL_CONFIRMATION_MAX_ATTEMPTS,
  canTransitionParcelStatus,
  generateParcelConfirmationCode,
  hashParcelConfirmationCode,
  type ParcelStatus,
} from "@/lib/parcel";

// Payment verification, approval, cancellation, rejection, assignment, and
// delivery confirmation each have dedicated actions with required side
// effects. Generic status updates are intentionally limited to operational
// delivery stages so those workflows cannot be bypassed by a direct API call.
const ADMIN_OPERATIONAL_STATUS_UPDATES = [
  "RIDER_GOING_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PARCEL_PICKED_UP",
  "ON_THE_WAY",
  "FAILED_DELIVERY",
] as const satisfies readonly ParcelStatus[];

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("VERIFY_PAYMENT") }),
  z.object({ action: z.literal("APPROVE") }),
  z.object({
    action: z.literal("REJECT"),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("CANCEL"),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("ASSIGN_RIDER"),
    riderId: z.string().min(1),
  }),
  z.object({
    action: z.literal("REASSIGN_RIDER"),
    riderId: z.string().min(1),
    reason: z.string().trim().min(3).max(500).optional(),
  }),
  z.object({
    action: z.literal("UPDATE_STATUS"),
    status: z.enum(ADMIN_OPERATIONAL_STATUS_UPDATES),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("OVERRIDE_DELIVERY_CONFIRMATION"),
    reason: z.string().trim().min(5).max(500),
    recipientName: z.string().trim().min(2).max(120),
  }),
]);

type Tx = Prisma.TransactionClient;

async function notifyParcel(
  tx: Tx,
  input: {
    parcelDeliveryId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    dedupeSuffix?: string;
  },
) {
  const dedupeKey = [
    input.parcelDeliveryId,
    input.userId,
    input.type,
    input.dedupeSuffix ?? "current",
  ].join(":");
  await tx.parcelNotification.upsert({
    where: { dedupeKey },
    update: { title: input.title, message: input.message, readAt: null },
    create: {
      parcelDeliveryId: input.parcelDeliveryId,
      userId: input.userId,
      type: input.type,
      dedupeKey,
      title: input.title,
      message: input.message,
    },
  });
}

async function notifyActiveAdmins(
  tx: Tx,
  input: {
    parcelDeliveryId: string;
    type: string;
    title: string;
    message: string;
    dedupeSuffix?: string;
  },
) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      notifyParcel(tx, { ...input, userId: admin.id }),
    ),
  );
}

async function updateRiderAvailability(tx: Tx, riderId: string) {
  const [activeOrders, activeParcels] = await Promise.all([
    tx.order.count({
      where: {
        riderId,
        status: { in: ["READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY"] },
      },
    }),
    tx.parcelDelivery.count({
      where: {
        assignedRiderId: riderId,
        status: { in: [...PARCEL_ACTIVE_RIDER_STATUSES] },
      },
    }),
  ]);
  await tx.riderProfile.upsert({
    where: { userId: riderId },
    update: {
      riderStatus: activeOrders + activeParcels > 0 ? "BUSY" : "AVAILABLE",
      lastSeenAt: new Date(),
    },
    create: {
      userId: riderId,
      riderStatus: activeOrders + activeParcels > 0 ? "BUSY" : "AVAILABLE",
      lastSeenAt: new Date(),
    },
  });
}

function timestampForStatus(status: ParcelStatus, now: Date) {
  if (status === "CONFIRMED") return { confirmedAt: now };
  if (status === "RIDER_GOING_TO_PICKUP") return { goingToPickupAt: now };
  if (status === "ARRIVED_AT_PICKUP") return { arrivedAtPickupAt: now };
  if (status === "PARCEL_PICKED_UP") return { pickedUpAt: now };
  if (status === "DELIVERED") return { deliveredAt: now };
  if (status === "CANCELLED") return { cancelledAt: now };
  if (status === "REJECTED") return { rejectedAt: now };
  if (status === "FAILED_DELIVERY") return { failedAt: now };
  return {};
}

function assignmentTimestampForStatus(status: ParcelStatus, now: Date) {
  if (status === "RIDER_GOING_TO_PICKUP") return { goingToPickupAt: now };
  if (status === "ARRIVED_AT_PICKUP") return { arrivedAtPickupAt: now };
  if (status === "PARCEL_PICKED_UP") return { pickedUpAt: now };
  if (status === "ON_THE_WAY") return { onTheWayAt: now };
  if (status === "DELIVERED")
    return { deliveredAt: now, endedAt: now, status: "DELIVERED" };
  if (["CANCELLED", "REJECTED", "FAILED_DELIVERY"].includes(status))
    return { endedAt: now, status };
  return { status };
}

async function serializeAdminParcel(id: string) {
  const parcel = await db.parcelDelivery.findUniqueOrThrow({
    where: { id },
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
  });
  return {
    ...parcel,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
    scheduledPickupAt: parcel.scheduledPickupAt?.toISOString() ?? null,
    riderLocationUpdatedAt:
      parcel.riderLocationUpdatedAt?.toISOString() ?? null,
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
  };
}

export async function GET(
  _request: Request,
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
  const { id } = await params;
  const exists = await db.parcelDelivery.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists)
    return NextResponse.json(
      { error: "Parcel delivery not found." },
      { status: 404 },
    );
  return NextResponse.json({ parcel: await serializeAdminParcel(id) });
}

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
      { error: "Invalid parcel update." },
      { status: 400 },
    );

  const { id } = await params;
  const parcel = await db.parcelDelivery.findUnique({
    where: { id },
    include: {
      payment: true,
      confirmation: true,
      assignedRider: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
      customer: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!parcel)
    return NextResponse.json(
      { error: "Parcel delivery not found." },
      { status: 404 },
    );

  const action = parsed.data;
  if (action.action === "VERIFY_PAYMENT") {
    if (!parcel.payment)
      return NextResponse.json(
        { error: "Parcel payment record not found." },
        { status: 404 },
      );
    if (
      parcel.payment.status !== "PENDING_VERIFICATION" ||
      parcel.status !== "PENDING_VERIFICATION"
    )
      return NextResponse.json(
        { error: "Only pending parcel payments can be verified." },
        { status: 409 },
      );
    await db.$transaction(async (tx) => {
      const changed = await tx.parcelDelivery.updateMany({
        where: { id, status: "PENDING_VERIFICATION" },
        data: { status: "AWAITING_ADMIN_REVIEW" },
      });
      if (changed.count !== 1) throw new Error("PARCEL_CHANGED");
      await tx.parcelPayment.update({
        where: { parcelDeliveryId: id },
        data: {
          status: "PAID",
          verifiedAt: new Date(),
          verifiedById: admin.id,
        },
      });
      await tx.parcelStatusEvent.create({
        data: {
          parcelDeliveryId: id,
          status: "AWAITING_ADMIN_REVIEW",
          actorId: admin.id,
          note: "MoMo payment verified; parcel is awaiting administrator review.",
        },
      });
      await notifyParcel(tx, {
        parcelDeliveryId: id,
        userId: parcel.customerId,
        type: "PARCEL_PAYMENT_VERIFIED",
        title: "Parcel payment verified",
        message: `Payment for ${parcel.referenceNumber} was verified. Your request is awaiting review.`,
      });
    });
    return NextResponse.json({ parcel: await serializeAdminParcel(id) });
  }

  if (action.action === "APPROVE") {
    if (parcel.status !== "AWAITING_ADMIN_REVIEW")
      return NextResponse.json(
        { error: "Only parcels awaiting review can be approved." },
        { status: 409 },
      );
    if (parcel.payment?.status !== "PAID")
      return NextResponse.json(
        { error: "Verify payment before approving this parcel." },
        { status: 409 },
      );
    const confirmationCode = generateParcelConfirmationCode(6);
    await db.$transaction(async (tx) => {
      const now = new Date();
      const changed = await tx.parcelDelivery.updateMany({
        where: { id, status: "AWAITING_ADMIN_REVIEW" },
        data: { status: "CONFIRMED", confirmedAt: now },
      });
      if (changed.count !== 1) throw new Error("PARCEL_CHANGED");
      await tx.parcelDeliveryConfirmation.upsert({
        where: { parcelDeliveryId: id },
        update: {
          codeHash: hashParcelConfirmationCode(id, confirmationCode),
          codeLength: 6,
          attemptCount: 0,
          maxAttempts: PARCEL_CONFIRMATION_MAX_ATTEMPTS,
          verifiedAt: null,
          verifiedByRiderId: null,
          overriddenAt: null,
          overriddenByAdminId: null,
          overrideReason: null,
        },
        create: {
          parcelDeliveryId: id,
          codeHash: hashParcelConfirmationCode(id, confirmationCode),
          codeLength: 6,
          maxAttempts: PARCEL_CONFIRMATION_MAX_ATTEMPTS,
        },
      });
      await tx.parcelStatusEvent.create({
        data: {
          parcelDeliveryId: id,
          status: "CONFIRMED",
          actorId: admin.id,
          note: "Parcel request approved by administrator.",
        },
      });
      await notifyParcel(tx, {
        parcelDeliveryId: id,
        userId: parcel.customerId,
        type: "PARCEL_APPROVED",
        title: "Parcel approved",
        message: `${parcel.referenceNumber} was approved. Your delivery confirmation code is ${confirmationCode}. Share it only with the recipient.`,
      });
      await notifyActiveAdmins(tx, {
        parcelDeliveryId: id,
        type: "PARCEL_WAITING_ASSIGNMENT",
        title: "Parcel waiting for rider",
        message: `${parcel.referenceNumber} is approved and waiting for manual rider assignment.`,
      });
    });
    return NextResponse.json({ parcel: await serializeAdminParcel(id) });
  }

  if (action.action === "REJECT" || action.action === "CANCEL") {
    if (["DELIVERED", "CANCELLED", "REJECTED", "FAILED_DELIVERY"].includes(parcel.status))
      return NextResponse.json(
        { error: "This parcel is already closed." },
        { status: 409 },
      );
    const targetStatus = action.action === "REJECT" ? "REJECTED" : "CANCELLED";
    const now = new Date();
    await db.$transaction(async (tx) => {
      const changed = await tx.parcelDelivery.updateMany({
        where: { id, status: parcel.status },
        data: {
          status: targetStatus,
          closedReason: action.reason,
          ...(targetStatus === "REJECTED"
            ? { rejectedAt: now }
            : { cancelledAt: now }),
        },
      });
      if (changed.count !== 1) throw new Error("PARCEL_CHANGED");
      await tx.parcelStatusEvent.create({
        data: {
          parcelDeliveryId: id,
          status: targetStatus,
          actorId: admin.id,
          note: action.reason,
        },
      });
      await tx.parcelRiderAssignment.updateMany({
        where: { parcelDeliveryId: id, endedAt: null },
        data: { status: targetStatus, endedAt: now, note: action.reason },
      });
      await notifyParcel(tx, {
        parcelDeliveryId: id,
        userId: parcel.customerId,
        type: `PARCEL_${targetStatus}`,
        title: targetStatus === "REJECTED" ? "Parcel rejected" : "Parcel cancelled",
        message: `${parcel.referenceNumber} was ${targetStatus.toLowerCase()}. ${action.reason}`,
      });
      if (parcel.assignedRiderId) {
        await notifyParcel(tx, {
          parcelDeliveryId: id,
          userId: parcel.assignedRiderId,
          type: `PARCEL_ASSIGNMENT_${targetStatus}`,
          title: "Parcel assignment closed",
          message: `${parcel.referenceNumber} was ${targetStatus.toLowerCase()}.`,
        });
        await updateRiderAvailability(tx, parcel.assignedRiderId);
      }
    });
    return NextResponse.json({ parcel: await serializeAdminParcel(id) });
  }

  if (action.action === "ASSIGN_RIDER" || action.action === "REASSIGN_RIDER") {
    const isReassignment = action.action === "REASSIGN_RIDER";
    if (!isReassignment && (parcel.status !== "CONFIRMED" || parcel.assignedRiderId))
      return NextResponse.json(
        { error: "Only a confirmed unassigned parcel can be assigned." },
        { status: 409 },
      );
    if (
      isReassignment &&
      (!parcel.assignedRiderId ||
        !PARCEL_ACTIVE_RIDER_STATUSES.includes(parcel.status as ParcelStatus))
    )
      return NextResponse.json(
        { error: "Only an active assigned parcel can be reassigned." },
        { status: 409 },
      );
    if (parcel.assignedRiderId === action.riderId)
      return NextResponse.json(
        { error: "Select a different rider." },
        { status: 409 },
      );
    const rider = await db.user.findFirst({
      where: { id: action.riderId, role: "RIDER", status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        riderProfile: { select: { vehicleType: true } },
      },
    });
    if (!rider)
      return NextResponse.json(
        { error: "Select an active rider account." },
        { status: 404 },
      );
    const vehicleType = (rider.riderProfile?.vehicleType ?? "MOTORCYCLE").toUpperCase();
    const capacity = await db.parcelVehicleCapacity.findFirst({
      where: { vehicleType, isActive: true },
    });
    const fitsVehicle =
      capacity &&
      parcel.estimatedWeightKg <= capacity.maxWeightKg &&
      (!parcel.estimatedLengthCm || parcel.estimatedLengthCm <= capacity.maxLengthCm) &&
      (!parcel.estimatedWidthCm || parcel.estimatedWidthCm <= capacity.maxWidthCm) &&
      (!parcel.estimatedHeightCm || parcel.estimatedHeightCm <= capacity.maxHeightCm);
    if (!fitsVehicle)
      return NextResponse.json(
        { error: `The selected rider's ${vehicleType.toLowerCase()} cannot safely carry this parcel.` },
        { status: 409 },
      );
    const previousRiderId = parcel.assignedRiderId;
    const now = new Date();
    await db.$transaction(async (tx) => {
      const changed = await tx.parcelDelivery.updateMany({
        where: {
          id,
          status: parcel.status,
          assignedRiderId: previousRiderId,
        },
        data: {
          assignedRiderId: rider.id,
          ...(parcel.status === "CONFIRMED" ? { status: "RIDER_ASSIGNED" } : {}),
        },
      });
      if (changed.count !== 1) throw new Error("PARCEL_CHANGED");
      if (previousRiderId) {
        await tx.parcelRiderAssignment.updateMany({
          where: { parcelDeliveryId: id, riderId: previousRiderId, endedAt: null },
          data: {
            status: "REASSIGNED",
            endedAt: now,
            note: action.action === "REASSIGN_RIDER" ? action.reason : undefined,
          },
        });
      }
      const assignment = await tx.parcelRiderAssignment.create({
        data: {
          parcelDeliveryId: id,
          riderId: rider.id,
          riderName: `${rider.firstName} ${rider.lastName}`,
          riderPhone: rider.phone,
          assignedById: admin.id,
          status: "ASSIGNED",
          assignedAt: now,
          note: action.action === "REASSIGN_RIDER" ? action.reason : undefined,
        },
      });
      await tx.parcelStatusEvent.create({
        data: {
          parcelDeliveryId: id,
          status: parcel.status === "CONFIRMED" ? "RIDER_ASSIGNED" : parcel.status,
          actorId: admin.id,
          note: `${rider.firstName} ${rider.lastName} assigned by administrator.`,
          metadataJson: JSON.stringify({
            assignmentId: assignment.id,
            previousRiderId,
            riderId: rider.id,
          }),
        },
      });
      await tx.riderProfile.upsert({
        where: { userId: rider.id },
        update: { riderStatus: "BUSY", lastSeenAt: now },
        create: { userId: rider.id, riderStatus: "BUSY", lastSeenAt: now },
      });
      if (previousRiderId) {
        await notifyParcel(tx, {
          parcelDeliveryId: id,
          userId: previousRiderId,
          type: "PARCEL_ASSIGNMENT_CHANGED",
          title: "Parcel assignment changed",
          message: `${parcel.referenceNumber} is no longer assigned to you.`,
          dedupeSuffix: assignment.id,
        });
        await updateRiderAvailability(tx, previousRiderId);
      }
      await notifyParcel(tx, {
        parcelDeliveryId: id,
        userId: rider.id,
        type: "PARCEL_DELIVERY_ASSIGNED",
        title: "Parcel delivery assigned",
        message: `You have been assigned ${parcel.referenceNumber}.`,
        dedupeSuffix: assignment.id,
      });
      await notifyParcel(tx, {
        parcelDeliveryId: id,
        userId: parcel.customerId,
        type: "PARCEL_RIDER_ASSIGNED",
        title: "Rider assigned",
        message: `${rider.firstName} ${rider.lastName} has been assigned to ${parcel.referenceNumber}.`,
        dedupeSuffix: assignment.id,
      });
    });
    return NextResponse.json({ parcel: await serializeAdminParcel(id) });
  }

  if (action.action === "OVERRIDE_DELIVERY_CONFIRMATION") {
    if (parcel.status !== "ON_THE_WAY" || !parcel.assignedRiderId)
      return NextResponse.json(
        { error: "Only an on-the-way parcel can be completed by override." },
        { status: 409 },
      );
    const now = new Date();
    await db.$transaction(async (tx) => {
      const changed = await tx.parcelDelivery.updateMany({
        where: { id, status: "ON_THE_WAY", assignedRiderId: parcel.assignedRiderId },
        data: { status: "DELIVERED", deliveredAt: now },
      });
      if (changed.count !== 1) throw new Error("PARCEL_CHANGED");
      await tx.parcelDeliveryConfirmation.upsert({
        where: { parcelDeliveryId: id },
        update: {
          overriddenAt: now,
          overriddenByAdminId: admin.id,
          overrideReason: action.reason,
          recipientConfirmedName: action.recipientName,
        },
        create: {
          parcelDeliveryId: id,
          codeHash: hashParcelConfirmationCode(id, generateParcelConfirmationCode()),
          overriddenAt: now,
          overriddenByAdminId: admin.id,
          overrideReason: action.reason,
          recipientConfirmedName: action.recipientName,
        },
      });
      await tx.parcelStatusEvent.create({
        data: {
          parcelDeliveryId: id,
          status: "DELIVERED",
          actorId: admin.id,
          note: `Delivery confirmation overridden by administrator: ${action.reason}`,
          metadataJson: JSON.stringify({ recipientName: action.recipientName }),
        },
      });
      await tx.parcelRiderAssignment.updateMany({
        where: { parcelDeliveryId: id, riderId: parcel.assignedRiderId, endedAt: null },
        data: { status: "DELIVERED", deliveredAt: now, endedAt: now },
      });
      await notifyParcel(tx, {
        parcelDeliveryId: id,
        userId: parcel.customerId,
        type: "PARCEL_DELIVERED",
        title: "Parcel delivered",
        message: `${parcel.referenceNumber} was marked delivered after administrator verification.`,
      });
      await notifyActiveAdmins(tx, {
        parcelDeliveryId: id,
        type: "PARCEL_DELIVERED_ADMIN",
        title: "Parcel delivered",
        message: `${parcel.referenceNumber} was delivered after administrator confirmation override.`,
      });
      await updateRiderAvailability(tx, parcel.assignedRiderId!);
    });
    return NextResponse.json({ parcel: await serializeAdminParcel(id) });
  }

  const targetStatus = action.status;
  if (!canTransitionParcelStatus(parcel.status, targetStatus))
    return NextResponse.json(
      { error: `Cannot change ${parcel.status} to ${targetStatus}.` },
      { status: 409 },
    );
  if (!parcel.assignedRiderId)
    return NextResponse.json(
      { error: "Assign a rider before updating delivery stages." },
      { status: 409 },
    );
  const now = new Date();
  await db.$transaction(async (tx) => {
    const changed = await tx.parcelDelivery.updateMany({
      where: { id, status: parcel.status },
      data: { status: targetStatus, ...timestampForStatus(targetStatus, now) },
    });
    if (changed.count !== 1) throw new Error("PARCEL_CHANGED");
    await tx.parcelStatusEvent.create({
      data: {
        parcelDeliveryId: id,
        status: targetStatus,
        actorId: admin.id,
        note: action.note || "Status updated by administrator.",
      },
    });
    if (parcel.assignedRiderId) {
      await tx.parcelRiderAssignment.updateMany({
        where: {
          parcelDeliveryId: id,
          riderId: parcel.assignedRiderId,
          endedAt: null,
        },
        data: assignmentTimestampForStatus(targetStatus, now),
      });
      if (["CANCELLED", "REJECTED", "FAILED_DELIVERY"].includes(targetStatus))
        await updateRiderAvailability(tx, parcel.assignedRiderId);
    }
    await notifyParcel(tx, {
      parcelDeliveryId: id,
      userId: parcel.customerId,
      type: `PARCEL_${targetStatus}`,
      title: targetStatus.replaceAll("_", " ").toLowerCase(),
      message: `${parcel.referenceNumber} is now ${targetStatus.replaceAll("_", " ").toLowerCase()}.`,
    });
  });
  return NextResponse.json({ parcel: await serializeAdminParcel(id) });
}
