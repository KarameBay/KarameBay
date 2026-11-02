import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { KIGALI_CENTRE, isWithinKigali } from "@/lib/delivery";

const schema = z.string().trim().min(2).max(120);
type Place = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
};
type SearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  type: string;
  approximate?: boolean;
};

function labelFor(place: Place) {
  const data = place.properties;
  if (!data) return "";
  const street = [data.housenumber, data.street].filter(Boolean).join(" ");
  const parts = [data.name, street, data.district, data.city, data.state, data.country]
    .filter((part): part is string => Boolean(part?.trim()));
  return [...new Set(parts)].join(", ");
}

async function findPlaces(query: string): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    bbox: "29.92,-2.16,30.29,-1.79",
    countrycode: "RW",
    lon: String(KIGALI_CENTRE.longitude),
    lat: String(KIGALI_CENTRE.latitude),
    limit: "20",
    lang: "en",
  });
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
    headers: { "User-Agent": "KarameBay/1.0 (karametransportdelivery@gmail.com)" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Photon ${response.status}`);
  const data = (await response.json()) as { features?: Place[] };
  return data.features ?? [];
}

function toResults(places: Place[]): SearchResult[] {
  const seen = new Set<string>();
  return places.flatMap((place) => {
    const [longitude, latitude] = place.geometry?.coordinates ?? [NaN, NaN];
    const label = labelFor(place);
    const locality = [place.properties?.city, place.properties?.state].filter(Boolean).join(" ");
    if (!label || !/\bkigali\b/i.test(locality) || !isWithinKigali({ latitude, longitude })) return [];
    const key = `${latitude},${longitude}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      id: `${place.properties?.osm_type ?? "place"}-${place.properties?.osm_id ?? key}`,
      label,
      latitude,
      longitude,
      type: place.properties?.type ?? "place",
    }];
  });
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`geocode:${ip}`, 60, 60_000))
    return NextResponse.json(
      { error: "Too many searches. Please wait a moment." },
      { status: 429 },
    );
  const parsed = schema.safeParse(request.nextUrl.searchParams.get("q"));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter at least two characters." },
      { status: 400 },
    );
  try {
    const places = await findPlaces(parsed.data);
    const results = toResults(places);
    const firstWord = parsed.data.split(/\s+/)[0];
    const requestedName = parsed.data.toLowerCase();
    const hasNamedMatch = results.some((place) =>
      place.label.split(",")[0].toLowerCase().includes(requestedName),
    );
    if (firstWord.length >= 5 && parsed.data.includes(" ") && !hasNamedMatch) {
      const nearby = toResults(await findPlaces(firstWord));
      const area = nearby.find((place) => place.label.split(",")[0].toLowerCase() === firstWord.toLowerCase());
      if (area && !results.some((place) => place.id === area.id)) {
        results.unshift({ ...area, label: `${firstWord} (area), Kigali, Rwanda`, approximate: true });
      }
    }
    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (error) {
    console.error("Geocoding failed", error);
    return NextResponse.json(
      { error: "Location search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
