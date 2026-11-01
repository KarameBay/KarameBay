import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { isKigaliAddress, isWithinKigali } from "@/lib/delivery";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`reverse:${ip}`, 20, 60_000))
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid coordinates." },
      { status: 400 },
    );
  if (!isWithinKigali({ latitude: parsed.data.lat, longitude: parsed.data.lon })) {
    return NextResponse.json({ error: "Karame Bay currently delivers in Kigali only." }, { status: 422 });
  }
  const params = new URLSearchParams({
    lat: String(parsed.data.lat),
    lon: String(parsed.data.lon),
    format: "jsonv2",
    zoom: "18",
  });
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          "User-Agent": "KarameBay/1.0 (karametransportdelivery@gmail.com)",
          "Accept-Language": "en,rw;q=0.8",
        },
        next: { revalidate: 86400 },
      },
    );
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const place = (await response.json()) as { display_name?: string; address?: Record<string, string> };
    const address = place.display_name ?? "";
    if (!isKigaliAddress(address)) {
      return NextResponse.json({ error: "That pin is not in Kigali. Choose a Kigali delivery location." }, { status: 422 });
    }
    return NextResponse.json({
      address,
    });
  } catch (error) {
    console.error("Reverse geocoding failed", error);
    return NextResponse.json({ error: "We could not verify this pin right now. Please try again." }, { status: 502 });
  }
}
