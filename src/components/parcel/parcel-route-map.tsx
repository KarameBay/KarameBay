"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

export type ParcelMapPoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  pickup?: ParcelMapPoint | null;
  delivery?: ParcelMapPoint | null;
  rider?: ParcelMapPoint | null;
  route?: [number, number][];
  editing?: "pickup" | "delivery" | null;
  onPickupChange?: (point: ParcelMapPoint) => void;
  onDeliveryChange?: (point: ParcelMapPoint) => void;
  compact?: boolean;
};

const makeIcon = (kind: "pickup" | "delivery" | "rider", label: string) =>
  L.divIcon({
    className: "parcel-map-pin-wrap",
    html: `<div class="parcel-map-pin ${kind}"><span>${label}</span></div>`,
    iconSize: [42, 50],
    iconAnchor: [21, 47],
  });

const pickupIcon = makeIcon("pickup", "P");
const deliveryIcon = makeIcon("delivery", "D");
const riderIcon = makeIcon("rider", "R");
const KIGALI = { latitude: -1.9706, longitude: 30.1044 };

function ClickToPlace({
  editing,
  onPickupChange,
  onDeliveryChange,
}: Pick<Props, "editing" | "onPickupChange" | "onDeliveryChange">) {
  useMapEvents({
    click(event) {
      const point = {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      };
      if (editing === "pickup") onPickupChange?.(point);
      if (editing === "delivery") onDeliveryChange?.(point);
    },
  });
  return null;
}

function FitVisiblePoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) {
      map.setView([KIGALI.latitude, KIGALI.longitude], 12);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(points).pad(0.18), {
      animate: true,
      maxZoom: 16,
      padding: [28, 28],
    });
  }, [map, points]);
  return null;
}

export function ParcelRouteMap({
  pickup,
  delivery,
  rider,
  route = [],
  editing = null,
  onPickupChange,
  onDeliveryChange,
  compact = false,
}: Props) {
  const visiblePoints = useMemo(
    () => [
      ...route,
      ...(pickup
        ? ([[pickup.latitude, pickup.longitude]] as [number, number][])
        : []),
      ...(delivery
        ? ([[delivery.latitude, delivery.longitude]] as [number, number][])
        : []),
      ...(rider
        ? ([[rider.latitude, rider.longitude]] as [number, number][])
        : []),
    ],
    [delivery, pickup, rider, route],
  );

  const movePoint = (
    event: L.LeafletEvent,
    callback?: (point: ParcelMapPoint) => void,
  ) => {
    const marker = event.target as L.Marker;
    const position = marker.getLatLng();
    callback?.({ latitude: position.lat, longitude: position.lng });
  };

  return (
    <MapContainer
      center={[KIGALI.latitude, KIGALI.longitude]}
      zoom={12}
      scrollWheelZoom
      attributionControl
      className={`parcel-route-map ${compact ? "compact" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pickup && (
        <Marker
          position={[pickup.latitude, pickup.longitude]}
          icon={pickupIcon}
          draggable={editing === "pickup"}
          eventHandlers={{
            dragend: (event) => movePoint(event, onPickupChange),
          }}
        />
      )}
      {delivery && (
        <Marker
          position={[delivery.latitude, delivery.longitude]}
          icon={deliveryIcon}
          draggable={editing === "delivery"}
          eventHandlers={{
            dragend: (event) => movePoint(event, onDeliveryChange),
          }}
        />
      )}
      {rider && (
        <Marker
          position={[rider.latitude, rider.longitude]}
          icon={riderIcon}
        />
      )}
      {route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{
            color: "#b7791f",
            weight: 6,
            opacity: 0.9,
            lineCap: "round",
          }}
        />
      )}
      <ClickToPlace
        editing={editing}
        onPickupChange={onPickupChange}
        onDeliveryChange={onDeliveryChange}
      />
      <FitVisiblePoints points={visiblePoints} />
    </MapContainer>
  );
}
