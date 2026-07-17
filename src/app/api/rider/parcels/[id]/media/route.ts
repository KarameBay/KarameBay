import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRider } from "@/lib/rider";
import { saveParcelMedia } from "@/lib/parcel-media";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const allowedByKind = {
  PICKUP_PHOTO: ["ARRIVED_AT_PICKUP", "PARCEL_PICKED_UP"],
  DELIVERY_PHOTO: ["ON_THE_WAY"],
} as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getRider();
  if ("error" in context)
    return NextResponse.json({ error: context.error }, { status: context.status });
  const { id } = await params;
  if (!rateLimit(`parcel-media:${context.user.id}:${id}`, 8, 60_000))
    return NextResponse.json({ error: "Too many photo uploads. Please wait." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const kind = form?.get("kind");
  const file = form?.get("photo");
  if (kind !== "PICKUP_PHOTO" && kind !== "DELIVERY_PHOTO")
    return NextResponse.json({ error: "Choose a pickup or delivery photo." }, { status: 400 });
  if (!(file instanceof File) || !file.size)
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });

  const parcel = await db.parcelDelivery.findFirst({
    where: { id, assignedRiderId: context.user.id },
    select: { id: true, referenceNumber: true, status: true },
  });
  if (!parcel)
    return NextResponse.json({ error: "This parcel is not assigned to you." }, { status: 404 });
  if (!(allowedByKind[kind] as readonly string[]).includes(parcel.status))
    return NextResponse.json(
      { error: `A ${kind === "PICKUP_PHOTO" ? "pickup" : "delivery"} photo cannot be added at this stage.` },
      { status: 409 },
    );

  let saved;
  try {
    saved = await saveParcelMedia(
      file,
      kind === "PICKUP_PHOTO" ? "pickup" : "delivery",
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The photo could not be saved." },
      { status: 400 },
    );
  }

  const media = await db.$transaction(async (tx) => {
    const created = await tx.parcelMedia.create({
      data: {
        parcelDeliveryId: parcel.id,
        kind,
        storageKey: saved.storageKey,
        url: saved.url,
        publicId: saved.publicId,
        resourceType: saved.resourceType,
        originalName: file.name,
        mimeType: saved.contentType,
        sizeBytes: saved.sizeBytes,
        width: saved.width ?? null,
        height: saved.height ?? null,
        format: saved.format ?? null,
        uploadedById: context.user.id,
      },
      select: { id: true, kind: true, originalName: true, createdAt: true },
    });
    await tx.parcelStatusEvent.create({
      data: {
        parcelDeliveryId: parcel.id,
        status: parcel.status,
        actorId: context.user.id,
        note: kind === "PICKUP_PHOTO" ? "Pickup photo recorded." : "Delivery photo recorded.",
      },
    });
    return created;
  });

  return NextResponse.json({
    media: { ...media, createdAt: media.createdAt.toISOString() },
  });
}
