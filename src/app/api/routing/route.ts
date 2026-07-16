import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { getDrivingRoute } from "@/lib/routing";

const coordinate = z.coerce.number().finite();
const querySchema = z.object({
  storeId: z.string().min(1).max(80),
  customerLat: coordinate.min(-90).max(90),
  customerLng: coordinate.min(-180).max(180),
});
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`route:${ip}`, 40, 60_000))
    return NextResponse.json(
      { error: "Too many route requests. Please wait a moment." },
      { status: 429 },
    );
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid route coordinates." },
      { status: 400 },
    );
  const { storeId, customerLat, customerLng } = parsed.data;
  const store = await db.store.findFirst({
    where: { id: storeId, status: "APPROVED" },
    select: { latitude: true, longitude: true },
  });
  if (!store)
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  try {
    const result = await getDrivingRoute(store, {
      latitude: customerLat,
      longitude: customerLng,
    });
    return NextResponse.json({
      distanceKm: result.distanceKm,
      durationMinutes: result.durationMinutes,
      deliveryFeeRwf: result.deliveryFeeRwf,
      route: result.route,
    });
  } catch (error) {
    console.error("Routing failed", error);
    return NextResponse.json(
      {
        error:
          "We could not calculate this route. Please adjust the pin and try again.",
      },
      { status: 502 },
    );
  }
}
