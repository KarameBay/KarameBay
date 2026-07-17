import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeRwandaPhone } from "@/lib/auth/phone";
import { db } from "@/lib/db";
import { calculateParcelPrice, formatParcelReference } from "@/lib/parcel";
import { saveParcelMedia } from "@/lib/parcel-media";
import { notifyParcelAdmins, notifyParcelCustomer } from "@/lib/parcel-notifications";
import { rateLimit } from "@/lib/rate-limit";
import { getDrivingRoute } from "@/lib/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const asBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on" || value === "1",
  z.boolean(),
);
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().nonnegative().optional(),
);
const schema = z.object({
  pickupContactName: z.string().trim().min(2).max(100),
  pickupPhone: z.string().trim().min(9).max(24),
  pickupLatitude: z.coerce.number().min(-90).max(90),
  pickupLongitude: z.coerce.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(3).max(240),
  pickupAddressDetails: z.string().trim().max(240).default(""),
  pickupInstructions: z.string().trim().max(500).optional().default(""),
  pickupPreference: z.enum(["NOW", "SCHEDULED"]).default("NOW"),
  scheduledPickupAt: z.string().trim().optional().default(""),
  recipientName: z.string().trim().min(2).max(100),
  recipientPhone: z.string().trim().min(9).max(24),
  deliveryLatitude: z.coerce.number().min(-90).max(90),
  deliveryLongitude: z.coerce.number().min(-180).max(180),
  deliveryAddress: z.string().trim().min(3).max(240),
  deliveryAddressDetails: z.string().trim().max(240).default(""),
  deliveryInstructions: z.string().trim().max(500).optional().default(""),
  categoryId: z.string().trim().min(1).max(100).optional(),
  categoryName: z.string().trim().min(1).max(100).optional(),
  parcelDescription: z.string().trim().min(3).max(800),
  quantity: z.coerce.number().int().min(1).max(50),
  estimatedWeightKg: z.coerce.number().positive().max(1000),
  estimatedLengthCm: optionalNumber,
  estimatedWidthCm: optionalNumber,
  estimatedHeightCm: optionalNumber,
  sizeCode: z.string().trim().min(1).max(20),
  fragile: asBoolean,
  requiresCarefulHandling: asBoolean,
  declaredValueRwf: optionalNumber,
  detailsAccurate: asBoolean,
  prohibitedItemsConfirmed: asBoolean,
  safePackagingConfirmed: asBoolean,
  recipientAvailableConfirmed: asBoolean,
  paymentConfirmed: asBoolean,
});

async function readInput(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return { input: Object.fromEntries(form), photo: form.get("parcelPhoto") };
  }
  return { input: await request.json().catch(() => null), photo: null };
}

function parseKigaliDateTime(value: string) {
  const local = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!local) return new Date(value);
  const [, year, month, day, hour, minute, second = "0"] = local;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 2,
      Number(minute),
      Number(second),
    ),
  );
}

export async function GET() {
  const customer = await getCurrentUser("CUSTOMER");
  if (!customer)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const parcels = await db.parcelDelivery.findMany({
    where: { customerId: customer.id },
    select: {
      referenceNumber: true,
      status: true,
      categoryName: true,
      sizeName: true,
      pickupAddress: true,
      deliveryAddress: true,
      deliveryFeeRwf: true,
      totalRwf: true,
      createdAt: true,
      updatedAt: true,
      payment: { select: { status: true } },
      assignedRider: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ parcels });
}

export async function POST(request: Request) {
  const customer = await getCurrentUser("CUSTOMER");
  if (!customer)
    return NextResponse.json({ error: "Sign in before booking a parcel." }, { status: 401 });
  if (!customer.emailVerifiedAt)
    return NextResponse.json({ error: "Verify your email before booking a parcel." }, { status: 403 });
  if (!rateLimit(`parcel-create:${customer.id}`, 10, 60_000))
    return NextResponse.json({ error: "Please wait before submitting another parcel request." }, { status: 429 });

  const { input, photo } = await readInput(request);
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json({ error: "Complete every required parcel booking field." }, { status: 400 });
  const data = parsed.data;
  if (!data.detailsAccurate || !data.prohibitedItemsConfirmed || !data.safePackagingConfirmed || !data.recipientAvailableConfirmed)
    return NextResponse.json({ error: "Confirm the parcel safety and handover declarations." }, { status: 400 });
  if (!data.paymentConfirmed)
    return NextResponse.json({ error: "Confirm your MoMo payment before submitting." }, { status: 400 });
  const pickupPhone = normalizeRwandaPhone(data.pickupPhone);
  const recipientPhone = normalizeRwandaPhone(data.recipientPhone);
  if (!pickupPhone || !recipientPhone)
    return NextResponse.json({ error: "Use a valid Rwanda phone number for both contacts." }, { status: 400 });
  const scheduledPickupAt =
    data.pickupPreference === "SCHEDULED"
      ? parseKigaliDateTime(data.scheduledPickupAt)
      : null;
  if (data.pickupPreference === "SCHEDULED" && (!scheduledPickupAt || Number.isNaN(scheduledPickupAt.getTime()) || scheduledPickupAt <= new Date()))
    return NextResponse.json({ error: "Choose a future scheduled pickup time." }, { status: 400 });

  const [pricing, size, category, capacities, prohibitedRules] = await Promise.all([
    db.parcelPricingSetting.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } }),
    db.parcelSizeDefinition.findFirst({ where: { code: data.sizeCode.toUpperCase(), isActive: true } }),
    db.parcelCategory.findFirst({
      where: {
        isActive: true,
        ...(data.categoryId ? { id: data.categoryId } : { name: data.categoryName }),
      },
    }),
    db.parcelVehicleCapacity.findMany({ where: { isActive: true } }),
    db.parcelProhibitedItemRule.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!pricing || !size || !category)
    return NextResponse.json({ error: "The selected parcel category, size, or pricing is unavailable." }, { status: 409 });
  const length = data.estimatedLengthCm ?? 0;
  const width = data.estimatedWidthCm ?? 0;
  const height = data.estimatedHeightCm ?? 0;
  const fitsSize = data.estimatedWeightKg <= size.maxWeightKg && (!length || length <= size.maxLengthCm) && (!width || width <= size.maxWidthCm) && (!height || height <= size.maxHeightCm);
  const supported = capacities.some((capacity) => data.estimatedWeightKg <= capacity.maxWeightKg && (!length || length <= capacity.maxLengthCm) && (!width || width <= capacity.maxWidthCm) && (!height || height <= capacity.maxHeightCm));
  if (!fitsSize || !supported)
    return NextResponse.json({ error: "This parcel requires special delivery assistance. Please contact Karame Bay support." }, { status: 422 });

  let route;
  try {
    route = await getDrivingRoute(
      { latitude: data.pickupLatitude, longitude: data.pickupLongitude },
      { latitude: data.deliveryLatitude, longitude: data.deliveryLongitude },
    );
  } catch (error) {
    console.error("Parcel booking route failed", error);
    return NextResponse.json({ error: "Routing is temporarily unavailable. Please try again." }, { status: 502 });
  }
  const price = calculateParcelPrice(pricing, {
    distanceM: route.distanceMeters,
    estimatedWeightKg: data.estimatedWeightKg,
    sizeSurchargeRwf: size.surchargeRwf,
    fragile: data.fragile,
    requiresCarefulHandling: data.requiresCarefulHandling,
    scheduled: data.pickupPreference === "SCHEDULED",
  });
  let savedPhoto: Awaited<ReturnType<typeof saveParcelMedia>> | null = null;
  try {
    if (photo instanceof File && photo.size) savedPhoto = await saveParcelMedia(photo, "parcel");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid parcel photo." }, { status: 400 });
  }
  const now = new Date();
  const parcel = await db.$transaction(async (tx) => {
    const counter = await tx.parcelReferenceCounter.upsert({
      where: { id: "parcel" },
      update: { lastValue: { increment: 1 } },
      create: { id: "parcel", lastValue: 1 },
    });
    const created = await tx.parcelDelivery.create({
      data: {
        referenceNumber: formatParcelReference(counter.lastValue),
        customerId: customer.id,
        categoryId: category.id,
        sizeDefinitionId: size.id,
        pickupContactName: data.pickupContactName,
        pickupPhone,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        pickupAddress: data.pickupAddress,
        pickupAddressDetails: data.pickupAddressDetails,
        pickupInstructions: data.pickupInstructions || null,
        pickupPreference: data.pickupPreference,
        scheduledPickupAt,
        recipientName: data.recipientName,
        recipientPhone,
        deliveryLatitude: data.deliveryLatitude,
        deliveryLongitude: data.deliveryLongitude,
        deliveryAddress: data.deliveryAddress,
        deliveryAddressDetails: data.deliveryAddressDetails,
        deliveryInstructions: data.deliveryInstructions || null,
        categoryName: category.name,
        parcelDescription: data.parcelDescription,
        quantity: data.quantity,
        estimatedWeightKg: data.estimatedWeightKg,
        estimatedLengthCm: data.estimatedLengthCm,
        estimatedWidthCm: data.estimatedWidthCm,
        estimatedHeightCm: data.estimatedHeightCm,
        sizeCode: size.code,
        sizeName: size.name,
        fragile: data.fragile,
        requiresCarefulHandling: data.requiresCarefulHandling,
        declaredValueRwf: data.declaredValueRwf ? Math.round(data.declaredValueRwf) : null,
        distanceM: route.distanceMeters,
        estimatedDurationS: route.durationSeconds,
        quotedRouteJson: JSON.stringify(route.route),
        currency: price.currency,
        pricingVersion: price.pricingVersion,
        baseFeeRwf: price.baseFeeRwf,
        distanceFeeRwf: price.distanceFeeRwf,
        sizeSurchargeRwf: price.sizeSurchargeRwf,
        weightSurchargeRwf: price.weightSurchargeRwf,
        fragileSurchargeRwf: price.fragileSurchargeRwf,
        carefulHandlingRwf: price.carefulHandlingRwf,
        waitingTimeChargeRwf: price.waitingTimeChargeRwf,
        scheduledSurchargeRwf: price.scheduledSurchargeRwf,
        extraFeesRwf: price.extraFeesRwf,
        deliveryFeeRwf: price.deliveryFeeRwf,
        totalRwf: price.totalRwf,
        pricingSnapshotJson: JSON.stringify(pricing),
        status: "PENDING_VERIFICATION",
        detailsConfirmedAt: now,
        prohibitedItemsConfirmedAt: now,
        safePackagingConfirmedAt: now,
        recipientAvailableConfirmedAt: now,
        prohibitedRulesSnapshotJson: JSON.stringify(prohibitedRules.map((rule) => rule.title)),
        payment: {
          create: {
            status: "PENDING_VERIFICATION",
            amountRwf: price.totalRwf,
            customerConfirmedAt: now,
          },
        },
        events: {
          create: { status: "PENDING_VERIFICATION", actorId: customer.id, note: "Customer confirmed parcel details and MoMo payment." },
        },
        ...(savedPhoto ? {
          media: {
            create: {
              kind: "PARCEL_PHOTO",
              storageKey: savedPhoto.storageKey,
              url: savedPhoto.url,
              publicId: savedPhoto.publicId,
              resourceType: savedPhoto.resourceType,
              originalName: photo instanceof File ? photo.name : null,
              mimeType: savedPhoto.contentType,
              sizeBytes: savedPhoto.sizeBytes,
              width: savedPhoto.width ?? null,
              height: savedPhoto.height ?? null,
              format: savedPhoto.format ?? null,
              uploadedById: customer.id,
            },
          },
        } : {}),
      },
      select: { id: true, referenceNumber: true, customerId: true, status: true, totalRwf: true },
    });
    await notifyParcelCustomer(tx, created, "PARCEL_CREATED", "Parcel request created", `${created.referenceNumber} is pending MoMo payment verification.`);
    await notifyParcelAdmins(tx, created, "NEW_PARCEL_REQUEST", "New parcel request", `${created.referenceNumber} is ready for payment verification and review.`);
    await notifyParcelAdmins(tx, created, "PARCEL_PAYMENT_CONFIRMED", "Parcel payment confirmation", `The customer confirmed MoMo payment for ${created.referenceNumber}.`);
    return created;
  });
  return NextResponse.json(
    {
      parcel: {
        referenceNumber: parcel.referenceNumber,
        status: parcel.status,
        totalRwf: parcel.totalRwf,
      },
    },
    { status: 201 },
  );
}
