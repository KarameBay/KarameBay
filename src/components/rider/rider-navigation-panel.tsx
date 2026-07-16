"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, LocateFixed, Map, Navigation, Route, Smartphone } from "lucide-react";
import { LiveRouteMapLoader } from "@/components/tracking/live-route-map-loader";

type Point = { latitude: number; longitude: number };

export type NavigationDelivery = {
  id: string;
  status: string;
  store: Point;
  deliveryLatitude: number;
  deliveryLongitude: number;
  riderCurrentLatitude: number | null;
  riderCurrentLongitude: number | null;
  riderLocationUpdatedAt: string | null;
  riderRoutePhase: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  liveRoute: [number, number][];
};

type LocationUpdate = {
  latitude: number;
  longitude: number;
  updatedAt: string;
  phase: string;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  route: [number, number][];
};

const MIN_SEND_INTERVAL_MS = 25_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const MIN_MOVEMENT_METERS = 30;

function distanceMeters(a: Point, b: Point) {
  const radius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(b.latitude - a.latitude);
  const lngDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const value =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

export function RiderNavigationPanel({
  delivery,
  onUpdate,
}: {
  delivery: NavigationDelivery;
  onUpdate?: (update: LocationUpdate) => void;
}) {
  const [tracking, setTracking] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [point, setPoint] = useState<Point | null>(
    delivery.riderCurrentLatitude != null && delivery.riderCurrentLongitude != null
      ? {
          latitude: delivery.riderCurrentLatitude,
          longitude: delivery.riderCurrentLongitude,
        }
      : null,
  );
  const [route, setRoute] = useState(delivery.liveRoute);
  const [phase, setPhase] = useState(delivery.riderRoutePhase);
  const [remainingDistanceM, setRemainingDistanceM] = useState(
    delivery.remainingDistanceM,
  );
  const [remainingDurationS, setRemainingDurationS] = useState(
    delivery.remainingDurationS,
  );
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const lastSentPoint = useRef<Point | null>(null);
  const latestPosition = useRef<GeolocationPosition | null>(null);

  const customer = useMemo(
    () => ({
      latitude: delivery.deliveryLatitude,
      longitude: delivery.deliveryLongitude,
    }),
    [delivery.deliveryLatitude, delivery.deliveryLongitude],
  );
  const destination = delivery.status === "READY_FOR_PICKUP" ? delivery.store : customer;
  const destinationLabel = delivery.status === "READY_FOR_PICKUP" ? "pickup" : "customer";
  const encodedDestination = `${destination.latitude},${destination.longitude}`;
  const external = {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`,
    waze: `https://waze.com/ul?ll=${encodedDestination}&navigate=yes`,
    apple: `https://maps.apple.com/?daddr=${encodedDestination}&dirflg=d`,
  };

  const publish = useCallback(
    async (position: GeolocationPosition, force = false) => {
      const nextPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setPoint(nextPoint);
      latestPosition.current = position;

      const now = Date.now();
      const elapsed = now - lastSentAt.current;
      const moved = lastSentPoint.current
        ? distanceMeters(lastSentPoint.current, nextPoint)
        : Number.POSITIVE_INFINITY;
      if (
        !force &&
        elapsed < HEARTBEAT_INTERVAL_MS &&
        (elapsed < MIN_SEND_INTERVAL_MS || moved < MIN_MOVEMENT_METERS)
      ) {
        return;
      }

      setSending(true);
      try {
        const response = await fetch(`/api/rider/deliveries/${delivery.id}/location`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...nextPoint,
            accuracyM: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
            headingDegrees: Number.isFinite(position.coords.heading)
              ? position.coords.heading
              : null,
            speedMps: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(data.error ?? "Could not publish the rider location.");
          return;
        }
        lastSentAt.current = now;
        lastSentPoint.current = nextPoint;
        setRoute(data.route);
        setPhase(data.phase);
        setRemainingDistanceM(data.remainingDistanceM);
        setRemainingDurationS(data.remainingDurationS);
        setMessage(
          data.warning ?? `Live route to ${destinationLabel} updated.`,
        );
        onUpdate?.({
          ...nextPoint,
          updatedAt: data.location.updatedAt,
          phase: data.phase,
          remainingDistanceM: data.remainingDistanceM,
          remainingDurationS: data.remainingDurationS,
          route: data.route,
        });
      } catch {
        setMessage("Location update failed. Check your connection and keep GPS enabled.");
      } finally {
        setSending(false);
      }
    },
    [delivery.id, destinationLabel, onUpdate],
  );

  function startTracking() {
    if (!navigator.geolocation) {
      setMessage("GPS is not supported by this device.");
      return;
    }
    if (watchId.current != null) return;
    setMessage("Waiting for GPS permission…");
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setTracking(true);
        void publish(position);
      },
      (gpsError) => {
        setTracking(false);
        setMessage(
          gpsError.code === gpsError.PERMISSION_DENIED
            ? "Location permission is required for live navigation."
            : "GPS is unavailable. Move outdoors or check device location settings.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 20_000,
      },
    );
  }

  function stopTracking() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
    setMessage("Live GPS paused.");
  }

  useEffect(() => {
    if (latestPosition.current) void publish(latestPosition.current, true);
  }, [delivery.status, publish]);

  useEffect(
    () => () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  return (
    <section className="rider-navigation-panel">
      <header>
        <div>
          <span className={`rider-live-dot ${tracking ? "active" : ""}`} />
          <span>
            <b>Navigation to {destinationLabel}</b>
            <small>{tracking ? "Live GPS is sharing" : "GPS sharing is paused"}</small>
          </span>
        </div>
        <button type="button" onClick={tracking ? stopTracking : startTracking}>
          <LocateFixed /> {tracking ? "Pause GPS" : "Start live GPS"}
        </button>
      </header>

      <LiveRouteMapLoader
        store={delivery.store}
        customer={customer}
        rider={point}
        route={route}
        phase={phase ?? (delivery.status === "READY_FOR_PICKUP" ? "PICKUP" : "DELIVERY")}
      />

      <div className="rider-navigation-stats">
        <span>
          <Route />
          <small>Remaining</small>
          <b>{remainingDistanceM != null ? `${(remainingDistanceM / 1000).toFixed(1)} km` : "—"}</b>
        </span>
        <span>
          <Clock3 />
          <small>ETA</small>
          <b>{remainingDurationS != null ? `${Math.max(1, Math.ceil(remainingDurationS / 60))} min` : "—"}</b>
        </span>
        <span>
          <Navigation />
          <small>Routing</small>
          <b>{phase === "PICKUP" ? "To pickup" : "To customer"}</b>
        </span>
      </div>

      <div className="rider-external-navigation">
        <a href={external.google} target="_blank" rel="noreferrer">
          <Map /> Google Maps
        </a>
        <a href={external.waze} target="_blank" rel="noreferrer">
          <Navigation /> Waze
        </a>
        <a href={external.apple} target="_blank" rel="noreferrer">
          <Smartphone /> Apple Maps
        </a>
      </div>
      {message && <p className={sending ? "sending" : ""}>{message}</p>}
    </section>
  );
}
