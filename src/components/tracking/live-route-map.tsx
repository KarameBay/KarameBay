"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

export type MapPoint = { latitude: number; longitude: number };

type Props = {
  store: MapPoint;
  customer: MapPoint;
  rider?: MapPoint | null;
  route: [number, number][];
  phase?: "PICKUP" | "DELIVERY" | string | null;
  compact?: boolean;
};

const icon = (kind: "store" | "customer" | "rider", label: string) =>
  L.divIcon({
    className: "live-route-pin-wrap",
    html: `<div class="live-route-pin ${kind}"><span>${label}</span></div>`,
    iconSize: [38, 46],
    iconAnchor: [19, 43],
  });

const storeIcon = icon("store", "S");
const customerIcon = icon("customer", "C");
const riderIcon = icon("rider", "R");

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points).pad(0.18);
    map.fitBounds(bounds, { animate: true, maxZoom: 16, padding: [24, 24] });
  }, [map, points]);
  return null;
}

export function LiveRouteMap({ store, customer, rider, route, phase, compact }: Props) {
  const destination = phase === "PICKUP" ? store : customer;
  const fallbackRoute: [number, number][] = rider
    ? [
        [rider.latitude, rider.longitude],
        [destination.latitude, destination.longitude],
      ]
    : [
        [store.latitude, store.longitude],
        [customer.latitude, customer.longitude],
      ];
  const visibleRoute = route.length > 1 ? route : fallbackRoute;
  const boundsPoints = useMemo(
    () => [
      ...visibleRoute,
      [store.latitude, store.longitude] as [number, number],
      [customer.latitude, customer.longitude] as [number, number],
      ...(rider ? [[rider.latitude, rider.longitude] as [number, number]] : []),
    ],
    [visibleRoute, store.latitude, store.longitude, customer.latitude, customer.longitude, rider],
  );

  return (
    <MapContainer
      center={visibleRoute[0]}
      zoom={13}
      scrollWheelZoom
      attributionControl
      className={`live-route-map ${compact ? "compact" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[store.latitude, store.longitude]} icon={storeIcon} />
      <Marker position={[customer.latitude, customer.longitude]} icon={customerIcon} />
      {rider && <Marker position={[rider.latitude, rider.longitude]} icon={riderIcon} />}
      <Polyline
        positions={visibleRoute}
        pathOptions={{ color: "#c27a10", weight: 6, opacity: 0.9, lineCap: "round" }}
      />
      <FitRoute points={boundsPoints} />
    </MapContainer>
  );
}
