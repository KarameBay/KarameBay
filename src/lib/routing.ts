import { Coordinates, calculateDeliveryFee } from "./delivery";

type OsrmResponse = {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
};
export type DrivingRoute = {
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
  deliveryFeeRwf: number;
  route: [number, number][];
};

export async function getDrivingRoute(
  store: Coordinates,
  customer: Coordinates,
): Promise<DrivingRoute> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const endpoint = `https://router.project-osrm.org/route/v1/driving/${store.longitude},${store.latitude};${customer.longitude},${customer.latitude}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { "User-Agent": "KarameBay/1.0 (delivery routing)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`OSRM returned ${response.status}`);
    const data = (await response.json()) as OsrmResponse;
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route)
      throw new Error("No driving route was found");
    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      distanceKm: Math.round(route.distance / 100) / 10,
      durationMinutes: Math.max(1, Math.ceil(route.duration / 60)),
      deliveryFeeRwf: calculateDeliveryFee(route.distance),
      route: route.geometry.coordinates.map(([longitude, latitude]) => [
        latitude,
        longitude,
      ]),
    };
  } finally {
    clearTimeout(timeout);
  }
}
