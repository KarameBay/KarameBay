import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;
type ParcelTarget = { id: string; referenceNumber: string; customerId: string };

export async function createParcelNotification(
  tx: Tx,
  input: {
    userId: string;
    parcelDeliveryId: string;
    referenceNumber: string;
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
    input.dedupeSuffix ?? "once",
  ].join(":");
  return tx.parcelNotification.upsert({
    where: { dedupeKey },
    update: { title: input.title, message: input.message },
    create: {
      userId: input.userId,
      parcelDeliveryId: input.parcelDeliveryId,
      type: input.type,
      dedupeKey,
      title: input.title,
      message: input.message,
    },
  });
}

export async function notifyParcelCustomer(
  tx: Tx,
  parcel: ParcelTarget,
  type: string,
  title: string,
  message: string,
  dedupeSuffix?: string,
) {
  return createParcelNotification(tx, {
    userId: parcel.customerId,
    parcelDeliveryId: parcel.id,
    referenceNumber: parcel.referenceNumber,
    type,
    title,
    message,
    dedupeSuffix,
  });
}

export async function notifyParcelAdmins(
  tx: Tx,
  parcel: ParcelTarget,
  type: string,
  title: string,
  message: string,
  dedupeSuffix?: string,
) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      createParcelNotification(tx, {
        userId: admin.id,
        parcelDeliveryId: parcel.id,
        referenceNumber: parcel.referenceNumber,
        type,
        title,
        message,
        dedupeSuffix,
      }),
    ),
  );
}

export async function notifyParcelRider(
  tx: Tx,
  parcel: ParcelTarget,
  riderId: string,
  type: string,
  title: string,
  message: string,
  dedupeSuffix?: string,
) {
  return createParcelNotification(tx, {
    userId: riderId,
    parcelDeliveryId: parcel.id,
    referenceNumber: parcel.referenceNumber,
    type,
    title,
    message,
    dedupeSuffix,
  });
}

