import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getRider } from "@/lib/rider";
import { getRiderParcelDashboardData } from "@/lib/rider-parcels";
import { rateLimit } from "@/lib/rate-limit";
import {
  PARCEL_ACTIVE_RIDER_STATUSES,
  canTransitionParcelStatus,
  parcelConfirmationCodeMatches,
  type ParcelStatus,
} from "@/lib/parcel";

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE_STATUS"),
    status: z.enum([
      "RIDER_GOING_TO_PICKUP",
      "ARRIVED_AT_PICKUP",
      "PARCEL_PICKED_UP",
      "ON_THE_WAY",
      "DELIVERED",
    ]),
    confirmationCode: z.string().trim().regex(/^\d{4}(?:\d{2})?$/).optional(),
    recipientName: z.string().trim().min(2).max(120).optional(),
  }),
  z.object({
    action: z.literal("REPORT_PROBLEM"),
    category: z.string().trim().min(2).max(80),
    description: z.string().trim().min(5).max(1_000),
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

function deliveryTimestamps(status: ParcelStatus, now: Date) {
  if (status === "RIDER_GOING_TO_PICKUP") return { goingToPickupAt: now };
  if (status === "ARRIVED_AT_PICKUP") return { arrivedAtPickupAt: now };
  if (status === "PARCEL_PICKED_UP") return { pickedUpAt: now };
  if (status === "DELIVERED") return { deliveredAt: now };
  return {};
}

function assignmentTimestamps(status: ParcelStatus, now: Date) {
  if (status === "RIDER_GOING_TO_PICKUP")
    return {
      status,
      acknowledgedAt: now,
      goingToPickupAt: now,
    };
  if (status === "ARRIVED_AT_PICKUP")
    return { status, arrivedAtPickupAt: now };
  if (status === "PARCEL_PICKED_UP") return { status, pickedUpAt: now };
  if (status === "ON_THE_WAY") return { status, onTheWayAt: now };
  return { status, deliveredAt: now, endedAt: now };
}

async function currentParcelResponse(riderId: string, parcelId: string) {
  const data = await getRiderParcelDashboardData(riderId);
  const parcel = [...data.active, ...data.completed, ...data.closed].find(
    (item) => item.id === parcelId,
  );
  if (!parcel) throw new Error("PARCEL_NOT_ASSIGNED");
  return parcel;
}

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
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid parcel delivery update." },
      { status: 400 },
    );
  const { id } = await params;
  const parcel = await db.parcelDelivery.findFirst({
    where: { id, assignedRiderId: context.user.id },
    include: {
      payment: { select: { status: true } },
      confirmation: true,
    },
  });
  if (!parcel)
    return NextResponse.json(
      { error: "This parcel is not assigned to you." },
      { status: 404 },
    );
  if (!PARCEL_ACTIVE_RIDER_STATUSES.includes(parcel.status as ParcelStatus))
    return NextResponse.json(
      { error: "This parcel assignment is no longer active." },
      { status: 409 },
    );

  if (parsed.data.action === "REPORT_PROBLEM") {
    const report = parsed.data;
    const now = new Date();
    const problem = await db.$transaction(async (tx) => {
      const created = await tx.parcelDeliveryProblem.create({
        data: {
          parcelDeliveryId: id,
          reportedByRiderId: context.user.id,
          category: report.category,
          description: report.description,
        },
      });
      await tx.parcelStatusEvent.create({
        data: {
          parcelDeliveryId: id,
          status: parcel.status,
          actorId: context.user.id,
          note: `Rider reported a delivery problem: ${report.category}.`,
          metadataJson: JSON.stringify({ problemId: created.id }),
        },
      });
      await notifyActiveAdmins(tx, {
        parcelDeliveryId: id,
        type: "PARCEL_DELIVERY_PROBLEM",
        title: "Parcel delivery problem",
        message: `${context.user.firstName} ${context.user.lastName} reported a problem with ${parcel.referenceNumber}: ${report.description}`,
        dedupeSuffix: created.id,
      });
      await tx.riderProfile.upsert({
        where: { userId: context.user.id },
        update: { lastSeenAt: now },
        create: {
          userId: context.user.id,
          riderStatus: "BUSY",
          lastSeenAt: now,
        },
      });
      return created;
    });
    return NextResponse.json({
      problem: { ...problem, createdAt: problem.createdAt.toISOString() },
      parcel: await currentParcelResponse(context.user.id, id),
    });
  }

  if (parcel.payment?.status !== "PAID")
    return NextResponse.json(
      { error: "This parcel payment has not been verified." },
      { status: 409 },
    );
  const statusUpdate = parsed.data;
  const targetStatus = statusUpdate.status;
  if (!canTransitionParcelStatus(parcel.status, targetStatus))
    return NextResponse.json(
      {
        error: `The parcel cannot move from ${parcel.status.replaceAll("_", " ")} to ${targetStatus.replaceAll("_", " ")}.`,
      },
      { status: 409 },
    );

  if (targetStatus === "DELIVERED") {
    if (!rateLimit(`parcel-confirm:${id}:${context.user.id}`, 8, 10 * 60_000))
      return NextResponse.json(
        { error: "Too many confirmation attempts. Try again later." },
        { status: 429 },
      );
    if (!statusUpdate.confirmationCode || !statusUpdate.recipientName)
      return NextResponse.json(
        { error: "Enter the recipient name and delivery confirmation code." },
        { status: 400 },
      );
    if (!parcel.confirmation)
      return NextResponse.json(
        { error: "Delivery confirmation is not ready. Contact an administrator." },
        { status: 409 },
      );
    if (
      parcel.confirmation.attemptCount >= parcel.confirmation.maxAttempts ||
      parcel.confirmation.verifiedAt ||
      parcel.confirmation.overriddenAt
    )
      return NextResponse.json(
        { error: "Delivery confirmation is locked or already completed." },
        { status: 409 },
      );
    if (
      parcel.confirmation.expiresAt &&
      parcel.confirmation.expiresAt <= new Date()
    )
      return NextResponse.json(
        { error: "The delivery code has expired. Contact an administrator." },
        { status: 409 },
      );
    const correct = parcelConfirmationCodeMatches(
      id,
      statusUpdate.confirmationCode,
      parcel.confirmation.codeHash,
    );
    if (!correct) {
      await db.parcelDeliveryConfirmation.update({
        where: { parcelDeliveryId: id },
        data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
      });
      return NextResponse.json(
        { error: "Incorrect delivery confirmation code." },
        { status: 409 },
      );
    }
  }

  const now = new Date();
  const changed = await db.$transaction(async (tx) => {
    const result = await tx.parcelDelivery.updateMany({
      where: {
        id,
        assignedRiderId: context.user.id,
        status: parcel.status,
      },
      data: {
        status: targetStatus,
        ...deliveryTimestamps(targetStatus, now),
      },
    });
    if (result.count !== 1) return false;
    await tx.parcelStatusEvent.create({
      data: {
        parcelDeliveryId: id,
        status: targetStatus,
        actorId: context.user.id,
        note: `Updated by rider ${context.user.firstName} ${context.user.lastName}.`,
      },
    });
    await tx.parcelRiderAssignment.updateMany({
      where: {
        parcelDeliveryId: id,
        riderId: context.user.id,
        endedAt: null,
      },
      data: assignmentTimestamps(targetStatus, now),
    });
    if (targetStatus === "DELIVERED") {
      await tx.parcelDeliveryConfirmation.update({
        where: { parcelDeliveryId: id },
        data: {
          verifiedAt: now,
          verifiedByRiderId: context.user.id,
          recipientConfirmedName: statusUpdate.recipientName!,
          lastAttemptAt: now,
        },
      });
    }
    await notifyParcel(tx, {
      parcelDeliveryId: id,
      userId: parcel.customerId,
      type: `PARCEL_${targetStatus}`,
      title:
        targetStatus === "DELIVERED"
          ? "Parcel delivered"
          : targetStatus.replaceAll("_", " ").toLowerCase(),
      message: `${parcel.referenceNumber} is now ${targetStatus.replaceAll("_", " ").toLowerCase()}.`,
    });
    if (targetStatus === "DELIVERED") {
      await notifyActiveAdmins(tx, {
        parcelDeliveryId: id,
        type: "PARCEL_DELIVERED_ADMIN",
        title: "Parcel delivered",
        message: `${parcel.referenceNumber} was delivered successfully.`,
      });
    }
    const [activeOrders, activeParcels] = await Promise.all([
      tx.order.count({
        where: {
          riderId: context.user.id,
          status: { in: ["READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY"] },
        },
      }),
      tx.parcelDelivery.count({
        where: {
          assignedRiderId: context.user.id,
          status: { in: [...PARCEL_ACTIVE_RIDER_STATUSES] },
        },
      }),
    ]);
    await tx.riderProfile.upsert({
      where: { userId: context.user.id },
      update: {
        riderStatus:
          activeOrders + activeParcels > 0 ? "ON_DELIVERY" : "AVAILABLE",
        lastSeenAt: now,
        ...(targetStatus === "DELIVERED"
          ? {
              completedDeliveriesCount: { increment: 1 },
              totalEarningsRwf: { increment: parcel.deliveryFeeRwf },
            }
          : {}),
      },
      create: {
        userId: context.user.id,
        riderStatus:
          activeOrders + activeParcels > 0 ? "ON_DELIVERY" : "AVAILABLE",
        lastSeenAt: now,
        ...(targetStatus === "DELIVERED"
          ? {
              completedDeliveriesCount: 1,
              totalEarningsRwf: parcel.deliveryFeeRwf,
            }
          : {}),
      },
    });
    return true;
  });

  if (!changed)
    return NextResponse.json(
      { error: "The parcel changed. Refresh and try again." },
      { status: 409 },
    );
  return NextResponse.json({
    parcel: await currentParcelResponse(context.user.id, id),
  });
}
