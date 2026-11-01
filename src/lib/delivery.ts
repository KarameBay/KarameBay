export const DELIVERY_LOCATION_KEY = "karame_delivery_location_v1";
export const DELIVERY_QUOTE_KEY = "karame_delivery_quote_v3";
export const DELIVERY_ADDRESS_KEY = "karame_delivery_address_v1";
export const DELIVERY_DETAILS_KEY = "karame_delivery_details_v1";
export const DELIVERY_ADDRESS_MODE_KEY = "karame_delivery_address_mode_v1";
export const DELIVERY_QUOTE_MAX_AGE_MS = 15 * 60 * 1000;
export type Coordinates = { latitude: number; longitude: number };
export const KIGALI_CENTRE: Coordinates = { latitude: -1.9706, longitude: 30.1044 };
// Kigali delivery is intentionally limited to the city. A radius keeps the
// boundary predictable for GPS pins and geocoder results without pretending
// that a street address alone is enough to determine serviceability.
export const KIGALI_SERVICE_RADIUS_KM = 25;
export function distanceBetweenCoordinates(a: Coordinates, b: Coordinates) {
  const earthRadiusKm = 6371;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
export function isWithinKigali(value: unknown): value is Coordinates {
  return validCoordinates(value) && distanceBetweenCoordinates(value, KIGALI_CENTRE) <= KIGALI_SERVICE_RADIUS_KM;
}
export type RouteQuote = {
  distanceKm: number;
  durationMinutes: number;
  deliveryFeeRwf: number;
  route: [number, number][];
};
export type SavedDeliveryQuote = Omit<RouteQuote, "route"> &
  Coordinates & { storeId: string; savedAt: number };
export function validSavedDeliveryQuote(
  value: unknown,
): value is SavedDeliveryQuote {
  if (typeof value !== "object" || value === null) return false;
  const quote = value as SavedDeliveryQuote;
  const age = Date.now() - quote.savedAt;
  return (
    typeof quote.storeId === "string" &&
    validCoordinates(quote) &&
    Number.isFinite(quote.distanceKm) &&
    quote.distanceKm >= 0 &&
    Number.isFinite(quote.durationMinutes) &&
    quote.durationMinutes > 0 &&
    Number.isInteger(quote.deliveryFeeRwf) &&
    quote.deliveryFeeRwf >= 0 &&
    Number.isFinite(quote.savedAt) &&
    age >= 0 &&
    age <= DELIVERY_QUOTE_MAX_AGE_MS
  );
}
export function roundRwfToNearestHundred(value: number) {
  return Math.round(value / 100) * 100;
}
export function calculateDeliveryFee(distanceMeters: number) {
  return roundRwfToNearestHundred(500 + 210 * (distanceMeters / 1000));
}
export function validCoordinates(value: unknown): value is Coordinates {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Coordinates).latitude === "number" &&
    typeof (value as Coordinates).longitude === "number" &&
    Math.abs((value as Coordinates).latitude) <= 90 &&
    Math.abs((value as Coordinates).longitude) <= 180
  );
}
