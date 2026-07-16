import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.string().trim().min(3).max(120);
type Place = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`geocode:${ip}`, 10, 60_000))
    return NextResponse.json(
      { error: "Too many searches. Please wait a moment." },
      { status: 429 },
    );
  const parsed = schema.safeParse(request.nextUrl.searchParams.get("q"));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter at least three characters." },
      { status: 400 },
    );
  const params = new URLSearchParams({
    q: parsed.data,
    format: "jsonv2",
    limit: "5",
    countrycodes: "rw",
    addressdetails: "1",
  });
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "KarameBay/1.0 (karametransportdelivery@gmail.com)",
          "Accept-Language": "en,rw;q=0.8",
        },
        next: { revalidate: 86400 },
      },
    );
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const places = (await response.json()) as Place[];
    return NextResponse.json({
      results: places.map((place) => ({
        id: String(place.place_id),
        label: place.display_name,
        latitude: Number(place.lat),
        longitude: Number(place.lon),
        type: place.type,
      })),
    });
  } catch (error) {
    console.error("Geocoding failed", error);
    return NextResponse.json(
      { error: "Location search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
