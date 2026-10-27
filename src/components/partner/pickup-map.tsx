"use client";
import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type Point = { latitude: number; longitude: number };
type Props = { location: Point | null; onChange: (point: Point) => void };
const centre: Point = { latitude: -1.9441, longitude: 30.0619 };
const icon = L.divIcon({
  className: "partner-map-marker",
  html: "<span>Pickup</span>",
  iconSize: [68, 32],
  iconAnchor: [34, 32],
});
function MapEvents({ location, onChange }: Props) {
  const map = useMap();
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  useEffect(() => {
    if (location) map.panTo([location.latitude, location.longitude]);
  }, [map, location]);
  return null;
}
export function PickupMap({ location, onChange }: Props) {
  const initial = location ?? centre;
  return (
    <MapContainer
      className="partner-pickup-map"
      center={[initial.latitude, initial.longitude]}
      zoom={14}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {location && (
        <Marker
          position={[location.latitude, location.longitude]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend(event) {
              const point = event.target.getLatLng();
              onChange({ latitude: point.lat, longitude: point.lng });
            },
          }}
        />
      )}
      <MapEvents location={location} onChange={onChange} />
    </MapContainer>
  );
}
