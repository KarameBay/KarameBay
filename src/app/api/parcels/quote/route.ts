import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { calculateParcelPrice } from "@/lib/parcel";
import { rateLimit } from "@/lib/rate-limit";
import { getDrivingRoute } from "@/lib/routing";

const coordinate = z.coerce.number().finite();
const optionalDimension = z.coerce.number().positive().max(500).optional().nullable();
const schema = z.object({
  pickupLatitude: coordinate.min(-90).max(90),
  pickupLongitude: coordinate.min(-180).max(180),
  deliveryLatitude: coordinate.min(-90).max(90),
  deliveryLongitude: coordinate.min(-180).max(180),
  sizeCode: z.string().trim().min(1).max(20),
  estimatedWeightKg: z.coerce.number().positive().max(1000),
  estimatedLengthCm: optionalDimension,
  estimatedWidthCm: optionalDimension,
  estimatedHeightCm: optionalDimension,
  fragile: z.coerce.boolean().default(false),
  requiresCarefulHandling: z.coerce.boolean().default(false),
  scheduled: z.coerce.boolean().default(false),
});

export async function POST(request: Request) {
  const customer = await getCurrentUser("CUSTOMER");
  if (!customer)
    return NextResponse.json({ error: "Sign in to calculate a parcel route." }, { status: 401 });
  if (!customer.emailVerifiedAt)
    return NextResponse.json({ error: "Verify your email before booking a parcel." }, { status: 403 });
  if (!rateLimit(`parcel-quote:${customer.id}`, 30, 60_000))
    return NextResponse.json({ error: "Too many route requests. Please wait a moment." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Complete both locations, parcel size, and weight." }, { status: 400 });

  const [pricing, size, capacities] = await Promise.all([
    db.parcelPricingSetting.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } }),
    db.parcelSizeDefinition.findFirst({
      where: { code: parsed.data.sizeCode.toUpperCase(), isActive: true },
    }),
    db.parcelVehicleCapacity.findMany({ where: { isActive: true } }),
  ]);
  if (!pricing || !size)
    return NextResponse.json({ error: "Parcel pricing or size settings are unavailable." }, { status: 503 });

  const length = parsed.data.estimatedLengthCm ?? 0;
  const width = parsed.data.estimatedWidthCm ?? 0;
  const height = parsed.data.estimatedHeightCm ?? 0;
  const fitsSize =
    parsed.data.estimatedWeightKg <= size.maxWeightKg &&
    (!length || length <= size.maxLengthCm) &&
    (!width || width <= size.maxWidthCm) &&
    (!height || height <= size.maxHeightCm);
  const supportedByVehicle = capacities.some(
    (capacity) =>
      parsed.data.estimatedWeightKg <= capacity.maxWeightKg &&
      (!length || length <= capacity.maxLengthCm) &&
      (!width || width <= capacity.maxWidthCm) &&
      (!height || height <= capacity.maxHeightCm),
  );
  if (!fitsSize || !supportedByVehicle)
    return NextResponse.json(
      { error: "This parcel requires special delivery assistance. Please contact Karame Bay support." },
      { status: 422 },
    );

  try {
    const route = await getDrivingRoute(
      { latitude: parsed.data.pickupLatitude, longitude: parsed.data.pickupLongitude },
      { latitude: parsed.data.deliveryLatitude, longitude: parsed.data.deliveryLongitude },
    );
    const price = calculateParcelPrice(pricing, {
      distanceM: route.distanceMeters,
      estimatedWeightKg: parsed.data.estimatedWeightKg,
      sizeSurchargeRwf: size.surchargeRwf,
      fragile: parsed.data.fragile,
      requiresCarefulHandling: parsed.data.requiresCarefulHandling,
      scheduled: parsed.data.scheduled,
    });
    return NextResponse.json({
      distanceM: route.distanceMeters,
      distanceKm: route.distanceKm,
      estimatedDurationS: route.durationSeconds,
      durationMinutes: route.durationMinutes,
      route: route.route,
      deliveryFeeRwf: price.deliveryFeeRwf,
      totalRwf: price.totalRwf,
      extraFeesRwf: price.extraFeesRwf,
      currency: price.currency,
    });
  } catch (error) {
    console.error("Parcel route calculation failed", error);
    return NextResponse.json(
      { error: "We could not calculate this driving route. Adjust either pin and try again." },
      { status: 502 },
    );
  }
}

